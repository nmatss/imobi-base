/**
 * Behavioral tests for the ai-actions feature.
 *
 * Covers:
 *  - registry: Zod payload validation per actionType (accept/reject, unknown type)
 *  - executor: idempotency (already-executed short-circuits) + status transitions
 *  - approval gating: move_stage / reactivate_contacts NEVER run without "approved"
 *  - audit: every execution path appends EXACTLY ONE audit row
 *  - tenant isolation: cross-tenant action / lead is rejected, no mutation
 *
 * The `storage` module is mocked with an in-memory store so we exercise the
 * REAL registry + executor logic (state machine, side-effect mutations) rather
 * than asserting on stubs that always return canned values.
 */
import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory storage mock. Vi.fn wrappers use rest-param `any` signatures so the
// generated spies stay typed as `(...args: any[]) => any` and don't fight tsc.
// ---------------------------------------------------------------------------
type StoredLead = { id: string; tenantId: string; name: string; status: string; notes?: string | null };
type StoredAction = {
  id: string;
  tenantId: string;
  actionType: string;
  status: string;
  payload: unknown;
  result?: unknown;
  error?: unknown;
  executedAt?: unknown;
};

const db = vi.hoisted(() => ({
  leads: new Map<string, any>(),
  actions: new Map<string, any>(),
  interactions: [] as any[],
  followUps: [] as any[],
  audits: [] as any[],
  reset() {
    this.leads.clear();
    this.actions.clear();
    this.interactions.length = 0;
    this.followUps.length = 0;
    this.audits.length = 0;
  },
}));

const storageMock = vi.hoisted(() => ({
  getLead: vi.fn(async (..._a: any[]) => (db.leads.get(_a[0]) ?? undefined)),
  updateLead: vi.fn(async (..._a: any[]) => {
    const [id, patch] = _a;
    const lead = db.leads.get(id);
    if (!lead) return undefined;
    Object.assign(lead, patch);
    return lead;
  }),
  createInteraction: vi.fn(async (..._a: any[]) => {
    const row = { id: `int-${db.interactions.length + 1}`, ..._a[0] };
    db.interactions.push(row);
    return row;
  }),
  createFollowUp: vi.fn(async (..._a: any[]) => {
    const row = { id: `fu-${db.followUps.length + 1}`, ..._a[0] };
    db.followUps.push(row);
    return row;
  }),
  getAiAction: vi.fn(async (..._a: any[]) => (db.actions.get(_a[0]) ?? undefined)),
  updateAiActionStatus: vi.fn(async (..._a: any[]) => {
    const [id, patch] = _a;
    const action = db.actions.get(id);
    if (!action) return undefined;
    Object.assign(action, patch);
    return action;
  }),
  appendAiActionAudit: vi.fn(async (..._a: any[]) => {
    const row = { id: `audit-${db.audits.length + 1}`, ..._a[0] };
    db.audits.push(row);
    return row;
  }),
}));

vi.mock("../../server/storage", () => ({ storage: storageMock }));

const registry = await import("../../server/services/ai-actions/registry");
const { executeAction } = await import("../../server/services/ai-actions/executor");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT = "tenant-1";
const OTHER_TENANT = "tenant-2";
const APPROVER = "user-approver";

function seedLead(over: Partial<StoredLead> = {}): StoredLead {
  const lead: StoredLead = {
    id: over.id ?? "lead-1",
    tenantId: over.tenantId ?? TENANT,
    name: over.name ?? "Maria Lead",
    status: over.status ?? "new",
    notes: over.notes ?? null,
  };
  db.leads.set(lead.id, lead);
  return lead;
}

function seedAction(over: Partial<StoredAction> = {}): StoredAction {
  const action: StoredAction = {
    id: over.id ?? "action-1",
    tenantId: over.tenantId ?? TENANT,
    actionType: over.actionType ?? "qualify_lead",
    status: over.status ?? "proposed",
    payload: over.payload ?? { leadId: "lead-1", status: "qualified" },
  };
  db.actions.set(action.id, action);
  return action;
}

