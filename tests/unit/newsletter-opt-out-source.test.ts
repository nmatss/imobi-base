import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("newsletter opt-out source gates", () => {
  it("persists public unsubscribe requests and filters bulk marketing recipients", () => {
    const routesEmail = read("server/routes-email.ts");

    expect(routesEmail).toContain("await storage.unsubscribeNewsletter(tokenData.email");
    expect(routesEmail).toContain("await storage.isNewsletterOptedOut(email.to)");
    expect(routesEmail).toContain("skippedOptOut");
  });

  it("keeps opt-out fields out of public newsletter subscribe payloads", () => {
    const schema = read("shared/schema.ts");
    const sqliteSchema = read("shared/schema-sqlite.ts");

    for (const source of [schema, sqliteSchema]) {
      expect(source).toContain("unsubscribedAt");
      expect(source).toContain("unsubscribeReason");
      expect(source).toContain("resubscribedAt");
      expect(source).toContain("active: true");
      expect(source).toContain("unsubscribeReason: true");
    }
  });

  it("ships a migration for durable opt-out audit fields", () => {
    const migration = read("migrations/20260617_002_newsletter_opt_out.sql");

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS unsubscribed_at");
    expect(migration).toContain("legacy_active_false");
    expect(migration).toContain("idx_newsletter_subscriptions_active_email");
  });
});
