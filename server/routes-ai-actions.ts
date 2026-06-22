/**
 * AI Actions Routes — actionable, auditable AI for the CRM.
 *
 * Surface:
 *   POST /api/ai/actions/plan          — propose structured actions (planner)
 *   GET  /api/ai/actions               — list tenant actions (filterable)
 *   POST /api/ai/actions/:id/approve   — approve a proposed action
 *   POST /api/ai/actions/:id/reject    — reject a proposed action
 *   POST /api/ai/actions/:id/execute   — execute (auto/approved) action
 *   GET  /api/ai/actions/:id/audit     — append-only audit trail
 *
 * All routes are requireAuth + tenant-scoped. move_stage / reactivate_contacts
 * require explicit approval before execution.
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import {
  getActionDefinition,
  getActionCatalog,
} from "./services/ai-actions/registry";
import { executeAction } from "./services/ai-actions/executor";
import { planActions, isPlannerAvailable } from "./services/ai-actions/planner";

function tenantOf(req: Request): string {
  return (req.user as any).tenantId as string;
}

function userIdOf(req: Request): string {
  return (req.user as any).id as string;
}

export function registerAiActionRoutes(app: Express): void {
  /**
   * GET /api/ai/actions/catalog
   * Static metadata about supported action types (no tenant data).
   */
  app.get(
    "/api/ai/actions/catalog",
    requireAuth,
    (_req: Request, res: Response) => {
      res.json({ aiAvailable: isPlannerAvailable(), actions: getActionCatalog() });
    },
  );

  /**
   * POST /api/ai/actions/plan
   * Propose structured actions for a lead/goal. Persists as status "proposed".
   * Degrades gracefully when ANTHROPIC_API_KEY is missing.
   */
  app.post(
    "/api/ai/actions/plan",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { leadId, goal } = req.body ?? {};
        if (leadId !== undefined && typeof leadId !== "string") {
          return res.status(400).json({ error: "leadId inválido" });
        }
        if (goal !== undefined && typeof goal !== "string") {
          return res.status(400).json({ error: "goal inválido" });
        }
        const result = await planActions({
          tenantId: tenantOf(req),
          requestedByUserId: userIdOf(req),
          leadId,
          goal,
        });
        res.json(result);
      } catch (error: any) {
        console.error("[ai-actions] plan error:", error?.message ?? error);
        res.status(500).json({ error: "Erro ao gerar plano de ações" });
      }
    },
  );

  /**
   * GET /api/ai/actions
   * List actions for the tenant, optional filters via query string.
   */
  app.get("/api/ai/actions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, targetType, targetId, actionType, limit } = req.query;
      const parsedLimit = limit ? Number.parseInt(limit as string, 10) : undefined;
      const actions = await storage.getAiActionsByTenant(tenantOf(req), {
        status: status as string | undefined,
        targetType: targetType as string | undefined,
        targetId: targetId as string | undefined,
        actionType: actionType as string | undefined,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      });
      res.json(actions);
    } catch (error: any) {
      console.error("[ai-actions] list error:", error?.message ?? error);
      res.status(500).json({ error: "Erro ao listar ações" });
    }
  });

  /**
   * POST /api/ai/actions/:id/approve
   */
  app.post(
    "/api/ai/actions/:id/approve",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = tenantOf(req);
        const action = await storage.getAiAction(req.params.id);
        if (!action || action.tenantId !== tenantId) {
          return res.status(404).json({ error: "Ação não encontrada" });
        }
        if (action.status !== "proposed") {
          return res
            .status(409)
            .json({ error: `Ação não está em estado "proposed" (atual: ${action.status})` });
        }
        const updated = await storage.updateAiActionStatus(action.id, {
          status: "approved",
          approvedBy: userIdOf(req),
          approvedAt: new Date() as any,
        } as any);
        await storage.appendAiActionAudit({
          tenantId,
          actionId: action.id,
          event: "approved",
          actorId: userIdOf(req),
          actorType: "user",
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        } as any);
        res.json(updated);
      } catch (error: any) {
        console.error("[ai-actions] approve error:", error?.message ?? error);
        res.status(500).json({ error: "Erro ao aprovar ação" });
      }
    },
  );

  /**
   * POST /api/ai/actions/:id/reject
   */
  app.post(
    "/api/ai/actions/:id/reject",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = tenantOf(req);
        const action = await storage.getAiAction(req.params.id);
        if (!action || action.tenantId !== tenantId) {
          return res.status(404).json({ error: "Ação não encontrada" });
        }
        if (action.status !== "proposed" && action.status !== "approved") {
          return res
            .status(409)
            .json({ error: `Ação não pode ser rejeitada (atual: ${action.status})` });
        }
        const reason =
          typeof req.body?.reason === "string" ? req.body.reason : undefined;
        const updated = await storage.updateAiActionStatus(action.id, {
          status: "rejected",
          error: reason ?? null,
        } as any);
        await storage.appendAiActionAudit({
          tenantId,
          actionId: action.id,
          event: "rejected",
          actorId: userIdOf(req),
          actorType: "user",
          details: reason ? { reason } : null,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        } as any);
        res.json(updated);
      } catch (error: any) {
        console.error("[ai-actions] reject error:", error?.message ?? error);
        res.status(500).json({ error: "Erro ao rejeitar ação" });
      }
    },
  );

  /**
   * POST /api/ai/actions/:id/execute
   * Auto-approve actions can be executed directly; approval-gated actions must
   * be "approved" first (enforced in the executor).
   */
  app.post(
    "/api/ai/actions/:id/execute",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = tenantOf(req);
        const action = await storage.getAiAction(req.params.id);
        if (!action || action.tenantId !== tenantId) {
          return res.status(404).json({ error: "Ação não encontrada" });
        }
        const def = getActionDefinition(action.actionType);
        if (def?.requiresApproval && action.status === "proposed") {
          return res.status(403).json({
            error: "Esta ação requer aprovação antes da execução.",
            requiresApproval: true,
          });
        }
        const outcome = await executeAction(action.id, {
          tenantId,
          approverUserId: userIdOf(req),
          ipAddress: req.ip ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        });
        if (!outcome.ok) {
          const code = outcome.status === "not_found" ? 404 : 422;
          return res.status(code).json(outcome);
        }
        res.json(outcome);
      } catch (error: any) {
        console.error("[ai-actions] execute error:", error?.message ?? error);
        res.status(500).json({ error: "Erro ao executar ação" });
      }
    },
  );

  /**
   * GET /api/ai/actions/:id/audit
   */
  app.get(
    "/api/ai/actions/:id/audit",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = tenantOf(req);
        const action = await storage.getAiAction(req.params.id);
        if (!action || action.tenantId !== tenantId) {
          return res.status(404).json({ error: "Ação não encontrada" });
        }
        const audit = await storage.getAiActionAudit(action.id);
        res.json(audit);
      } catch (error: any) {
        console.error("[ai-actions] audit error:", error?.message ?? error);
        res.status(500).json({ error: "Erro ao buscar auditoria" });
      }
    },
  );
}
