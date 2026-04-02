/**
 * Reads AI configuration from AppSettings, falling back to env var defaults.
 * Call getOllamaConfig() in every AI route to pick up user-saved preferences.
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_EMBED_MODEL,
} from "@/lib/ollama";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
export { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  systemPrompt: string;
}

export async function getOllamaConfig(): Promise<OllamaConfig> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: {
      ollamaBaseUrl: true,
      ollamaModel: true,
      ollamaEmbedModel: true,
      chatSystemPrompt: true,
    },
  });
  return {
    baseUrl: settings?.ollamaBaseUrl || DEFAULT_BASE_URL(),
    model: settings?.ollamaModel || DEFAULT_MODEL(),
    embedModel: settings?.ollamaEmbedModel || DEFAULT_EMBED_MODEL(),
    systemPrompt: settings?.chatSystemPrompt || DEFAULT_SYSTEM_PROMPT,
  };
}

/** Backward-compatible alias used by routes that only need model names. */
export async function getAiModels(): Promise<{
  model: string;
  embedModel: string;
}> {
  const { model, embedModel } = await getOllamaConfig();
  return { model, embedModel };
}
