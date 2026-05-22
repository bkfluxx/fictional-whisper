import crypto from "node:crypto";

/**
 * Generates a cryptographically random 128-bit recovery code.
 * Formatted as 8 groups of 4 uppercase hex digits separated by dashes.
 * Example: "A3F2-9B1C-7E04-D56A-0F3B-8C2E-4D71-A9B0"
 */
export function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString("hex").toUpperCase();
  return (hex.match(/.{4}/g) as string[]).join("-");
}

/**
 * Strips dashes/spaces and uppercases the code.
 * Throws if the result is not exactly 32 uppercase hex characters.
 */
export function normalizeRecoveryCode(raw: string): string {
  const normalized = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(normalized)) {
    throw new Error("Invalid recovery code format");
  }
  return normalized;
}
