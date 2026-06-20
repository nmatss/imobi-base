export const VISIT_SLOT_MINUTES = 60;

const ACTIVE_VISIT_STATUSES = new Set(["scheduled", "confirmed"]);

export interface VisitScheduleCandidate {
  id?: string | null;
  propertyId: string;
  leadId?: string | null;
  assignedTo?: string | null;
  scheduledFor: string | Date;
  status?: string | null;
}

export type VisitScheduleCreateInput = VisitScheduleCandidate & {
  tenantId: string;
  notes?: string | null;
};

export interface VisitSchedulingConflict {
  reason: "property" | "broker";
  visitId: string;
  scheduledFor: Date;
}

export interface VisitSchedulePolicyResources<TVisit = unknown> {
  getProperty(id: string): Promise<{ tenantId: string } | null | undefined>;
  getLead(id: string): Promise<{ tenantId: string } | null | undefined>;
  getUser(id: string): Promise<{ tenantId: string } | null | undefined>;
  getVisitsByTenant(tenantId: string): Promise<VisitScheduleCandidate[]>;
  createVisit?(visit: VisitScheduleCreateInput): Promise<TVisit>;
}

export function findVisitSchedulingConflict(
  visits: VisitScheduleCandidate[],
  candidate: VisitScheduleCandidate,
  ignoreVisitId?: string,
): VisitSchedulingConflict | null {
  const candidateInterval = getVisitInterval(candidate);
  if (!candidateInterval) return null;
  if (!isActiveVisit(candidate)) {
    return null;
  }

  for (const visit of visits) {
    if (ignoreVisitId && visit.id === ignoreVisitId) continue;
    const visitInterval = getVisitInterval(visit, { allowInvalid: true });
    if (!visitInterval || !isActiveVisit(visit) || !intervalsOverlap(candidateInterval, visitInterval)) {
      continue;
    }

    const reason = getConflictReason(visit, candidate);
    if (reason) {
      return {
        reason,
        visitId: visit.id ?? "",
        scheduledFor: visitInterval.start,
      };
    }
  }

  return null;
}

export function formatVisitSchedulingConflict(conflict: VisitSchedulingConflict): string {
  const scheduledFor = conflict.scheduledFor.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  if (conflict.reason === "broker") {
    return `Corretor indisponível: já existe uma visita ativa no intervalo de ${VISIT_SLOT_MINUTES} minutos (${scheduledFor}).`;
  }

  return `Imóvel indisponível: já existe uma visita ativa no intervalo de ${VISIT_SLOT_MINUTES} minutos (${scheduledFor}).`;
}

export async function assertVisitSchedulePolicy(
  tenantId: string,
  visit: VisitScheduleCandidate,
  resources: VisitSchedulePolicyResources,
  ignoreVisitId?: string,
): Promise<void> {
  await validateVisitReferences(tenantId, visit, resources);

  let conflict;
  try {
    const tenantVisits = await resources.getVisitsByTenant(tenantId);
    conflict = findVisitSchedulingConflict(
      tenantVisits.map((tenantVisit) => ({
        id: tenantVisit.id,
        propertyId: tenantVisit.propertyId,
        assignedTo: tenantVisit.assignedTo,
        scheduledFor: tenantVisit.scheduledFor,
        status: tenantVisit.status,
      })),
      visit,
      ignoreVisitId,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Data da visita inválida") {
      throw createVisitScheduleError(400, error.message);
    }
    throw error;
  }

  if (conflict) {
    throw createVisitScheduleError(409, formatVisitSchedulingConflict(conflict));
  }
}

export async function createVisitWithPolicy<TVisit>(
  tenantId: string,
  visit: VisitScheduleCreateInput,
  resources: VisitSchedulePolicyResources<TVisit> & {
    createVisit(visit: VisitScheduleCreateInput): Promise<TVisit>;
  },
): Promise<TVisit> {
  await assertVisitSchedulePolicy(tenantId, visit, resources);
  return resources.createVisit({ ...visit, tenantId });
}

async function validateVisitReferences(
  tenantId: string,
  visit: VisitScheduleCandidate,
  resources: VisitSchedulePolicyResources,
): Promise<void> {
  const property = await resources.getProperty(visit.propertyId);
  validateTenantResource(property, tenantId, "Imóvel");

  if (visit.leadId) {
    const lead = await resources.getLead(visit.leadId);
    validateTenantResource(lead, tenantId, "Lead");
  }

  if (visit.assignedTo) {
    const broker = await resources.getUser(visit.assignedTo);
    validateTenantResource(broker, tenantId, "Corretor");
  }
}

function validateTenantResource(
  resource: { tenantId: string } | null | undefined,
  tenantId: string,
  resourceName: string,
): void {
  if (!resource || resource.tenantId !== tenantId) {
    throw createVisitScheduleError(404, `${resourceName} not found`);
  }
}

function createVisitScheduleError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function normalizeScheduledFor(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isActiveVisit(visit: Pick<VisitScheduleCandidate, "status">): boolean {
  return ACTIVE_VISIT_STATUSES.has(visit.status ?? "scheduled");
}

function getVisitInterval(
  visit: Pick<VisitScheduleCandidate, "scheduledFor">,
  options: { allowInvalid?: boolean } = {},
): { start: Date; end: Date } | null {
  const start = normalizeScheduledFor(visit.scheduledFor);
  if (!start) {
    if (options.allowInvalid) return null;
    throw new Error("Data da visita inválida");
  }

  return {
    start,
    end: new Date(start.getTime() + VISIT_SLOT_MINUTES * 60 * 1000),
  };
}

function intervalsOverlap(
  candidate: { start: Date; end: Date },
  existing: { start: Date; end: Date },
): boolean {
  return candidate.start < existing.end && existing.start < candidate.end;
}

function getConflictReason(
  visit: Pick<VisitScheduleCandidate, "propertyId" | "assignedTo">,
  candidate: Pick<VisitScheduleCandidate, "propertyId" | "assignedTo">,
): VisitSchedulingConflict["reason"] | null {
  if (visit.propertyId === candidate.propertyId) return "property";
  if (visit.assignedTo && candidate.assignedTo && visit.assignedTo === candidate.assignedTo) {
    return "broker";
  }
  return null;
}
