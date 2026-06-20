/**
 * Behavioral tests for the agenda-crm feature.
 *
 * Focus (real behavior, not trivial asserts):
 *   1. lead-dedup: normalization collapses +55 / bare-DDD phones and mixed-case
 *      emails into the SAME bucket the partial unique index uses (so a re-submit
 *      is recognized as the same lead and gets merged, never duplicated).
 *   2. lead-intake: applyLeadDedupAndAssign returns { duplicate, existingLead } and
 *      does NOT auto-assign / advance the cursor when a dedup match exists; otherwise
 *      it enriches the payload with the normalized contact + the round-robin broker.
 *   3. lead-distribution round_robin: advances to the next active broker, wraps around,
 *      and skips/falls back when the last-assigned broker is no longer active.
 *   4. lead-score-weighted: defaults reproduce the legacy contract; per-tenant weights
 *      rescale the dimensions and shift hot/warm thresholds; partial/garbage weights
 *      fall back to defaults dimension-by-dimension.
 *   5. confirm / reschedule by token: the public token routes confirm, decline, 404 on
 *      a bad token, and reschedule (creating a new visit + cancelling the old one).
 *
 * The pure services are exercised directly with fake ports/inputs. The token routes
 * are mounted on a real express app with storage/db mocked (same pattern as
 * portal-admin-rbac.test.ts), so we assert observable HTTP behavior and the exact
 * storage calls — not source strings.
 */

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  digitsOnly,
  normalizePhone,
  normalizeEmail,
  normalizeLeadKeys,
} from "../../server/services/lead-dedup";
import {
  getNextBroker,
  type LeadDistributionPort,
  type BrokerLike,
  type LeadLike,
  type AssignmentStateLike,
} from "../../server/services/lead-distribution";
import {
  resolveLeadScoreWeights,
  calculateWeightedLeadScore,
  DEFAULT_LEAD_SCORE_WEIGHTS,
} from "../../server/services/lead-score-weighted";

// ---------------------------------------------------------------------------
// Shared module mocks (hoisted to top level — these apply file-wide).
// `storageMock` is a single superset surface used by BOTH lead-intake (section 2)
// and the agenda-crm token routes (section 5). vi.fn args use a rest-param `any`
// signature so tsc stays happy under noImplicitAny.
// ---------------------------------------------------------------------------
const storageMock = vi.hoisted(() => ({
  // lead-intake surface
  findLeadByDedup: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve([] as any[])),
  getLeadAssignmentState: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  advanceLeadAssignment: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve([] as any[])),
  // agenda-crm token-route surface
  getVisitByConfirmationToken: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getProperty: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  updateVisitConfirmation: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  updateVisit: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  createRescheduledVisit: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getVisitsByTenant: vi.fn((..._a: any[]) => Promise.resolve([] as any[])),
  getLead: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getUser: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
}));

vi.mock("../../server/storage", () => ({ storage: storageMock }));
// db / schema are only touched by the authed distribution-strategy upsert, never
// by the pure services or token routes exercised here.
vi.mock("../../server/db", () => ({ db: {} }));
vi.mock("@shared/schema", () => ({ leadAssignmentState: {} }));
// Don't actually dispatch WhatsApp/email when rescheduling fires a confirmation.
vi.mock("../../server/services/visit-notifications", () => ({
  sendVisitConfirmationRequest: vi.fn((..._a: any[]) => Promise.resolve({})),
}));

// ---------------------------------------------------------------------------
// 1. lead-dedup: normalization collapses equivalent contacts into one bucket
// ---------------------------------------------------------------------------

