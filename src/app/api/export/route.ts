import { NextRequest, NextResponse } from "next/server";
import { getSessionDEK, isDEKResult } from "@/lib/api-helpers";
import { exportJSON, exportMarkdownZip } from "@/lib/export";

export async function GET(req: NextRequest) {
  const auth = await getSessionDEK();
  if (!isDEKResult(auth)) return auth;
  const { dek } = auth;

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "markdown") {
    const buffer = await exportMarkdownZip(dek);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="fictional-whisper-${timestamp}.zip"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

  // Default: JSON
  const buffer = await exportJSON(dek);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fictional-whisper-${timestamp}.json"`,
      "Content-Length": String(buffer.length),
    },
  });
}
