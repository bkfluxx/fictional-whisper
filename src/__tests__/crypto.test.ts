import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { aesEncrypt, aesDecrypt } from "@/lib/crypto/aes";
import { deriveKEK } from "@/lib/crypto/kek";
import { generateDEK, wrapDEK, unwrapDEK } from "@/lib/crypto/dek";
import { encryptString, decryptString, encryptBuffer, decryptBuffer } from "@/lib/crypto/index";

// ──────────────────────────────────────────────
// AES-256-GCM primitives
// ──────────────────────────────────────────────
describe("aesEncrypt / aesDecrypt", () => {
  const key = crypto.randomBytes(32);

  it("round-trips a buffer", () => {
    const plain = Buffer.from("hello journal");
    const blob = aesEncrypt(plain, key);
    expect(aesDecrypt(blob, key).toString()).toBe("hello journal");
  });

  it("produces different ciphertext each call (random IV)", () => {
    const plain = Buffer.from("same plaintext");
    const blob1 = aesEncrypt(plain, key);
    const blob2 = aesEncrypt(plain, key);
    expect(blob1.toString("hex")).not.toBe(blob2.toString("hex"));
  });

  it("throws on a tampered ciphertext (auth tag check)", () => {
    const plain = Buffer.from("tamper me");
    const blob = aesEncrypt(plain, key);
    // Flip a byte in the ciphertext region (after 12-byte IV + 16-byte tag)
    blob[blob.length - 1] ^= 0xff;
    expect(() => aesDecrypt(blob, key)).toThrow();
  });

  it("throws with the wrong key", () => {
    const wrongKey = crypto.randomBytes(32);
    const blob = aesEncrypt(Buffer.from("secret"), key);
    expect(() => aesDecrypt(blob, wrongKey)).toThrow();
  });

  it("handles empty plaintext", () => {
    const empty = Buffer.alloc(0);
    const blob = aesEncrypt(empty, key);
    expect(aesDecrypt(blob, key).length).toBe(0);
  });

  it("handles large plaintext (1 MB)", () => {
    const large = crypto.randomBytes(1024 * 1024);
    const blob = aesEncrypt(large, key);
    expect(aesDecrypt(blob, key)).toEqual(large);
  });
});

// ──────────────────────────────────────────────
// Argon2id KEK derivation
// ──────────────────────────────────────────────
describe("deriveKEK", () => {
  it("produces a 32-byte key", async () => {
    const salt = crypto.randomBytes(32);
    const kek = await deriveKEK("my-password", salt);
    expect(kek).toBeInstanceOf(Buffer);
    expect(kek.length).toBe(32);
  });

  it("is deterministic for same password + salt", async () => {
    const salt = crypto.randomBytes(32);
    const kek1 = await deriveKEK("password", salt);
    const kek2 = await deriveKEK("password", salt);
    expect(kek1.toString("hex")).toBe(kek2.toString("hex"));
  });

  it("produces different keys for different passwords", async () => {
    const salt = crypto.randomBytes(32);
    const kek1 = await deriveKEK("correct-horse", salt);
    const kek2 = await deriveKEK("wrong-horse", salt);
    expect(kek1.toString("hex")).not.toBe(kek2.toString("hex"));
  });

  it("produces different keys for different salts", async () => {
    const kek1 = await deriveKEK("password", crypto.randomBytes(32));
    const kek2 = await deriveKEK("password", crypto.randomBytes(32));
    expect(kek1.toString("hex")).not.toBe(kek2.toString("hex"));
  });
});

// ──────────────────────────────────────────────
// DEK generation, wrap, unwrap
// ──────────────────────────────────────────────
describe("generateDEK / wrapDEK / unwrapDEK", () => {
  it("generates a 32-byte random DEK", () => {
    const dek = generateDEK();
    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
  });

  it("two generated DEKs are unique", () => {
    expect(generateDEK().toString("hex")).not.toBe(generateDEK().toString("hex"));
  });

  it("wraps and unwraps correctly", async () => {
    const dek = generateDEK();
    const salt = crypto.randomBytes(32);
    const kek = await deriveKEK("vault-password", salt);

    const wrapped = wrapDEK(dek, kek);
    expect(typeof wrapped).toBe("string"); // base64 string

    const unwrapped = unwrapDEK(wrapped, kek);
    expect(unwrapped.toString("hex")).toBe(dek.toString("hex"));
  });

  it("unwrap fails with wrong KEK", async () => {
    const dek = generateDEK();
    const salt = crypto.randomBytes(32);
    const kek = await deriveKEK("correct", salt);
    const wrongKek = await deriveKEK("wrong", salt);

    const wrapped = wrapDEK(dek, kek);
    expect(() => unwrapDEK(wrapped, wrongKek)).toThrow();
  });
});

// ──────────────────────────────────────────────
// Envelope: full password → KEK → DEK → encrypt → decrypt flow
// ──────────────────────────────────────────────
describe("full envelope encryption flow", () => {
  it("encrypts and decrypts a journal entry body end-to-end", async () => {
    const password = "hunter2";
    const salt = crypto.randomBytes(32);
    const kek = await deriveKEK(password, salt);
    const dek = generateDEK();

    const wrapped = wrapDEK(dek, kek);

    // Simulate server restart: derive KEK again from password, unwrap DEK
    const kekRestored = await deriveKEK(password, salt);
    const dekRestored = unwrapDEK(wrapped, kekRestored);

    const plaintext = "Today was a great day. I wrote some code and drank coffee.";
    const encrypted = encryptString(plaintext, dekRestored);
    const decrypted = decryptString(encrypted, dekRestored);

    expect(decrypted).toBe(plaintext);
  });

  it("password change: re-wrapping DEK with new KEK leaves entries decryptable", async () => {
    const oldPassword = "old-pass";
    const newPassword = "new-pass";
    const salt = crypto.randomBytes(32);

    const oldKek = await deriveKEK(oldPassword, salt);
    const dek = generateDEK();
    const wrapped = wrapDEK(dek, oldKek);

    // Encrypt an entry with the original DEK
    const body = "This entry was written before the password change.";
    const encrypted = encryptString(body, dek);

    // Simulate password change: unwrap with old KEK, re-wrap with new KEK
    const newSalt = crypto.randomBytes(32); // new salt on password change
    const newKek = await deriveKEK(newPassword, newSalt);
    const dekUnwrapped = unwrapDEK(wrapped, oldKek);
    const newWrapped = wrapDEK(dekUnwrapped, newKek);

    // Verify: entry still decryptable with the re-wrapped DEK
    const dekRestored = unwrapDEK(newWrapped, newKek);
    expect(decryptString(encrypted, dekRestored)).toBe(body);
  });
});

// ──────────────────────────────────────────────
// String / Buffer convenience helpers
// ──────────────────────────────────────────────
describe("encryptString / decryptString", () => {
  const dek = generateDEK();

  it("round-trips a plain string", () => {
    const s = "The quick brown fox";
    expect(decryptString(encryptString(s, dek), dek)).toBe(s);
  });

  it("round-trips unicode text", () => {
    const s = "日本語テスト 🌸 café résumé";
    expect(decryptString(encryptString(s, dek), dek)).toBe(s);
  });

  it("round-trips an empty string", () => {
    expect(decryptString(encryptString("", dek), dek)).toBe("");
  });
});

describe("encryptBuffer / decryptBuffer", () => {
  const dek = generateDEK();

  it("round-trips binary data", () => {
    const data = crypto.randomBytes(512);
    expect(decryptBuffer(encryptBuffer(data, dek), dek)).toEqual(data);
  });
});
