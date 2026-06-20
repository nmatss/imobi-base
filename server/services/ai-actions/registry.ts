/**
 * AI Actions Registry
 *
 * Typed registry mapping each `actionType` to:
 *  - a Zod schema validating its payload
 *  - approval requirements + risk level
 *  - an `execute(ctx, payload)` that performs the side-effect via storage
 *  - a `preview(ctx, payload)` returning a human-readable, side-effect-free summary
 *
 * Every action is AUDITABLE: the executor records before/after state. Every
 * action is ACTIONABLE: it maps to concrete storage mutations.
 *
 * IMPORTANT: This file MUST NOT edit shared schema / storage. It only consumes
 * the existing storage interface.
 */

import { z } from "zod";
import { storage } from "../../storage";

// ==================== Execution Context ====================

export interface AiActionContext {
  tenantId: string;
  /** User id of whoever triggers the execution (approver or auto-approver). */
  actorUserId: string;
}

export interface ActionExecuteResult {
  /** Human-readable summary of what happened. */
  summary: string;
  /** Structured "before" snapshot for audit. */
  before?: unknown;
  /** Structured "after" snapshot for audit. */
  after?: unknown;
  /** Arbitrary structured result persisted on the action. */
  result?: unknown;
}

export interface ActionPreview {
  summary: string;
  details?: Record<string, unknown>;
}

export type RiskLevel = "low" | "medium" | "high";

export interface ActionDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  actionType: string;
  /** Where this action operates: "lead" | "contact" | etc. */
  targetType: string;
  schema: S;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  description: string;
  preview: (ctx: AiActionContext, payload: z.infer<S>) => Promise<ActionPreview>;
  execute: (ctx: AiActionContext, payload: z.infer<S>) => Promise<ActionExecuteResult>;
}

// ==================== Helpers ====================

async function loadTenantLead(ctx: AiActionContext, leadId: string) {
  const lead = await storage.getLead(leadId);
  if (!lead || lead.tenantId !== ctx.tenantId) {
    throw new Error("Lead não encontrado ou fora do tenant");
  }
  return lead;
}

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

// ==================== Payload Schemas ====================

const qualifyLeadSchema = z.object({
  leadId: z.string().min(1),
  status: z.enum(LEAD_STATUSES),
  notes: z.string().max(2000).optional(),
});

const suggestPropertiesSchema = z.object({
  leadId: z.string().min(1),
  propertyIds: z.array(z.string().min(1)).min(1).max(10),
  message: z.string().max(2000).optional(),
});

const createFollowUpSchema = z.object({
  leadId: z.string().min(1),
  dueAt: z.string().datetime(),
  type: z.enum(["call", "email", "whatsapp", "visit", "task"]).default("call"),
  notes: z.string().max(2000).optional(),
});

const logSummarySchema = z.object({
  leadId: z.string().min(1),
  summary: z.string().min(1).max(4000),
});

const moveStageSchema = z.object({
  leadId: z.string().min(1),
  toStatus: z.enum(LEAD_STATUSES),
  reason: z.string().max(2000).optional(),
});

const reactivateContactsSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1).max(50),
  message: z.string().max(2000).optional(),
});

// ==================== Action Definitions ====================

const qualifyLead: ActionDefinition<typeof qualifyLeadSchema> = {
  actionType: "qualify_lead",
  targetType: "lead",
  schema: qualifyLeadSchema,
  requiresApproval: false,
  riskLevel: "low",
  description: "Atualiza o status de qualificação do lead.",
  async preview(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    return {
      summary: `Qualificar lead "${lead.name}" como "${payload.status}".`,
      details: { from: lead.status, to: payload.status },
    };
  },
  async execute(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    const before = { status: lead.status, notes: lead.notes };
    const updated = await storage.updateLead(payload.leadId, {
      status: payload.status,
      ...(payload.notes ? { notes: payload.notes } : {}),
    });
    return {
      summary: `Lead "${lead.name}" qualificado: ${lead.status} → ${payload.status}.`,
      before,
      after: { status: updated?.status, notes: updated?.notes },
      result: { leadId: payload.leadId, status: payload.status },
    };
  },
};

const suggestProperties: ActionDefinition<typeof suggestPropertiesSchema> = {
  actionType: "suggest_properties",
  targetType: "lead",
  schema: suggestPropertiesSchema,
  requiresApproval: false, // auto-approve
  riskLevel: "low",
  description: "Registra sugestões de imóveis para o lead como interação.",
  async preview(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    return {
      summary: `Sugerir ${payload.propertyIds.length} imóvel(is) para "${lead.name}".`,
      details: { propertyIds: payload.propertyIds },
    };
  },
  async execute(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    const content =
      `Sugestão de imóveis (IA): ${payload.propertyIds.join(", ")}` +
      (payload.message ? `\n${payload.message}` : "");
    const interaction = await storage.createInteraction({
      leadId: payload.leadId,
      userId: ctx.actorUserId,
      type: "ai_suggestion",
      content,
    });
    return {
      summary: `Sugestão de ${payload.propertyIds.length} imóvel(is) registrada para "${lead.name}".`,
      before: null,
      after: { interactionId: interaction.id, propertyIds: payload.propertyIds },
      result: { interactionId: interaction.id },
    };
  },
};

