/**
 * Client helpers for the AI Actions feature.
 *
 * All mutating calls go through `apiClient`, which already injects CSRF headers
 * (see client/src/lib/api-client.ts -> csrfHeaders) and credentials.
 */

import { apiClient } from "@/lib/api-client";

export type AiActionStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "expired";

export interface AiAction {
  id: string;
  tenantId: string;
  actionType: string;
  status: AiActionStatus;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  rationale: string | null;
  confidence: number | null;
  requiresApproval: boolean;
  riskLevel: string | null;
  proposedBy: string;
  aiModel: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  result: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiActionAudit {
  id: string;
  tenantId: string;
  actionId: string;
  event: string;
  actorId: string | null;
  actorType: string;
  beforeState: unknown;
  afterState: unknown;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PlannedActionSummary {
  id: string;
  actionType: string;
  status: string;
  requiresApproval: boolean;
  riskLevel: string | null;
  rationale: string | null;
  payload: unknown;
}

export interface PlanResult {
  aiAvailable: boolean;
  created: PlannedActionSummary[];
  warnings: string[];
}

export interface ExecuteOutcome {
  ok: boolean;
  status: string;
  summary?: string;
  error?: string;
  alreadyExecuted?: boolean;
}

export interface ListFilters {
  status?: string;
  targetType?: string;
  targetId?: string;
  actionType?: string;
}

function toQuery(filters?: ListFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.targetId) params.set("targetId", filters.targetId);
  if (filters.actionType) params.set("actionType", filters.actionType);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const aiActionsApi = {
  plan(input: { leadId?: string; goal?: string }): Promise<PlanResult> {
    return apiClient.post<PlanResult>("/api/ai/actions/plan", input);
  },

  list(filters?: ListFilters): Promise<AiAction[]> {
    return apiClient.get<AiAction[]>(`/api/ai/actions${toQuery(filters)}`);
  },

  approve(id: string): Promise<AiAction> {
    return apiClient.post<AiAction>(`/api/ai/actions/${id}/approve`);
  },

  reject(id: string, reason?: string): Promise<AiAction> {
    return apiClient.post<AiAction>(`/api/ai/actions/${id}/reject`, { reason });
  },

  execute(id: string): Promise<ExecuteOutcome> {
    return apiClient.post<ExecuteOutcome>(`/api/ai/actions/${id}/execute`);
  },

  audit(id: string): Promise<AiActionAudit[]> {
    return apiClient.get<AiActionAudit[]>(`/api/ai/actions/${id}/audit`);
  },
};

export const RISK_LABEL: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

export const ACTION_TYPE_LABEL: Record<string, string> = {
  qualify_lead: "Qualificar lead",
  suggest_properties: "Sugerir imóveis",
  create_follow_up: "Criar follow-up",
  log_summary: "Registrar resumo",
  move_stage: "Mover estágio",
  reactivate_contacts: "Reativar contatos",
};

export const STATUS_LABEL: Record<string, string> = {
  proposed: "Proposta",
  approved: "Aprovada",
  rejected: "Rejeitada",
  executed: "Executada",
  failed: "Falhou",
  expired: "Expirada",
};
