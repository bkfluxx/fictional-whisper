import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If no session token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all app routes; leave setup, login, auth endpoints, and
  // static assets public so first-run setup and the login page work.
  matcher: [
    "/((?!login|setup|api/setup|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:jpg|jpeg|png|svg|ico|webp)$).*)",
  ],
};
