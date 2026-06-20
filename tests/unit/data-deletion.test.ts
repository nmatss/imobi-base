/**
 * Behavioral tests for server/compliance/data-deletion.ts (LGPD Art. 18 flow).
 *
 * The module talks to Drizzle/Postgres (`../db`), the compliance audit logger,
 * the confirmation-email transport and pdfkit. We replace all of those with
 * controllable fakes so we can assert the REAL orchestration/validation
 * behavior of the exported functions:
 *   - what gets validated and which errors are thrown,
 *   - what records are inserted/updated (status transitions),
 *   - what is anonymized vs. preserved,
 *   - which compliance audit entries (action + legalBasis) are emitted.
 *
 * The fake `db` is a tiny in-memory store with a Drizzle-shaped chainable
 * query builder. It is driven by `tableData` (rows returned by `select`) and
 * records every mutation in `ops` so tests can assert side effects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared mutable state lives in a hoisted block so the (hoisted) vi.mock
// factories can reference it without "Cannot access before initialization".
const h = vi.hoisted(() => {
  // Identify schema tables by reference so the fake db can key on them.
  const T = {
    users: { __t: "users" },
    accountDeletionRequests: { __t: "accountDeletionRequests" },
    leads: { __t: "leads" },
    owners: { __t: "owners" },
    renters: { __t: "renters" },
    userConsents: { __t: "userConsents" },
    userSessions: { __t: "userSessions" },
    interactions: { __t: "interactions" },
    visits: { __t: "visits" },
  };

  // Rows returned by `select().from(table)`. `where` filtering is ignored:
  // each test sets exactly the rows the code under test should see.
  const state = {
    tableData: {} as Record<string, any[]>,
    ops: [] as Array<{ op: string; table: string; values?: any; set?: any }>,
    auditCalls: [] as any[],
    emailCalls: [] as any[],
    emailShouldThrow: false,
  };

  const tableName = (table: any): string => table?.__t ?? "unknown";

  // Thenable query-builder: chain methods return `this`, awaiting resolves to
  // the rows for the current table, so `const [row] = await db.select()...`.
  function makeBuilder() {
    const builder: any = {
      _table: "unknown",
      _op: "select",
      from(table: any) {
        this._table = tableName(table);
        return this;
      },
      where() {
        return this;
      },
      set(values: any) {
        ops_push({ op: "update", table: this._table, set: values });
        return this;
      },
      values(values: any) {
        this._values = values;
        ops_push({ op: "insert", table: this._table, values });
        return this;
      },
      returning() {
        return this;
      },
      then(resolve: any, reject: any) {
        try {
          if (this._op === "insert") {
            return Promise.resolve([{ ...this._values }]).then(resolve, reject);
          }
          if (this._op === "update" || this._op === "delete") {
            return Promise.resolve(undefined).then(resolve, reject);
          }
          return Promise.resolve(state.tableData[this._table] ?? []).then(resolve, reject);
        } catch (e) {
          return Promise.reject(e).then(resolve, reject);
        }
      },
    };
    return builder;
  }

  const ops_push = (o: any) => state.ops.push(o);

  const fakeDb = {
    select() {
      const b = makeBuilder();
      b._op = "select";
      return b;
    },
    insert(table: any) {
      const b = makeBuilder();
      b._op = "insert";
      b._table = tableName(table);
      return b;
    },
    update(table: any) {
      const b = makeBuilder();
      b._op = "update";
      b._table = tableName(table);
      return b;
    },
    delete(table: any) {
      const b = makeBuilder();
      b._op = "delete";
      b._table = tableName(table);
      state.ops.push({ op: "delete", table: tableName(table) });
      return b;
    },
  };

  return { T, state, fakeDb };
});

// ---- Mocks (hoisted; reference only the hoisted `h`).
vi.mock("../../server/db", () => ({
  db: h.fakeDb,
  schema: h.T,
  isSqlite: true,
}));

vi.mock("../../server/compliance/audit-logger", () => ({
  logComplianceAudit: vi.fn(async (entry: any) => {
    h.state.auditCalls.push(entry);
  }),
}));

vi.mock("../../server/compliance/compliance-email", () => ({
  sendDeletionConfirmationEmail: vi.fn(async (...args: any[]) => {
    h.state.emailCalls.push(args);
    if (h.state.emailShouldThrow) throw new Error("smtp down");
  }),
}));

// pdfkit writes a real PDF; we don't exercise the certificate path in these
// tests (it runs only inside the async processAccountDeletion side-effect),
// but stub it defensively so an accidental import never touches the FS hard.
vi.mock("pdfkit", () => ({
  default: class {
    pipe() { return this; }
    fontSize() { return this; }
    font() { return this; }
    text() { return this; }
    moveDown() { return this; }
    end() {}
  },
}));

import {
  requestAccountDeletion,
  confirmAccountDeletion,
  cancelDeletionRequest,
  getDeletionStatus,
} from "../../server/compliance/data-deletion";

import { DEFAULT_RETENTION_POLICY } from "../../server/compliance/anonymizer";

const tableData = () => h.state.tableData;
const ops = () => h.state.ops;
const auditCalls = () => h.state.auditCalls;
const emailCalls = () => h.state.emailCalls;

beforeEach(() => {
  h.state.tableData = {};
  h.state.ops = [];
  h.state.auditCalls = [];
  h.state.emailCalls = [];
  h.state.emailShouldThrow = false;
  vi.clearAllMocks();
});

function setUser(user: any) {
  h.state.tableData.users = [user];
}

const baseUser = {
  id: "user-1",
  tenantId: "tenant-1",
  name: "Maria Silva",
  email: "maria@example.com",
};

describe("requestAccountDeletion — validation", () => {
  it("rejects when the user does not exist", async () => {
    h.state.tableData.users = []; // no user
    await expect(
      requestAccountDeletion({ userId: "ghost", tenantId: "tenant-1" }),
    ).rejects.toThrow("User not found");
    // No deletion request must be inserted on a failed lookup.
    expect(ops().some((o) => o.op === "insert")).toBe(false);
  });

  it("rejects when a pending request already exists for the user", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [
      { id: "req-existing", userId: "user-1", status: "pending" },
    ];
    await expect(
      requestAccountDeletion({ userId: "user-1", tenantId: "tenant-1" }),
    ).rejects.toThrow(/já existe uma solicitação de exclusão pendente/i);
    expect(ops().some((o) => o.op === "insert")).toBe(false);
  });
});

describe("requestAccountDeletion — happy path", () => {
  it("creates a pending request with a confirmation token and default anonymize type", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = []; // no existing pending

    const result = await requestAccountDeletion({
      userId: "user-1",
      tenantId: "tenant-1",
      reason: "no longer using",
    });

    const insert = ops().find((o) => o.op === "insert" && o.table === "accountDeletionRequests");
    expect(insert).toBeTruthy();
    const inserted = insert!.values;
    expect(inserted.status).toBe("pending");
    expect(inserted.deletionType).toBe("anonymize"); // default
    expect(inserted.userId).toBe("user-1");
    expect(inserted.tenantId).toBe("tenant-1");
    expect(inserted.reason).toBe("no longer using");
    // 32-byte hex confirmation token.
    expect(inserted.confirmationToken).toMatch(/^[0-9a-f]{64}$/);
    // id is generated explicitly (UUID) because SQLite column has no default.
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);

    // Returned contract.
    expect(result.status).toBe("pending");
    expect(result.confirmationUrl).toBe(
      `/api/compliance/confirm-deletion/${inserted.confirmationToken}`,
    );
    expect(result.requestId).toBe(inserted.id);
  });

  it("persists the default retention policy as JSON in dataRetention", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [];

    await requestAccountDeletion({ userId: "user-1", tenantId: "tenant-1" });

    const inserted = ops().find((o) => o.op === "insert")!.values;
    expect(JSON.parse(inserted.dataRetention)).toEqual(DEFAULT_RETENTION_POLICY);
    // Sanity: the default policy keeps the legally-required records.
    expect(DEFAULT_RETENTION_POLICY.keepFinancialRecords).toBe(true);
    expect(DEFAULT_RETENTION_POLICY.keepContractRecords).toBe(true);
    expect(DEFAULT_RETENTION_POLICY.keepAuditLogs).toBe(true);
  });

  it("honors an explicit hard_delete deletionType", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [];

    await requestAccountDeletion({
      userId: "user-1",
      tenantId: "tenant-1",
      deletionType: "hard_delete",
    });

    const inserted = ops().find((o) => o.op === "insert")!.values;
    expect(inserted.deletionType).toBe("hard_delete");
  });

  it("sends a confirmation email with the user's email/name and the token", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [];

    await requestAccountDeletion({ userId: "user-1", tenantId: "tenant-1" });

    expect(emailCalls()).toHaveLength(1);
    const [email, name, token] = emailCalls()[0];
    expect(email).toBe("maria@example.com");
    expect(name).toBe("Maria Silva");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("still creates the request when the confirmation email fails (non-blocking)", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [];
    h.state.emailShouldThrow = true;

    const result = await requestAccountDeletion({ userId: "user-1", tenantId: "tenant-1" });

    expect(result.status).toBe("pending");
    expect(ops().some((o) => o.op === "insert" && o.table === "accountDeletionRequests")).toBe(true);
  });

  it("emits an audit entry for the request with consent legal basis", async () => {
    setUser(baseUser);
    h.state.tableData.accountDeletionRequests = [];

    await requestAccountDeletion({ userId: "user-1", tenantId: "tenant-1" });

    const audit = auditCalls().find((a) => a.action === "account_deletion_requested");
    expect(audit).toBeTruthy();
    expect(audit.legalBasis).toBe("consent");
    expect(audit.actorType).toBe("user");
    expect(audit.entityType).toBe("user");
    expect(audit.entityId).toBe("user-1");
  });
});

describe("confirmAccountDeletion — validation", () => {
  it("rejects an unknown/expired token", async () => {
    h.state.tableData.accountDeletionRequests = []; // token finds nothing
    await expect(confirmAccountDeletion("bad-token")).rejects.toThrow(
      /token de confirmação inválido/i,
    );
  });

  it("rejects a request that is no longer pending", async () => {
    h.state.tableData.accountDeletionRequests = [
      { id: "req-1", userId: "user-1", tenantId: "tenant-1", status: "completed", deletionType: "anonymize" },
    ];
    await expect(confirmAccountDeletion("tok")).rejects.toThrow(
      /esta solicitação já foi processada/i,
    );
  });
});

describe("confirmAccountDeletion — happy path", () => {
  it("transitions the request to confirmed and audits with consent basis", async () => {
    h.state.tableData.accountDeletionRequests = [
      {
        id: "req-1",
        userId: "user-1",
        tenantId: "tenant-1",
        status: "pending",
        deletionType: "anonymize",
      },
    ];
    // processAccountDeletion runs async (fire-and-forget). Give it a user so it
    // does not blow up, but we only assert on the synchronous confirm result.
    setUser(baseUser);

    const result = await confirmAccountDeletion("tok", "1.2.3.4");

    expect(result.requestId).toBe("req-1");
    expect(result.message).toMatch(/será deletada em breve/i);

    // The confirmed status update was issued.
    const confirmUpdate = ops().find(
      (o) => o.op === "update" && o.table === "accountDeletionRequests" && o.set?.status === "confirmed",
    );
    expect(confirmUpdate).toBeTruthy();
    expect(confirmUpdate!.set.confirmedAt).toBeTruthy();
    expect(confirmUpdate!.set.ipAddress).toBe("1.2.3.4");

    const audit = auditCalls().find((a) => a.action === "account_deletion_confirmed");
    expect(audit).toBeTruthy();
    expect(audit.legalBasis).toBe("consent");
  });
});

describe("cancelDeletionRequest", () => {
  const pendingReq = {
    id: "req-1",
    userId: "user-1",
    tenantId: "tenant-1",
    status: "pending",
    deletionType: "anonymize",
  };

  it("rejects when the request does not exist", async () => {
    h.state.tableData.accountDeletionRequests = [];
    await expect(cancelDeletionRequest("req-x", "user-1")).rejects.toThrow("Request not found");
  });

  it("rejects when the requesting user does not own the request", async () => {
    h.state.tableData.accountDeletionRequests = [{ ...pendingReq, userId: "other-user" }];
    await expect(cancelDeletionRequest("req-1", "user-1")).rejects.toThrow("Unauthorized");
    // No cancellation update should be issued for an unauthorized actor.
    expect(
      ops().some((o) => o.op === "update" && o.set?.status === "cancelled"),
    ).toBe(false);
  });

  it("rejects cancelling a request that is already processing/completed", async () => {
    h.state.tableData.accountDeletionRequests = [{ ...pendingReq, status: "processing" }];
    await expect(cancelDeletionRequest("req-1", "user-1")).rejects.toThrow(
      /cannot cancel a request that is already being processed/i,
    );
  });

  it("cancels a pending request owned by the user and audits with info severity", async () => {
    h.state.tableData.accountDeletionRequests = [pendingReq];

    const result = await cancelDeletionRequest("req-1", "user-1");
    expect(result.message).toMatch(/cancelada com sucesso/i);

    const cancelUpdate = ops().find(
      (o) => o.op === "update" && o.set?.status === "cancelled",
    );
    expect(cancelUpdate).toBeTruthy();
    expect(cancelUpdate!.set.cancelledAt).toBeTruthy();

    const audit = auditCalls().find((a) => a.action === "account_deletion_cancelled");
    expect(audit).toBeTruthy();
    expect(audit.legalBasis).toBe("consent");
    expect(audit.severity).toBe("info");
  });
});

describe("getDeletionStatus", () => {
  it("returns null when there is no pending request", async () => {
    h.state.tableData.accountDeletionRequests = [];
    const status = await getDeletionStatus("user-1");
    expect(status).toBeNull();
  });

  it("returns a trimmed status projection for a pending request", async () => {
    h.state.tableData.accountDeletionRequests = [
      {
        id: "req-1",
        userId: "user-1",
        tenantId: "tenant-1",
        status: "pending",
        deletionType: "anonymize",
        reason: "leaving",
        confirmationToken: "secret-token",
        createdAt: "2026-06-20",
        confirmedAt: null,
        completedAt: null,
        certificateNumber: null,
        certificateUrl: null,
      },
    ];

    const status = await getDeletionStatus("user-1");
    expect(status).toMatchObject({
      id: "req-1",
      status: "pending",
      deletionType: "anonymize",
      reason: "leaving",
    });
    // The projection must NOT leak the confirmation token to the status API.
    expect(status).not.toHaveProperty("confirmationToken");
    expect((status as any).confirmationToken).toBeUndefined();
  });
});
