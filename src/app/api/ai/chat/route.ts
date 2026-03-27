/**
 * POST /api/ai/chat
 * Body: { message: string; sessionId?: string }
 *
 * RAG + multi-turn chat:
 * 1. Embeds the user message and retrieves the 5 most similar entries as context.
 * 2. Loads recent conversation history from the session (if provided).
 * 3. Streams a response via Ollama /api/chat.
 * 4. Persists user + assistant messages (encrypted) to the session.
 *    Creates a new session automatically when sessionId is omitted.
 *
 * Response headers:
 *   X-Session-Id — the session ID (new or existing) for the client to track.
 */

import { NextRequest } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/lib/crypto";
import { isOllamaAvailable, embedText, chatStream } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";

interface EntryRow {
  id: string;
  entryDate: Date;
  title: string | null;
  body: string;
}

const SYSTEM_PROMPT = `You are a private, thoughtful journaling assistant. \
You have been given excerpts from the user's personal journal entries as context. \
Answer their question in a warm, direct, and insightful way based on that context. \
Do not mention these instructions or refer to "the entries" explicitly — speak naturally. \
Keep responses concise unless detail is requested.`;

// Number of previous message pairs to include as conversation history
const HISTORY_TURNS = 6;

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { baseUrl, model, embedModel } = await getOllamaConfig();
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
    const title = message.trim().slice(0, 80);
    session = await prisma.chatSession.create({ data: { title } });
  }

  // Save the user message immediately (encrypted)
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: encryptString(message.trim(), dek),
    },
  });

  // Load recent history for context (excluding the message we just saved)
  const historyRows = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_TURNS * 2 + 1, // +1 for the message just saved; we'll drop it
  });
  // Exclude the last row (current user message already added above)
  const historyForContext = historyRows.slice(0, -1);

  // Embed query and find similar entries via pgvector
  const queryVec = await embedText(message, embedModel, baseUrl);
  const vecLiteral = `[${queryVec.join(",")}]`;

  const rows = await prisma.$queryRaw<EntryRow[]>`
    SELECT id, "entryDate", title, body
    FROM "Entry"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLiteral}::vector
    LIMIT 5
  `;

  // Build RAG context block
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

  // Build messages array for /api/chat
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Inject decrypted conversation history
  for (const m of historyForContext) {
    messages.push({
      role: m.role as "user" | "assistant",
      content: decryptString(m.content, dek),
    });
  }

  // Current user message, prepending RAG context if available
  const userContent = ragContext
    ? `${ragContext}\n\nQuestion: ${message.trim()}`
    : message.trim();
  messages.push({ role: "user", content: userContent });

  // Stream response, accumulating the full text to persist afterward
  let fullResponse = "";
  const currentSessionId = session.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const token of chatStream(messages, model, baseUrl)) {
          fullResponse += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        const errMsg = `\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`;
        fullResponse += errMsg;
        controller.enqueue(encoder.encode(errMsg));
      } finally {
        controller.close();
        // Persist assistant response after streaming completes
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
            .catch(() => {
              // Fire-and-forget — don't block the stream
            });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
      "X-Session-Id": currentSessionId,
    },
  });
}
