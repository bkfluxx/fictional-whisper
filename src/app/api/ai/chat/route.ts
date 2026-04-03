/**
 * POST /api/ai/chat
 * Body: { message: string; sessionId?: string }
 *
 * RAG + multi-turn chat with two modes:
 *
 * Normal mode:
 *   Embeds the user message, retrieves 5 similar entries as RAG context,
 *   builds conversation history from the session, and streams a response.
 *
 * Entry-creation mode (triggered when the user explicitly asks to create a
 * journal entry — e.g. "create a journal entry about my day"):
 *   Generates a structured entry draft via Ollama's JSON mode, then streams
 *   a brief confirmation. Returns the draft in the X-Entry-Draft response
 *   header (base64 JSON) so the client can show a "Save" card.
 *
 * Response headers always include:
 *   X-Session-Id   — session id (new or existing)
 *   X-Entry-Draft  — base64(JSON) entry draft, only present in entry-creation mode
 */

export const maxDuration = 300;

import { NextRequest } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/lib/crypto";
import {
  isOllamaAvailable,
  embedText,
  chatStream,
  generateJson,
} from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";
import { JOURNAL_TYPES, VALID_JOURNAL_TYPE_IDS } from "@/lib/journal-types";

interface EntryRow {
  id: string;
  entryDate: Date;
  title: string | null;
  body: string;
}

interface EntryDraft {
  title: string;
  body: string;
  mood?: string;
  categories?: string[];
}

// Number of previous message pairs to include as conversation history
const HISTORY_TURNS = 6;

// Matches explicit journal-entry creation requests only.
// The user must clearly ask to create/write/add/draft an entry.
const ENTRY_CREATE_INTENT =
  /\b(?:create|write|add|make|log|draft|save)\b.{0,40}\b(?:journal\s+entry|new\s+entry|an\s+entry|a\s+entry)\b/i;

const VALID_MOODS = new Set([
  "happy", "sad", "anxious", "calm", "energized", "tired",
  "grateful", "frustrated", "excited", "neutral",
]);

