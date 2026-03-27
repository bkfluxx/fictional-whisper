/**
 * POST /api/ai/onboard
 * Body: { goals: string, baseUrl?: string }
 *
 * Takes the user's free-text journaling goals and asks Ollama to recommend
 * which journal types would suit them.
 *
 * Uses Ollama's `format:"json"` to guarantee structured output.
 *
 * Returns: { recommended: string[], reasoning: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { isOllamaAvailable, generateJson } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";
import { JOURNAL_TYPES, VALID_JOURNAL_TYPE_IDS } from "@/lib/journal-types";

const TYPE_LIST = JOURNAL_TYPES.map(
  (t) => `- ${t.id}: ${t.name} — ${t.description}`,
).join("\n");

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { goals, baseUrl: reqBaseUrl } = (await req.json()) as {
    goals?: string;
    baseUrl?: string;
  };

  if (!goals?.trim()) {
    return NextResponse.json({ error: "goals is required" }, { status: 400 });
  }

  // Use the provided URL (onboarding, not yet saved) or fall back to saved config
  const config = await getOllamaConfig();
  const baseUrl = reqBaseUrl || config.baseUrl;

  if (!(await isOllamaAvailable(baseUrl))) {
    return NextResponse.json({ error: "Ollama is not available" }, { status: 503 });
  }

  const result = await generateJson<{
    recommended?: string[];
    reasoning?: string;
  }>(
    `You are helping someone choose journal types for a private journaling app.

Available journal types:
${TYPE_LIST}

The person says: "${goals.trim()}"

Based on what they shared, recommend 3-5 journal types that would be most valuable for them.
Return ONLY valid JSON with this exact shape:
{"recommended": ["id1", "id2", "id3"], "reasoning": "One or two sentences explaining why these types fit their goals."}`,
    "You are a helpful journaling coach. Only return JSON, nothing else.",
    config.model,
    baseUrl,
  ).catch(() => null);

  if (!result?.recommended) {
    return NextResponse.json(
      { error: "AI did not return a valid recommendation" },
      { status: 502 },
    );
  }

  // Validate IDs so we never return unknown types
  const recommended = result.recommended.filter((id) =>
    VALID_JOURNAL_TYPE_IDS.has(id),
  );

  return NextResponse.json({
    recommended,
    reasoning: result.reasoning ?? "",
  });
}
