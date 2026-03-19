/**
 * AVM (Automated Valuation Model) Routes
 * RESTful API for property valuation and market analysis
 */

import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth";
import { storage } from "./storage";
import {
  calculateValuation,
  findComparables,
  recalculateMarketIndices,
  getPriceMapData,
} from "./services/avm-engine";
import type { ValuationInput } from "./services/avm-engine";

const avmEvaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Limite de avaliações atingido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerAVMRoutes(app: Express) {
  // Apply authentication middleware to ALL AVM routes
  app.use("/api/avm", requireAuth);

  /**
   * POST /api/avm/evaluate
   * Run a full valuation for a property (with or without an existing propertyId)
   */
  app.post("/api/avm/evaluate", avmEvaluateLimiter, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      const body = req.body;

      // Validate required fields
      if (!body.propertyType || !body.category || !body.city || !body.state || !body.area) {
        return res.status(400).json({
          error: "Campos obrigatorios: propertyType, category, city, state, area",
        });
      }

      const input: ValuationInput = {
        propertyType: body.propertyType,
        category: body.category,
        city: body.city,
        state: body.state,
        neighborhood: body.neighborhood,
        area: parseFloat(body.area),
        bedrooms: body.bedrooms ? parseInt(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? parseInt(body.bathrooms) : undefined,
        parkingSpaces: body.parkingSpaces ? parseInt(body.parkingSpaces) : undefined,
        features: body.features,
        condition: body.condition,
        yearBuilt: body.yearBuilt ? parseInt(body.yearBuilt) : undefined,
      };

      // Run valuation
      const result = await calculateValuation(tenantId, input);

      // Save valuation to database
      const valuation = await storage.createPropertyValuation({
        tenantId,
        propertyId: body.propertyId || null,
        propertyType: input.propertyType,
        category: input.category,
        city: input.city,
        state: input.state,
        neighborhood: input.neighborhood || null,
        address: body.address || null,
        area: input.area,
        bedrooms: input.bedrooms || null,
        bathrooms: input.bathrooms || null,
        parkingSpaces: input.parkingSpaces || null,
        features: input.features ? JSON.stringify(input.features) : null,
        condition: input.condition || null,
        yearBuilt: input.yearBuilt || null,
        estimatedValue: result.estimatedValue,
        minValue: result.minValue,
        maxValue: result.maxValue,
        pricePerSqm: result.pricePerSqm,
        confidenceScore: result.confidenceScore,
        comparablesCount: result.comparables.length,
        comparablesData: JSON.stringify(result.comparables),
        marketTrend: result.marketTrend,
        adjustments: JSON.stringify(result.adjustments),
        methodology: result.methodology,
        reportUrl: null,
        requestedBy: userId,
      });

      res.json({
        ...valuation,
        result,
      });
    } catch (error: any) {
      console.error("AVM evaluation error:", error);
      res.status(500).json({ error: "Erro ao calcular avaliacao: " + error.message });
    }
  });

  /**
   * GET /api/avm/evaluate/:propertyId
   * Quick valuation for an existing property
   */
  app.get("/api/avm/evaluate/:propertyId", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      const { propertyId } = req.params;

      // Get property details
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Imovel nao encontrado" });
      }

      if (property.tenantId !== tenantId) {
        return res.status(404).json({ error: "Imovel nao encontrado" });
      }

      // Parse features
      let features: string[] = [];
      try {
        if (property.features) {
          features = JSON.parse(property.features);
        }
      } catch {}

      const input: ValuationInput = {
        propertyType: property.type,
        category: property.category,
        city: property.city,
        state: property.state,
        area: property.area || 100,
        bedrooms: property.bedrooms || undefined,
        bathrooms: property.bathrooms || undefined,
        features,
      };

      const result = await calculateValuation(tenantId, input);

      // Save valuation
      const valuation = await storage.createPropertyValuation({
        tenantId,
        propertyId: property.id,
        propertyType: property.type,
        category: property.category,
        city: property.city,
        state: property.state,
        neighborhood: null,
        address: property.address,
        area: property.area || 100,
        bedrooms: property.bedrooms || null,
        bathrooms: property.bathrooms || null,
        parkingSpaces: null,
        features: property.features || null,
        condition: null,
        yearBuilt: null,
        estimatedValue: result.estimatedValue,
        minValue: result.minValue,
        maxValue: result.maxValue,
        pricePerSqm: result.pricePerSqm,
        confidenceScore: result.confidenceScore,
        comparablesCount: result.comparables.length,
        comparablesData: JSON.stringify(result.comparables),
        marketTrend: result.marketTrend,
        adjustments: JSON.stringify(result.adjustments),
        methodology: result.methodology,
        reportUrl: null,
        requestedBy: userId,
      });

      res.json({
        ...valuation,
        result,
      });
    } catch (error: any) {
      console.error("AVM quick evaluation error:", error);
      res.status(500).json({ error: "Erro ao calcular avaliacao: " + error.message });
    }
  });

  /**
   * GET /api/avm/history
   * Get valuation history for the tenant
   */
  app.get("/api/avm/history", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const valuations = await storage.getPropertyValuationsByTenant(tenantId);
      res.json(valuations);
    } catch (error: any) {
      console.error("AVM history error:", error);
      res.status(500).json({ error: "Erro ao buscar historico: " + error.message });
    }
  });

  /**
   * GET /api/avm/history/:id
   * Get a specific valuation detail
   */
  app.get("/api/avm/history/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const valuation = await storage.getPropertyValuation(req.params.id);
      if (!valuation) {
        return res.status(404).json({ error: "Avaliacao nao encontrada" });
      }
      if (valuation.tenantId !== tenantId) {
        return res.status(404).json({ error: "Avaliacao nao encontrada" });
      }
      res.json(valuation);
    } catch (error: any) {
      console.error("AVM history detail error:", error);
      res.status(500).json({ error: "Erro ao buscar avaliacao: " + error.message });
    }
  });

  /**
   * DELETE /api/avm/history/:id
   * Delete a valuation
   */
  app.delete("/api/avm/history/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const valuation = await storage.getPropertyValuation(req.params.id);
      if (!valuation) {
        return res.status(404).json({ error: "Avaliacao nao encontrada" });
      }
      if (valuation.tenantId !== tenantId) {
        return res.status(404).json({ error: "Avaliacao nao encontrada" });
      }
      await storage.deletePropertyValuation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("AVM delete error:", error);
      res.status(500).json({ error: "Erro ao excluir avaliacao: " + error.message });
    }
  });

  /**
   * GET /api/avm/market-indices
   * Get market indices dashboard data
   */
  app.get("/api/avm/market-indices", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { city, propertyType, category } = req.query;
      const indices = await storage.getMarketIndicesByTenant(tenantId, {
        city: city as string | undefined,
        propertyType: propertyType as string | undefined,
        category: category as string | undefined,
      });
      res.json(indices);
    } catch (error: any) {
      console.error("AVM market indices error:", error);
      res.status(500).json({ error: "Erro ao buscar indices: " + error.message });
    }
  });

  /**
   * POST /api/avm/recalculate-indices
   * Recalculate market indices from current property data
   */
  app.post("/api/avm/recalculate-indices", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const count = await recalculateMarketIndices(tenantId);
      res.json({
        success: true,
        message: `${count} indices de mercado recalculados com sucesso`,
        count,
      });
    } catch (error: any) {
      console.error("AVM recalculate error:", error);
      res.status(500).json({ error: "Erro ao recalcular indices: " + error.message });
    }
  });

  /**
   * GET /api/avm/comparables/:propertyId
   * Find comparable properties for a given property
   */
  app.get("/api/avm/comparables/:propertyId", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ error: "Imovel nao encontrado" });
      }
      if (property.tenantId !== tenantId) {
        return res.status(404).json({ error: "Imovel nao encontrado" });
      }

      const input: ValuationInput = {
        propertyType: property.type,
        category: property.category,
        city: property.city,
        state: property.state,
        area: property.area || 100,
        bedrooms: property.bedrooms || undefined,
        bathrooms: property.bathrooms || undefined,
      };

      const comparables = await findComparables(tenantId, input, 20);
      // Filter out the property itself
      const filtered = comparables.filter((c) => c.id !== property.id);

      res.json(filtered);
    } catch (error: any) {
      console.error("AVM comparables error:", error);
      res.status(500).json({ error: "Erro ao buscar comparaveis: " + error.message });
    }
  });

  /**
   * GET /api/avm/price-map
   * Price per sqm heatmap data by neighborhood
   */
  app.get("/api/avm/price-map", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { city, category } = req.query;
      const data = await getPriceMapData(
        tenantId,
        city as string | undefined,
        category as string | undefined
      );
      res.json(data);
    } catch (error: any) {
      console.error("AVM price map error:", error);
      res.status(500).json({ error: "Erro ao buscar mapa de precos: " + error.message });
    }
  });
}