const opts = { tenantId: TENANT, approverUserId: APPROVER };

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
});

// ===========================================================================
// Registry — Zod payload validation
// ===========================================================================
describe("registry.validatePayload", () => {
  it("accepts a well-formed payload and returns the parsed value", () => {
    const parsed = registry.validatePayload("qualify_lead", {
      leadId: "lead-9",
      status: "qualified",
      notes: "quente",
    }) as any;
    expect(parsed).toMatchObject({ leadId: "lead-9", status: "qualified", notes: "quente" });
  });

  it("rejects a payload with an out-of-enum status via Zod", () => {
    expect(() =>
      registry.validatePayload("qualify_lead", { leadId: "lead-9", status: "banana" }),
    ).toThrow(ZodError);
  });

  it("rejects a payload missing the required leadId", () => {
    expect(() => registry.validatePayload("qualify_lead", { status: "qualified" })).toThrow(
      ZodError,
    );
  });

  it("enforces array bounds on reactivate_contacts (min 1, max 50)", () => {
    expect(() => registry.validatePayload("reactivate_contacts", { leadIds: [] })).toThrow(ZodError);
    const tooMany = Array.from({ length: 51 }, (_, i) => `l-${i}`);
    expect(() => registry.validatePayload("reactivate_contacts", { leadIds: tooMany })).toThrow(
      ZodError,
    );
    expect(() =>
      registry.validatePayload("reactivate_contacts", { leadIds: ["l-1", "l-2"] }),
    ).not.toThrow();
  });

  it("throws for an unknown action type", () => {
    expect(() => registry.validatePayload("delete_everything", {})).toThrow(/desconhecid/i);
  });

  it("exposes a catalog whose approval/risk metadata matches each definition", () => {
    const catalog = registry.getActionCatalog();
    const byType = Object.fromEntries(catalog.map((c) => [c.actionType, c]));

    // Auto-approve, low risk.
    expect(byType.qualify_lead).toMatchObject({ requiresApproval: false, riskLevel: "low" });
    expect(byType.suggest_properties).toMatchObject({ requiresApproval: false });
    // Approval-gated.
    expect(byType.move_stage).toMatchObject({ requiresApproval: true, riskLevel: "medium" });
    expect(byType.reactivate_contacts).toMatchObject({ requiresApproval: true, riskLevel: "high" });
    // Catalog must not leak executable functions to the API surface.
    expect((byType.qualify_lead as any).execute).toBeUndefined();
  });
});

// ===========================================================================
// Executor — happy path, state transition, single audit
// ===========================================================================
describe("executeAction — auto-approve happy path", () => {
  it("transitions a proposed auto-approve action to executed and mutates the lead", async () => {
    seedLead({ id: "lead-1", status: "new" });
    seedAction({ id: "action-1", actionType: "qualify_lead", status: "proposed", payload: { leadId: "lead-1", status: "qualified" } });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(outcome.status).toBe("executed");
    // Real side-effect happened.
    expect(db.leads.get("lead-1")!.status).toBe("qualified");
    // Action row was advanced to executed with a timestamp.
    const action = db.actions.get("action-1")!;
    expect(action.status).toBe("executed");
    expect(action.executedAt).toBeTruthy();
  });

  it("writes EXACTLY ONE audit row per successful execution", async () => {
    seedLead({ id: "lead-1" });
    seedAction({ id: "action-1", payload: { leadId: "lead-1", status: "qualified" } });

    await executeAction("action-1", opts);

    expect(storageMock.appendAiActionAudit).toHaveBeenCalledTimes(1);
    expect(db.audits).toHaveLength(1);
    const audit = db.audits[0];
    expect(audit).toMatchObject({ event: "executed", actionId: "action-1", tenantId: TENANT });
    // before/after snapshot is captured for the audit trail.
    expect(audit.afterState).toMatchObject({ status: "qualified" });
  });
});

