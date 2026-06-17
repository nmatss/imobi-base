const FIRST_RESPONSE_TARGET_MINUTES = 15;

const STALE_HOURS_BY_STATUS: Record<string, number> = {
  new: 4,
  qualification: 24,
  visit: 48,
  proposal: 72,
};

export interface LeadSlaLead {
  id: string;
  status: string;
  assignedTo?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

export interface LeadSlaInteraction {
  createdAt: string | Date;
}

export interface LeadSlaStatus {
  leadId: string;
  firstResponseStatus: "pending" | "met" | "late";
  firstResponseMinutes: number | null;
  stale: boolean;
  staleHours: number;
  priority: "urgent" | "high" | "normal" | "low";
  nextAction: string;
}

export interface LeadSlaSummary {
  items: LeadSlaStatus[];
  totals: {
    total: number;
    pendingFirstResponse: number;
    lateFirstResponse: number;
    stale: number;
    urgent: number;
    unassigned: number;
  };
}

export function calculateLeadSlaStatus(
  lead: LeadSlaLead,
  interactions: LeadSlaInteraction[],
  now = new Date(),
): LeadSlaStatus {
  const createdAt = parseDateOrThrow(lead.createdAt, "createdAt");
  const updatedAt = parseDateOrThrow(lead.updatedAt ?? lead.createdAt, "updatedAt");
  const firstInteractionAt = findFirstInteractionAt(interactions);
  const lastInteractionAt = findLastInteractionAt(interactions);
  const firstResponseMinutes = firstInteractionAt
    ? Math.max(0, Math.round((firstInteractionAt.getTime() - createdAt.getTime()) / 60000))
    : null;

  const firstResponseStatus = getFirstResponseStatus(firstResponseMinutes);
  const staleHours = getStaleHours(lead, updatedAt, lastInteractionAt, now);
  const stale = staleHours >= (STALE_HOURS_BY_STATUS[lead.status] ?? 72);
  const priority = getLeadSlaPriority({
    assignedTo: lead.assignedTo,
    firstResponseStatus,
    stale,
    status: lead.status,
  });

  return {
    leadId: lead.id,
    firstResponseStatus,
    firstResponseMinutes,
    stale,
    staleHours,
    priority,
    nextAction: getNextSlaAction({
      assignedTo: lead.assignedTo,
      firstResponseStatus,
      stale,
      status: lead.status,
    }),
  };
}

export function summarizeLeadSla(
  leads: LeadSlaLead[],
  interactionsByLeadId: Map<string, LeadSlaInteraction[]>,
  now = new Date(),
): LeadSlaSummary {
  const items = leads.map((lead) =>
    calculateLeadSlaStatus(lead, interactionsByLeadId.get(lead.id) ?? [], now),
  );

  return {
    items,
    totals: {
      total: items.length,
      pendingFirstResponse: items.filter((item) => item.firstResponseStatus === "pending").length,
      lateFirstResponse: items.filter((item) => item.firstResponseStatus === "late").length,
      stale: items.filter((item) => item.stale).length,
      urgent: items.filter((item) => item.priority === "urgent").length,
      unassigned: leads.filter((lead) => !lead.assignedTo).length,
    },
  };
}

function getFirstResponseStatus(firstResponseMinutes: number | null): LeadSlaStatus["firstResponseStatus"] {
  if (firstResponseMinutes === null) return "pending";
  return firstResponseMinutes <= FIRST_RESPONSE_TARGET_MINUTES ? "met" : "late";
}

function getStaleHours(
  lead: Pick<LeadSlaLead, "status">,
  updatedAt: Date,
  firstInteractionAt: Date | null,
  now: Date,
): number {
  const lastTouch = firstInteractionAt && firstInteractionAt > updatedAt ? firstInteractionAt : updatedAt;
  if (lead.status === "contract") return 0;
  return Math.max(0, Math.floor((now.getTime() - lastTouch.getTime()) / 3600000));
}

function getLeadSlaPriority(input: {
  assignedTo?: string | null;
  firstResponseStatus: LeadSlaStatus["firstResponseStatus"];
  stale: boolean;
  status: string;
}): LeadSlaStatus["priority"] {
  if (!input.assignedTo || input.firstResponseStatus === "pending") return "urgent";
  if (input.firstResponseStatus === "late" || input.stale) return "high";
  if (input.status === "proposal" || input.status === "visit") return "normal";
  return "low";
}

function getNextSlaAction(input: {
  assignedTo?: string | null;
  firstResponseStatus: LeadSlaStatus["firstResponseStatus"];
  stale: boolean;
  status: string;
}): string {
  if (!input.assignedTo) return "Distribuir lead para um corretor";
  if (input.firstResponseStatus === "pending") return "Fazer primeiro atendimento agora";
  if (input.stale) return "Reativar contato e registrar próxima ação";
  if (input.status === "qualification") return "Sugerir imóveis e agendar visita";
  if (input.status === "visit") return "Registrar feedback da visita";
  if (input.status === "proposal") return "Fazer follow-up da proposta";
  return "Manter acompanhamento";
}

function findFirstInteractionAt(interactions: LeadSlaInteraction[]): Date | null {
  const dates = interactions
    .map((interaction) => parseDate(interaction.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}

function findLastInteractionAt(interactions: LeadSlaInteraction[]): Date | null {
  const dates = interactions
    .map((interaction) => parseDate(interaction.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ?? null;
}

function parseDateOrThrow(value: string | Date, field: string): Date {
  const date = parseDate(value);
  if (!date) throw new Error(`Data inválida em ${field}`);
  return date;
}

function parseDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
