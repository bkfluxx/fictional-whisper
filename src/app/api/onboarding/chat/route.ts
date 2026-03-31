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

const WHISPER_SYSTEM_PROMPT = `You are Whisper, a warm and encouraging personal journaling assistant built into the Fictional Whisper app.

You are guiding a new user through onboarding via a friendly conversation. Follow this script closely but keep responses concise and natural (2-4 sentences max per message).

Onboarding script:
1. Greet the user warmly and ask for their name.
2. Once you have their name, use it naturally. Briefly describe Fictional Whisper in 2 sentences: it's a private, encrypted journal where all data stays on their device — they can write freely, track moods, set categories, browse their history by calendar, search semantically, and get AI-powered insights. Then ask what brings them to journaling (offer options: self-reflection, stress relief, creative writing, gratitude practice, habit tracking — or something else).
3. Once they share their intention, acknowledge it warmly. Ask whether they prefer structured prompts (templates with questions to answer) or a blank page to free-write.
4. Based on their answers, offer a brief personalised first-entry prompt they could use right now (e.g. for gratitude: "What's one small thing that made you smile today?"). Then say they're all set and can head to their journal.

Rules:
- Never make up facts about the app beyond what's listed above.
- If the user goes off-script, gently bring the conversation back to onboarding.
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

      try {
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: WHISPER_SYSTEM_PROMPT },
              ...messages,
            ],
            stream: true,
            think: false, // disable thinking mode (qwen3/deepseek-r1 series)
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (!res.ok || !res.body) {
          send({ error: `Ollama chat failed (${res.status})` });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let thinkDepth = 0; // track whether we're inside a <think> block

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
                message?: { content?: string };
                done?: boolean;
              };
              if (obj.message?.content) {
                let token = obj.message.content;
                // Strip thinking-mode tokens (<think>...</think>) emitted by
                // qwen3/deepseek-r1 series even when think:false is requested
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
