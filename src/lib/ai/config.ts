/**
 * Reads AI configuration from AppSettings, falling back to env var defaults.
 * Call getOllamaConfig() in every AI route to pick up user-saved preferences.
 *
 * When personas are enabled, the active persona's systemPrompt replaces the
 * default (or chatSystemPrompt override) across all AI surfaces.
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_EMBED_MODEL,
} from "@/lib/ollama";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { BUILT_IN_PERSONAS } from "@/lib/personas";
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
      personasEnabled: true,
      activePersonaId: true,
    },
  });

  // Resolve system prompt: active persona takes precedence when feature is enabled
  let systemPrompt = settings?.chatSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  if (settings?.personasEnabled && settings.activePersonaId) {
    const pid = settings.activePersonaId;
    if (pid.startsWith("builtin:")) {
      const builtin = BUILT_IN_PERSONAS.find((p) => p.id === pid);
      if (builtin) systemPrompt = builtin.systemPrompt;
    } else {
      const custom = await prisma.persona.findUnique({ where: { id: pid } });
      if (custom) systemPrompt = custom.systemPrompt;
    }
  }

  return {
    baseUrl: settings?.ollamaBaseUrl || DEFAULT_BASE_URL(),
    model: settings?.ollamaModel || DEFAULT_MODEL(),
    embedModel: settings?.ollamaEmbedModel || DEFAULT_EMBED_MODEL(),
    systemPrompt,
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
