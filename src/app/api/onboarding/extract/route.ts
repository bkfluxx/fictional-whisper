/**
 * POST /api/onboarding/extract
 *
 * Calls Ollama with a structured JSON extraction prompt to parse a user's
 * onboarding conversation into a typed profile. Used by WhisperChatStep
 * instead of the heuristic keyword extractor.
 *
 * When the user's stated purpose doesn't match any predefined journaling
 * category, a second AI call generates a custom template from the conversation.
 *
 * Body: { messages: Message[], ollamaUrl: string, model: string }
 * Response: { userName?, journalingIntention?, writingStyle?, customTemplate? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export interface CustomTemplate {
  title: string;
  emoji: string;
  body: string; // HTML
}

export interface ExtractedProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
  customTemplate?: CustomTemplate;
}

async function ollamaJson(
  ollamaUrl: string,
  model: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      think: false,
      format: "json",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama failed (${res.status})`);
  const data = (await res.json()) as { message?: { content?: string } };
  return JSON.parse(data.message?.content ?? "{}");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, ollamaUrl, model, step } = (await req.json()) as {
    messages: Message[];
    ollamaUrl: string;
    model: string;
    /** "profile" = step 1 only; "template" = step 2 only; omit = both */
    step?: "profile" | "template";
  };

  if (!ollamaUrl || !model || !messages?.length) {
    return NextResponse.json(
      { error: "ollamaUrl, model, and messages required" },
      { status: 400 },
    );
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Aura"}: ${m.content}`)
    .join("\n");

  try {
    // ── Step 2 only: generate custom template ───────────────────────────────
    if (step === "template") {
      const generated = await ollamaJson(
        ollamaUrl,
        model,
        `You are a journaling template designer. Based on the following conversation, design a simple journaling template tailored to the user's specific needs.

CONVERSATION:
${transcript}

Return ONLY a JSON object with these fields:
- "title": string — a short, descriptive template name (e.g. "Recipe Log", "Bookmark & Notes")
- "emoji": string — a single relevant emoji
- "sections": array of strings — 3 to 5 section heading names that make sense for this template (e.g. ["Recipe name", "Ingredients", "Method", "Notes"])

Respond with ONLY valid JSON. No explanation, no markdown, no code fences. Example:
{"title":"Recipe Log","emoji":"🍳","sections":["Recipe name","Why I love it","Key ingredients","Tips & variations"]}`,
      );

      const title =
        typeof generated.title === "string" && generated.title.trim()
          ? generated.title.trim()
          : "My Custom Template";
      const emoji =
        typeof generated.emoji === "string" && generated.emoji.trim()
          ? generated.emoji.trim()
          : "📝";
      const rawSections = Array.isArray(generated.sections) ? generated.sections : [];
      const sections = rawSections
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 6);
      const body = sections.length > 0 ? sections.map((s) => `<h2>${s}</h2><p></p>`).join("") : "";

      if (sections.length === 0) {
        return NextResponse.json({ customTemplate: null });
      }

      const category = await prisma.userCategory.create({
        data: { name: title, emoji },
      });

      return NextResponse.json({
        customTemplate: { title, emoji, body },
        categoryId: category.id,
      });
    }

    // ── Step 1: Extract structured profile ──────────────────────────────────
    const extracted = await ollamaJson(
      ollamaUrl,
      model,
      `You are a data extraction assistant. Read the following onboarding conversation between a user and Aura (a journaling app assistant), then extract structured information about the user.

CONVERSATION:
${transcript}

Extract and return ONLY a JSON object with these fields (omit any field you cannot confidently determine):
- "userName": string — the name or nickname the user gave
- "journalingIntention": array of strings — pick ONLY from these exact values that genuinely match what the user said they want to use the journal for: ${VALID_INTENTIONS.join(", ")}. If the user's stated purpose does not match any of these (e.g. storing recipes, collecting bookmarks, work tasks), return an empty array.
- "writingStyle": string — either "prompts" (user wants guided prompts/templates) or "blank" (user prefers free writing), or omit if unclear

Respond with ONLY valid JSON. No explanation, no markdown, no code fences. Example:
{"userName":"Alice","journalingIntention":["self-reflection","gratitude"],"writingStyle":"prompts"}`,
    );

    const profile: ExtractedProfile = {};

    if (typeof extracted.userName === "string" && extracted.userName.trim()) {
      profile.userName = extracted.userName.trim();
    }

    if (Array.isArray(extracted.journalingIntention)) {
      const valid = (extracted.journalingIntention as unknown[]).filter(
        (v): v is string => typeof v === "string" && VALID_INTENTIONS.includes(v),
      );
      if (valid.length > 0) profile.journalingIntention = valid;
    }

    if (
      typeof extracted.writingStyle === "string" &&
      VALID_STYLES.includes(extracted.writingStyle)
    ) {
      profile.writingStyle = extracted.writingStyle;
    }

    const needsTemplate =
      !profile.journalingIntention || profile.journalingIntention.length === 0;

    // When called as step 1, return profile + whether a template step is needed.
    // When called without a step (legacy / fallback), run step 2 inline.
    if (step === "profile") {
      return NextResponse.json({ ...profile, needsTemplate });
    }

    // ── Legacy: both steps in one call ──────────────────────────────────────
    if (needsTemplate) {
      const generated = await ollamaJson(
        ollamaUrl,
        model,
        `You are a journaling template designer. Based on the following conversation, design a simple journaling template tailored to the user's specific needs.

CONVERSATION:
${transcript}

Return ONLY a JSON object with these fields:
- "title": string — a short, descriptive template name (e.g. "Recipe Log", "Bookmark & Notes")
- "emoji": string — a single relevant emoji
- "sections": array of strings — 3 to 5 section heading names that make sense for this template (e.g. ["Recipe name", "Ingredients", "Method", "Notes"])

Respond with ONLY valid JSON. No explanation, no markdown, no code fences. Example:
{"title":"Recipe Log","emoji":"🍳","sections":["Recipe name","Why I love it","Key ingredients","Tips & variations"]}`,
      );

      const title =
        typeof generated.title === "string" && generated.title.trim()
          ? generated.title.trim()
          : "My Custom Template";
      const emoji =
        typeof generated.emoji === "string" && generated.emoji.trim()
          ? generated.emoji.trim()
          : "📝";
      const rawSections = Array.isArray(generated.sections) ? generated.sections : [];
      const sections = rawSections
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 6);
      if (sections.length > 0) {
        const category = await prisma.userCategory.create({
          data: { name: title, emoji },
        });
        profile.customTemplate = {
          title,
          emoji,
          body: sections.map((s) => `<h2>${s}</h2><p></p>`).join(""),
        };
        (profile as Record<string, unknown>).categoryId = category.id;
      }
    }

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