describe("lead-dedup normalization (merge, not duplicate)", () => {
  it("strips non-digits exactly like regexp_replace(phone, '\\D', '', 'g')", () => {
    expect(digitsOnly("+55 (11) 99999-9999")).toBe("5511999999999");
    expect(digitsOnly("  ")).toBe("");
    expect(digitsOnly(null)).toBe("");
    expect(digitsOnly(undefined)).toBe("");
  });

  it("collapses the +55 country-code form and the bare-DDD form to the SAME bucket", () => {
    // A lead re-submitted with the international prefix must hit the same dedup
    // bucket as the local form, otherwise the DB unique index lets a dupe through.
    const international = normalizePhone("+55 11 99999-9999"); // 13 digits -> drop 55
    const local = normalizePhone("(11) 99999-9999"); // 11 digits, kept as-is
    expect(international).toBe("11999999999");
    expect(local).toBe("11999999999");
    expect(international).toBe(local);
  });

  it("collapses an 8-digit landline with +55 to its bare-DDD bucket", () => {
    const international = normalizePhone("+55 11 3333-4444"); // 12 digits -> drop 55
    const local = normalizePhone("11 3333-4444"); // 10 digits
    expect(international).toBe("1133334444");
    expect(local).toBe("1133334444");
    expect(international).toBe(local);
  });

  it("does NOT strip a leading 55 when the result would not be a full local number", () => {
    // 5599 is only 4 digits -> not a 12/13-digit BR number, leave intact.
    expect(normalizePhone("5599")).toBe("5599");
    // 11 digits already (a São Paulo mobile starting with the DDD 55) must stay put.
    expect(normalizePhone("55988887777")).toBe("55988887777");
  });

  it("returns undefined for empty/blank phones (no bucket = no false match)", () => {
    expect(normalizePhone("")).toBeUndefined();
    expect(normalizePhone(null)).toBeUndefined();
    expect(normalizePhone("---")).toBeUndefined();
  });

  it("lowercases and trims email so mixed-case re-submits merge", () => {
    expect(normalizeEmail("  John.Doe@Example.COM ")).toBe("john.doe@example.com");
    expect(normalizeEmail("john.doe@example.com")).toBe("john.doe@example.com");
    expect(normalizeEmail("   ")).toBeUndefined();
    expect(normalizeEmail(null)).toBeUndefined();
  });

  it("normalizeLeadKeys produces both buckets from a raw payload", () => {
    expect(
      normalizeLeadKeys({ phone: "+55 (11) 99999-9999", email: "A@B.com" }),
    ).toEqual({ normalizedPhone: "11999999999", normalizedEmail: "a@b.com" });
  });
});

// ---------------------------------------------------------------------------
// 2. lead-intake: dedup short-circuits the insert; otherwise enrich + assign
// ---------------------------------------------------------------------------

describe("lead-intake applyLeadDedupAndAssign (merge + round-robin)", () => {
  // storage is imported transitively by lead-intake; the file-wide storageMock
  // (declared at top) stands in so the pure logic runs without a DB.
  let applyLeadDedupAndAssign: typeof import("../../server/services/lead-intake")["applyLeadDedupAndAssign"];

  beforeEach(async () => {
    vi.clearAllMocks();
    storageMock.findLeadByDedup.mockResolvedValue(undefined as any);
    ({ applyLeadDedupAndAssign } = await import("../../server/services/lead-intake"));
  });

  it("looks up dedup on the NORMALIZED buckets and merges when a lead already exists", async () => {
    const existing = { id: "lead-existing", tenantId: "t1", phone: "11999999999" };
    storageMock.findLeadByDedup.mockResolvedValue(existing as any);

    const port: LeadDistributionPort = {
      getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve([{ id: "b1" }])),
      getLeadAssignmentState: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      advanceLeadAssignment: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve([])),
    };

    const result = await applyLeadDedupAndAssign(
      "t1",
      { name: "Re-submit", phone: "+55 (11) 99999-9999", email: "Lead@X.com" },
      { port },
    );

    // dedup lookup used the canonical buckets, not the raw input
    expect(storageMock.findLeadByDedup).toHaveBeenCalledWith(
      "t1",
      "11999999999",
      "lead@x.com",
    );
    // merge path: flagged duplicate, returns the matched lead, never assigns/advances
    expect(result.duplicate).toBe(true);
    expect(result.existingLead).toBe(existing);
    expect(result.assignedBrokerId).toBeUndefined();
    expect(port.getActiveBrokers).not.toHaveBeenCalled();
    expect(port.advanceLeadAssignment).not.toHaveBeenCalled();
  });

  it("enriches with normalized contact and auto-assigns the next broker when new", async () => {
    const port: LeadDistributionPort = {
      getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve([{ id: "b1" }, { id: "b2" }])),
      getLeadAssignmentState: vi.fn((..._a: any[]) =>
        Promise.resolve({ strategy: "round_robin", lastAssignedUserId: "b1" }),
      ),
      advanceLeadAssignment: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve([])),
    };

    const result = await applyLeadDedupAndAssign<import("../../server/services/lead-intake").LeadIntakeInput>(
      "t1",
      { name: "New", phone: "+55 11 98888-7777", email: "  NEW@X.com " },
      { port },
    );

    expect(result.duplicate).toBe(false);
    // contact persisted in the same canonical form the index buckets on
    expect(result.leadData.phone).toBe("11988887777");
    expect(result.leadData.email).toBe("new@x.com");
    // round-robin advanced from b1 -> b2 and persisted the cursor
    expect(result.assignedBrokerId).toBe("b2");
    expect(result.leadData.assignedTo).toBe("b2");
    expect(port.advanceLeadAssignment).toHaveBeenCalledWith("t1", "b2");
  });

  it("never overrides an owner the caller already pinned", async () => {
    const port: LeadDistributionPort = {
      getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve([{ id: "b1" }, { id: "b2" }])),
      getLeadAssignmentState: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      advanceLeadAssignment: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve([])),
    };

    const result = await applyLeadDedupAndAssign(
      "t1",
      { name: "Pinned", phone: "11977776666", assignedTo: "broker-pinned" },
      { port },
    );

    expect(result.leadData.assignedTo).toBe("broker-pinned");
    expect(result.assignedBrokerId).toBeUndefined();
    // distribution skipped entirely — no broker query, no cursor move
    expect(port.getActiveBrokers).not.toHaveBeenCalled();
    expect(port.advanceLeadAssignment).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. lead-distribution round_robin: advance, wrap, skip inactive
