import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

process.env.USE_SQLITE = "true";
process.env.SQLITE_DB_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "newsletter-opt-out-test-")),
  "test.db",
);

{
  const { default: Database } = await import("better-sqlite3");
  const bootstrap = new Database(process.env.SQLITE_DB_PATH);
  bootstrap.exec(`
    CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      tenant_id text,
      subscribed_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      active integer DEFAULT true NOT NULL,
      unsubscribed_at text,
      unsubscribe_reason text,
      resubscribed_at text
    );
  `);
  bootstrap.close();
}

const { db, schema, closeDb } = await import("../../../server/db");
const { storage } = await import("../../../server/storage");

describe("newsletter opt-out storage", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("persists an opt-out row even when the email was not subscribed", async () => {
    await expect(
      storage.unsubscribeNewsletter(" CLIENT@Example.com ", "unit_test"),
    ).resolves.toBe(true);

    const rows = await db.select().from(schema.newsletterSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "client@example.com",
      active: false,
      unsubscribeReason: "unit_test",
    });
    expect(rows[0].unsubscribedAt).toBeTruthy();
    await expect(storage.isNewsletterOptedOut("client@example.com")).resolves.toBe(true);
  });

  it("does not silently reactivate an email with a prior opt-out", async () => {
    await storage.unsubscribeNewsletter("blocked@example.com", "unsubscribe_link");

    const subscription = await storage.subscribeNewsletter({
      email: "Blocked@Example.com",
      tenantId: "tenant-1",
    });

    expect(subscription.active).toBe(false);
    await expect(storage.isNewsletterOptedOut("blocked@example.com")).resolves.toBe(true);
  });
});
