import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import fs from "fs";

function readLog(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logPath = logger.logPath();
  // Combine rotated file (older) + current
  const content = readLog(logPath + ".1") + readLog(logPath);
  const trimmed = content.trim();

  if (req.nextUrl.searchParams.get("preview") === "1") {
    const lines = trimmed ? trimmed.split("\n").filter(Boolean) : [];
    return NextResponse.json({ lines: lines.slice(-200), total: lines.length });
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const buf = Buffer.from(trimmed || "(no log entries)", "utf8");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="aura-logs-${timestamp}.txt"`,
      "Content-Length": String(buf.length),
    },
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logPath = logger.logPath();
  try {
    fs.writeFileSync(logPath, "", "utf8");
  } catch {
    // file may not exist yet
  }
  try {
    fs.unlinkSync(logPath + ".1");
  } catch {
    // no rotated file — fine
  }

  return NextResponse.json({ ok: true });
}
