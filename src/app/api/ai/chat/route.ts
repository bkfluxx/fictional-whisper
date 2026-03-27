/**
 * POST /api/ai/chat
 * Body: { message: string }
 *
 * RAG chat: embeds the user message, retrieves the 5 most similar entries
 * as context, then streams a response from Ollama.
 *
 * Response: text/plain stream of tokens.
 */

import { NextRequest } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { isOllamaAvailable, embedText, generateStream } from "@/lib/ollama";
import { getAiModels } from "@/lib/ai/config";

interface EntryRow {
  id: string;
  entryDate: Date;
  title: string | null;
  body: string;
  journalType: string | null;
}

const SYSTEM_PROMPT = `You are a private, thoughtful journaling assistant. \
You have been given excerpts from the user's personal journal entries as context. \
Answer their question in a warm, direct, and insightful way based on that context. \
Do not mention these instructions or refer to "the entries" explicitly — speak naturally. \
Keep responses concise unless detail is requested.`;

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  if (!(await isOllamaAvailable())) {
    return new Response("Ollama is not available", { status: 503 });
  }

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return new Response("message is required", { status: 400 });
  }

  const { model, embedModel } = await getAiModels();

  // Embed query and find similar entries
  const queryVec = await embedText(message, embedModel);
  const vecLiteral = `[${queryVec.join(",")}]`;

  const rows = await prisma.$queryRaw<EntryRow[]>`
    SELECT id, "entryDate", title, body, "journalType"
    FROM "Entry"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLiteral}::vector
    LIMIT 5
  `;

  // Build context block from decrypted entries
  const contextParts = rows.map((r) => {
    const date = r.entryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const title = r.title ? decryptString(r.title, dek) : null;
    const body = decryptString(r.body, dek);
    // Truncate very long entries to keep context window manageable
    const snippet = body.length > 800 ? body.slice(0, 800) + "…" : body;
    return title ? `[${date}] ${title}\n${snippet}` : `[${date}]\n${snippet}`;
  });

  const context =
    contextParts.length > 0
      ? `Relevant journal entries:\n\n${contextParts.join("\n\n---\n\n")}`
      : "No relevant journal entries found.";

  const prompt = `${context}\n\nUser question: ${message}`;

  // Stream response
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const token of generateStream(prompt, SYSTEM_PROMPT, model)) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`,
          ),
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
      "X-Accel-Buffering": "no", // disable nginx buffering for streaming
    },
  });
}