// ===========================================================================
// Executor — idempotency
// ===========================================================================
describe("executeAction — idempotency", () => {
  it("short-circuits an already-executed action without re-running or re-auditing", async () => {
    seedLead({ id: "lead-1", status: "qualified" });
    seedAction({ id: "action-1", status: "executed", payload: { leadId: "lead-1", status: "won" } });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(outcome.alreadyExecuted).toBe(true);
    // No mutation, no audit — the action is terminal.
    expect(storageMock.updateLead).not.toHaveBeenCalled();
    expect(storageMock.appendAiActionAudit).not.toHaveBeenCalled();
    expect(db.leads.get("lead-1")!.status).toBe("qualified");
  });

  it("running the same proposed action twice executes once and is idempotent on the second call", async () => {
    seedLead({ id: "lead-1", status: "new" });
    seedAction({ id: "action-1", payload: { leadId: "lead-1", status: "qualified" } });

    const first = await executeAction("action-1", opts);
    const second = await executeAction("action-1", opts);

    expect(first.alreadyExecuted).toBeFalsy();
    expect(second.alreadyExecuted).toBe(true);
    // The mutating storage call only happened on the first run.
    expect(storageMock.updateLead).toHaveBeenCalledTimes(1);
    // Only the first run produced an audit row.
    expect(db.audits).toHaveLength(1);
  });
});

// ===========================================================================
// Executor — rejected / expired terminal states
// ===========================================================================
describe("executeAction — non-runnable states", () => {
  it.each(["rejected", "expired"] as const)(
    "refuses to execute a %s action and performs no mutation",
    async (status) => {
      seedLead({ id: "lead-1" });
      seedAction({ id: "action-1", status, payload: { leadId: "lead-1", status: "qualified" } });

      const outcome = await executeAction("action-1", opts);

      expect(outcome.ok).toBe(false);
      expect(outcome.status).toBe(status);
      expect(storageMock.updateLead).not.toHaveBeenCalled();
      expect(storageMock.appendAiActionAudit).not.toHaveBeenCalled();
    },
  );
});

// ===========================================================================
// Approval gating — move_stage / reactivate_contacts
// ===========================================================================
describe("executeAction — approval gating", () => {
  it("does NOT execute move_stage while still proposed (requires approval)", async () => {
    seedLead({ id: "lead-1", status: "new" });
    seedAction({
      id: "action-1",
      actionType: "move_stage",
      status: "proposed",
      payload: { leadId: "lead-1", toStatus: "negotiation" },
    });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/aprova/i);
    // No state change at all.
    expect(db.leads.get("lead-1")!.status).toBe("new");
    expect(db.actions.get("action-1")!.status).toBe("proposed");
    expect(storageMock.updateLead).not.toHaveBeenCalled();
  });

  it("executes move_stage once it is approved, mutating the lead + leaving a trail interaction", async () => {
    seedLead({ id: "lead-1", status: "new" });
    seedAction({
      id: "action-1",
      actionType: "move_stage",
      status: "approved",
      payload: { leadId: "lead-1", toStatus: "negotiation", reason: "cliente quente" },
    });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(outcome.status).toBe("executed");
    expect(db.leads.get("lead-1")!.status).toBe("negotiation");
    // move_stage writes a stage-change interaction trail...
    expect(db.interactions.some((i) => i.type === "ai_stage_change")).toBe(true);
    // ...plus exactly one lifecycle audit row.
    expect(db.audits).toHaveLength(1);
    expect(db.audits[0].event).toBe("executed");
  });

  it("does NOT execute reactivate_contacts while proposed (high-risk, requires approval)", async () => {
    seedLead({ id: "lead-1", status: "lost" });
    seedLead({ id: "lead-2", status: "lost" });
    seedAction({
      id: "action-1",
      actionType: "reactivate_contacts",
      status: "proposed",
      payload: { leadIds: ["lead-1", "lead-2"] },
    });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/aprova/i);
    expect(db.leads.get("lead-1")!.status).toBe("lost");
    expect(db.leads.get("lead-2")!.status).toBe("lost");
    expect(storageMock.updateLead).not.toHaveBeenCalled();
  });

  it("reactivates contacts in bulk once approved and still produces a single audit row", async () => {
    seedLead({ id: "lead-1", status: "lost" });
    seedLead({ id: "lead-2", status: "lost" });
    seedAction({
      id: "action-1",
      actionType: "reactivate_contacts",
      status: "approved",
      payload: { leadIds: ["lead-1", "lead-2"] },
    });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(db.leads.get("lead-1")!.status).toBe("contacted");
    expect(db.leads.get("lead-2")!.status).toBe("contacted");
    // One audit for the whole batch action (not one per lead).
    expect(db.audits).toHaveLength(1);
  });
});

