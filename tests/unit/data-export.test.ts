import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioral tests for server/compliance/data-export.ts (LGPD Art. 18 export).
 *
 * The module imports a real Drizzle `db` and writes ZIP files to disk. We mock:
 *  - `../db`: a configurable fluent query chain keyed by the Drizzle table
 *    object, so we control exactly what each table returns.
 *  - `./audit-logger`: spy on compliance audit calls.
 *  - `archiver`: capture the JSON payload appended to the export archive so we
 *    can assert the *shape* and *scope* of the exported data without touching
 *    the filesystem semantics.
 *  - `fs`: avoid real file IO (statSync / write stream behavior).
 *
 * Focus: payload shape, sensitive-field stripping, tenant scope in metadata,
 * role-gated related data, and per-owner authorization on status/download.
 */

// Drizzle table markers used by the module. We expose them from the schema
// mock and key our fake DB behavior on identity.
const tables = {
  dataExportRequests: { __table: "dataExportRequests" },
  users: { __table: "users" },
  userConsents: { __table: "userConsents" },
  interactions: { __table: "interactions" },
  complianceAuditLog: { __table: "complianceAuditLog" },
  leads: { __table: "leads" },
  visits: { __table: "visits" },
} as const;

// Per-table SELECT results. Tests mutate this before invoking the module.
const selectResults: Record<string, any[]> = {};

// Captured INSERTs/UPDATES for assertions.
const inserted: Array<{ table: string; values: any }> = [];
const updated: Array<{ table: string; values: any }> = [];

function tableKey(table: any): string {
  return table?.__table ?? "unknown";
}

// A thenable that also supports .where(...).limit(...) chaining, all resolving
// to the configured array for the given table.
function makeSelectChain(table: any) {
  const key = tableKey(table);
  const resolve = () => Promise.resolve(selectResults[key] ?? []);
  const chain: any = {
    where: () => chain,
    limit: () => resolve(),
    then: (onFulfilled: any, onRejected: any) =>
      resolve().then(onFulfilled, onRejected),
    catch: (onRejected: any) => resolve().catch(onRejected),
  };
  return chain;
}

const mocks = vi.hoisted(() => ({
  archiveAppend: vi.fn(),
  logComplianceAudit: vi.fn(async () => undefined),
  storageConfigured: false,
  uploadObject: vi.fn(async () => true),
  downloadObject: vi.fn(async () => Buffer.from("mock-export-zip")),
}));

vi.mock("../../server/db", () => {
  const db = {
    insert: (table: any) => ({
      values: (values: any) => ({
        returning: () => {
          const row = { id: values.id, ...values };
          inserted.push({ table: tableKey(table), values: row });
          return Promise.resolve([row]);
        },
      }),
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: () => {
          updated.push({ table: tableKey(table), values });
          return Promise.resolve(undefined);
        },
      }),
    }),
    select: () => ({
      from: (table: any) => makeSelectChain(table),
    }),
  };
  return { db, schema: tables };
});

vi.mock("../../server/compliance/audit-logger", () => ({
  logComplianceAudit: mocks.logComplianceAudit,
}));

vi.mock("../../server/storage/supabase-client", () => ({
  STORAGE_BUCKETS: { EXPORTS: "exports" },
  isStorageConfigured: () => mocks.storageConfigured,
  uploadObject: mocks.uploadObject,
  downloadObject: mocks.downloadObject,
}));

// Capture the JSON payload appended to the export archive without real IO.
vi.mock("archiver", () => {
  const factory = () => {
    const handlers: Record<string, Function> = {};
    const archive: any = {
      on: (event: string, cb: Function) => {
        handlers[event] = cb;
        return archive;
      },
      pipe: (out: any) => {
        archive.__out = out;
        return archive;
      },
      append: (content: any, opts: any) => {
        mocks.archiveAppend(content, opts);
        return archive;
      },
      pointer: () => 1234,
      finalize: () => {
        // Best-effort: fire the output stream "close" handler if our fs mock is
        // the one in effect, so generateJsonExport() can settle. The behavioral
        // assertions do not depend on this completing.
        archive.__out?.__fireClose?.();
        return Promise.resolve();
      },
    };
    return archive;
  };
  return { default: factory };
});

vi.mock("fs", async () => {
  const actual = await vi.importActual<any>("fs");
  return {
    ...actual,
    existsSync: () => true,
    mkdirSync: () => undefined,
    createWriteStream: () => {
      const closeHandlers: Function[] = [];
      const stream: any = {
        on: (event: string, cb: Function) => {
          if (event === "close") closeHandlers.push(cb);
          return stream;
        },
        once: (event: string, cb: Function) => {
          if (event === "close") closeHandlers.push(cb);
          return stream;
        },
        write: () => true,
        end: () => undefined,
        __fireClose: () => closeHandlers.forEach((h) => h()),
      };
      return stream;
    },
    statSync: () => ({ size: 4096 }),
    unlinkSync: () => undefined,
  };
});

const dataExport = await import("../../server/compliance/data-export");

