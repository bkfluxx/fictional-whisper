/**
 * AI model management endpoints.
 *
 * GET  /api/ai/models
 *   Returns the list of models pulled in Ollama plus the currently saved preferences.
 *   Response: { available: boolean, models: OllamaModelInfo[], selected: { model, embedModel } }
 *
 * PATCH /api/ai/models
 *   Body: { model?: string, embedModel?: string }
 *   Saves the selected model preferences to AppSettings.
 *   Pass null/empty string to revert a field to the env-var default.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { isOllamaAvailable, listModels } from "@/lib/ollama";
import { getAiModels } from "@/lib/ai/config";

export async function GET(_req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const available = await isOllamaAvailable();
  const models = available ? await listModels().catch(() => []) : [];
  const selected = await getAiModels();

  return NextResponse.json({ available, models, selected });
}

export async function PATCH(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const body = (await req.json()) as {
    model?: string | null;
    embedModel?: string | null;
  };

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ollamaModel: body.model || null,
      ollamaEmbedModel: body.embedModel || null,
    },
    update: {
      ...(body.model !== undefined ? { ollamaModel: body.model || null } : {}),
      ...(body.embedModel !== undefined
        ? { ollamaEmbedModel: body.embedModel || null }
        : {}),
    },
  });

  const selected = await getAiModels();
  return NextResponse.json({ selected });
}
