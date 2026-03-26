/**
 * Public API for application-layer encryption.
 * All journal content passes through these helpers before touching the database.
 */
import { aesEncrypt, aesDecrypt } from "./aes";

export { deriveKEK } from "./kek";
export { generateDEK, wrapDEK, unwrapDEK } from "./dek";

/** Encrypts a UTF-8 string. Returns a base64 blob for storage in a TEXT column. */
export function encryptString(plaintext: string, dek: Buffer): string {
  return aesEncrypt(Buffer.from(plaintext, "utf8"), dek).toString("base64");
}

/** Decrypts a base64 blob back to a UTF-8 string. */
export function decryptString(encrypted: string, dek: Buffer): string {
  return aesDecrypt(Buffer.from(encrypted, "base64"), dek).toString("utf8");
}

/** Encrypts a binary Buffer. Returns a base64 blob. */
export function encryptBuffer(plain: Buffer, dek: Buffer): string {
  return aesEncrypt(plain, dek).toString("base64");
}

/** Decrypts a base64 blob back to a Buffer. */
export function decryptBuffer(encrypted: string, dek: Buffer): Buffer {
  return aesDecrypt(Buffer.from(encrypted, "base64"), dek);
}
