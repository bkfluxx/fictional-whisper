import crypto from "node:crypto";
import { aesEncrypt, aesDecrypt } from "./aes";

/** Generates a fresh random 256-bit Data Encryption Key. */
export function generateDEK(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Wraps (encrypts) the DEK with the KEK.
 * Returns a base64 string safe to store in the database.
 */
export function wrapDEK(dek: Buffer, kek: Buffer): string {
  return aesEncrypt(dek, kek).toString("base64");
}

/**
 * Unwraps (decrypts) the DEK using the KEK.
 * Throws if the KEK is wrong (auth tag mismatch).
 */
export function unwrapDEK(wrappedBase64: string, kek: Buffer): Buffer {
  const blob = Buffer.from(wrappedBase64, "base64");
  return aesDecrypt(blob, kek);
}
