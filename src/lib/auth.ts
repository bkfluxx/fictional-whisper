import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveKEK, unwrapDEK } from "@/lib/crypto";
import { setDEK } from "@/lib/session/dek-store";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

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

        // The DEK is stored keyed by userId; the JWT callback will associate it
        // with the session token after the JWT is created.
        // We stash it temporarily on the returned user object so the jwt callback
        // can pick it up. It is NOT serialized into the JWT itself.
        return {
          id: user.id,
          _dekHex: dek.toString("hex"), // temp carrier, stripped in jwt callback
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "_dekHex" in user) {
        // First sign-in: seed the DEK store keyed by the JWT token's jti (unique ID)
        const dek = Buffer.from((user as { _dekHex: string })._dekHex, "hex");
        if (token.jti) {
          setDEK(token.jti, dek);
        }
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.jti = token.jti as string;
      session.userId = token.userId as string;
      return session;
    },
  },
};