const JOURNAL_TYPE_LIST = JOURNAL_TYPES.map((t) => `${t.id} (${t.name})`).join(
  ", ",
);

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { baseUrl, model, embedModel, systemPrompt } = await getOllamaConfig();
  if (!(await isOllamaAvailable(baseUrl))) {
    return new Response("Ollama is not available", { status: 503 });
  }

  const { message, sessionId } = (await req.json()) as {
    message?: string;
    sessionId?: string;
  };
  if (!message?.trim()) {
    return new Response("message is required", { status: 400 });
  }

  // Resolve or create session
  let session = sessionId
    ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
    : null;

  if (!session) {
    session = await prisma.chatSession.create({
      data: { title: message.trim().slice(0, 80) },
    });
  }

  // Persist user message (encrypted) immediately
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: encryptString(message.trim(), dek),
    },
  });

  // Load recent history (excluding the message just saved)
  const historyRows = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_TURNS * 2 + 1,
  });
  const historyForContext = historyRows.slice(0, -1);

  // ── Entry-creation mode ─────────────────────────────────────────────────
  const isEntryRequest = ENTRY_CREATE_INTENT.test(message);

  let entryDraftHeader: string | undefined;

  if (isEntryRequest) {
    const contextSummary = historyForContext
      .slice(-6)
      .map((m) => `${m.role}: ${decryptString(m.content, dek)}`)
      .join("\n");

    try {
      const raw = await generateJson<Partial<EntryDraft>>(
        `The user has explicitly asked to create a journal entry.\n` +
          `User's request: "${message.trim()}"\n\n` +
          (contextSummary ? `Recent conversation:\n${contextSummary}\n\n` : "") +
          `Write a journal entry in first person based on the request. ` +
          `Optionally suggest 1-3 relevant categories from this list: ${JOURNAL_TYPE_LIST}. ` +
          `Choose a mood from: happy, sad, anxious, calm, energized, tired, grateful, frustrated, excited, neutral — or omit if unclear.\n\n` +
          `Return ONLY valid JSON: {"title":"...","body":"...","mood":"...","categories":["..."]}`,
        "You are a journaling assistant. Output only JSON, nothing else.",
        model,
        baseUrl,
      );

      const draft: EntryDraft = {
        title: typeof raw.title === "string" ? raw.title.trim() : "Untitled",
        body: typeof raw.body === "string" ? raw.body.trim() : "",
        ...(typeof raw.mood === "string" && VALID_MOODS.has(raw.mood)
          ? { mood: raw.mood }
          : {}),
        ...(Array.isArray(raw.categories) && raw.categories.length > 0
          ? {
              categories: raw.categories
                .filter(
                  (c): c is string =>
                    typeof c === "string" && VALID_JOURNAL_TYPE_IDS.has(c),
                )
                .slice(0, 5),
            }
          : {}),
      };

      entryDraftHeader = Buffer.from(JSON.stringify(draft)).toString("base64");
    } catch {
      // Fall through to normal chat if generation fails
    }
  }

  // ── Build messages for /api/chat ────────────────────────────────────────
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  for (const m of historyForContext) {
    messages.push({
      role: m.role as "user" | "assistant",
      content: decryptString(m.content, dek),
    });
  }

  if (isEntryRequest && entryDraftHeader) {
    // The entry is drafted — ask AI to confirm it naturally
    const draft = JSON.parse(
      Buffer.from(entryDraftHeader, "base64").toString(),
    ) as EntryDraft;
    messages.push({
      role: "user",
      content:
        `I asked you to create a journal entry. You have drafted one titled "${draft.title}". ` +
        `Briefly confirm this to me in one warm sentence, mentioning the title.`,
    });
  } else {
    // Normal RAG chat: embed query and find similar entries
    const queryVec = await embedText(message, embedModel, baseUrl);
    const vecLiteral = `[${queryVec.join(",")}]`;

    const rows = await prisma.$queryRaw<EntryRow[]>`
      SELECT id, "entryDate", title, body
      FROM "Entry"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vecLiteral}::vector
      LIMIT 5
    `;

    const contextParts = rows.map((r) => {
      const date = r.entryDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const title = r.title ? decryptString(r.title, dek) : null;
      const body = decryptString(r.body, dek);
      const snippet = body.length > 800 ? body.slice(0, 800) + "…" : body;
      return title ? `[${date}] ${title}\n${snippet}` : `[${date}]\n${snippet}`;
    });

    const ragContext =
      contextParts.length > 0
        ? `Relevant journal entries:\n\n${contextParts.join("\n\n---\n\n")}`
        : "";

    messages.push({
      role: "user",
      content: ragContext
        ? `${ragContext}\n\nQuestion: ${message.trim()}`
        : message.trim(),
    });
  }

  // ── Stream response ─────────────────────────────────────────────────────
  let fullResponse = "";
  const currentSessionId = session.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const token of chatStream(messages, model, baseUrl, AbortSignal.timeout(3 * 60 * 1000))) {
          fullResponse += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        const errMsg = `\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`;
        fullResponse += errMsg;
        controller.enqueue(encoder.encode(errMsg));
      } finally {
        controller.close();
        if (fullResponse.trim()) {
          prisma.chatMessage
            .create({
              data: {
                sessionId: currentSessionId,
                role: "assistant",
                content: encryptString(fullResponse, dek),
              },
            })
            .then(() =>
              prisma.chatSession.update({
                where: { id: currentSessionId },
                data: { updatedAt: new Date() },
              }),
            )
            .catch(() => {});
        }
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "X-Accel-Buffering": "no",
    "X-Session-Id": currentSessionId,
  };
  if (entryDraftHeader) {
    headers["X-Entry-Draft"] = entryDraftHeader;
  }

  return new Response(stream, { headers });
}
