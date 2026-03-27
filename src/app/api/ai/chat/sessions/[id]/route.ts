/**
 * DELETE /api/ai/chat/sessions/[id] — delete a session and all its messages
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.chatSession.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chatSession.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
