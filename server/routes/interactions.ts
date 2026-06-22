/**
 * arch-1 — Rotas de Interactions (extraidas de server/routes.ts).
 * Caso de complexidade media: usa requireAuth (deps) + IDOR via validateResourceTenant.
 */
import type { Express } from "express";
import { insertInteractionSchema } from "@shared/schema-sqlite";
import { storage } from "../storage";
import { validateResourceTenant } from "../middleware/tenant-resource";
import { toHttpError, type RouteDeps } from "./_shared";

export function registerInteractionRoutes(
  app: Express,
  deps: Pick<RouteDeps, "requireAuth">,
): void {
  const { requireAuth } = deps;

  app.get("/api/leads/:leadId/interactions", requireAuth, async (req, res) => {
    try {
      // IDOR Protection: validate the parent lead belongs to the tenant
      const lead = await storage.getLead(req.params.leadId);
      await validateResourceTenant(lead, req.user!.tenantId, "Lead");
      const interactions = await storage.getInteractionsByLead(
        req.params.leadId,
      );
      res.json(interactions);
    } catch (error: unknown) {
      const httpErr = toHttpError(error);
      const message = httpErr.message || "Erro ao buscar interações";
      res.status(httpErr.status).json({ error: message });
    }
  });

  app.post("/api/interactions", requireAuth, async (req, res) => {
    try {
      const data = insertInteractionSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      // IDOR Protection: validate the target lead belongs to the tenant
      // before attaching an interaction to it.
      const lead = await storage.getLead(data.leadId);
      await validateResourceTenant(lead, req.user!.tenantId, "Lead");
      const interaction = await storage.createInteraction(data);
      await storage.touchLead(data.leadId);
      res.status(201).json(interaction);
    } catch (error: unknown) {
      const httpErr = toHttpError(error);
      // Erros de validacao do Zod / corpo invalido continuam como 400.
      const status = httpErr.status === 500 ? 400 : httpErr.status;
      const message = httpErr.message || "Erro ao criar interação";
      res.status(status).json({ error: message });
    }
  });
}
