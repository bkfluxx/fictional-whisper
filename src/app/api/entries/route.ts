import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { indexEntry } from "@/lib/search/hmac-index";
import { embedEntryText } from "@/lib/ai/embed";
import type { EntryPayload, EntryStub } from "@/types/entry";

/** GET /api/entries — list entries (stubs, no body) */
export async function GET(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { searchParams } = req.nextUrl;
  const tag = searchParams.get("tag");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const mood = searchParams.get("mood");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") === "updatedAt" ? "updatedAt" : "entryDate";

  const entries = await prisma.entry.findMany({
    where: {
      ...(tag ? { tags: { some: { name: tag } } } : {}),
      ...(mood ? { mood } : {}),
      ...(category ? { categories: { has: category } } : {}),
      ...(from || to
        ? {
            entryDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { [sort]: "desc" },
  });

  const stubs: EntryStub[] = entries.map((e) => ({
    id: e.id,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    entryDate: e.entryDate.toISOString(),
    title: e.title ? decryptString(e.title, dek) : null,
    mood: e.mood,
    categories: e.categories,
    tags: e.tags,
  }));

  return NextResponse.json(stubs);
}

/** POST /api/entries — create a new entry */
export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const body: EntryPayload = await req.json();
  if (!body.body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const inlineTags = extractInlineTags(body.body);
  const allTags = [...new Set([...(body.tags ?? []), ...inlineTags])];

  const entry = await prisma.entry.create({
    data: {
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      title: body.title ? encryptString(body.title, dek) : null,
      body: encryptString(body.body, dek),
      mood: body.mood ?? null,
      categories: body.categories ?? [],
      tags: {
        connectOrCreate: allTags.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
    include: { tags: { select: { id: true, name: true } } },
  });

  const plainBody = body.body;
  setImmediate(() => {
    indexEntry(entry.id, plainBody, process.env.SEARCH_HMAC_SECRET!).catch(
      console.error,
    );
    embedEntryText(entry.id, plainBody).catch(console.error);
  });

  return NextResponse.json(
    {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      entryDate: entry.entryDate.toISOString(),
      title: body.title ?? null,
      mood: entry.mood,
      categories: entry.categories,
      tags: entry.tags,
    },
    { status: 201 },
  );
}

function extractInlineTags(markdown: string): string[] {
  const matches = markdown.match(/#([a-zA-Z]\w*)/g) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}
