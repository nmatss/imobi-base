/**
 * arch-1 — Rotas de Newsletter (extraidas de server/routes.ts).
 *
 * Primeiro dominio decomposto do monolito de rotas. Demonstra o seam:
 *   - helpers compartilhados vem de ./_shared
 *   - middlewares locais de registerRoutes (limiters) chegam via `deps`
 *   - storage/schemas sao imports diretos de modulo
 */
import type { Express } from "express";
import { insertNewsletterSchema } from "@shared/schema-sqlite";
import { storage } from "../storage";
import { isValidEmail, type RouteDeps } from "./_shared";

export function registerNewsletterRoutes(
  app: Express,
  deps: Pick<RouteDeps, "publicLimiter">,
): void {
  app.post("/api/newsletter/subscribe", deps.publicLimiter, async (req, res) => {
    try {
      // Validate email format
      if (!req.body.email || !isValidEmail(req.body.email)) {
        return res.status(400).json({ error: "Email inválido" });
      }
      const data = insertNewsletterSchema.parse(req.body);
      const subscription = await storage.subscribeNewsletter(data);
      res.status(201).json(subscription);
    } catch (error: unknown) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao inscrever newsletter",
      });
    }
  });
}
