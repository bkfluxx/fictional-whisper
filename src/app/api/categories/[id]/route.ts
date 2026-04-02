import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, emoji, description } = (await req.json()) as {
    name?: string;
    emoji?: string;
    description?: string;
  };

  const category = await prisma.userCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(emoji !== undefined ? { emoji: emoji.trim() || "📝" } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.userCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
