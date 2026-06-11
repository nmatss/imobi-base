/**
 * updateTenantSubscription — MERGE do metadata (JSONB), não replace.
 *
 * Cenário do bug (P0 double-billing): a ordem dos webhooks do Stripe não é
 * garantida. Se customer.subscription.created processa primeiro (grava
 * stripeSubscriptionId) e checkout.session.completed chega depois (grava só
 * stripeCustomerId), um replace do JSONB apagaria o stripeSubscriptionId —
 * cancel/reactivate retornariam 404 e o guard de checkout duplicado deixaria
 * criar uma segunda assinatura.
 *
 * NOTA: diferente de inspections-storage.test.ts (SQLITE_DB_PATH temp), aqui
 * o server/db é mockado: tenant_subscriptions vive primariamente no schema
 * Postgres e um SQLite temp recém-criado não tem a tabela (better-sqlite3 não
 * roda migrations). O mock captura o que o storage manda para o .set() do
 * Drizzle, que é exatamente o contrato sob teste (merge vs replace).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const setCalls: Array<Record<string, unknown>> = [];
let existingRow: Record<string, unknown> | null = null;

vi.mock("../../../server/db", () => {
  const tenantSubscriptions = { tenantId: { name: "tenant_id" } };
  return {
    isSqlite: false,
    schema: { tenantSubscriptions },
    closeDb: async () => {},
    db: {
      // Usado por getTenantSubscription (leitura do registro atual p/ merge)
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => (existingRow ? [existingRow] : []),
          }),
        }),
      }),
      // Usado por updateTenantSubscription — captura o payload do .set()
      update: () => ({
        set: (data: Record<string, unknown>) => {
          setCalls.push(data);
          return {
            where: () => ({
              returning: async () => [{ ...(existingRow || {}), ...data }],
            }),
          };
        },
      }),
    },
  };
});

const { storage } = await import("../../../server/storage");

describe("updateTenantSubscription — merge de metadata", () => {
  beforeEach(() => {
    setCalls.length = 0;
    existingRow = null;
  });

  it("checkout.session.completed depois de subscription.created NÃO apaga o stripeSubscriptionId", async () => {
    // subscription.created já processou e gravou o subscriptionId
    existingRow = {
      tenantId: "tenant-1",
      status: "active",
      metadata: { stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123" },
    };

    // checkout.session.completed grava só o customerId (stripe-webhooks.ts)
    await storage.updateTenantSubscription("tenant-1", {
      metadata: { stripeCustomerId: "cus_123" },
    });

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].metadata).toEqual({
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
    });
  });

  it("chaves novas sobrescrevem as antigas no merge", async () => {
    existingRow = {
      tenantId: "tenant-1",
      metadata: { stripeSubscriptionId: "sub_old", cancelAtPeriodEnd: true },
    };

    await storage.updateTenantSubscription("tenant-1", {
      metadata: { stripeSubscriptionId: "sub_new", cancelAtPeriodEnd: false },
    });

    expect(setCalls[0].metadata).toEqual({
      stripeSubscriptionId: "sub_new",
      cancelAtPeriodEnd: false,
    });
  });

  it("update sem metadata não toca no metadata existente", async () => {
    existingRow = {
      tenantId: "tenant-1",
      metadata: { stripeSubscriptionId: "sub_123" },
    };

    await storage.updateTenantSubscription("tenant-1", { status: "past_due" });

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].status).toBe("past_due");
    expect(setCalls[0]).not.toHaveProperty("metadata");
  });

  it("funciona quando não há registro existente (merge com objeto vazio)", async () => {
    existingRow = null;

    await storage.updateTenantSubscription("tenant-1", {
      metadata: { stripeCustomerId: "cus_999" },
    });

    expect(setCalls[0].metadata).toEqual({ stripeCustomerId: "cus_999" });
  });
});
