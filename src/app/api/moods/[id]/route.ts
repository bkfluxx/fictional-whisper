import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/moods/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const emotion = await prisma.customEmotion.findUnique({ where: { id } });
  if (!emotion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customEmotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
