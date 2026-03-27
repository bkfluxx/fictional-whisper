/**
 * GET /api/ai/search?q=<query>&limit=<n>
 *
 * Embeds the query and returns the top `limit` (default 8) most semantically
 * similar entries, ordered by cosine distance (closest first).
 *
 * Returns the same EntryStub shape as GET /api/entries so the existing search
 * UI can render results without changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { isOllamaAvailable, embedText } from "@/lib/ollama";
import { getOllamaConfig } from "@/lib/ai/config";
import type { EntryStub } from "@/types/entry";

interface RawRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  entryDate: Date;
  title: string | null;
  mood: string | null;
  categories: string[];
}

export async function GET(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const { baseUrl, embedModel } = await getOllamaConfig();
  if (!(await isOllamaAvailable(baseUrl))) {
    return NextResponse.json({ error: "Ollama is not available" }, { status: 503 });
  }

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "8", 10),
    20,
  );

  const queryVec = await embedText(q, embedModel, baseUrl);
  const vecLiteral = `[${queryVec.join(",")}]`;

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT id, "createdAt", "updatedAt", "entryDate", title, mood, "categories"
    FROM "Entry"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLiteral}::vector
    LIMIT ${limit}
  `;

  // Fetch tags for the matched entries
  const ids = rows.map((r) => r.id);
  const tagMap = new Map<string, { id: string; name: string }[]>();
  if (ids.length) {
    const tagRows = await prisma.$queryRaw<
      { entryId: string; tagId: string; tagName: string }[]
    >`
      SELECT et."A" AS "entryId", t.id AS "tagId", t.name AS "tagName"
      FROM "_EntryTags" et
      JOIN "Tag" t ON t.id = et."B"
      WHERE et."A" = ANY(${ids})
    `;
    for (const row of tagRows) {
      if (!tagMap.has(row.entryId)) tagMap.set(row.entryId, []);
      tagMap.get(row.entryId)!.push({ id: row.tagId, name: row.tagName });
    }
  }

  const stubs: EntryStub[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    entryDate: r.entryDate.toISOString(),
    title: r.title ? decryptString(r.title, dek) : null,
    mood: r.mood,
    categories: r.categories,
    tags: tagMap.get(r.id) ?? [],
  }));

  return NextResponse.json(stubs);
}
