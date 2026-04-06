import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/** PATCH /api/goals/[id] — update title, notes, status, or targetDate */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const { id } = await params;
  const { title, notes, status, targetDate } = (await req.json()) as {
    title?: string;
    notes?: string;
    status?: string;
    targetDate?: string | null;
  };

  const VALID_STATUSES = new Set(["active", "completed", "paused"]);

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: encryptString(title.trim(), dek) } : {}),
      ...(notes !== undefined
        ? { notes: notes.trim() ? encryptString(notes.trim(), dek) : null }
        : {}),
      ...(status !== undefined && VALID_STATUSES.has(status) ? { status } : {}),
      ...(targetDate !== undefined
        ? { targetDate: targetDate ? new Date(targetDate) : null }
        : {}),
    },
  });

  return NextResponse.json({
    id: goal.id,
    title: title !== undefined ? title.trim() : decryptString(goal.title, dek),
    notes: notes !== undefined
      ? (notes.trim() || null)
      : goal.notes ? decryptString(goal.notes, dek) : null,
    status: goal.status,
    targetDate: goal.targetDate?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  });
}

/** DELETE /api/goals/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { id } = await params;
  await prisma.goal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
