import crypto from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { prisma } from "@/lib/prisma";
import { deriveKEK, unwrapDEK } from "@/lib/crypto";
import { setDEK } from "@/lib/session/dek-store";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import {
  peekChallenge,
  invalidateChallenge,
  recordTotpFailure,
} from "@/lib/totp-challenge";

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
        password:       { label: "Password",        type: "password" },
        challengeToken: { label: "Challenge Token", type: "text" },
        totpCode:       { label: "2FA Code",        type: "text" },
      },
      async authorize(credentials, req) {
        const ip =
          (req as { headers?: Record<string, string> })?.headers?.[
            "x-forwarded-for"
          ] ?? "unknown";

        // ── Two-step challenge flow ──────────────────────────────────────
        // Used when /api/auth/check-password has already verified the password.
        if (credentials?.challengeToken) {
          const challenge = peekChallenge(credentials.challengeToken);
          if (!challenge) throw new Error("INVALID_CHALLENGE");

          if (challenge.requires2fa) {
            if (!credentials.totpCode) throw new Error("TOTP_REQUIRED");

            const user = await prisma.user.findUnique({
              where: { id: challenge.userId },
            });
            if (!user?.totpSecret) {
              invalidateChallenge(credentials.challengeToken);
              throw new Error("INVALID_CHALLENGE");
            }

            const valid = speakeasy.totp.verify({
              secret: user.totpSecret,
              encoding: "base32",
              token: credentials.totpCode.replace(/\s/g, ""),
              window: 1,
            });
            if (!valid) {
              const dead = recordTotpFailure(credentials.challengeToken);
              throw new Error(dead ? "INVALID_CHALLENGE" : "INVALID_TOTP");
            }
          }

          // Success — consume challenge and create session
          invalidateChallenge(credentials.challengeToken);
          resetRateLimit(ip);
          const sessionId = crypto.randomUUID();
          setDEK(sessionId, challenge.dek);
          return { id: challenge.userId, _sessionId: sessionId };
        }

        // ── Legacy password-only flow (2FA not enabled) ──────────────────
        // Kept for backward compatibility; the login page always uses the
        // two-step flow, but this path is hit if someone calls signIn() directly.
        if (isRateLimited(ip)) throw new Error("TOO_MANY_ATTEMPTS");
        if (!credentials?.password) return null;

        const user = await prisma.user.findFirst();
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Reject password-only login when 2FA is active
        if (user.totpSecret) throw new Error("TOTP_REQUIRED");

        const keyStore = await prisma.keyStore.findUnique({
          where: { id: "singleton" },
        });
        if (!keyStore) return null;

        const salt = Buffer.from(keyStore.dekSalt, "base64");
        const kek = await deriveKEK(credentials.password, salt);
        const dek = unwrapDEK(keyStore.encryptedDek, kek);

        resetRateLimit(ip);
        const sessionId = crypto.randomUUID();
        setDEK(sessionId, dek);
        return { id: user.id, _sessionId: sessionId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "_sessionId" in user) {
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
