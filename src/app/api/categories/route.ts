import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.userCategory.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, emoji, description, builtinId, hidden } = (await req.json()) as {
    name?: string;
    emoji?: string;
    description?: string;
    builtinId?: string;
    hidden?: boolean;
  };

  if (!name?.trim() && !builtinId) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // For built-in overrides: upsert by builtinId
  if (builtinId) {
    const category = await prisma.userCategory.upsert({
      where: { builtinId },
      update: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(emoji !== undefined ? { emoji: emoji.trim() || "📝" } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(hidden !== undefined ? { hidden } : {}),
      },
      create: {
        builtinId,
        name: name?.trim() ?? "",
        emoji: emoji?.trim() || "📝",
        description: description?.trim() || null,
        hidden: hidden ?? false,
      },
    });
    return NextResponse.json(category, { status: 200 });
  }

  const category = await prisma.userCategory.create({
    data: {
      name: name!.trim(),
      emoji: emoji?.trim() || "📝",
      description: description?.trim() || null,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
