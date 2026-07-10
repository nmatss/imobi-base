import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
} from "../../server/security/token-encryption";

const KEY = "test-encryption-key-0123456789abcdef-0123456789"; // >= 32 chars

describe("token-encryption (AES-256-GCM)", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = savedKey;
  });

  it("round-trips a secret and prefixes the ciphertext", () => {
    process.env.ENCRYPTION_KEY = KEY;
    const ct = encryptSecret("ya29.super-secret-google-token");
    expect(ct).toBeTruthy();
    expect(ct!.startsWith("enc:v1:")).toBe(true);
    expect(ct).not.toContain("super-secret-google-token");
    expect(decryptSecret(ct)).toBe("ya29.super-secret-google-token");
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("produces distinct ciphertexts for the same plaintext (random IV)", () => {
    process.env.ENCRYPTION_KEY = KEY;
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("treats unprefixed values as legacy plaintext on decrypt", () => {
    process.env.ENCRYPTION_KEY = KEY;
    expect(decryptSecret("legacy-plain-token")).toBe("legacy-plain-token");
  });

  it("passes through null/empty/undefined", () => {
    process.env.ENCRYPTION_KEY = KEY;
    expect(encryptSecret(null)).toBeNull();
    expect(encryptSecret(undefined)).toBeNull();
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBe("");
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    process.env.ENCRYPTION_KEY = KEY;
    const ct = encryptSecret("integrity-protected")!;
    const parts = ct.split(":");
    // Corrompe o segmento de dados (mantém base64 válido).
    parts[4] = (parts[4][0] === "A" ? "B" : "A") + parts[4].slice(1);
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });

  it("without ENCRYPTION_KEY (dev/test) is a no-op passthrough", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    expect(encryptSecret("plain")).toBe("plain");
    expect(decryptSecret("plain")).toBe("plain");
  });
});
