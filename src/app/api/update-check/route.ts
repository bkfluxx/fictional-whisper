/**
 * GET /api/update-check
 *
 * Compares the running version against the latest GitHub release.
 * Returns { currentVersion, latestVersion, hasUpdate, releaseUrl }
 *
 * Set GITHUB_REPO env var (default: bkfluxx/fictional-whisper) to point
 * at the correct repo if you fork or rename it.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import packageJson from "../../../../package.json";

const CURRENT = packageJson.version; // e.g. "0.1.0"

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v.replace(/^v/, "").split(".").map(Number) as [number, number, number];
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repo = process.env.GITHUB_REPO ?? "bkfluxx/fictional-whisper";

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
      {
        headers: { "User-Agent": "aura-update-check" },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ currentVersion: CURRENT, hasUpdate: false });
    }

    const data = await res.json() as { tag_name: string; html_url: string };
    const latestVersion = data.tag_name.replace(/^v/, "");
    const hasUpdate = isNewer(latestVersion, CURRENT);

    return NextResponse.json({
      currentVersion: CURRENT,
      latestVersion,
      hasUpdate,
      releaseUrl: data.html_url,
    });
  } catch {
    return NextResponse.json({ currentVersion: CURRENT, hasUpdate: false });
  }
}
