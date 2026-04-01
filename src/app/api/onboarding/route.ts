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
    customTemplate,
  } = body as {
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    ollamaEmbedModel?: string;
    userName?: string;
    journalingIntention?: string[];
    writingStyle?: string;
    customTemplate?: { title: string; emoji: string; body: string };
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

  // Save AI-generated custom template if one was produced
  if (customTemplate?.title && customTemplate?.body) {
    await prisma.journalTemplate.create({
      data: {
        title: customTemplate.title,
        emoji: customTemplate.emoji ?? "📝",
        body: customTemplate.body,
        description: "Created for you during setup",
        categories: [],
      },
    });
  }

  return NextResponse.json({ ok: true });
}
