/**
 * POST /api/ai/transcribe
 *
 * Accepts multipart/form-data with an `audio` field (Blob).
 * Forwards to a Whisper-compatible endpoint (whisperBaseUrl from AppSettings)
 * using the OpenAI-compatible POST /v1/audio/transcriptions format.
 *
 * Returns { transcript: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { whisperBaseUrl: true },
  });

  const whisperBaseUrl = settings?.whisperBaseUrl?.replace(/\/$/, "");
  if (!whisperBaseUrl) {
    return NextResponse.json(
      { error: "Whisper URL not configured. Set it in Settings → AI Settings." },
      { status: 422 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  const fwd = new FormData();
  fwd.append("file", audio, "recording.webm");
  fwd.append("model", "whisper-1");

  try {
    const res = await fetch(`${whisperBaseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      body: fwd,
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("Whisper transcription failed", new Error(`${res.status}: ${text}`));
      return NextResponse.json(
        { error: `Whisper returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json() as { text?: string };
    const transcript = (data.text ?? "").trim();
    return NextResponse.json({ transcript });
  } catch (err) {
    logger.error("Whisper transcription error", err);
    return NextResponse.json(
      { error: "Could not reach Whisper endpoint" },
      { status: 502 },
    );
  }
}
