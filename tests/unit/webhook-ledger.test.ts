import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    rows: [] as Array<{ status: string; updatedAt?: Date | string | null }>,
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    nextInsertError: undefined as unknown,
  };

  const table = {
    tenantId: "tenant_id",
    provider: "provider",
    eventId: "event_id",
    eventType: "event_type",
    status: "status",
    attempts: "attempts",
    payloadDigest: "payload_digest",
    signatureDigest: "signature_digest",
    lastError: "last_error",
    receivedAt: "received_at",
    processedAt: "processed_at",
    failedAt: "failed_at",
    updatedAt: "updated_at",
  };

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => state.rows),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: Record<string, unknown>) => {
        if (state.nextInsertError) {
          const error = state.nextInsertError;
          state.nextInsertError = undefined;
          throw error;
        }
        state.inserts.push(value);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((value: Record<string, unknown>) => {
        state.updates.push(value);
        return {
          where: vi.fn(async () => undefined),
        };
      }),
    })),
  };

  return { db, state, table };
});

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ op: "and", conditions }),
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
  sql: (...args: unknown[]) => ({ op: "sql", args }),
}));

vi.mock("../../server/db", () => ({
  db: mocks.db,
  isSqlite: false,
  schema: {
    webhookEvents: mocks.table,
  },
}));

const {
  createWebhookPayloadDigest,
  markWebhookEventFailed,
  markWebhookEventProcessed,
  reserveWebhookEvent,
} = await import("../../server/integrations/webhook-ledger");

describe("webhook ledger", () => {
  beforeEach(() => {
    mocks.state.rows = [];
    mocks.state.inserts = [];
    mocks.state.updates = [];
    mocks.state.nextInsertError = undefined;
    vi.clearAllMocks();
  });

  it("reserves a new webhook event persistently", async () => {
    const result = await reserveWebhookEvent({
      provider: "stripe",
      eventId: "evt_1",
      eventType: "invoice.payment_succeeded",
      payloadDigest: "payload",
    });

    expect(result).toEqual({ reserved: true, duplicate: false, status: "processing" });
    expect(mocks.state.inserts[0]).toMatchObject({
      provider: "stripe",
      eventId: "evt_1",
      eventType: "invoice.payment_succeeded",
      status: "processing",
      attempts: 1,
      payloadDigest: "payload",
    });
  });

  it("treats processed and active processing events as duplicates", async () => {
    mocks.state.rows = [{ status: "processed", updatedAt: new Date() }];

    await expect(
      reserveWebhookEvent({ provider: "stripe", eventId: "evt_1" }),
    ).resolves.toMatchObject({ reserved: false, duplicate: true, status: "processed" });

    mocks.state.rows = [{ status: "processing", updatedAt: new Date() }];

    await expect(
      reserveWebhookEvent({ provider: "stripe", eventId: "evt_1" }),
    ).resolves.toMatchObject({ reserved: false, duplicate: true, status: "processing" });
  });

  it("re-reserves failed and stale processing events for provider retries", async () => {
    mocks.state.rows = [{ status: "failed", updatedAt: new Date() }];

    await expect(
      reserveWebhookEvent({ provider: "mercadopago", eventId: "payment:1" }),
    ).resolves.toMatchObject({ reserved: true, duplicate: false, status: "processing" });
    expect(mocks.state.updates[0]).toMatchObject({
      status: "processing",
      lastError: null,
      failedAt: null,
    });

    mocks.state.updates = [];
    mocks.state.rows = [
      {
        status: "processing",
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ];

    await expect(
      reserveWebhookEvent({
        provider: "clicksign",
        eventId: "doc:1",
        staleAfterMs: 1000,
      }),
    ).resolves.toMatchObject({ reserved: true, duplicate: false, status: "processing" });
    expect(mocks.state.updates[0]).toMatchObject({ status: "processing" });
  });

  it("marks events as processed or failed", async () => {
    await markWebhookEventProcessed({
      provider: "stripe",
      eventId: "evt_1",
      tenantId: "tenant-1",
    });
    expect(mocks.state.updates[0]).toMatchObject({
      tenantId: "tenant-1",
      status: "processed",
      failedAt: null,
      lastError: null,
    });

    await markWebhookEventFailed({
      provider: "stripe",
      eventId: "evt_2",
      error: new Error("boom"),
    });
    expect(mocks.state.updates[1]).toMatchObject({
      status: "failed",
      lastError: "boom",
    });
  });

  it("uses stable sha256 digests for raw buffers and objects", () => {
    expect(createWebhookPayloadDigest(Buffer.from("abc"))).toMatch(/^[a-f0-9]{64}$/);
    expect(createWebhookPayloadDigest({ a: 1 })).toBe(createWebhookPayloadDigest({ a: 1 }));
  });
});
