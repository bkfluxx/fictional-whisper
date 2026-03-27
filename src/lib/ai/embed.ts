/**
 * Shared embedding helper used by the entries API routes (fire-and-forget)
 * and the POST /api/ai/embed/[id] route.
 *
 * Silently no-ops if Ollama is unreachable.
 */

import { prisma } from "@/lib/prisma";
import { isOllamaAvailable, embedText } from "@/lib/ollama";
import { getOllamaConfig } from "./config";

export async function embedEntryText(
  entryId: string,
  plainText: string,
): Promise<void> {
  const config = await getOllamaConfig();
  if (!(await isOllamaAvailable(config.baseUrl))) return;

  const vector = await embedText(plainText, config.embedModel, config.baseUrl);
  const vecLiteral = `[${vector.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "Entry"
    SET "embedding" = ${vecLiteral}::vector
    WHERE id = ${entryId}
  `;
}