function baseUser(overrides: Record<string, any> = {}) {
  return {
    id: "user-1",
    tenantId: "tenant-a",
    name: "Alice",
    email: "alice@example.com",
    role: "user",
    password: "hashed-secret",
    passwordResetToken: "reset-token",
    verificationToken: "verify-token",
    oauthAccessToken: "oauth-access",
    oauthRefreshToken: "oauth-refresh",
    ...overrides,
  };
}

function resetState() {
  inserted.length = 0;
  updated.length = 0;
  for (const k of Object.keys(selectResults)) delete selectResults[k];
  vi.clearAllMocks();
  mocks.storageConfigured = false;
}

// Wait for the fire-and-forget processDataExport() chain to settle.
async function flushAsync() {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

function lastAppendedPayload(): any {
  const calls = mocks.archiveAppend.mock.calls;
  // The data file (my-data.json) is appended before the README.
  const dataCall = calls.find((c) => c[1]?.name === "my-data.json");
  expect(dataCall, "expected my-data.json to be appended to archive").toBeTruthy();
  return JSON.parse(dataCall![0]);
}

describe("requestDataExport — request payload contract", () => {
  beforeEach(() => {
    resetState();
    selectResults["users"] = [baseUser()];
  });

  it("returns a pending request descriptor with token and 7-day expiry", async () => {
    const before = Date.now();
    const result = await dataExport.requestDataExport({
      userId: "user-1",
      tenantId: "tenant-a",
    });

    expect(result.status).toBe("pending");
    expect(typeof result.requestId).toBe("string");
    expect(result.requestId.length).toBeGreaterThan(0);
    // 32-byte hex token => 64 chars.
    expect(result.requestToken).toMatch(/^[0-9a-f]{64}$/);
    expect(result.message).toContain("solicitação de exportação");

    const expiresMs = new Date(result.expiresAt).getTime();
    const expectedMin = before + 6 * 24 * 60 * 60 * 1000;
    const expectedMax = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThan(expectedMin);
    expect(expiresMs).toBeLessThan(expectedMax);

    await flushAsync();
  });

  it("persists the request scoped to the requesting user and tenant", async () => {
    await dataExport.requestDataExport({
      userId: "user-1",
      tenantId: "tenant-a",
      format: "json",
      ipAddress: "203.0.113.7",
    });

    const insert = inserted.find((i) => i.table === "dataExportRequests");
    expect(insert).toBeTruthy();
    expect(insert!.values).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-a",
      status: "pending",
      format: "json",
      ipAddress: "203.0.113.7",
    });
    // dataScope must record includeRelated as a JSON string.
    expect(JSON.parse(insert!.values.dataScope)).toEqual({ includeRelated: true });

    await flushAsync();
  });

  it("records a compliance audit event for the export request", async () => {
    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-a" });

    expect(mocks.logComplianceAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        userId: "user-1",
        actorId: "user-1",
        actorType: "user",
        action: "data_export_requested",
        entityType: "user",
        entityId: "user-1",
        legalBasis: "consent",
      }),
    );

    await flushAsync();
  });
});

describe("export payload — shape and scope", () => {
  beforeEach(() => {
    resetState();
  });

  it("strips sensitive credential fields from the exported user record", async () => {
    selectResults["users"] = [baseUser()];

    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-a" });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.user.email).toBe("alice@example.com");
    expect(payload.user.id).toBe("user-1");
    // Sensitive fields must be removed.
    expect(payload.user.password).toBeUndefined();
    expect(payload.user.passwordResetToken).toBeUndefined();
    expect(payload.user.verificationToken).toBeUndefined();
    expect(payload.user.oauthAccessToken).toBeUndefined();
    expect(payload.user.oauthRefreshToken).toBeUndefined();
  });

  it("stamps metadata with the data-subject tenant and a version", async () => {
    selectResults["users"] = [baseUser({ tenantId: "tenant-zeta" })];

    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-zeta" });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.metadata.tenant).toBe("tenant-zeta");
    expect(payload.metadata.dataVersion).toBe("1.0.0");
    expect(typeof payload.metadata.exportDate).toBe("string");
    expect(Number.isNaN(Date.parse(payload.metadata.exportDate))).toBe(false);
  });

  it("includes related collections (consents, interactions, audit) when requested", async () => {
    selectResults["users"] = [baseUser()];
    selectResults["userConsents"] = [{ id: "c1", userId: "user-1" }];
    selectResults["interactions"] = [{ id: "i1", userId: "user-1" }];
    selectResults["complianceAuditLog"] = [{ id: "a1", userId: "user-1" }];

    await dataExport.requestDataExport({
      userId: "user-1",
      tenantId: "tenant-a",
      includeRelated: true,
    });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.consents).toEqual([{ id: "c1", userId: "user-1" }]);
    expect(payload.interactions).toEqual([{ id: "i1", userId: "user-1" }]);
    expect(payload.auditLogs).toEqual([{ id: "a1", userId: "user-1" }]);
  });

  it("omits related collections entirely when includeRelated is false", async () => {
    selectResults["users"] = [baseUser()];
    selectResults["userConsents"] = [{ id: "c1" }];

    await dataExport.requestDataExport({
      userId: "user-1",
      tenantId: "tenant-a",
      includeRelated: false,
    });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.consents).toBeUndefined();
    expect(payload.interactions).toBeUndefined();
    expect(payload.auditLogs).toBeUndefined();
    expect(payload.leads).toBeUndefined();
    expect(payload.visits).toBeUndefined();
  });

  it("includes assigned leads/visits only for privileged roles", async () => {
    selectResults["users"] = [baseUser({ role: "admin" })];
    selectResults["leads"] = [{ id: "l1", assignedTo: "user-1" }];
    selectResults["visits"] = [{ id: "v1", assignedTo: "user-1" }];

    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-a" });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.leads).toEqual([{ id: "l1", assignedTo: "user-1" }]);
    expect(payload.visits).toEqual([{ id: "v1", assignedTo: "user-1" }]);
  });

  it("does not attach leads/visits for a non-privileged data subject", async () => {
    selectResults["users"] = [baseUser({ role: "user" })];
    selectResults["leads"] = [{ id: "l1" }];
    selectResults["visits"] = [{ id: "v1" }];

    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-a" });
    await flushAsync();

    const payload = lastAppendedPayload();
    expect(payload.leads).toBeUndefined();
    expect(payload.visits).toBeUndefined();
    // But baseline related data is still present.
    expect(payload.consents).toBeDefined();
  });

  it("transitions the request to processing before collecting data", async () => {
    selectResults["users"] = [baseUser()];

    await dataExport.requestDataExport({ userId: "user-1", tenantId: "tenant-a" });
    await flushAsync();

    // The async processor flips status to "processing" before it touches the
    // filesystem; this transition is deterministic regardless of IO timing.
    const processing = updated.find(
      (u) => u.table === "dataExportRequests" && u.values.status === "processing",
    );
    expect(processing).toBeTruthy();
  });
});

