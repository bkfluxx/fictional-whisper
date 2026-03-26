import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton to avoid exhausting connection pool during Next.js hot reloads
export const prisma: PrismaClient =
  global.__prisma ?? (global.__prisma = new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
