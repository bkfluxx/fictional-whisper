import argon2 from "argon2";

// Argon2id parameters — well above OWASP minimums.
// Takes ~0.5s on a Pi 5; intentionally slow for brute-force resistance.
const ARGON2_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  raw: true, // return raw bytes, not an encoded string
} as const;

/**
 * Derives a 256-bit Key Encryption Key (KEK) from a password and salt.
 * The salt is stored in KeyStore.dekSalt (base64) and is NOT secret.
 */
export async function deriveKEK(
  password: string,
  salt: Buffer,
): Promise<Buffer> {
  const hash = await argon2.hash(password, { ...ARGON2_PARAMS, salt });
  return hash as Buffer;
}
