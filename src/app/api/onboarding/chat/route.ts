/**
 * POST /api/onboarding/chat
 *
 * Streams Whisper's onboarding conversation as Server-Sent Events.
 * Authenticated — requires active session (called after setup, before onboardingDone).
 *
 * Body: { messages: Array<{ role: "user"|"assistant"; content: string }>, ollamaUrl: string, model: string }
 *
 * SSE events:
 *   data: { token: string }
 *   data: { done: true }
 *   data: { error: string }
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const WHISPER_SYSTEM_PROMPT = `You are Aura, a warm and encouraging personal journaling assistant.

You are guiding a new user through onboarding via a friendly conversation. Follow this script closely but keep responses concise and natural (2-4 sentences max per message).

Onboarding script:
1. Greet the user warmly and ask for their name.
2. Once you have their name, use it naturally. Briefly describe Aura in 2 sentences: it's a private, encrypted journal where all data stays on their device — they can write freely, track moods, set categories, browse their history by calendar, search semantically, and get AI-powered insights. Aura can also create a custom journaling template tailored to any specific purpose the user describes — recipe logging, bookmark collecting, workout notes, anything. Then ask what brings them to journaling (offer options: self-reflection, stress relief, creative writing, gratitude practice, habit tracking — or something specific they have in mind).
3. Once they share their intention, acknowledge it warmly. If they mention a specific or unusual use case (e.g. logging recipes, tracking workouts, collecting bookmarks), tell them enthusiastically that Aura will create a custom template for exactly that. Ask whether they prefer structured prompts (templates with questions to answer) or a blank page to free-write.
4. Based on their answers, offer a brief personalised first-entry prompt they could use right now (e.g. for gratitude: "What's one small thing that made you smile today?", for recipes: "What dish are you excited to try this week?"). Then say they're all set and can head to their journal.

Rules:
- Never make up facts about the app beyond what's listed above.
- IMPORTANT: You are ONLY a journaling onboarding assistant. You cannot write code, tell jokes, or help with anything outside of guiding the user through this onboarding. If the user asks you to do anything not related to onboarding their journaling experience, politely decline and return to the onboarding question you last asked.
- If the user describes a specific journaling purpose that isn't in the standard list, treat it as valid and tell them Aura will set up a custom template for it.
- Do NOT advance to the next onboarding step unless the user has genuinely answered the current question. Treat off-topic or irrelevant replies as non-answers and repeat or rephrase your current question.
- Keep your tone warm, human, and never robotic.
- Do NOT use bullet points or headers in your responses — just natural prose.
- Always remember the user's name once they share it and use it occasionally.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, ollamaUrl, model } = (await req.json()) as {
    messages: Message[];
    ollamaUrl: string;
    model: string;
  };

  if (!ollamaUrl || !model || !messages?.length) {
    return new Response(JSON.stringify({ error: "ollamaUrl, model, and messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const buildBody = (withThink: boolean) => ({
        model,
        messages: [
          { role: "system", content: WHISPER_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        // Limit context to 4k — onboarding needs no more, and the default
        // 262k context on qwen3.5 requires a massive KV cache that causes
        // the model to stall for 2+ minutes before generating the first token.
        options: { num_ctx: 4096 },
        ...(withThink ? { think: false } : {}),
      });

      const makeRequest = async (withThink: boolean) =>
        fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(withThink)),
          signal: AbortSignal.timeout(300_000),
        });

      try {
        let res = await makeRequest(true);
        // Some non-thinking models reject the `think` param — retry without it
        if (res.status === 400) res = await makeRequest(false);

        if (!res.ok || !res.body) {
          send({ error: `Ollama chat failed (${res.status})` });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let thinkDepth = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line) as {
                message?: { content?: string; thinking?: string };
                done?: boolean;
              };
              // Skip native thinking tokens (qwen3/deepseek via Ollama's thinking field)
              if (obj.message?.thinking) continue;
              if (obj.message?.content) {
                const token = obj.message.content;
                // Also strip inline <think>...</think> blocks for older model variants
                if (token.includes("<think>")) { thinkDepth++; }
                if (thinkDepth > 0) {
                  if (token.includes("</think>")) { thinkDepth--; }
                } else {
                  if (token) send({ token });
                }
              }
              if (obj.done) {
                send({ done: true });
                controller.close();
                return;
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        send({ done: true });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Chat failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
