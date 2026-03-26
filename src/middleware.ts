export { default } from "next-auth/middleware";

export const config = {
  // Protect all app routes; leave /login and /api/auth/* public
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
