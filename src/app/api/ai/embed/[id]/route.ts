/**
 * POST /api/ai/embed/[id]
 *
 * Generates a 768-dim embedding for the entry's plaintext body and stores
 * it in the pgvector `embedding` column.  Used by:
 *   - The AiPanel "Analyze" flow (called after analysis)
 *   - The fire-and-forget hook in the entries create/PATCH routes
 *
 * Returns: { ok: true, dims: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { isOllamaAvailable, embedText } from "@/lib/ollama";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  if (!(await isOllamaAvailable())) {
    return NextResponse.json(
      { error: "Ollama is not available" },
      { status: 503 },
    );
  }

  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const plain = decryptString(entry.body, dek);
  const vector = await embedText(plain);

  // pgvector expects the literal string "[n1,n2,...]"
  const vecLiteral = `[${vector.join(",")}]`;
  await prisma.$executeRaw`
    UPDATE "Entry"
    SET "embedding" = ${vecLiteral}::vector
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, dims: vector.length });
}
