import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/** PATCH /api/templates/[id] — update a user template or built-in override */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const existing = await prisma.journalTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, description, emoji, body, categories, hidden } =
    await req.json();

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) data.title = title?.trim() ?? existing.title;
  if (description !== undefined) data.description = description?.trim() || null;
  if (emoji !== undefined) data.emoji = emoji?.trim() || "📝";
  if (body !== undefined) data.body = body?.trim() ?? existing.body;
  if (categories !== undefined) data.categories = categories;
  if (hidden !== undefined) data.hidden = hidden;

  const updated = await prisma.journalTemplate.update({ where: { id }, data });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/templates/[id]
 * - User template: permanently deleted.
 * - Built-in override: deleted, restoring the original built-in.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const existing = await prisma.journalTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.journalTemplate.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
