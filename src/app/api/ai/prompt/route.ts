/**
 * POST /api/ai/prompt
 * Body: { journalType?: string }
 *
 * Returns 3 short writing prompts tailored to the given journal type.
 * If no journal type is provided, returns general journaling prompts.
 *
 * Returns: { prompts: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { isOllamaAvailable, generateText } from "@/lib/ollama";
import { getJournalType } from "@/lib/journal-types";

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  if (!(await isOllamaAvailable())) {
    return NextResponse.json(
      { error: "Ollama is not available" },
      { status: 503 },
    );
  }

  const { journalType } = (await req.json()) as { journalType?: string };
  const typeDef = journalType ? getJournalType(journalType) : null;
  const typeLabel = typeDef
    ? `${typeDef.name} journal (${typeDef.description})`
    : "personal journal";

  const raw = await generateText(
    `Give me exactly 3 short journaling prompts for a ${typeLabel}. ` +
      `Return only the 3 prompts as a numbered list (1. ... 2. ... 3. ...). ` +
      `No intro, no outro, no extra text.`,
    "You are a thoughtful journaling coach. Keep prompts concise and personal.",
  );

  // Parse numbered list — handle "1. ", "1) ", "1 " etc.
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  const prompts = lines.slice(0, 3);

  return NextResponse.json({ prompts });
}
