/**
 * Agenda + CRM routes.
 *
 * Public (token-based, no auth — the lead clicks a link from WhatsApp/email):
 *   GET  /api/visits/confirm/:token       → visit summary for the confirm page
 *   POST /api/visits/confirm/:token       → confirm or decline a visit
 *   POST /api/visits/reschedule/:token    → propose a new slot (reuses the conflict policy)
 *
 * Authenticated (tenant-scoped):
 *   PATCH /api/visits/:id/checklist        → save the visit checklist
 *   POST  /api/visits/:id/feedback         → record post-visit feedback + next action
 *   GET   /api/settings/lead-score-weights → read per-tenant scoring weights
 *   PUT   /api/settings/lead-score-weights → upsert per-tenant scoring weights
 *   GET   /api/settings/lead-distribution  → read distribution strategy + cursor
 *   PATCH /api/settings/lead-distribution  → update distribution strategy
 *
 * Register with `registerAgendaCrmRoutes(app)` (see integrationInstructions).
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "./middleware/error-handler";
import { assertVisitSchedulePolicy } from "./services/visit-scheduling";
import { sendVisitConfirmationRequest } from "./services/visit-notifications";
import { resolveLeadScoreWeights } from "./services/lead-score-weighted";

// ---------- validation schemas ----------

const confirmActionSchema = z.object({
  action: z.enum(["confirm", "decline"]).default("confirm"),
});

const rescheduleSchema = z.object({
  scheduledFor: z.string().min(1, "scheduledFor é obrigatório"),
});

const checklistSchema = z.object({
  checklist: z.any(),
});

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  notes: z.string().optional(),
  nextActionType: z.string().optional(),
  nextActionDueAt: z.string().optional(),
});

const weightsSchema = z.object({
  budgetWeight: z.coerce.number().int().min(0).max(100).optional(),
  engagementWeight: z.coerce.number().int().min(0).max(100).optional(),
  profileWeight: z.coerce.number().int().min(0).max(100).optional(),
  urgencyWeight: z.coerce.number().int().min(0).max(100).optional(),
  behaviorWeight: z.coerce.number().int().min(0).max(100).optional(),
  hotThreshold: z.coerce.number().int().min(0).max(200).optional(),
  warmThreshold: z.coerce.number().int().min(0).max(200).optional(),
});

const distributionSchema = z.object({
  strategy: z.enum(["round_robin", "least_loaded"]),
});

// ---------- helpers ----------

/**
 * Upsert the lead-distribution strategy for a tenant.
 *
 * `storage.advanceLeadAssignment` only moves the round-robin cursor; it never sets
 * `strategy`. There is no shared storage method for the strategy column, so we write
 * it directly via Drizzle against the same `lead_assignment_state` table (tenant_id is
 * UNIQUE). We do not touch `lastAssignedUserId`, preserving the round-robin cursor.
 */
async function upsertDistributionStrategy(
  tenantId: string,
  strategy: string,
): Promise<{ strategy: string | null; lastAssignedUserId: string | null }> {
  const table = (schema as any).leadAssignmentState;
  const [existing] = await db.select().from(table).where(eq(table.tenantId, tenantId));
  if (existing) {
    const [row] = await db
      .update(table)
      .set({ strategy, updatedAt: new Date().toISOString() } as any)
      .where(eq(table.tenantId, tenantId))
      .returning();
    return { strategy: row?.strategy ?? strategy, lastAssignedUserId: row?.lastAssignedUserId ?? null };
  }
  const [row] = await db
    .insert(table)
    .values({ tenantId, strategy, updatedAt: new Date().toISOString() } as any)
    .returning();
  return { strategy: row?.strategy ?? strategy, lastAssignedUserId: row?.lastAssignedUserId ?? null };
}

/** Public-facing, non-sensitive view of a visit for the confirm page. */
function publicVisitView(visit: any) {
  return {
    id: visit.id,
    scheduledFor: visit.scheduledFor,
    status: visit.status,
    confirmationStatus: visit.confirmationStatus,
    propertyId: visit.propertyId,
    notes: visit.notes ?? null,
  };
}

