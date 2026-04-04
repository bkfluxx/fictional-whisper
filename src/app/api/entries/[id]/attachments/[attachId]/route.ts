import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { aesDecrypt } from "@/lib/crypto/aes";

type Params = { params: Promise<{ id: string; attachId: string }> };

/** GET /api/entries/[id]/attachments/[attachId] — decrypt and stream audio */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;
  const { id, attachId } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id: attachId } });
  if (!attachment || attachment.entryId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const plain = aesDecrypt(Buffer.from(attachment.data), dek);

  return new NextResponse(new Uint8Array(plain), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(plain.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}

/** DELETE /api/entries/[id]/attachments/[attachId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { id, attachId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachId },
    select: { entryId: true },
  });

  if (!attachment || attachment.entryId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id: attachId } });
  return NextResponse.json({ ok: true });
}
