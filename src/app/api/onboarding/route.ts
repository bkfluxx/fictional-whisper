import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VALID_JOURNAL_TYPE_IDS } from "@/lib/journal-types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { journalTypes, ollamaBaseUrl } = body as {
    journalTypes: unknown;
    ollamaBaseUrl?: string;
  };

  if (
    !Array.isArray(journalTypes) ||
    journalTypes.length === 0 ||
    journalTypes.some((id) => typeof id !== "string" || !VALID_JOURNAL_TYPE_IDS.has(id))
  ) {
    return NextResponse.json(
      { error: "journalTypes must be a non-empty array of valid type IDs" },
      { status: 400 },
    );
  }

  const aiFields = ollamaBaseUrl ? { ollamaBaseUrl } : {};
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { journalTypes, onboardingDone: true, ...aiFields },
    create: { id: "singleton", journalTypes, onboardingDone: true, ...aiFields },
  });

  return NextResponse.json({ ok: true });
}
