import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("webhook hardening source guards", () => {
  it("keeps payment webhooks on the persistent ledger", () => {
    const stripe = readProjectFile("server/payments/stripe/stripe-webhooks.ts");
    const mercadoPago = readProjectFile("server/payments/mercadopago/mercadopago-webhooks.ts");

    for (const source of [stripe, mercadoPago]) {
      expect(source).toContain("reserveWebhookEvent");
      expect(source).toContain("markWebhookEventProcessed");
      expect(source).toContain("markWebhookEventFailed");
      expect(source).not.toContain("getRedisClient");
      expect(source).not.toContain("SETNX");
      expect(source).not.toContain("fail-open");
    }
  });

  it("keeps ClickSign signed against raw body and deduplicated", () => {
    const clicksign = readProjectFile("server/integrations/clicksign/webhook-handler.ts");

    expect(clicksign).toContain("req.rawBody");
    expect(clicksign).toContain("Buffer.isBuffer(req.rawBody)");
    expect(clicksign).toContain("reserveWebhookEvent");
    expect(clicksign).toContain("CLICKSIGN_WEBHOOK_REQUIRE_TIMESTAMP");
    expect(clicksign).not.toContain("const payload = JSON.stringify(req.body)");
  });

  it("keeps legacy webhook surfaces closed by default in production", () => {
    const mercadoPago = readProjectFile("server/payments/mercadopago/mercadopago-webhooks.ts");
    const isa = readProjectFile("server/routes-isa.ts");

    expect(mercadoPago).toContain("MERCADOPAGO_ENABLE_LEGACY_IPN");
    expect(mercadoPago).toContain("MERCADOPAGO_IPN_SECRET");
    expect(mercadoPago).toContain("timingSafeEqual");

    expect(isa).toContain("ISA_ENABLE_LEGACY_WEBHOOK");
    expect(isa).toContain("Use /api/webhooks/whatsapp");
  });

  it("keeps webhook_events covered by schema, migration and RLS", () => {
    const schema = readProjectFile("shared/schema.ts");
    const sqlite = readProjectFile("shared/schema-sqlite.ts");
    const migration = readProjectFile("migrations/20260617_001_webhook_events.sql");
    const rls = readProjectFile("migrations/RLS_enable.sql");

    expect(schema).toContain('pgTable("webhook_events"');
    expect(sqlite).toContain('sqliteTable("webhook_events"');
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS webhook_events");
    expect(migration).toContain("uq_webhook_events_provider_event");
    expect(rls).toContain('ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY');
    expect(rls).toContain('CREATE POLICY tenant_isolation ON "webhook_events"');
  });
});
