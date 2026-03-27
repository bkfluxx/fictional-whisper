/**
 * GET /api/ai/chat/sessions/[id]/messages
 * Returns decrypted messages for a session, oldest first.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { id } = await params;
  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const messages = rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: decryptString(m.content, dek),
    createdAt: m.createdAt,
  }));

  return NextResponse.json(messages);
}
