/**
 * POST /api/ai/warmup
 *
 * Fires minimal requests to pre-load both Ollama models into memory:
 *   - nomic-embed-text  (used before every chat message)
 *   - the configured LLM (used for chat, analysis, prompts)
 *
 * Called once per browser session from the app layout.
 * The client fires-and-forgets; this handler awaits the Ollama calls
 * so they complete even if the client navigates away before the
 * response arrives.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isOllamaAvailable, embedText } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { baseUrl, model, embedModel } = await getOllamaConfig();
  if (!(await isOllamaAvailable(baseUrl))) {
    return NextResponse.json({ ok: false, reason: "ollama_unavailable" });
  }

  // Fire both model loads as background tasks — respond immediately so that
  // real chat requests are never queued behind the warmup.
  // In Node.js (self-hosted), promises continue after the response is sent.
  embedText("warmup", embedModel, baseUrl).catch(() => {});

  fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "hi",
      stream: false,
      options: { num_predict: 1 },
    }),
    signal: AbortSignal.timeout(120_000),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
