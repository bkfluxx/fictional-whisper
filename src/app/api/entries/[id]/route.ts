import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { indexEntry, deleteEntryTokens } from "@/lib/search/hmac-index";
import { embedEntryText } from "@/lib/ai/embed";
import type { EntryPayload, DecryptedEntry } from "@/types/entry";

/** GET /api/entries/[id] — fetch and decrypt a single entry */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { tags: { select: { id: true, name: true } } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result: DecryptedEntry = {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    entryDate: entry.entryDate.toISOString(),
    title: entry.title ? decryptString(entry.title, dek) : null,
    body: decryptString(entry.body, dek),
    mood: entry.mood,
    categories: entry.categories,
    tags: entry.tags,
  };

  return NextResponse.json(result);
}

/** PATCH /api/entries/[id] — update an entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const body: Partial<EntryPayload> = await req.json();

  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inlineTags = body.body ? extractInlineTags(body.body) : [];
  const allTags = [...new Set([...(body.tags ?? []), ...inlineTags])];

  const updated = await prisma.entry.update({
    where: { id },
    data: {
      ...(body.entryDate ? { entryDate: new Date(body.entryDate) } : {}),
      ...(body.title !== undefined
        ? { title: body.title ? encryptString(body.title, dek) : null }
        : {}),
      ...(body.body !== undefined
        ? { body: encryptString(body.body, dek) }
        : {}),
      ...(body.mood !== undefined ? { mood: body.mood } : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
      ...(allTags.length > 0
        ? {
            tags: {
              set: [],
              connectOrCreate: allTags.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          }
        : {}),
    },
    include: { tags: { select: { id: true, name: true } } },
  });

  // Re-index search tokens and re-embed if body changed
  if (body.body !== undefined) {
    const plainBody = body.body!;
    setImmediate(async () => {
      await deleteEntryTokens(id);
      await indexEntry(id, plainBody, process.env.SEARCH_HMAC_SECRET!).catch(
        console.error,
      );
      await embedEntryText(id, plainBody).catch(console.error);
    });
  }

  return NextResponse.json({
    id: updated.id,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    entryDate: updated.entryDate.toISOString(),
    title:
      body.title !== undefined
        ? (body.title ?? null)
        : existing.title
          ? "(encrypted)"
          : null,
    mood: updated.mood,
    categories: updated.categories,
    tags: updated.tags,
  });
}

/** DELETE /api/entries/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  await prisma.entry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

function extractInlineTags(markdown: string): string[] {
  const matches = markdown.match(/#([a-zA-Z]\w*)/g) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}
