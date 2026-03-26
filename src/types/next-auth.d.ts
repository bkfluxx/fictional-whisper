import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    jti: string;
    userId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionId?: string;
    userId?: string;
  }
}
