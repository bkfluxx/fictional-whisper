import crypto from "node:crypto";

const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns a single Buffer: IV (12 bytes) || auth tag (16 bytes) || ciphertext.
 */
export function aesEncrypt(plaintext: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypts a blob produced by aesEncrypt.
 * Throws if the auth tag is invalid (tampered ciphertext).
 */
export function aesDecrypt(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag); // must be called before final() to verify

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
