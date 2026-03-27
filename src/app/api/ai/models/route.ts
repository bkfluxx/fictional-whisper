/**
 * AI model management endpoints.
 *
 * GET  /api/ai/models[?url=<baseUrl>]
 *   Returns available models + saved preferences.
 *   Optional `url` param tests an alternate base URL (used during onboarding
 *   before the URL has been saved).
 *
 * PATCH /api/ai/models
 *   Body: { baseUrl?, model?, embedModel? }
 *   Saves AI config to AppSettings. Pass null/empty to revert to env defaults.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { isOllamaAvailable, listModels } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";

export async function GET(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  // Optional: test a specific URL (used during onboarding before saving)
  const testUrl = req.nextUrl.searchParams.get("url") ?? undefined;
  const config = await getOllamaConfig();
  const resolvedUrl = testUrl ?? config.baseUrl;

  const available = await isOllamaAvailable(resolvedUrl);
  const models = available ? await listModels(resolvedUrl).catch(() => []) : [];

  return NextResponse.json({
    available,
    models,
    selected: {
      baseUrl: config.baseUrl,
      model: config.model,
      embedModel: config.embedModel,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const body = (await req.json()) as {
    baseUrl?: string | null;
    model?: string | null;
    embedModel?: string | null;
  };

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ollamaBaseUrl: body.baseUrl || null,
      ollamaModel: body.model || null,
      ollamaEmbedModel: body.embedModel || null,
    },
    update: {
      ...(body.baseUrl !== undefined
        ? { ollamaBaseUrl: body.baseUrl || null }
        : {}),
      ...(body.model !== undefined ? { ollamaModel: body.model || null } : {}),
      ...(body.embedModel !== undefined
        ? { ollamaEmbedModel: body.embedModel || null }
        : {}),
    },
  });

  const config = await getOllamaConfig();
  return NextResponse.json({ selected: config });
}