// ---------------------------------------------------------------------------

describe("lead-distribution round_robin", () => {
  function makePort(opts: {
    brokers: BrokerLike[];
    state?: AssignmentStateLike;
    leads?: LeadLike[];
  }): LeadDistributionPort & {
    advanceLeadAssignment: ReturnType<typeof vi.fn>;
  } {
    return {
      getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve(opts.brokers)),
      getLeadAssignmentState: vi.fn((..._a: any[]) => Promise.resolve(opts.state)),
      advanceLeadAssignment: vi.fn((..._a: any[]) => Promise.resolve(undefined)),
      getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve(opts.leads ?? [])),
    };
  }

  it("advances to the broker AFTER the last-assigned one", async () => {
    const port = makePort({
      brokers: [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
      state: { strategy: "round_robin", lastAssignedUserId: "b1" },
    });

    const result = await getNextBroker("t1", port);

    expect(result?.broker.id).toBe("b2");
    expect(result?.strategy).toBe("round_robin");
    expect(port.advanceLeadAssignment).toHaveBeenCalledWith("t1", "b2");
  });

  it("wraps around to the first broker after the last one in the list", async () => {
    const port = makePort({
      brokers: [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
      state: { strategy: "round_robin", lastAssignedUserId: "b3" },
    });

    const result = await getNextBroker("t1", port);

    expect(result?.broker.id).toBe("b1");
    expect(port.advanceLeadAssignment).toHaveBeenCalledWith("t1", "b1");
  });

  it("falls back to the first broker when the last-assigned one is no longer active (skipped)", async () => {
    // b2 was deactivated since the last assignment, so it's absent from the active list.
    const port = makePort({
      brokers: [{ id: "b1" }, { id: "b3" }],
      state: { strategy: "round_robin", lastAssignedUserId: "b2" },
    });

    const result = await getNextBroker("t1", port);

    expect(result?.broker.id).toBe("b1");
    expect(port.advanceLeadAssignment).toHaveBeenCalledWith("t1", "b1");
  });

  it("starts at the first broker on a cold cursor (no prior assignment)", async () => {
    const port = makePort({
      brokers: [{ id: "b1" }, { id: "b2" }],
      state: undefined,
    });

    const result = await getNextBroker("t1", port);

    expect(result?.broker.id).toBe("b1");
    expect(result?.strategy).toBe("round_robin"); // missing strategy -> default
  });

  it("returns null (leave unassigned) when there are no active brokers", async () => {
    const port = makePort({ brokers: [] });

    const result = await getNextBroker("t1", port);

    expect(result).toBeNull();
    expect(port.advanceLeadAssignment).not.toHaveBeenCalled();
  });

  it("a full round trips every broker exactly once before repeating", async () => {
    const brokers = [{ id: "b1" }, { id: "b2" }, { id: "b3" }];
    let last: string | null = null;
    const port: LeadDistributionPort = {
      getActiveBrokers: vi.fn((..._a: any[]) => Promise.resolve(brokers)),
      getLeadAssignmentState: vi.fn((..._a: any[]) =>
        Promise.resolve({ strategy: "round_robin", lastAssignedUserId: last }),
      ),
      advanceLeadAssignment: vi.fn((_t: any, next: any) => {
        last = next;
        return Promise.resolve(undefined);
      }),
      getLeadsByTenant: vi.fn((..._a: any[]) => Promise.resolve([])),
    };

    const picks: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await getNextBroker("t1", port);
      picks.push(r!.broker.id);
    }

    expect(picks).toEqual(["b1", "b2", "b3", "b1"]); // each once, then wrap
  });

  it("least_loaded picks the broker with the fewest active leads (cursor strategy honored)", async () => {
    const port = makePort({
      brokers: [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
      state: { strategy: "least_loaded", lastAssignedUserId: null },
      leads: [
        { assignedTo: "b1" },
        { assignedTo: "b1" },
        { assignedTo: "b2" },
        // b3 has zero -> should win
      ],
    });

    const result = await getNextBroker("t1", port);

    expect(result?.strategy).toBe("least_loaded");
    expect(result?.broker.id).toBe("b3");
    expect(port.advanceLeadAssignment).toHaveBeenCalledWith("t1", "b3");
  });
});

