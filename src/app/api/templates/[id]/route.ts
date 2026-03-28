import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/** DELETE /api/templates/[id] — delete a user-created template */
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
