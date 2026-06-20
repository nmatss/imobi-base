/**
 * AI Actions Executor
 *
 * Executes a previously-proposed (and, when required, approved) ai_action.
 *
 * Guarantees:
 *  - Re-validates the payload against the registry Zod schema before running.
 *  - Enforces tenant scoping (action.tenantId must match the caller's tenant).
 *  - Enforces approval gating (requiresApproval actions must be "approved").
 *  - Idempotent by status: an action already "executed" is never re-run.
 *  - Records an append-only audit trail with before/after state.
 */

import { storage } from "../../storage";
import {
  getActionDefinition,
  type AiActionContext,
} from "./registry";

export interface ExecuteOptions {
  /** Tenant of the authenticated caller (must match the action's tenant). */
  tenantId: string;
  /** User performing the execution (approver / operator). */
  approverUserId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExecuteOutcome {
  ok: boolean;
  status: string;
  summary?: string;
  error?: string;
  /** True when the call short-circuited because it was already executed. */
  alreadyExecuted?: boolean;
}

export async function executeAction(
  actionId: string,
  options: ExecuteOptions,
): Promise<ExecuteOutcome> {
  const { tenantId, approverUserId, ipAddress, userAgent } = options;

  const action = await storage.getAiAction(actionId);
  if (!action || action.tenantId !== tenantId) {
    return { ok: false, status: "not_found", error: "Ação não encontrada" };
  }

  // Idempotency: never re-run a terminal-executed action.
  if (action.status === "executed") {
    return {
      ok: true,
      status: "executed",
      alreadyExecuted: true,
      summary: "Ação já havia sido executada.",
    };
  }

  if (action.status === "rejected" || action.status === "expired") {
    return {
      ok: false,
      status: action.status,
      error: `Ação está em estado "${action.status}" e não pode ser executada.`,
    };
  }

  const def = getActionDefinition(action.actionType);
  if (!def) {
    return {
      ok: false,
      status: action.status,
      error: `Tipo de ação desconhecido: ${action.actionType}`,
    };
  }

  // Approval gating.
  if (def.requiresApproval && action.status !== "approved") {
    return {
      ok: false,
      status: action.status,
      error: "Esta ação requer aprovação antes da execução.",
    };
  }

  // Re-validate payload (defense in depth — payload could be tampered in DB).
  let payload: unknown;
  try {
    payload = def.schema.parse(parseMaybeJson(action.payload));
  } catch (err: any) {
    await safeAudit(action.id, tenantId, {
      event: "execute_failed",
      actorId: approverUserId,
      actorType: "user",
      details: { reason: "invalid_payload", message: String(err?.message ?? err) },
      ipAddress,
      userAgent,
    });
    await storage.updateAiActionStatus(action.id, {
      status: "failed",
      error: `Payload inválido: ${err?.message ?? err}`,
    } as any);
    return { ok: false, status: "failed", error: "Payload inválido" };
  }

  const ctx: AiActionContext = { tenantId, actorUserId: approverUserId };

  try {
    const outcome = await def.execute(ctx, payload as any);

    await storage.updateAiActionStatus(action.id, {
      status: "executed",
      executedAt: new Date() as any,
      result: outcome.result ?? null,
      error: null,
    } as any);

    await safeAudit(action.id, tenantId, {
      event: "executed",
      actorId: approverUserId,
      actorType: "user",
      beforeState: outcome.before ?? null,
      afterState: outcome.after ?? null,
      details: { summary: outcome.summary, actionType: action.actionType },
      ipAddress,
      userAgent,
    });

    return { ok: true, status: "executed", summary: outcome.summary };
  } catch (err: any) {
    const message = String(err?.message ?? err);
    await storage.updateAiActionStatus(action.id, {
      status: "failed",
      error: message,
    } as any);
    await safeAudit(action.id, tenantId, {
      event: "execute_failed",
      actorId: approverUserId,
      actorType: "user",
      details: { message, actionType: action.actionType },
      ipAddress,
      userAgent,
    });
    return { ok: false, status: "failed", error: message };
  }
}

// ==================== Internal helpers ====================

function parseMaybeJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function safeAudit(
  actionId: string,
  tenantId: string,
  data: {
    event: string;
    actorId?: string;
    actorType: string;
    beforeState?: unknown;
    afterState?: unknown;
    details?: unknown;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  try {
    await storage.appendAiActionAudit({
      tenantId,
      actionId,
      event: data.event,
      actorId: data.actorId ?? null,
      actorType: data.actorType,
      beforeState: (data.beforeState ?? null) as any,
      afterState: (data.afterState ?? null) as any,
      details: (data.details ?? null) as any,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    } as any);
  } catch (err) {
    // Audit must never break execution flow.
    console.error("[ai-actions] Falha ao gravar auditoria:", err);
  }
}
