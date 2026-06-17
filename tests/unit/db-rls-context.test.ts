import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  getTenantRlsContext,
  installTenantRlsOnPool,
  runWithAuthEmailRlsContext,
  runWithClickSignDocumentRlsContext,
  runWithDigitalSignatureTokenRlsContext,
  runWithEmailVerificationTokenRlsContext,
  runWithPasswordResetTokenRlsContext,
  runWithPropertyComparisonRlsContext,
  runWithPublicPropertyIdsRlsContext,
  runWithTenantRlsContext,
  runWithUserRlsContext,
  runWithWhatsAppPhoneNumberRlsContext,
} from "../../server/db-rls";

type FakeQueryResult = { rows: unknown[] };
type FakeQuery = (...args: unknown[]) => Promise<FakeQueryResult>;
type FakeConnect = () => Promise<FakeClient>;

interface FakeClient {
  query: ReturnType<typeof vi.fn<FakeQuery>>;
  release: ReturnType<typeof vi.fn<() => void>>;
}

interface FakePool {
  query: FakeQuery;
  connect: FakeConnect;
}

function textOf(args: unknown[]): string {
  const query = args[0];
  if (typeof query === "string") return query;
  if (query && typeof query === "object" && "text" in query) {
    const queryText = (query as { text?: unknown }).text;
    return typeof queryText === "string" ? queryText : "";
  }
  return "";
}