describe("getExportStatus — per-owner authorization", () => {
  beforeEach(() => {
    resetState();
  });

  it("returns a status descriptor for the owning user", async () => {
    selectResults["dataExportRequests"] = [
      {
        id: "req-1",
        userId: "user-1",
        status: "completed",
        format: "json",
        fileName: "data-export-x.zip",
        fileSize: "4096",
        fileUrl: "/api/compliance/export-data/download/req-1",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: null,
      },
    ];

    const status = await dataExport.getExportStatus("req-1", "user-1");
    expect(status).toMatchObject({
      id: "req-1",
      status: "completed",
      format: "json",
      fileName: "data-export-x.zip",
    });
  });

  it("rejects status access by a different user (cross-subject scope)", async () => {
    selectResults["dataExportRequests"] = [
      { id: "req-1", userId: "user-1", status: "completed" },
    ];

    await expect(
      dataExport.getExportStatus("req-1", "intruder-9"),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when the request does not exist", async () => {
    selectResults["dataExportRequests"] = [];

    await expect(
      dataExport.getExportStatus("missing", "user-1"),
    ).rejects.toThrow("Export request not found");
  });
});

describe("downloadExport — ownership, readiness and expiry", () => {
  beforeEach(() => {
    resetState();
  });

  it("rejects download by a non-owner", async () => {
    selectResults["dataExportRequests"] = [
      { id: "req-1", userId: "user-1", status: "completed", fileName: "f.zip" },
    ];

    await expect(
      dataExport.downloadExport("req-1", "intruder-9"),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects download while the export is not yet completed", async () => {
    selectResults["dataExportRequests"] = [
      { id: "req-1", userId: "user-1", status: "processing" },
    ];

    await expect(
      dataExport.downloadExport("req-1", "user-1"),
    ).rejects.toThrow("Export not ready yet");
  });

  it("rejects download after the link has expired", async () => {
    selectResults["dataExportRequests"] = [
      {
        id: "req-1",
        userId: "user-1",
        status: "completed",
        fileName: "f.zip",
        tenantId: "tenant-a",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    ];

    await expect(
      dataExport.downloadExport("req-1", "user-1"),
    ).rejects.toThrow("expired");
  });

  it("returns the file content, bumps download count and audits a valid download", async () => {
    mocks.storageConfigured = true;
    selectResults["dataExportRequests"] = [
      {
        id: "req-1",
        userId: "user-1",
        tenantId: "tenant-a",
        status: "completed",
        fileName: "data-export-abc.zip",
        downloadCount: 2,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    const buffer = await dataExport.downloadExport("req-1", "user-1");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe("mock-export-zip");
    expect(mocks.downloadObject).toHaveBeenCalledWith(
      "exports",
      "tenant-a/data-export-abc.zip",
    );

    const dlUpdate = updated.find(
      (u) => u.table === "dataExportRequests" && u.values.downloadCount === 3,
    );
    expect(dlUpdate).toBeTruthy();
    expect(dlUpdate!.values.downloadedAt).toBeTruthy();

    expect(mocks.logComplianceAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "data_export_downloaded",
        tenantId: "tenant-a",
        userId: "user-1",
      }),
    );
  });
});
