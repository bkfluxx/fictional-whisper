/**
 * Shared embedding helper used by both the entries API routes (fire-and-forget)
 * and the POST /api/ai/embed/[id] route.
 *
 * Only runs when OLLAMA_BASE_URL is configured and Ollama responds.
 * All errors are swallowed so callers can fire-and-forget safely.
 */

import { prisma } from "@/lib/prisma";
import { isOllamaAvailable, embedText } from "@/lib/ollama";
import { getAiModels } from "./config";

/**
 * Embed `plainText` and store the vector for the given entry.
 * Silently no-ops if Ollama is unavailable.
 */
export async function embedEntryText(
  entryId: string,
  plainText: string,
): Promise<void> {
  if (!process.env.OLLAMA_BASE_URL) return;
  if (!(await isOllamaAvailable())) return;

  const { embedModel } = await getAiModels();
  const vector = await embedText(plainText, embedModel);
  const vecLiteral = `[${vector.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "Entry"
    SET "embedding" = ${vecLiteral}::vector
    WHERE id = ${entryId}
  `;
}
