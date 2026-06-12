/**
 * Onboarding Routes
 *
 * Dados de exemplo pós-onboarding ("aha moment"): permite ao usuário
 * popular o tenant com imóveis/leads/visitas/lançamentos de demonstração
 * e removê-los depois. Registrado em server/index.ts ao lado dos demais
 * register*Routes (padrão de routes-inspections.ts).
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "./middleware/auth";
import { asyncHandler, ConflictError } from "./middleware/error-handler";
import { hasDemoData, seedDemoData, removeDemoData, DEMO_PREFIX } from "./onboarding-demo";

export function registerOnboardingRoutes(app: Express) {
  /**
   * POST /api/onboarding/demo-data
   * Cria os dados de exemplo no tenant do usuário autenticado.
   * 409 se o tenant já possui registros com o prefixo `[Exemplo] `.
   */
  app.post(
    "/api/onboarding/demo-data",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;

      if (await hasDemoData(tenantId)) {
        throw new ConflictError(
          `Este tenant já possui dados de exemplo (registros com prefixo "${DEMO_PREFIX.trim()}").`,
        );
      }

      const result = await seedDemoData(tenantId, req.user!.id);

      res.status(201).json({
        message: "Dados de exemplo criados com sucesso",
        created: {
          properties: result.properties,
          leads: result.leads,
          visits: result.visits,
          financeEntries: result.financeEntries,
        },
        ids: result.ids,
      });
    }),
  );

  /**
   * DELETE /api/onboarding/demo-data
   * Remove todos os registros do tenant cujo título/nome/descrição começa
   * com `[Exemplo] `. No-op (zeros) se não houver dados de exemplo.
   */
  app.delete(
    "/api/onboarding/demo-data",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const removed = await removeDemoData(tenantId);
      const total =
        removed.properties + removed.leads + removed.visits + removed.financeEntries;

      res.json({
        message:
          total > 0
            ? "Dados de exemplo removidos com sucesso"
            : "Nenhum dado de exemplo encontrado",
        removed,
      });
    }),
  );
}
