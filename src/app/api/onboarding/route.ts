import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ollamaBaseUrl } = body as { ollamaBaseUrl?: string };

  const aiFields = ollamaBaseUrl ? { ollamaBaseUrl } : {};
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { onboardingDone: true, ...aiFields },
    create: { id: "singleton", onboardingDone: true, ...aiFields },
  });

  return NextResponse.json({ ok: true });
}
