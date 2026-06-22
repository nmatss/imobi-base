/**
 * Lead intake pipeline: de-duplication + auto-assignment.
 *
 * `applyLeadDedupAndAssign` is the single entry point the POST /api/leads handler
 * should call BEFORE creating a lead. It:
 *   1. Normalizes phone/email to the dedup buckets (see lead-dedup.ts).
 *   2. Looks up an existing active lead for the tenant on those buckets.
 *      - If found, returns `{ duplicate: true, existingLead }` so the caller can
 *        decide to merge / 409 / update instead of inserting a duplicate (which
 *        would otherwise be rejected by the partial unique indexes).
 *   3. Otherwise picks the next broker via the configured distribution strategy and
 *      returns a `leadData` clone with normalized phone/email and `assignedTo` set
 *      (only when the caller did not already pin an owner).
 *
 * This does NOT write the lead — the caller still owns `storage.createLead(...)`.
 * Keeping it side-effect-light (other than advancing the round-robin cursor) means
 * it can be unit-tested with a fake port.
 */

import { storage } from "../storage";
import { normalizePhone, normalizeEmail } from "./lead-dedup";
import { getNextBroker, type LeadDistributionPort } from "./lead-distribution";
import { isUniqueViolation } from "../utils/db-errors";

// Use the storage's own lead row type (pg-vs-sqlite agnostic) rather than the
// `@shared/schema` row type, whose timestamp typing (Date) diverges from what the
// active storage layer returns (string).
type StoredLead = NonNullable<Awaited<ReturnType<typeof storage.findLeadByDedup>>>;

export interface LeadIntakeInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  assignedTo?: string | null;
  [key: string]: unknown;
}

export interface LeadIntakeResult<T extends LeadIntakeInput = LeadIntakeInput> {
  /** True when an active lead already exists for the tenant on phone/email. */
  duplicate: boolean;
  /** The matched lead when `duplicate` is true. */
  existingLead?: StoredLead;
  /** Lead payload with normalized contact + (possibly) assignedTo to persist. */
  leadData: T;
  /** Broker chosen by distribution, when one was assigned in this call. */
  assignedBrokerId?: string;
}

/** Build a distribution port backed by real storage. */
function storagePort(): LeadDistributionPort {
  return {
    getActiveBrokers: (tenantId) => storage.getActiveBrokers(tenantId),
    getLeadAssignmentState: (tenantId) => storage.getLeadAssignmentState(tenantId),
    advanceLeadAssignment: (tenantId, nextUserId) =>
      storage.advanceLeadAssignment(tenantId, nextUserId),
    getLeadsByTenant: (tenantId) => storage.getLeadsByTenant(tenantId),
  };
}

export async function applyLeadDedupAndAssign<T extends LeadIntakeInput>(
  tenantId: string,
  leadData: T,
  options?: { port?: LeadDistributionPort },
): Promise<LeadIntakeResult<T>> {
  const normalizedPhone = normalizePhone(leadData.phone);
  const normalizedEmail = normalizeEmail(leadData.email);

  // 1. De-dup lookup against the partial unique index buckets.
  const existingLead = await storage.findLeadByDedup(
    tenantId,
    normalizedPhone,
    normalizedEmail,
  );
  if (existingLead) {
    return { duplicate: true, existingLead, leadData };
  }

  // 2. Persist normalized contact so the row lands in the same bucket the index uses.
  const enriched: T = {
    ...leadData,
    ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
  };

  // 3. Auto-assign only when the caller didn't already pin an owner.
  let assignedBrokerId: string | undefined;
  if (!enriched.assignedTo) {
    const next = await getNextBroker(tenantId, options?.port ?? storagePort());
    if (next) {
      enriched.assignedTo = next.broker.id;
      assignedBrokerId = next.broker.id;
    }
  }

  return { duplicate: false, leadData: enriched, assignedBrokerId };
}

/**
 * ACT-2 — Cria o lead resolvendo a corrida de de-dup de forma deterministica.
 *
 * `findLeadByDedup` + `createLead` em dois passos tem uma janela: duas requisicoes
 * concorrentes (ex.: o mesmo lead submetido duas vezes no formulario publico) podem
 * ambas passar o lookup e tentar inserir. O indice unico parcial
 * (`leads_tenant_phone_uniq` / `leads_tenant_email_uniq`) e a fonte de verdade
 * atomica: a segunda insercao falha com violacao de unicidade. Aqui capturamos essa
 * violacao e a tratamos como duplicata (mesma resposta do caminho sem corrida),
 * em vez de deixar virar um 500 generico.
 */
export async function createLeadDeduped<T extends LeadIntakeInput>(
  tenantId: string,
  leadData: T,
): Promise<
  | { duplicate: false; lead: StoredLead }
  | { duplicate: true; existingLead?: StoredLead }
> {
  try {
    const lead = (await storage.createLead(leadData as never)) as StoredLead;
    return { duplicate: false, lead };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Corrida perdida: outra requisicao criou o lead primeiro. Recupera o vencedor.
    const existingLead = await storage.findLeadByDedup(
      tenantId,
      normalizePhone(leadData.phone),
      normalizeEmail(leadData.email),
    );
    return { duplicate: true, existingLead };
  }
}
