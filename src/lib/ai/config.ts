/**
 * Reads AI model preferences from AppSettings, falling back to env vars.
 * Called by all AI API routes so user-selected models are used consistently.
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, DEFAULT_EMBED_MODEL } from "@/lib/ollama";

export interface AiModels {
  model: string;
  embedModel: string;
}

export async function getAiModels(): Promise<AiModels> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { ollamaModel: true, ollamaEmbedModel: true },
  });
  return {
    model: settings?.ollamaModel || DEFAULT_MODEL(),
    embedModel: settings?.ollamaEmbedModel || DEFAULT_EMBED_MODEL(),
  };
}
