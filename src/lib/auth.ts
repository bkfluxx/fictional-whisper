import crypto from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveKEK, unwrapDEK } from "@/lib/crypto";
import { setDEK } from "@/lib/session/dek-store";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,  // refresh every 24 hours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Rate limit by IP
        const ip =
          (req as { headers?: Record<string, string> })?.headers?.[
            "x-forwarded-for"
          ] ?? "unknown";
        if (isRateLimited(ip)) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        if (!credentials?.password) return null;

        const user = await prisma.user.findFirst();
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Derive KEK and unwrap DEK — store in memory for this session
        const keyStore = await prisma.keyStore.findUnique({
          where: { id: "singleton" },
        });
        if (!keyStore) return null;

        const salt = Buffer.from(keyStore.dekSalt, "base64");
        const kek = await deriveKEK(credentials.password, salt);
        const dek = unwrapDEK(keyStore.encryptedDek, kek);

        resetRateLimit(ip);

        // Generate a stable session ID here, in authorize(), so we control the key.
        // We cannot use token.jti from the jwt callback — NextAuth sets jti AFTER
        // the jwt callback runs (during JWT encoding), so it would be undefined.
        const sessionId = crypto.randomUUID();
        setDEK(sessionId, dek);

        return {
          id: user.id,
          _sessionId: sessionId, // carries the key into the jwt callback
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "_sessionId" in user) {
        // First sign-in: persist the session ID we generated in authorize()
        token.sessionId = (user as { _sessionId: string })._sessionId;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.jti = token.sessionId as string;
      session.userId = token.userId as string;
      return session;
    },
  },
};
