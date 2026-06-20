import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

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
});
