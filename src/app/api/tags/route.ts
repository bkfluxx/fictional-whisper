import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/** GET /api/tags — all tags with entry counts */
export async function GET() {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { entries: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    tags.map((t) => ({ id: t.id, name: t.name, count: t._count.entries })),
  );
}
