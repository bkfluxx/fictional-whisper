import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { encryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { indexEntry } from "@/lib/search/hmac-index";
import {
  parseFWJson,
  parseDayOneJson,
  parseMarkdownFile,
  parseZipEntries,
  detectFormat,
  type ImportEntry,
} from "@/lib/import";

// 50 MB limit
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  }

  const filename = file.name;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let entries: ImportEntry[];

  try {
    const format = detectFormat(filename, buffer.toString("utf8").slice(0, 2000));

    if (format === "zip") {
      const files = await unpackZip(buffer);
      entries = parseZipEntries(files);
    } else if (format === "markdown") {
      entries = [parseMarkdownFile(buffer.toString("utf8"), filename)];
    } else if (format === "day-one") {
      entries = parseDayOneJson(buffer.toString("utf8"));
    } else {
      entries = parseFWJson(buffer.toString("utf8"));
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse file: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (entries.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.body.trim()) {
      skipped++;
      continue;
    }

    const created = await prisma.entry.create({
      data: {
        entryDate: entry.entryDate,
        title: entry.title ? encryptString(entry.title, dek) : null,
        body: encryptString(entry.body, dek),
        mood: entry.mood,
        categories: entry.categories,
        tags: {
          connectOrCreate: entry.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    // Index search tokens asynchronously
    setImmediate(() => {
      indexEntry(created.id, entry.body, process.env.SEARCH_HMAC_SECRET!).catch(
        console.error,
      );
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}

/**
 * Minimal zip parser — reads the zip central directory to extract file names
 * and contents without any third-party dependencies.
 */
async function unpackZip(
  buf: Buffer,
): Promise<Array<{ name: string; content: string }>> {
  // Find end of central directory record (signature 0x06054b50)
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Not a valid zip file");

  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);
  const centralDirSize = buf.readUInt32LE(eocdOffset + 12);

  const files: Array<{ name: string; content: string }> = [];
  const CD_SIG = 0x02014b50;
  const LFH_SIG = 0x04034b50;
  let pos = centralDirOffset;

  while (pos < centralDirOffset + centralDirSize) {
    if (buf.readUInt32LE(pos) !== CD_SIG) break;

    const compression = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const filenameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + filenameLen);

    pos += 46 + filenameLen + extraLen + commentLen;

    // Skip directories
    if (name.endsWith("/")) continue;

    // Read local file header to find data offset
    if (buf.readUInt32LE(localHeaderOffset) !== LFH_SIG) continue;
    const lfhFilenameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lfhExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + lfhFilenameLen + lfhExtraLen;
    const compressedData = buf.subarray(dataOffset, dataOffset + compressedSize);

    let content: string;
    if (compression === 0) {
      // Stored (no compression)
      content = compressedData.toString("utf8");
    } else if (compression === 8) {
      // Deflate — use Node.js zlib.inflateRawSync
      const { inflateRawSync } = await import("zlib");
      content = inflateRawSync(compressedData).toString("utf8");
    } else {
      continue; // Skip unsupported compression
    }

    files.push({ name, content });
  }

  return files;
}
