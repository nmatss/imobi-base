/**
 * Token Encryption at Rest (AES-256-GCM)
 *
 * Criptografa segredos de terceiros (OAuth access/refresh tokens, chaves de
 * integração) antes de persistir no banco. Usa `ENCRYPTION_KEY` derivada para
 * 32 bytes via SHA-256.
 *
 * Formato do ciphertext: `enc:v1:<iv_b64>:<authTag_b64>:<data_b64>`.
 * - `encryptSecret` retorna o valor original quando não há chave (dev/test) ou
 *   quando o valor é vazio, para não quebrar fluxos locais.
 * - `decryptSecret` é retrocompatível: valores SEM o prefixo `enc:v1:` são
 *   tratados como texto puro legado e devolvidos como estão.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 16) return null;
  // Deriva 32 bytes determinísticos a partir da chave configurada.
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Indica se a criptografia at-rest está ativa (chave presente). */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/** Criptografa um segredo. No-op seguro quando não há chave ou valor vazio. */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext ?? null;
  }
  const key = getKey();
  if (!key) {
    // Sem chave (dev/test): mantém comportamento legado (texto puro).
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY ausente em produção — recusando persistir segredo em texto puro",
      );
    }
    return plaintext;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Descriptografa um segredo. Retrocompatível com texto puro legado. */
export function decryptSecret(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined || ciphertext === "") {
    return ciphertext ?? null;
  }
  if (!ciphertext.startsWith(PREFIX)) {
    // Texto puro legado (gravado antes da criptografia).
    return ciphertext;
  }
  const key = getKey();
  if (!key) {
    throw new Error("ENCRYPTION_KEY ausente — não é possível descriptografar segredo");
  }
  const [, , ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Ciphertext inválido");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
