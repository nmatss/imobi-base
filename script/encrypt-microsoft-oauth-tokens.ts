#!/usr/bin/env tsx
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "@shared/schema-sqlite";
import { encryptSecret, isEncryptionConfigured } from "../server/security/token-encryption";

const APPLY_FLAG = "--apply";
const isApply = process.argv.includes(APPLY_FLAG);
const PREFIX = "enc:v1:";

function needsEncryption(value: string | null | undefined): value is string {
  return Boolean(value && !value.startsWith(PREFIX));
}

if (!isEncryptionConfigured()) {
  console.error("ENCRYPTION_KEY is required to encrypt Microsoft OAuth tokens.");
  process.exit(1);
}

const microsoftUsers = await db
  .select({
    id: users.id,
    oauthAccessToken: users.oauthAccessToken,
    oauthRefreshToken: users.oauthRefreshToken,
  })
  .from(users)
  .where(eq(users.oauthProvider, "microsoft"));

let scanned = 0;
let candidates = 0;
let updated = 0;

for (const user of microsoftUsers) {
  scanned++;
  const encryptAccess = needsEncryption(user.oauthAccessToken);
  const encryptRefresh = needsEncryption(user.oauthRefreshToken);

  if (!encryptAccess && !encryptRefresh) continue;
  candidates++;

  if (!isApply) continue;

  await db
    .update(users)
    .set({
      oauthAccessToken: encryptAccess ? encryptSecret(user.oauthAccessToken) : user.oauthAccessToken,
      oauthRefreshToken: encryptRefresh ? encryptSecret(user.oauthRefreshToken) : user.oauthRefreshToken,
    })
    .where(eq(users.id, user.id));
  updated++;
}

console.log(
  JSON.stringify(
    {
      mode: isApply ? "apply" : "dry-run",
      scanned,
      candidates,
      updated,
      next: isApply ? null : "Re-run with --apply to encrypt candidate rows.",
    },
    null,
    2,
  ),
);