export function registerAgendaCrmRoutes(app: Express): void {
  // ============================================================
  // PUBLIC token endpoints (no auth)
  // ============================================================

  app.get(
    "/api/visits/confirm/:token",
    asyncHandler(async (req: Request, res: Response) => {
      const visit = await storage.getVisitByConfirmationToken(req.params.token);
      if (!visit) throw new NotFoundError("Visita");
      const property = await storage.getProperty(visit.propertyId);
      res.json({
        visit: publicVisitView(visit),
        property: property
          ? {
              id: property.id,
              title: (property as any).title ?? null,
              address: (property as any).address ?? null,
              city: (property as any).city ?? null,
            }
          : null,
      });
    }),
  );

  app.post(
    "/api/visits/confirm/:token",
    asyncHandler(async (req: Request, res: Response) => {
      const visit = await storage.getVisitByConfirmationToken(req.params.token);
      if (!visit) throw new NotFoundError("Visita");

      const { action } = confirmActionSchema.parse(req.body ?? {});
      const confirmationStatus = action === "decline" ? "declined" : "confirmed";
      const updated = await storage.updateVisitConfirmation(visit.id, confirmationStatus);

      // Keep the lifecycle status in sync when confirmed.
      if (action === "confirm") {
        await storage.updateVisit(visit.id, { status: "confirmed" } as any);
      }

      res.json({
        success: true,
        confirmationStatus,
        visit: publicVisitView(updated ?? { ...visit, confirmationStatus }),
      });
    }),
  );

  app.post(
    "/api/visits/reschedule/:token",
    asyncHandler(async (req: Request, res: Response) => {
      const visit = await storage.getVisitByConfirmationToken(req.params.token);
      if (!visit) throw new NotFoundError("Visita");

      const { scheduledFor } = rescheduleSchema.parse(req.body ?? {});
      const when = new Date(scheduledFor);
      if (Number.isNaN(when.getTime())) {
        throw new BadRequestError("Data inválida");
      }

      // Reuse the SAME conflict policy used by the authenticated scheduling flow.
      // Ignore the visit being rescheduled so it doesn't conflict with itself.
      try {
        await assertVisitSchedulePolicy(
          visit.tenantId,
          {
            propertyId: visit.propertyId,
            leadId: visit.leadId,
            assignedTo: visit.assignedTo,
            scheduledFor: when,
            status: "scheduled",
          },
          storage,
          visit.id,
        );
      } catch (error: any) {
        if (error?.status === 409) throw new ConflictError(error.message);
        if (error?.status === 400) throw new BadRequestError(error.message);
        if (error?.status === 404) throw new NotFoundError(error.message);
        throw error;
      }

      const newVisit = await storage.createRescheduledVisit(visit.id, {
        tenantId: visit.tenantId,
        propertyId: visit.propertyId,
        leadId: visit.leadId,
        assignedTo: visit.assignedTo,
        scheduledFor: when as any,
        notes: visit.notes,
      });

      // Mark the original as cancelled (declined the old slot) and fire a fresh
      // confirmation request for the new slot.
      await storage.updateVisitConfirmation(visit.id, "declined");
      await storage.updateVisit(visit.id, { status: "cancelled" } as any);
      try {
        await sendVisitConfirmationRequest(newVisit);
      } catch {
        // Non-fatal: the visit was rescheduled even if notification dispatch fails.
      }

      res.status(201).json({ success: true, visit: publicVisitView(newVisit) });
    }),
  );

  // ============================================================
  // AUTHENTICATED visit endpoints
  // ============================================================

  async function getOwnedVisit(id: string, tenantId: string) {
    const visit = await storage.getVisit(id);
    if (!visit || visit.tenantId !== tenantId) {
      throw new NotFoundError("Visita");
    }
    return visit;
  }

  app.patch(
    "/api/visits/:id/checklist",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      await getOwnedVisit(req.params.id, tenantId);
      const { checklist } = checklistSchema.parse(req.body ?? {});
      const updated = await storage.saveVisitChecklist(req.params.id, checklist);
      res.json({ success: true, visit: updated });
    }),
  );

  app.post(
    "/api/visits/:id/feedback",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      await getOwnedVisit(req.params.id, tenantId);
      const body = feedbackSchema.parse(req.body ?? {});
      const dueAt = body.nextActionDueAt ? new Date(body.nextActionDueAt) : undefined;
      if (dueAt && Number.isNaN(dueAt.getTime())) {
        throw new BadRequestError("nextActionDueAt inválido");
      }
      const updated = await storage.saveVisitFeedback(
        req.params.id,
        body.rating,
        body.notes,
        body.nextActionType,
        dueAt,
      );
      res.json({ success: true, visit: updated });
    }),
  );

  // ============================================================
  // SETTINGS: lead score weights
  // ============================================================

  app.get(
    "/api/settings/lead-score-weights",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const weights = await storage.getLeadScoreWeights(req.user!.tenantId);
      res.json(resolveLeadScoreWeights(weights as any));
    }),
  );

  app.put(
    "/api/settings/lead-score-weights",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const patch = weightsSchema.parse(req.body ?? {});
      const updated = await storage.upsertLeadScoreWeights(tenantId, patch as any);
      res.json(resolveLeadScoreWeights(updated as any));
    }),
  );

  // ============================================================
  // SETTINGS: lead distribution
  // ============================================================

  app.get(
    "/api/settings/lead-distribution",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const state = await storage.getLeadAssignmentState(tenantId);
      res.json({
        strategy: state?.strategy ?? "round_robin",
        lastAssignedUserId: state?.lastAssignedUserId ?? null,
      });
    }),
  );

  app.patch(
    "/api/settings/lead-distribution",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const { strategy } = distributionSchema.parse(req.body ?? {});
      const updated = await upsertDistributionStrategy(tenantId, strategy);
      res.json({
        strategy: updated.strategy ?? strategy,
        lastAssignedUserId: updated.lastAssignedUserId ?? null,
      });
    }),
  );
}
