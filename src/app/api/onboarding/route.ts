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
  const {
    ollamaBaseUrl,
    ollamaModel,
    ollamaEmbedModel,
    userName,
    journalingIntention,
    writingStyle,
  } = body as {
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    ollamaEmbedModel?: string;
    userName?: string;
    journalingIntention?: string[];
    writingStyle?: string;
  };

  const fields = {
    ...(ollamaBaseUrl !== undefined ? { ollamaBaseUrl } : {}),
    ...(ollamaModel ? { ollamaModel } : {}),
    ...(ollamaEmbedModel ? { ollamaEmbedModel } : {}),
    ...(userName ? { userName } : {}),
    ...(journalingIntention ? { journalingIntention } : {}),
    ...(writingStyle ? { writingStyle } : {}),
  };

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { onboardingDone: true, ...fields },
    create: { id: "singleton", onboardingDone: true, ...fields },
  });

  return NextResponse.json({ ok: true });
}