// ---------------------------------------------------------------------------
// 4. lead-score-weighted: per-tenant weights with fallback to defaults
// ---------------------------------------------------------------------------

describe("lead-score-weighted (per-tenant weights + default fallback)", () => {
  it("resolves to the legacy defaults when no weights are configured", () => {
    expect(resolveLeadScoreWeights(undefined)).toEqual(DEFAULT_LEAD_SCORE_WEIGHTS);
    expect(resolveLeadScoreWeights(null)).toEqual(DEFAULT_LEAD_SCORE_WEIGHTS);
  });

  it("falls back dimension-by-dimension for partial / non-numeric overrides", () => {
    const resolved = resolveLeadScoreWeights({
      budgetWeight: 40, // honored
      engagementWeight: null, // -> default 25
      profileWeight: NaN as unknown as number, // non-finite -> default 20
      // urgency/behavior/thresholds omitted -> defaults
    });
    expect(resolved.budgetWeight).toBe(40);
    expect(resolved.engagementWeight).toBe(DEFAULT_LEAD_SCORE_WEIGHTS.engagementWeight);
    expect(resolved.profileWeight).toBe(DEFAULT_LEAD_SCORE_WEIGHTS.profileWeight);
    expect(resolved.urgencyWeight).toBe(DEFAULT_LEAD_SCORE_WEIGHTS.urgencyWeight);
    expect(resolved.behaviorWeight).toBe(DEFAULT_LEAD_SCORE_WEIGHTS.behaviorWeight);
    expect(resolved.hotThreshold).toBe(DEFAULT_LEAD_SCORE_WEIGHTS.hotThreshold);
  });

  it("with defaults, reproduces the legacy contract exactly (drop-in superset)", () => {
    // A fully-filled, high-budget lead in 'proposal' with recent activity.
    const now = Date.now();
    const recent = new Date(now - 1000).toISOString();
    const lead = {
      name: "L",
      email: "l@x.com",
      phone: "11999999999",
      budget: "1500000", // >=1M -> rawBudget 25
      preferredType: "apartment",
      preferredCity: "SP",
      preferredCategory: "sale", // 7/7 profile fields -> rawProfile 20
      status: "proposal", // rawUrgency 15
      updatedAt: new Date(now).toISOString(),
    };
    const interactions = Array.from({ length: 5 }, () => ({ createdAt: recent })); // engagement capped 25, >3 -> behavior +5
    const followUps = [
      { status: "completed" }, // behavior +5
      { status: "pending" }, // 1 pending (<3) -> behavior +5
    ];

    const result = calculateWeightedLeadScore(lead, interactions, followUps);

    // budget25 + engagement25 + profile20 + urgency15 + behavior15 = 100
    expect(result.budgetScore).toBe(25);
    expect(result.engagementScore).toBe(25);
    expect(result.profileScore).toBe(20);
    expect(result.urgencyScore).toBe(15);
    expect(result.behaviorScore).toBe(15);
    expect(result.totalScore).toBe(100);
    expect(result.temperature).toBe("hot"); // >= 70
    expect(result.nextBestAction).toBe("Follow-up de fechamento");
  });

  it("rescales dimensions into the tenant cap and shifts thresholds", () => {
    // Same maxed-out lead, but a tenant that triples budget weight and zeroes others.
    const now = Date.now();
    const lead = {
      name: "L",
      budget: "2000000", // rawBudget 25 (max)
      status: "proposal",
      updatedAt: new Date(now).toISOString(),
    };

    const result = calculateWeightedLeadScore(lead, [], [], {
      budgetWeight: 75, // raw 25/25 -> 75
      engagementWeight: 0,
      profileWeight: 0,
      urgencyWeight: 25, // raw urgency 15/15 -> 25
      behaviorWeight: 0,
      hotThreshold: 90,
      warmThreshold: 50,
    });

    expect(result.budgetScore).toBe(75);
    expect(result.urgencyScore).toBe(25);
    expect(result.engagementScore).toBe(0);
    expect(result.profileScore).toBeGreaterThanOrEqual(0); // profile weight 0 -> 0
    expect(result.profileScore).toBe(0);
    // total 100 >= hot 90
    expect(result.totalScore).toBe(100);
    expect(result.temperature).toBe("hot");
  });

  it("a partial-budget lead is rescaled proportionally into the tenant cap", () => {
    const lead = { name: "L", budget: "300000", status: "new", updatedAt: new Date().toISOString() };
    // 300k -> rawBudget 15 of native max 25. With budgetWeight 50: round(15/25*50)=30.
    const result = calculateWeightedLeadScore(lead, [], [], {
      budgetWeight: 50,
      engagementWeight: 0,
      profileWeight: 0,
      urgencyWeight: 0,
      behaviorWeight: 0,
    });
    expect(result.budgetScore).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 5. confirm / reschedule by token (public routes, storage + db mocked)
// ---------------------------------------------------------------------------

// Section 5 reuses the file-wide `storageMock` (it already exposes the token-route
// surface). Alias it for readability.
const routeStorage = storageMock;

describe("confirm / reschedule by token (public routes)", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    routeStorage.getVisitByConfirmationToken.mockResolvedValue(undefined as any);

    const { registerAgendaCrmRoutes } = await import("../../server/routes-agenda-crm");
    const { errorHandler } = await import("../../server/middleware/error-handler");

    app = express();
    app.use(express.json());
    registerAgendaCrmRoutes(app);
    app.use(errorHandler as any);
  });

  it("GET confirm/:token returns the public visit view for a valid token", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v1",
      tenantId: "t1",
      propertyId: "p1",
      scheduledFor: "2026-07-01T14:00:00.000Z",
      status: "scheduled",
      confirmationStatus: "pending",
      notes: "ring the bell",
    } as any);
    routeStorage.getProperty.mockResolvedValue({
      id: "p1",
      tenantId: "t1",
      title: "Apto 101",
      address: "Rua X",
      city: "SP",
    } as any);

    const res = await request(app).get("/api/visits/confirm/tok-abc");

    expect(res.status).toBe(200);
    expect(routeStorage.getVisitByConfirmationToken).toHaveBeenCalledWith("tok-abc");
    expect(res.body.visit).toMatchObject({ id: "v1", status: "scheduled" });
    expect(res.body.property).toMatchObject({ id: "p1", title: "Apto 101" });
    // the public view never leaks tenantId / internal fields
    expect(res.body.visit.tenantId).toBeUndefined();
  });

  it("GET confirm/:token returns 404 for an unknown token", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue(undefined as any);

    const res = await request(app).get("/api/visits/confirm/nope");

    expect(res.status).toBe(404);
    expect(routeStorage.getProperty).not.toHaveBeenCalled();
  });

  it("POST confirm/:token confirms the visit and syncs the lifecycle status", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v1",
      tenantId: "t1",
      propertyId: "p1",
      confirmationStatus: "pending",
    } as any);
    routeStorage.updateVisitConfirmation.mockResolvedValue({
      id: "v1",
      confirmationStatus: "confirmed",
      status: "confirmed",
      propertyId: "p1",
    } as any);

    const res = await request(app)
      .post("/api/visits/confirm/tok-abc")
      .send({ action: "confirm" });

    expect(res.status).toBe(200);
    expect(res.body.confirmationStatus).toBe("confirmed");
    expect(routeStorage.updateVisitConfirmation).toHaveBeenCalledWith("v1", "confirmed");
    // confirming also pushes the visit lifecycle to "confirmed"
    expect(routeStorage.updateVisit).toHaveBeenCalledWith("v1", { status: "confirmed" });
  });

  it("POST confirm/:token with action=decline marks declined and does NOT bump status", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v1",
      tenantId: "t1",
      propertyId: "p1",
    } as any);
    routeStorage.updateVisitConfirmation.mockResolvedValue({
      id: "v1",
      confirmationStatus: "declined",
      propertyId: "p1",
    } as any);

    const res = await request(app)
      .post("/api/visits/confirm/tok-abc")
      .send({ action: "decline" });

    expect(res.status).toBe(200);
    expect(res.body.confirmationStatus).toBe("declined");
    expect(routeStorage.updateVisitConfirmation).toHaveBeenCalledWith("v1", "declined");
    // decline must not flip the lifecycle status to confirmed
    expect(routeStorage.updateVisit).not.toHaveBeenCalled();
  });

  it("POST reschedule/:token creates a new visit and cancels the original", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v-old",
      tenantId: "t1",
      propertyId: "p1",
      leadId: "l1",
      assignedTo: "b1",
      notes: "n",
    } as any);
    routeStorage.getProperty.mockResolvedValue({ id: "p1", tenantId: "t1" } as any);
    routeStorage.getLead.mockResolvedValue({ id: "l1", tenantId: "t1" } as any);
    routeStorage.getUser.mockResolvedValue({ id: "b1", tenantId: "t1" } as any);
    routeStorage.getVisitsByTenant.mockResolvedValue([] as any); // no conflicts
    routeStorage.createRescheduledVisit.mockResolvedValue({
      id: "v-new",
      tenantId: "t1",
      propertyId: "p1",
      status: "scheduled",
      confirmationStatus: "pending",
      scheduledFor: "2026-07-10T16:00:00.000Z",
    } as any);

    const res = await request(app)
      .post("/api/visits/reschedule/tok-abc")
      .send({ scheduledFor: "2026-07-10T16:00:00.000Z" });

    expect(res.status).toBe(201);
    expect(res.body.visit).toMatchObject({ id: "v-new" });
    // new slot created off the original visit
    expect(routeStorage.createRescheduledVisit).toHaveBeenCalledWith(
      "v-old",
      expect.objectContaining({ tenantId: "t1", propertyId: "p1", leadId: "l1" }),
    );
    // original is declined + cancelled
    expect(routeStorage.updateVisitConfirmation).toHaveBeenCalledWith("v-old", "declined");
    expect(routeStorage.updateVisit).toHaveBeenCalledWith("v-old", { status: "cancelled" });
  });

  it("POST reschedule/:token rejects an invalid date with 400", async () => {
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v-old",
      tenantId: "t1",
      propertyId: "p1",
    } as any);

    const res = await request(app)
      .post("/api/visits/reschedule/tok-abc")
      .send({ scheduledFor: "not-a-date" });

    expect(res.status).toBe(400);
    expect(routeStorage.createRescheduledVisit).not.toHaveBeenCalled();
  });

  it("POST reschedule/:token returns 409 when the new slot conflicts", async () => {
    const conflictWhen = "2026-07-10T16:00:00.000Z";
    routeStorage.getVisitByConfirmationToken.mockResolvedValue({
      id: "v-old",
      tenantId: "t1",
      propertyId: "p1",
      leadId: "l1",
      assignedTo: "b1",
    } as any);
    routeStorage.getProperty.mockResolvedValue({ id: "p1", tenantId: "t1" } as any);
    routeStorage.getLead.mockResolvedValue({ id: "l1", tenantId: "t1" } as any);
    routeStorage.getUser.mockResolvedValue({ id: "b1", tenantId: "t1" } as any);
    // An existing active visit for the same property at the same slot -> conflict.
    routeStorage.getVisitsByTenant.mockResolvedValue([
      {
        id: "v-other",
        propertyId: "p1",
        assignedTo: "b9",
        scheduledFor: conflictWhen,
        status: "confirmed",
      },
    ] as any);

    const res = await request(app)
      .post("/api/visits/reschedule/tok-abc")
      .send({ scheduledFor: conflictWhen });

    expect(res.status).toBe(409);
    expect(routeStorage.createRescheduledVisit).not.toHaveBeenCalled();
  });
});