const createFollowUp: ActionDefinition<typeof createFollowUpSchema> = {
  actionType: "create_follow_up",
  targetType: "lead",
  schema: createFollowUpSchema,
  requiresApproval: false,
  riskLevel: "low",
  description: "Cria um follow-up agendado para o lead.",
  async preview(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    return {
      summary: `Criar follow-up (${payload.type}) para "${lead.name}" em ${payload.dueAt}.`,
      details: { type: payload.type, dueAt: payload.dueAt },
    };
  },
  async execute(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    const followUp = await storage.createFollowUp({
      tenantId: ctx.tenantId,
      leadId: payload.leadId,
      dueAt: new Date(payload.dueAt) as any,
      type: payload.type,
      status: "pending",
      ...(payload.notes ? { notes: payload.notes } : {}),
    } as any);
    return {
      summary: `Follow-up (${payload.type}) criado para "${lead.name}".`,
      before: null,
      after: { followUpId: followUp.id, dueAt: payload.dueAt },
      result: { followUpId: followUp.id },
    };
  },
};

const logSummary: ActionDefinition<typeof logSummarySchema> = {
  actionType: "log_summary",
  targetType: "lead",
  schema: logSummarySchema,
  requiresApproval: false, // auto-approve
  riskLevel: "low",
  description: "Registra um resumo da conversa como interação no lead.",
  async preview(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    return {
      summary: `Registrar resumo no lead "${lead.name}".`,
      details: { length: payload.summary.length },
    };
  },
  async execute(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    const interaction = await storage.createInteraction({
      leadId: payload.leadId,
      userId: ctx.actorUserId,
      type: "ai_summary",
      content: payload.summary,
    });
    return {
      summary: `Resumo registrado no lead "${lead.name}".`,
      before: null,
      after: { interactionId: interaction.id },
      result: { interactionId: interaction.id },
    };
  },
};

const moveStage: ActionDefinition<typeof moveStageSchema> = {
  actionType: "move_stage",
  targetType: "lead",
  schema: moveStageSchema,
  requiresApproval: true, // requires approval
  riskLevel: "medium",
  description: "Move o lead para outro estágio do funil (requer aprovação).",
  async preview(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    return {
      summary: `Mover "${lead.name}" para "${payload.toStatus}".`,
      details: { from: lead.status, to: payload.toStatus, reason: payload.reason },
    };
  },
  async execute(ctx, payload) {
    const lead = await loadTenantLead(ctx, payload.leadId);
    const before = { status: lead.status };
    const updated = await storage.updateLead(payload.leadId, {
      status: payload.toStatus,
    });
    // Leave an auditable interaction trail explaining the move.
    await storage.createInteraction({
      leadId: payload.leadId,
      userId: ctx.actorUserId,
      type: "ai_stage_change",
      content:
        `Estágio alterado (IA, aprovado): ${lead.status} → ${payload.toStatus}` +
        (payload.reason ? `\nMotivo: ${payload.reason}` : ""),
    });
    return {
      summary: `Lead "${lead.name}" movido: ${lead.status} → ${payload.toStatus}.`,
      before,
      after: { status: updated?.status },
      result: { leadId: payload.leadId, status: payload.toStatus },
    };
  },
};

const reactivateContacts: ActionDefinition<typeof reactivateContactsSchema> = {
  actionType: "reactivate_contacts",
  targetType: "lead",
  schema: reactivateContactsSchema,
  requiresApproval: true, // requires approval, high risk
  riskLevel: "high",
  description:
    "Reativa múltiplos contatos inativos em lote (requer aprovação, alto risco).",
  async preview(ctx, payload) {
    return {
      summary: `Reativar ${payload.leadIds.length} contato(s) inativo(s).`,
      details: { count: payload.leadIds.length },
    };
  },
  async execute(ctx, payload) {
    const reactivated: string[] = [];
    const skipped: string[] = [];
    for (const leadId of payload.leadIds) {
      const lead = await storage.getLead(leadId);
      if (!lead || lead.tenantId !== ctx.tenantId) {
        skipped.push(leadId);
        continue;
      }
      await storage.updateLead(leadId, { status: "contacted" });
      await storage.createInteraction({
        leadId,
        userId: ctx.actorUserId,
        type: "ai_reactivation",
        content:
          "Reativação em lote (IA, aprovada)." +
          (payload.message ? `\n${payload.message}` : ""),
      });
      reactivated.push(leadId);
    }
    return {
      summary: `${reactivated.length} contato(s) reativado(s)${
        skipped.length ? `, ${skipped.length} ignorado(s)` : ""
      }.`,
      before: { requested: payload.leadIds.length },
      after: { reactivated, skipped },
      result: { reactivated, skipped },
    };
  },
};

// ==================== Registry ====================

const definitions = [
  qualifyLead,
  suggestProperties,
  createFollowUp,
  logSummary,
  moveStage,
  reactivateContacts,
] as const;

export type AiActionType = (typeof definitions)[number]["actionType"];

const registry = new Map<string, ActionDefinition>(
  definitions.map((d) => [d.actionType, d as ActionDefinition]),
);

export function getActionDefinition(
  actionType: string,
): ActionDefinition | undefined {
  return registry.get(actionType);
}

export function listActionDefinitions(): ActionDefinition[] {
  return Array.from(registry.values());
}

/**
 * Validate an unknown payload against the registry schema for `actionType`.
 * Throws if the action type is unknown or the payload is invalid.
 */
export function validatePayload(actionType: string, payload: unknown): unknown {
  const def = registry.get(actionType);
  if (!def) {
    throw new Error(`Tipo de ação desconhecido: ${actionType}`);
  }
  return def.schema.parse(payload);
}

/**
 * Lightweight metadata for the planner / API surface (no functions exposed).
 */
export function getActionCatalog() {
  return listActionDefinitions().map((d) => ({
    actionType: d.actionType,
    targetType: d.targetType,
    requiresApproval: d.requiresApproval,
    riskLevel: d.riskLevel,
    description: d.description,
  }));
}
