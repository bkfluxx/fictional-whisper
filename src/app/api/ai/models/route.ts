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
import { isOllamaAvailable, listModels, getModelCapabilities } from "@/lib/ollama";
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

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { whisperBaseUrl: true, ollamaModelCapabilities: true, ollamaNumCtx: true },
  });

  // ?capabilities=<model> — returns capability list for a specific model
  // Used by the settings page when the user changes the dropdown before saving.
  const capModel = req.nextUrl.searchParams.get("capabilities");
  if (capModel) {
    const caps = available
      ? await getModelCapabilities(capModel, resolvedUrl)
      : [];
    return NextResponse.json({ capabilities: caps });
  }

  return NextResponse.json({
    available,
    models,
    selected: {
      baseUrl: config.baseUrl,
      model: config.model,
      embedModel: config.embedModel,
      systemPrompt: config.systemPrompt,
      whisperBaseUrl: settings?.whisperBaseUrl ?? "",
      numCtx: settings?.ollamaNumCtx ?? null,
      capabilities: settings?.ollamaModelCapabilities ?? [],
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
    numCtx?: number | null;
    systemPrompt?: string | null;
    whisperBaseUrl?: string | null;
  };

  // Fetch capabilities for the new model if one is being saved
  let capabilities: string[] | undefined;
  if (body.model) {
    const config = await getOllamaConfig();
    const baseUrl = body.baseUrl ?? config.baseUrl;
    capabilities = await getModelCapabilities(body.model, baseUrl);
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ollamaBaseUrl: body.baseUrl || null,
      ollamaModel: body.model || null,
      ollamaModelCapabilities: capabilities ?? [],
      ollamaEmbedModel: body.embedModel || null,
      ollamaNumCtx: body.numCtx ?? null,
      chatSystemPrompt: body.systemPrompt || null,
      whisperBaseUrl: body.whisperBaseUrl || null,
    },
    update: {
      ...(body.baseUrl !== undefined
        ? { ollamaBaseUrl: body.baseUrl || null }
        : {}),
      ...(body.model !== undefined ? { ollamaModel: body.model || null } : {}),
      ...(capabilities !== undefined
        ? { ollamaModelCapabilities: capabilities }
        : {}),
      ...(body.embedModel !== undefined
        ? { ollamaEmbedModel: body.embedModel || null }
        : {}),
      ...(body.numCtx !== undefined
        ? { ollamaNumCtx: body.numCtx ?? null }
        : {}),
      ...(body.systemPrompt !== undefined
        ? { chatSystemPrompt: body.systemPrompt || null }
        : {}),
      ...(body.whisperBaseUrl !== undefined
        ? { whisperBaseUrl: body.whisperBaseUrl || null }
        : {}),
    },
  });

  const updatedConfig = await getOllamaConfig();
  const updatedSettings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { ollamaModelCapabilities: true },
  });
  return NextResponse.json({
    selected: {
      baseUrl: updatedConfig.baseUrl,
      model: updatedConfig.model,
      embedModel: updatedConfig.embedModel,
      systemPrompt: updatedConfig.systemPrompt,
      capabilities: updatedSettings?.ollamaModelCapabilities ?? [],
    },
  });
}
