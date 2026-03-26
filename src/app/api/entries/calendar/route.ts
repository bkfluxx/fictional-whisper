import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";

/**
 * GET /api/entries/calendar?year=YYYY&month=MM
 * Returns { [dateStr: string]: number } — entry counts per day.
 * No decryption needed — only queries entryDate.
 */
export async function GET(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;

  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1); // exclusive

  const entries = await prisma.entry.findMany({
    where: { entryDate: { gte: from, lt: to } },
    select: { entryDate: true },
    orderBy: { entryDate: "asc" },
  });

  const counts: Record<string, number> = {};
  for (const e of entries) {
    const key = e.entryDate.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return NextResponse.json(counts);
}
