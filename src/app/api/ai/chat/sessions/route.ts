/**
 * GET  /api/ai/chat/sessions — list all sessions (newest first)
 * POST /api/ai/chat/sessions — create a new empty session (title required)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { title } = (await req.json()) as { title?: string };
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const session = await prisma.chatSession.create({
    data: { title: title.slice(0, 80) },
  });

  return NextResponse.json(session, { status: 201 });
}
