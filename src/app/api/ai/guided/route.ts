/**
 * POST /api/ai/guided
 * Body: { mode: "chat" | "synthesize"; messages: { role: "user" | "assistant"; content: string }[] }
 *
 * chat mode      — streams a guided journaling response. No RAG, no session storage.
 * synthesize mode — returns JSON { title, body, mood, categories } from the conversation.
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { isOllamaAvailable, chatStream, generateJson } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";
import { JOURNAL_TYPES, VALID_JOURNAL_TYPE_IDS } from "@/lib/journal-types";

const GUIDED_SYSTEM_PROMPT = `You are Aura, a warm and perceptive journaling companion. Your role is to guide the user through a reflective conversation that helps them process their thoughts and feelings.

Follow these rules:
- Ask exactly one open-ended question per response
- Keep each response to 2–3 sentences, ending with your question
- Build on what the user shares — reflect their words back empathetically and go deeper
- Be curious and compassionate, not advisory. Do not offer solutions.
- Gently explore emotions, not just events`;

const VALID_MOODS = new Set([
  "joyful", "content", "neutral", "reflective", "anxious", "frustrated", "sad",
]);

const JOURNAL_TYPE_LIST = JOURNAL_TYPES.map((t) => `${t.id} (${t.name})`).join(", ");

interface GuidedMessage {
  role: "user" | "assistant";
  content: string;
}

interface GuidedRequest {
  mode: "chat" | "synthesize";
  messages: GuidedMessage[];
}

interface EntryDraft {
  title: string;
  body: string;
  mood?: string;
  categories?: string[];
}

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { baseUrl, model } = await getOllamaConfig();
  if (!(await isOllamaAvailable(baseUrl))) {
    return new Response("Ollama is not available", { status: 503 });
  }

  const { mode, messages } = (await req.json()) as GuidedRequest;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  // ── Synthesize mode ───────────────────────────────────────────────────────
  if (mode === "synthesize") {
    const transcript = messages
      .map((m) => `${m.role === "assistant" ? "Aura" : "Me"}: ${m.content}`)
      .join("\n\n");

    const raw = await generateJson<Partial<EntryDraft>>(
      `The following is a guided journaling conversation.\n\n${transcript}\n\n` +
        `Write a first-person journal entry capturing the user's key thoughts, feelings, and insights. ` +
        `Write in the user's voice as if they wrote it themselves — flowing prose, not Q&A.\n\n` +
        `Also determine:\n` +
        `- mood: one of ${[...VALID_MOODS].join(", ")}\n` +
        `- categories: relevant IDs from: ${JOURNAL_TYPE_LIST}\n\n` +
        `Return ONLY valid JSON:\n` +
        `{"title":"3–6 word title","body":"<p>...</p><p>...</p>","mood":"...","categories":["..."]}`,
      "You are a journaling assistant. Output only valid JSON, nothing else.",
      model,
      baseUrl,
    );

    const draft: EntryDraft = {
      title: typeof raw.title === "string" ? raw.title.trim() : "Guided session",
      body: typeof raw.body === "string" ? raw.body.trim() : "",
      ...(typeof raw.mood === "string" && VALID_MOODS.has(raw.mood)
        ? { mood: raw.mood }
        : {}),
      ...(Array.isArray(raw.categories)
        ? {
            categories: raw.categories
              .filter((c): c is string => typeof c === "string" && VALID_JOURNAL_TYPE_IDS.has(c))
              .slice(0, 5),
          }
        : {}),
    };

    return NextResponse.json(draft);
  }

  // ── Chat mode — stream ────────────────────────────────────────────────────
  const ollamaMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: GUIDED_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const token of chatStream(
          ollamaMessages,
          model,
          baseUrl,
          AbortSignal.timeout(3 * 60 * 1000),
        )) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}
