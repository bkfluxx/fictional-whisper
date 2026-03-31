/**
 * POST /api/ai/pull
 *
 * Streams Ollama pull progress back to the client as Server-Sent Events.
 * No auth required — used during onboarding before the user has a session.
 *
 * Body: { url: string; model: string }
 *
 * SSE events:
 *   data: { status, completed?, total%, digest? }
 *   data: { done: true }
 *   data: { error: string }
 */

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { url, model } = (await req.json()) as {
    url?: string;
    model?: string;
  };

  if (!url || !model) {
    return new Response(JSON.stringify({ error: "url and model required" }), {
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
        const res = await fetch(`${url}/api/pull`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, stream: true }),
          signal: AbortSignal.timeout(600_000), // 10 min max
        });

        if (!res.ok || !res.body) {
          send({ error: `Ollama pull failed (${res.status})` });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
                status?: string;
                completed?: number;
                total?: number;
                digest?: string;
              };
              const pct =
                obj.total && obj.completed
                  ? Math.round((obj.completed / obj.total) * 100)
                  : undefined;
              send({
                status: obj.status,
                ...(pct !== undefined ? { pct } : {}),
                ...(obj.digest ? { digest: obj.digest } : {}),
              });
            } catch {
              // skip malformed lines
            }
          }
        }

        send({ done: true });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Pull failed" });
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
