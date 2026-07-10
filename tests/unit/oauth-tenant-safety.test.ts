import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const oauthFiles = [
  "server/auth/oauth-google.ts",
  "server/auth/oauth-microsoft.ts",
];

describe("OAuth tenant safety", () => {
  it("does not auto-provision users into a hardcoded tenant", () => {
    for (const file of oauthFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("default-tenant");
      expect(source).toContain("OAUTH_AUTO_PROVISION_TENANT_ID");
    }
  });

  it("sanitizes state redirect URLs before storing them", () => {
    for (const file of oauthFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("sanitizeRedirectUrl(req.query.redirect)");
    }
  });

  it("encrypts persisted OAuth provider tokens at rest", () => {
    for (const file of oauthFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('import { encryptSecret } from "../security/token-encryption"');
      expect(source).toContain("const encAccessToken = encryptSecret(access_token)");
      expect(source).toContain("const encRefreshToken = encryptSecret(refresh_token || null)");
      expect(source).toContain("oauthAccessToken: encAccessToken");
      expect(source).toContain("oauthRefreshToken: encRefreshToken");
      expect(source).not.toContain("oauthAccessToken: access_token");
      expect(source).not.toContain("oauthRefreshToken: refresh_token");
    }
  });

  it("provides an idempotent dry-run script for legacy Microsoft OAuth tokens", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const source = readFileSync("script/encrypt-microsoft-oauth-tokens.ts", "utf8");

    expect(packageJson.scripts["ops:oauth:encrypt-microsoft-tokens"]).toBe(
      "tsx script/encrypt-microsoft-oauth-tokens.ts",
    );
    expect(source).toContain('const APPLY_FLAG = "--apply"');
    expect(source).toContain("isEncryptionConfigured()");
    expect(source).toContain('value && !value.startsWith(PREFIX)');
    expect(source).toContain('eq(users.oauthProvider, "microsoft")');
    expect(source).toContain("encryptSecret(user.oauthAccessToken)");
    expect(source).toContain("encryptSecret(user.oauthRefreshToken)");
    expect(source).toContain('mode: isApply ? "apply" : "dry-run"');
  });
});
