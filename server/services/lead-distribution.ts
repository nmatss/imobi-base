/**
 * Lead distribution (auto-assignment) across active brokers.
 *
 * Strategies:
 *  - "round_robin" (default): hands the next broker after the last one assigned,
 *    cycling back to the first. Persisted via `advanceLeadAssignment`.
 *  - "least_loaded": picks the active broker with the fewest currently-assigned
 *    active leads (ties broken by round-robin order for fairness).
 *
 * The cursor lives in `lead_assignment_state` (per tenant). `strategy` is read from
 * that row; if absent we fall back to round_robin.
 */

// Minimal structural shapes — intentionally NOT importing the schema row types so this
// module is agnostic to the pg-vs-sqlite dual schema (timestamps typed as Date vs string).
// Only the fields actually used by the distribution logic are required.
export interface BrokerLike {
  id: string;
}
export interface LeadLike {
  assignedTo?: string | null;
}
export interface AssignmentStateLike {
  strategy?: string | null;
  lastAssignedUserId?: string | null;
}

export type LeadDistributionStrategy = "round_robin" | "least_loaded";

export interface LeadDistributionPort {
  getActiveBrokers(tenantId: string): Promise<BrokerLike[]>;
  getLeadAssignmentState(tenantId: string): Promise<AssignmentStateLike | undefined>;
  advanceLeadAssignment(tenantId: string, nextUserId: string): Promise<unknown>;
  /** Used only by least_loaded to compute per-broker load. */
  getLeadsByTenant(tenantId: string): Promise<LeadLike[]>;
}

export interface NextBrokerResult {
  broker: BrokerLike;
  strategy: LeadDistributionStrategy;
}

function normalizeStrategy(value: string | null | undefined): LeadDistributionStrategy {
  return value === "least_loaded" ? "least_loaded" : "round_robin";
}

/** Round-robin pick: the broker right after `lastAssignedUserId` in the ordered list. */
function pickRoundRobin(
  brokers: BrokerLike[],
  lastAssignedUserId: string | null | undefined,
): BrokerLike {
  if (!lastAssignedUserId) return brokers[0];
  const idx = brokers.findIndex((b) => b.id === lastAssignedUserId);
  if (idx === -1) return brokers[0];
  return brokers[(idx + 1) % brokers.length];
}

/**
 * Least-loaded pick: the broker with the fewest active assigned leads.
 * Ties are broken by the round-robin successor order so distribution stays fair
 * and deterministic when everyone is equally loaded.
 */
function pickLeastLoaded(
  brokers: BrokerLike[],
  leads: LeadLike[],
  lastAssignedUserId: string | null | undefined,
): BrokerLike {
  const load = new Map<string, number>();
  for (const broker of brokers) load.set(broker.id, 0);
  for (const lead of leads) {
    if (lead.assignedTo && load.has(lead.assignedTo)) {
      load.set(lead.assignedTo, (load.get(lead.assignedTo) ?? 0) + 1);
    }
  }

  // Reorder brokers starting just after the last-assigned one for tie fairness.
  const startIdx = lastAssignedUserId
    ? brokers.findIndex((b) => b.id === lastAssignedUserId)
    : -1;
  const ordered =
    startIdx === -1
      ? brokers
      : [...brokers.slice(startIdx + 1), ...brokers.slice(0, startIdx + 1)];

  let best = ordered[0];
  let bestLoad = load.get(best.id) ?? 0;
  for (const broker of ordered) {
    const current = load.get(broker.id) ?? 0;
    if (current < bestLoad) {
      best = broker;
      bestLoad = current;
    }
  }
  return best;
}

/**
 * Returns the next broker to receive a lead and advances the assignment cursor.
 * Returns `null` when there are no active brokers (caller should leave the lead
 * unassigned rather than fail).
 */
export async function getNextBroker(
  tenantId: string,
  port: LeadDistributionPort,
): Promise<NextBrokerResult | null> {
  const brokers = await port.getActiveBrokers(tenantId);
  if (!brokers || brokers.length === 0) return null;

  const state = await port.getLeadAssignmentState(tenantId);
  const strategy = normalizeStrategy(state?.strategy);
  const lastAssignedUserId = state?.lastAssignedUserId ?? null;

  let broker: BrokerLike;
  if (strategy === "least_loaded") {
    const leads = await port.getLeadsByTenant(tenantId);
    broker = pickLeastLoaded(brokers, leads, lastAssignedUserId);
  } else {
    broker = pickRoundRobin(brokers, lastAssignedUserId);
  }

  await port.advanceLeadAssignment(tenantId, broker.id);
  return { broker, strategy };
}
