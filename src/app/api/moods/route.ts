import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOOD_GROUPS } from "@/lib/moods";

const VALID_GROUP_IDS = new Set(MOOD_GROUPS.map((g) => g.id));

/** GET /api/moods — list all custom emotions */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emotions = await prisma.customEmotion.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(emotions);
}

/** POST /api/moods — create a custom emotion */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const label = (body?.label ?? "").trim();
  const groupId = body?.groupId ?? "";

  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!VALID_GROUP_IDS.has(groupId)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  if (label.length > 30) return NextResponse.json({ error: "Label too long" }, { status: 400 });

  // Derive a unique value slug from the label
  const baseValue = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  let value = baseValue;
  let suffix = 2;
  while (await prisma.customEmotion.findUnique({ where: { value } })) {
    value = `${baseValue}${suffix++}`;
  }

  const emotion = await prisma.customEmotion.create({
    data: { label, value, groupId },
  });
  return NextResponse.json(emotion, { status: 201 });
}
