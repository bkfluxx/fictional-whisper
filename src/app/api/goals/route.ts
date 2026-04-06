import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/** GET /api/goals — list all goals, decrypted */
export async function GET() {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json(
    goals.map((g) => ({
      id: g.id,
      title: decryptString(g.title, dek),
      notes: g.notes ? decryptString(g.notes, dek) : null,
      status: g.status,
      targetDate: g.targetDate?.toISOString() ?? null,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
  );
}

/** POST /api/goals — create a goal */
export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { title, notes, targetDate } = (await req.json()) as {
    title?: string;
    notes?: string;
    targetDate?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      title: encryptString(title.trim(), dek),
      ...(notes?.trim() ? { notes: encryptString(notes.trim(), dek) } : {}),
      ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
    },
  });

  return NextResponse.json(
    {
      id: goal.id,
      title: title.trim(),
      notes: notes?.trim() ?? null,
      status: goal.status,
      targetDate: goal.targetDate?.toISOString() ?? null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