// ===========================================================================
// Tenant isolation
// ===========================================================================
describe("executeAction — tenant isolation", () => {
  it("rejects an action owned by another tenant as not_found, with no mutation", async () => {
    seedLead({ id: "lead-1" });
    seedAction({ id: "action-1", tenantId: OTHER_TENANT, payload: { leadId: "lead-1", status: "qualified" } });

    const outcome = await executeAction("action-1", { tenantId: TENANT, approverUserId: APPROVER });

    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe("not_found");
    expect(storageMock.updateLead).not.toHaveBeenCalled();
    expect(storageMock.appendAiActionAudit).not.toHaveBeenCalled();
  });

  it("fails the action when its target lead belongs to a different tenant (cross-tenant payload)", async () => {
    // Action is in TENANT, but the referenced lead is in OTHER_TENANT.
    seedLead({ id: "lead-x", tenantId: OTHER_TENANT, status: "new" });
    seedAction({ id: "action-1", tenantId: TENANT, payload: { leadId: "lead-x", status: "qualified" } });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe("failed");
    // The cross-tenant lead must NOT have been mutated.
    expect(db.leads.get("lead-x")!.status).toBe("new");
    // Failure path is itself audited exactly once.
    expect(db.audits).toHaveLength(1);
    expect(db.audits[0].event).toBe("execute_failed");
    expect(db.actions.get("action-1")!.status).toBe("failed");
  });

  it("skips cross-tenant leads inside a bulk reactivate but processes valid ones", async () => {
    seedLead({ id: "mine", tenantId: TENANT, status: "lost" });
    seedLead({ id: "theirs", tenantId: OTHER_TENANT, status: "lost" });
    seedAction({
      id: "action-1",
      actionType: "reactivate_contacts",
      status: "approved",
      payload: { leadIds: ["mine", "theirs"] },
    });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(db.leads.get("mine")!.status).toBe("contacted");
    // Foreign-tenant lead untouched.
    expect(db.leads.get("theirs")!.status).toBe("lost");
    const audit = db.audits.find((a) => a.event === "executed");
    expect(audit.afterState).toMatchObject({ reactivated: ["mine"], skipped: ["theirs"] });
  });
});

// ===========================================================================
// Executor — payload re-validation as defense in depth
// ===========================================================================
describe("executeAction — payload re-validation", () => {
  it("fails (not executes) when the persisted payload is malformed", async () => {
    seedLead({ id: "lead-1" });
    // Tampered/invalid payload: status not in the lead-status enum.
    seedAction({ id: "action-1", payload: { leadId: "lead-1", status: "not-a-status" } });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe("failed");
    expect(storageMock.updateLead).not.toHaveBeenCalled();
    // Invalid-payload path still audits exactly once.
    expect(db.audits).toHaveLength(1);
    expect(db.audits[0].event).toBe("execute_failed");
  });

  it("accepts a JSON-string payload (DB json column round-trip) and executes", async () => {
    seedLead({ id: "lead-1", status: "new" });
    seedAction({ id: "action-1", payload: JSON.stringify({ leadId: "lead-1", status: "qualified" }) });

    const outcome = await executeAction("action-1", opts);

    expect(outcome.ok).toBe(true);
    expect(db.leads.get("lead-1")!.status).toBe("qualified");
  });
});