function createFakeClient(options: { failBusinessQuery?: boolean } = {}): {
  client: FakeClient;
  calls: unknown[][];
} {
  const calls: unknown[][] = [];
  const client = {
    query: vi.fn<FakeQuery>(async (...args: unknown[]) => {
      calls.push(args);
      if (options.failBusinessQuery && textOf(args) === "select * from properties") {
        throw new Error("query failed");
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };

  return { client, calls };
}

function createFakePool(client: FakeClient): {
  pool: FakePool;
  poolCalls: unknown[][];
  connectSpy: ReturnType<typeof vi.fn<FakeConnect>>;
  querySpy: ReturnType<typeof vi.fn<FakeQuery>>;
} {
  const poolCalls: unknown[][] = [];
  const querySpy = vi.fn<FakeQuery>(async (...args: unknown[]) => {
    poolCalls.push(args);
    return { rows: [] };
  });
  const connectSpy = vi.fn<FakeConnect>(async () => client);
  const pool: FakePool = {
    query: querySpy,
    connect: connectSpy,
  };

  installTenantRlsOnPool(pool as unknown as Pool);

  return { pool, poolCalls, connectSpy, querySpy };
}

describe("Tenant RLS context", () => {
  it("preserves AsyncLocalStorage tenant context across async boundaries", async () => {
    await runWithTenantRlsContext("tenant-1", async () => {
      await Promise.resolve();
      expect(getTenantRlsContext()).toEqual({ tenantId: "tenant-1" });
    });

    expect(getTenantRlsContext()).toBeNull();
  });

  it("does not wrap pool queries without tenant context", async () => {
    const { client } = createFakeClient();
    const { pool, poolCalls, connectSpy } = createFakePool(client);

    await pool.query("select 1");

    expect(connectSpy).not.toHaveBeenCalled();
    expect(poolCalls.map(textOf)).toEqual(["select 1"]);
  });

  it("wraps pool queries in a local tenant transaction when context exists", async () => {
    const { client, calls } = createFakeClient();
    const { pool, connectSpy } = createFakePool(client);

    await runWithTenantRlsContext("tenant-1", async () => {
      await pool.query("select * from properties");
    });

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.tenant_id', $1, true)",
      "select * from properties",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["tenant-1"]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("sets auth email context for public authentication lookups", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithAuthEmailRlsContext("USER@Example.COM ", async () => {
      await pool.query("select * from users where email = $1", ["user@example.com"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.auth_email', $1, true)",
      "select * from users where email = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["user@example.com"]);
  });

  it("sets user id context for session deserialization lookups", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithUserRlsContext("user-1", async () => {
      await pool.query("select * from users where id = $1", ["user-1"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.user_id', $1, true)",
      "select * from users where id = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["user-1"]);
  });

  it("sets token hash contexts for public reset and verification flows", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithPasswordResetTokenRlsContext("reset-hash", async () => {
      await pool.query("select * from users where password_reset_token = $1", ["reset-hash"]);
    });
    await runWithEmailVerificationTokenRlsContext("verify-hash", async () => {
      await pool.query("select * from users where verification_token = $1", ["verify-hash"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.password_reset_token_hash', $1, true)",
      "select * from users where password_reset_token = $1",
      "commit",
      "begin",
      "select set_config('app.email_verification_token_hash', $1, true)",
      "select * from users where verification_token = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["reset-hash"]);
    expect(calls[5][1]).toEqual(["verify-hash"]);
  });

  it("sets public document/token contexts for signed webhooks and signature links", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithClickSignDocumentRlsContext("doc-key-1", async () => {
      await pool.query("select * from contracts where clicksign_document_key = $1", ["doc-key-1"]);
    });
    await runWithDigitalSignatureTokenRlsContext("signature-token-1", async () => {
      await pool.query("select * from contracts where id = $1", ["contract-1"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.clicksign_document_key', $1, true)",
      "select * from contracts where clicksign_document_key = $1",
      "commit",
      "begin",
      "select set_config('app.digital_signature_token', $1, true)",
      "select * from contracts where id = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["doc-key-1"]);
    expect(calls[5][1]).toEqual(["signature-token-1"]);
  });

  it("sets public property and comparison contexts for anonymous comparison flows", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithPublicPropertyIdsRlsContext(["property-1", "property-2"], async () => {
      await pool.query("select * from properties where id = any($1)", [["property-1", "property-2"]]);
    });
    await runWithPropertyComparisonRlsContext("comparison-1", async () => {
      await pool.query("select * from property_comparisons where id = $1", ["comparison-1"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.public_property_ids', $1, true)",
      "select * from properties where id = any($1)",
      "commit",
      "begin",
      "select set_config('app.property_comparison_id', $1, true)",
      "select * from property_comparisons where id = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["property-1,property-2"]);
    expect(calls[5][1]).toEqual(["comparison-1"]);
  });

  it("sets WhatsApp phone number context before resolving webhook tenant mapping", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithWhatsAppPhoneNumberRlsContext("phone-number-1", async () => {
      await pool.query("select * from integration_configs where integration_name = $1", ["whatsapp"]);
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.whatsapp_phone_number_id', $1, true)",
      "select * from integration_configs where integration_name = $1",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["phone-number-1"]);
  });

  it("rejects public property ids that cannot be represented safely in a session GUC", () => {
    expect(() =>
      runWithPublicPropertyIdsRlsContext(["property-1,property-2"], () => undefined),
    ).toThrow("propertyIds must be non-empty strings without commas");
  });

  it("rolls back and releases the client when a scoped pool query fails", async () => {
    const { client, calls } = createFakeClient({ failBusinessQuery: true });
    const { pool } = createFakePool(client);

    await expect(
      runWithTenantRlsContext("tenant-1", async () => {
        await pool.query("select * from properties");
      }),
    ).rejects.toThrow("query failed");

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.tenant_id', $1, true)",
      "select * from properties",
      "rollback",
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("applies tenant context immediately after explicit transaction begin", async () => {
    const { client, calls } = createFakeClient();
    const { pool } = createFakePool(client);

    await runWithTenantRlsContext("tenant-1", async () => {
      const connectedClient = await pool.connect();
      await connectedClient.query("begin");
      await connectedClient.query("select * from properties");
      await connectedClient.query("commit");
      connectedClient.release();
    });

    expect(calls.map(textOf)).toEqual([
      "begin",
      "select set_config('app.tenant_id', $1, true)",
      "select * from properties",
      "commit",
    ]);
    expect(calls[1][1]).toEqual(["tenant-1"]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
