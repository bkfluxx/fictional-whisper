/**
 * POST /api/ai/prompt
 * Body: { category?: string }
 *
 * Returns 3 short writing prompts tailored to the given category.
 * If no category is provided, returns general journaling prompts.
 *
 * Returns: { prompts: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { isOllamaAvailable, generateText } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { baseUrl, model, systemPrompt } = await getOllamaConfig();
  if (!(await isOllamaAvailable(baseUrl))) {
    return NextResponse.json({ error: "Ollama is not available" }, { status: 503 });
  }

  const { category } = (await req.json()) as { category?: string };
  const typeLabel = category ? `${category} journal` : "personal journal";

  const raw = await generateText(
    `Give me exactly 3 short journaling prompts for a ${typeLabel}. ` +
      `Return only the 3 prompts as a numbered list (1. ... 2. ... 3. ...). ` +
      `No intro, no outro, no extra text.`,
    systemPrompt,
    model,
    baseUrl,
  );

  // Parse numbered list — handle "1. ", "1) ", "1 " etc.
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  const prompts = lines.slice(0, 3);

  return NextResponse.json({ prompts });
}
