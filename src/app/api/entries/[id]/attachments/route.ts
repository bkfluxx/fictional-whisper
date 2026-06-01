import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { aesEncrypt } from "@/lib/crypto/aes";
import { logger } from "@/lib/logger";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/** GET /api/entries/[id]/attachments — list metadata (no file data) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { id } = await params;

  const attachments = await prisma.attachment.findMany({
    where: { entryId: id },
    select: { id: true, filename: true, mimeType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(attachments);
}

/** POST /api/entries/[id]/attachments — upload, encrypt, store */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;
  const { id } = await params;

  const entry = await prisma.entry.findUnique({ where: { id }, select: { id: true } });
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  const image = formData.get("image");
  const fileBlob = audio instanceof Blob ? audio : image instanceof Blob ? image : null;
  const fileKind: "audio" | "image" = audio instanceof Blob ? "audio" : "image";

  if (!fileBlob) {
    return NextResponse.json({ error: "Missing audio or image field" }, { status: 400 });
  }

  if (fileBlob.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  if (fileKind === "image" && !fileBlob.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
  }

  try {
    const plain = Buffer.from(await fileBlob.arrayBuffer());
    const encrypted = aesEncrypt(plain, dek);

    let filename: string;
    const mimeType = fileBlob.type || (fileKind === "audio" ? "audio/webm" : "image/png");
    if (fileKind === "image") {
      const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
      filename = `image-${Date.now()}.${ext}`;
    } else {
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
      filename = `voice-note-${Date.now()}.${ext}`;
    }

    const attachment = await prisma.attachment.create({
      data: { entryId: id, filename, mimeType, data: encrypted },
      select: { id: true, filename: true, mimeType: true, createdAt: true },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    logger.error("Failed to save attachment", err);
    return NextResponse.json({ error: "Failed to save attachment" }, { status: 500 });
  }
}
