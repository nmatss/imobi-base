/**
 * arch-2 — Rotas de Lead Tags (extraidas de server/routes.ts).
 *
 * Mantem a ordem de /api/leads/tags/batch antes de /api/leads/:leadId/tags,
 * pois Express casaria "tags" como leadId se a ordem fosse invertida.
 */
import type { Express } from "express";
import {
  insertLeadTagSchema,
  insertLeadTagLinkSchema,
} from "@shared/schema-sqlite";
import { storage } from "../storage";
import { validateResourceTenant } from "../middleware/tenant-resource";
import { toHttpError, type RouteDeps } from "./_shared";

export function registerLeadTagRoutes(
  app: Express,
  deps: Pick<RouteDeps, "requireAuth">,
): void {
  const { requireAuth } = deps;

  app.get("/api/lead-tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getLeadTagsByTenant(req.user!.tenantId);
      res.json(tags);
    } catch (error: unknown) {
      res.status(500).json({ error: "Erro ao buscar tags" });
    }
  });

  app.post("/api/lead-tags", requireAuth, async (req, res) => {
    try {
      const data = insertLeadTagSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });
      const tag = await storage.createLeadTag(data);
      res.status(201).json(tag);
    } catch (error: unknown) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao criar tag",
      });
    }
  });

  app.patch("/api/lead-tags/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLeadTag(req.params.id);
      if (!existing)
        return res.status(404).json({ error: "Tag não encontrada" });
      if (existing.tenantId !== req.user!.tenantId)
        return res.status(403).json({ error: "Acesso negado" });
      // Mass-assignment guard: strip immutable fields before update.
      const {
        tenantId: _t,
        id: _id,
        createdAt: _c,
        ...allowedFields
      } = req.body;
      const tag = await storage.updateLeadTag(req.params.id, allowedFields);
      res.json(tag);
    } catch (error: unknown) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao atualizar tag",
      });
    }
  });

  app.delete("/api/lead-tags/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLeadTag(req.params.id);
      if (!existing)
        return res.status(404).json({ error: "Tag não encontrada" });
      if (existing.tenantId !== req.user!.tenantId)
        return res.status(403).json({ error: "Acesso negado" });
      await storage.deleteLeadTag(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ error: "Erro ao deletar tag" });
    }
  });

  app.get("/api/leads/tags/batch", requireAuth, async (req, res) => {
    try {
      const tagsMap = await storage.getTagsForAllLeads(req.user!.tenantId);
      res.json(tagsMap);
    } catch (error: unknown) {
      res.status(500).json({ error: "Erro ao buscar tags dos leads" });
    }
  });

  app.get("/api/leads/:leadId/tags", requireAuth, async (req, res) => {
    try {
      // IDOR Protection: validate the parent lead belongs to the tenant
      const lead = await storage.getLead(req.params.leadId);
      await validateResourceTenant(lead, req.user!.tenantId, "Lead");
      const tags = await storage.getTagsByLead(req.params.leadId);
      res.json(tags);
    } catch (error: unknown) {
      const httpErr = toHttpError(error);
      const message = httpErr.message || "Erro ao buscar tags do lead";
      res.status(httpErr.status).json({ error: message });
    }
  });

  app.post("/api/leads/:leadId/tags", requireAuth, async (req, res) => {
    try {
      const data = insertLeadTagLinkSchema.parse({
        leadId: req.params.leadId,
        tagId: req.body.tagId,
      });
      // IDOR Protection: validate both the lead and the tag belong to the
      // tenant before linking them.
      const lead = await storage.getLead(req.params.leadId);
      await validateResourceTenant(lead, req.user!.tenantId, "Lead");
      const tag = await storage.getLeadTag(data.tagId);
      await validateResourceTenant(tag, req.user!.tenantId, "Tag");
      const link = await storage.addTagToLead(data);
      res.status(201).json(link);
    } catch (error: unknown) {
      const httpErr = toHttpError(error);
      const status = httpErr.status === 500 ? 400 : httpErr.status;
      const message = httpErr.message || "Erro ao adicionar tag";
      res.status(status).json({ error: message });
    }
  });

  app.delete(
    "/api/leads/:leadId/tags/:tagId",
    requireAuth,
    async (req, res) => {
      try {
        // IDOR Protection: validate the parent lead belongs to the tenant
        // before removing any tag link.
        const lead = await storage.getLead(req.params.leadId);
        await validateResourceTenant(lead, req.user!.tenantId, "Lead");
        await storage.removeTagFromLead(req.params.leadId, req.params.tagId);
        res.json({ success: true });
      } catch (error: unknown) {
        const httpErr = toHttpError(error);
        const message = httpErr.message || "Erro ao remover tag";
        res.status(httpErr.status).json({ error: message });
      }
    },
  );
}
