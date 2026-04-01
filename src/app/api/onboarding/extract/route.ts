/**
 * POST /api/onboarding/extract
 *
 * Calls Ollama with a structured JSON extraction prompt to parse a user's
 * onboarding conversation into a typed profile. Used by WhisperChatStep
 * instead of the heuristic keyword extractor.
 *
 * Body: { messages: Message[], ollamaUrl: string, model: string }
 * Response: { userName?, journalingIntention?, writingStyle? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VALID_INTENTIONS = [
  "self-reflection",
  "stress-relief",
  "creative-writing",
  "gratitude",
  "habit-tracking",
];

const VALID_STYLES = ["prompts", "blank"];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, ollamaUrl, model } = (await req.json()) as {
    messages: Message[];
    ollamaUrl: string;
    model: string;
  };

  if (!ollamaUrl || !model || !messages?.length) {
    return NextResponse.json(
      { error: "ollamaUrl, model, and messages required" },
      { status: 400 },
    );
  }

  // Build a plain-text transcript for the extraction prompt
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Whisper"}: ${m.content}`)
    .join("\n");

  const extractionPrompt = `You are a data extraction assistant. Read the following onboarding conversation between a user and Whisper (a journaling app assistant), then extract structured information about the user.

CONVERSATION:
${transcript}

Extract and return ONLY a JSON object with these fields (omit any field you cannot confidently determine):
- "userName": string — the name or nickname the user gave
- "journalingIntention": array of strings — pick ONLY from these exact values that genuinely match what the user said they want to use the journal for: ${VALID_INTENTIONS.join(", ")}. If the user's stated purpose does not match any of these (e.g. storing recipes, work tasks), return an empty array.
- "writingStyle": string — either "prompts" (user wants guided prompts/templates) or "blank" (user prefers free writing), or omit if unclear

Respond with ONLY valid JSON. No explanation, no markdown, no code fences. Example:
{"userName":"Alice","journalingIntention":["self-reflection","gratitude"],"writingStyle":"prompts"}`;

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: extractionPrompt }],
        stream: false,
        think: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Ollama failed (${res.status})` }, { status: 502 });
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const raw = data.message?.content ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    const profile: ExtractedProfile = {};

    if (typeof parsed.userName === "string" && parsed.userName.trim()) {
      profile.userName = parsed.userName.trim();
    }

    if (Array.isArray(parsed.journalingIntention)) {
      const valid = (parsed.journalingIntention as unknown[])
        .filter((v): v is string => typeof v === "string" && VALID_INTENTIONS.includes(v));
      if (valid.length > 0) profile.journalingIntention = valid;
    }

    if (
      typeof parsed.writingStyle === "string" &&
      VALID_STYLES.includes(parsed.writingStyle)
    ) {
      profile.writingStyle = parsed.writingStyle;
    }

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
