import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDEK } from "@/lib/session/dek-store";

/**
 * Resolves the current session and returns the in-memory DEK.
 * Returns null with a 401 response if the session is missing or the DEK has expired.
 */
export async function getSessionDEK(): Promise<
  { dek: Buffer; session: Awaited<ReturnType<typeof getServerSession>> } | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.jti) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dek = getDEK(session.jti);
  if (!dek) {
    // Session token is valid but DEK was evicted (e.g. server restart)
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 },
    );
  }

  return { dek, session };
}

export function isDEKResult(
  v: { dek: Buffer; session: unknown } | NextResponse,
): v is { dek: Buffer; session: Awaited<ReturnType<typeof getServerSession>> } {
  return !(v instanceof NextResponse);
}
