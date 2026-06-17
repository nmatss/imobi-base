/**
 * Advanced Features Routes
 * - Lead Scoring
 * - Property Maps/Coordinates
 * - Virtual Tours
 * - Property Comparisons
 * - Digital Signatures
 * - Drip Campaigns
 * - Dashboard Layouts
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import {
  leadScores, propertyCoordinates, virtualTours, propertyComparisons,
  digitalSignatures, contractDocuments, dripCampaigns, campaignSteps,
  campaignEnrollments, dashboardLayouts, widgetTypes, leads, properties,
  interactions, followUps, contracts
} from "@shared/schema-sqlite";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { createAuditLog } from "./routes-security";
import {
  runWithDigitalSignatureTokenRlsContext,
  runWithPropertyComparisonRlsContext,
  runWithPublicPropertyIdsRlsContext,
  runWithTenantRlsContext,
} from "./db-rls";

const MAX_PUBLIC_COMPARISON_PROPERTIES = 20;

// Lead Score Calculator
function calculateLeadScore(lead: any, interactions: any[], followUps: any[]): {
  totalScore: number;
  budgetScore: number;
  engagementScore: number;
  profileScore: number;
  urgencyScore: number;
  behaviorScore: number;
  temperature: string;
  nextBestAction: string;
  predictedConversion: number;
} {
  let budgetScore = 0;
  let engagementScore = 0;
  let profileScore = 0;
  let urgencyScore = 0;
  let behaviorScore = 0;

  // Budget Score (0-25)
  const budget = parseFloat(lead.budget || '0');
  if (budget >= 1000000) budgetScore = 25;
  else if (budget >= 500000) budgetScore = 20;
  else if (budget >= 200000) budgetScore = 15;
  else if (budget >= 100000) budgetScore = 10;
  else if (budget > 0) budgetScore = 5;

  // Engagement Score (0-25) - Based on interactions
  const recentInteractions = interactions.filter(i => {
    const daysDiff = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  engagementScore = Math.min(25, recentInteractions.length * 5);

  // Profile Score (0-20) - Completeness
  let profileFields = 0;
  if (lead.name) profileFields++;
  if (lead.email) profileFields++;
  if (lead.phone) profileFields++;
  if (lead.budget) profileFields++;
  if (lead.preferredType) profileFields++;
  if (lead.preferredCity) profileFields++;
  if (lead.preferredCategory) profileFields++;
  profileScore = Math.round((profileFields / 7) * 20);

  // Urgency Score (0-15) - Status and activity
  const daysSinceUpdate = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (lead.status === 'proposal') urgencyScore = 15;
  else if (lead.status === 'visit') urgencyScore = 12;
  else if (lead.status === 'qualification') urgencyScore = 8;
  else if (lead.status === 'new' && daysSinceUpdate < 1) urgencyScore = 10;
  else if (lead.status === 'new') urgencyScore = 5;

  // Behavior Score (0-15) - Response patterns
  const pendingFollowUps = followUps.filter(f => f.status === 'pending');
  const completedFollowUps = followUps.filter(f => f.status === 'completed');
  if (completedFollowUps.length > 0) behaviorScore += 5;
  if (recentInteractions.length > 3) behaviorScore += 5;
  if (pendingFollowUps.length > 0 && pendingFollowUps.length < 3) behaviorScore += 5;

  const totalScore = budgetScore + engagementScore + profileScore + urgencyScore + behaviorScore;

  // Temperature
  let temperature = 'cold';
  if (totalScore >= 70) temperature = 'hot';
  else if (totalScore >= 40) temperature = 'warm';

  // Next Best Action
  let nextBestAction = 'Fazer primeiro contato';
  if (lead.status === 'new' && recentInteractions.length === 0) {
    nextBestAction = 'Fazer primeiro contato urgente';
  } else if (lead.status === 'qualification') {
    nextBestAction = 'Agendar visita';
  } else if (lead.status === 'visit') {
    nextBestAction = 'Enviar proposta';
  } else if (lead.status === 'proposal') {
    nextBestAction = 'Follow-up de fechamento';
  } else if (daysSinceUpdate > 7) {
    nextBestAction = 'Reativar contato';
  }

  // Predicted Conversion (simplified)
  const predictedConversion = Math.min(0.95, totalScore / 100 * 0.8 + (lead.status === 'proposal' ? 0.2 : 0));

  return {
    totalScore,
    budgetScore,
    engagementScore,
    profileScore,
    urgencyScore,
    behaviorScore,
    temperature,
    nextBestAction,
    predictedConversion,
  };
}

export function registerFeatureRoutes(app: Express) {
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (!req.user.tenantId) {
      return res.status(403).json({ error: "Sessão inválida" });
    }
    runWithTenantRlsContext(req.user.tenantId, () => next());
  };

  const getTenantProperty = async (
    propertyId: string,
    tenantId: string,
  ): Promise<{ id: string; tenantId: string } | null> => {
    const rows = await db
      .select({ id: properties.id, tenantId: properties.tenantId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
      .limit(1);

    return rows[0] ?? null;
  };

  const getTenantContract = async (
    contractId: string,
    tenantId: string,
  ): Promise<{ id: string; tenantId: string } | null> => {
    const rows = await db
      .select({ id: contracts.id, tenantId: contracts.tenantId })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.tenantId, tenantId)))
      .limit(1);

    return rows[0] ?? null;
  };

  // ==================== LEAD SCORING ====================

  // Calculate/update lead score
  app.post("/api/leads/:leadId/score", requireAuth, async (req, res) => {
    try {
      const { leadId } = req.params;
      const tenantId = req.user!.tenantId;

      // Get lead data
      const leadResult = await db.select().from(leads).where(and(
        eq(leads.id, leadId),
        eq(leads.tenantId, tenantId)
      ));

      if (leadResult.length === 0) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      const lead = leadResult[0];

      // Get interactions
      const leadInteractions = await db.select().from(interactions).where(eq(interactions.leadId, leadId));

      // Get follow-ups
      const leadFollowUps = await db.select().from(followUps).where(eq(followUps.leadId, leadId));

      // Calculate score
      const scoreData = calculateLeadScore(lead, leadInteractions, leadFollowUps);

      // Get existing score history
      const existingScore = await db.select().from(leadScores).where(eq(leadScores.leadId, leadId));
      let scoreHistory: any[] = [];
      if (existingScore.length > 0 && existingScore[0].scoreHistory) {
        scoreHistory = JSON.parse(existingScore[0].scoreHistory);
      }

      // Add new score to history (keep last 30)
      scoreHistory.push({
        score: scoreData.totalScore,
        date: new Date().toISOString(),
      });
      if (scoreHistory.length > 30) scoreHistory = scoreHistory.slice(-30);

      // Save or update score
      if (existingScore.length > 0) {
        await db.update(leadScores)
          .set({
            ...scoreData,
            scoreHistory: JSON.stringify(scoreHistory),
            lastCalculated: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(leadScores.leadId, leadId));
      } else {
        await db.insert(leadScores).values({
          id: nanoid(),
          leadId,
          ...scoreData,
          scoreHistory: JSON.stringify(scoreHistory),
        });
      }

      res.json({
        ...scoreData,
        scoreHistory,
      });
    } catch (error: any) {
      console.error('Lead score error:', error);
      res.status(500).json({ error: "Erro ao calcular score" });
    }
  });

  // Get lead score
  app.get("/api/leads/:leadId/score", requireAuth, async (req, res) => {
    try {
      const { leadId } = req.params;
      const tenantId = req.user!.tenantId;

      // Anti-IDOR: o lead precisa pertencer ao tenant da sessão (404 para não
      // vazar existência de leads de outros tenants).
      const leadResult = await db.select({ id: leads.id }).from(leads).where(and(
        eq(leads.id, leadId),
        eq(leads.tenantId, tenantId)
      ));
      if (leadResult.length === 0) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      const score = await db.select().from(leadScores).where(eq(leadScores.leadId, leadId));

      if (score.length === 0) {
        return res.json({ calculated: false });
      }

      res.json({
        calculated: true,
        ...score[0],
        scoreHistory: score[0].scoreHistory ? JSON.parse(score[0].scoreHistory) : [],
      });
    } catch (error: any) {
      console.error('Get lead score error:', error);
      res.status(500).json({ error: "Erro ao buscar score" });
    }
  });

  // Bulk calculate scores
  app.post("/api/leads/scores/calculate-all", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;

      const allLeads = await db.select().from(leads).where(eq(leads.tenantId, tenantId));

      let calculated = 0;
      for (const lead of allLeads) {
        const leadInteractions = await db.select().from(interactions).where(eq(interactions.leadId, lead.id));
        const leadFollowUps = await db.select().from(followUps).where(eq(followUps.leadId, lead.id));

        const scoreData = calculateLeadScore(lead, leadInteractions, leadFollowUps);

        const existing = await db.select().from(leadScores).where(eq(leadScores.leadId, lead.id));

        if (existing.length > 0) {
          await db.update(leadScores)
            .set({
              ...scoreData,
              lastCalculated: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(leadScores.leadId, lead.id));
        } else {
          await db.insert(leadScores).values({
            id: nanoid(),
            leadId: lead.id,
            ...scoreData,
          });
        }
        calculated++;
      }

      res.json({ calculated, total: allLeads.length });
    } catch (error: any) {
      console.error('Bulk score error:', error);
      res.status(500).json({ error: "Erro ao calcular scores" });
    }
  });

  // Get all lead scores (leaderboard)
  app.get("/api/leads/scores/ranking", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;

      const scores = await db.select({
        leadId: leadScores.leadId,
        totalScore: leadScores.totalScore,
        temperature: leadScores.temperature,
        nextBestAction: leadScores.nextBestAction,
        predictedConversion: leadScores.predictedConversion,
        leadName: leads.name,
        leadEmail: leads.email,
        leadStatus: leads.status,
        leadBudget: leads.budget,
      })
        .from(leadScores)
        .innerJoin(leads, eq(leadScores.leadId, leads.id))
        .where(eq(leads.tenantId, tenantId))
        .orderBy(desc(leadScores.totalScore))
        .limit(50);

      res.json(scores);
    } catch (error: any) {
      console.error('Scores ranking error:', error);
      res.status(500).json({ error: "Erro ao buscar ranking" });
    }
  });

  // ==================== PROPERTY COORDINATES/MAPS ====================

  // Set property coordinates
  app.post("/api/properties/:propertyId/coordinates", requireAuth, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { latitude, longitude, manuallySet } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
      }

      const property = await getTenantProperty(propertyId, req.user!.tenantId);
      if (!property) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }

      const existing = await db.select().from(propertyCoordinates).where(eq(propertyCoordinates.propertyId, propertyId));

      if (existing.length > 0) {
        await db.update(propertyCoordinates)
          .set({
            latitude,
            longitude,
            manuallySet: manuallySet || false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(propertyCoordinates.propertyId, propertyId));
      } else {
        await db.insert(propertyCoordinates).values({
          id: nanoid(),
          propertyId,
          latitude,
          longitude,
          manuallySet: manuallySet || false,
        });
      }

      await createAuditLog(req.user!.tenantId, req.user!.id, 'update', 'property_coordinates', propertyId, null, { latitude, longitude }, req);

      res.json({ success: true, latitude, longitude });
    } catch (error: any) {
      console.error('Set coordinates error:', error);
      res.status(500).json({ error: "Erro ao salvar coordenadas" });
    }
  });

  // Get property coordinates
  app.get("/api/properties/:propertyId/coordinates", requireAuth, async (req, res) => {
    try {
      const { propertyId } = req.params;

      const property = await getTenantProperty(propertyId, req.user!.tenantId);
      if (!property) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }

      const coords = await db.select().from(propertyCoordinates).where(eq(propertyCoordinates.propertyId, propertyId));

      if (coords.length === 0) {
        return res.json({ hasCoordinates: false });
      }

      res.json({ hasCoordinates: true, ...coords[0] });
    } catch (error: any) {
      console.error('Get coordinates error:', error);
      res.status(500).json({ error: "Erro ao buscar coordenadas" });
    }
  });

  // Get all properties with coordinates (for map)
  app.get("/api/properties/map", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;

      const propertiesWithCoords = await db.select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        type: properties.type,
        category: properties.category,
        status: properties.status,
        city: properties.city,
        address: properties.address,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        area: properties.area,
        images: properties.images,
        latitude: propertyCoordinates.latitude,
        longitude: propertyCoordinates.longitude,
      })
        .from(properties)
        .innerJoin(propertyCoordinates, eq(properties.id, propertyCoordinates.propertyId))
        .where(and(
          eq(properties.tenantId, tenantId),
          eq(properties.status, 'available')
        ));

      res.json(propertiesWithCoords);
    } catch (error: any) {
      console.error('Map properties error:', error);
      res.status(500).json({ error: "Erro ao buscar imóveis" });
    }
  });

  // ==================== VIRTUAL TOURS ====================

  // Add virtual tour
  app.post("/api/properties/:propertyId/virtual-tours", requireAuth, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { tourType, tourUrl, thumbnailUrl, title, description } = req.body;

      if (!tourType || !tourUrl) {
        return res.status(400).json({ error: "Tipo e URL são obrigatórios" });
      }

      // Anti-IDOR: virtual_tours não tem tenantId — o escopo de tenant é
      // derivado da property. Só cria tour em imóvel do tenant da sessão.
      const property = await db.select({ id: properties.id, tenantId: properties.tenantId })
        .from(properties)
        .where(eq(properties.id, propertyId));
      if (property.length === 0 || property[0].tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }

      const existing = await db.select().from(virtualTours).where(eq(virtualTours.propertyId, propertyId));

      const tour = await db.insert(virtualTours).values({
        id: nanoid(),
        propertyId,
        tourType,
        tourUrl,
        thumbnailUrl,
        title,
        description,
        sortOrder: existing.length,
      }).returning();

      await createAuditLog(req.user!.tenantId, req.user!.id, 'create', 'virtual_tour', tour[0].id, null, { tourType, tourUrl }, req);

      res.json(tour[0]);
    } catch (error: any) {
      console.error('Add tour error:', error);
      res.status(500).json({ error: "Erro ao adicionar tour" });
    }
  });

  // Get virtual tours
  app.get("/api/properties/:propertyId/virtual-tours", async (req, res) => {
    try {
      const { propertyId } = req.params;

      // Rota pública (site do tenant exibe tours), mas valida que a property
      // existe e está disponível — evita expor tours de imóveis privados/arquivados.
      const property = await db.select({ id: properties.id })
        .from(properties)
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.status, 'available')
        ));
      if (property.length === 0) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }

      const tours = await db.select()
        .from(virtualTours)
        .where(and(
          eq(virtualTours.propertyId, propertyId),
          eq(virtualTours.isActive, true)
        ))
        .orderBy(virtualTours.sortOrder);

      res.json(tours);
    } catch (error: any) {
      console.error('Get tours error:', error);
      res.status(500).json({ error: "Erro ao buscar tours" });
    }
  });

  // Delete virtual tour
  app.delete("/api/virtual-tours/:tourId", requireAuth, async (req, res) => {
    try {
      const { tourId } = req.params;

      // Anti-IDOR: valida a cadeia tour → property → tenant da sessão antes
      // de apagar (a tabela virtual_tours não tem tenantId próprio).
      const tour = await db.select({ id: virtualTours.id, propertyId: virtualTours.propertyId })
        .from(virtualTours)
        .where(eq(virtualTours.id, tourId));
      if (tour.length === 0) {
        return res.status(404).json({ error: "Tour não encontrado" });
      }
      const property = await db.select({ id: properties.id, tenantId: properties.tenantId })
        .from(properties)
        .where(eq(properties.id, tour[0].propertyId));
      if (property.length === 0 || property[0].tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Tour não encontrado" });
      }

      await db.delete(virtualTours).where(eq(virtualTours.id, tourId));

      await createAuditLog(req.user!.tenantId, req.user!.id, 'delete', 'virtual_tour', tourId, null, null, req);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete tour error:', error);
      res.status(500).json({ error: "Erro ao remover tour" });
    }
  });

  // Track tour view
  app.post("/api/virtual-tours/:tourId/view", async (req, res) => {
    try {
      const { tourId } = req.params;

      await db.update(virtualTours)
        .set({ viewCount: sql`view_count + 1` })
        .where(eq(virtualTours.id, tourId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao registrar visualização" });
    }
  });

  // ==================== PROPERTY COMPARISONS ====================

  // Save comparison
  app.post("/api/property-comparisons", async (req, res) => {
    try {
      const { propertyIds, userId, leadId, sessionId, notes } = req.body;

      if (!Array.isArray(propertyIds) || propertyIds.length < 2) {
        return res.status(400).json({ error: "Selecione pelo menos 2 imóveis" });
      }
      if (propertyIds.length > MAX_PUBLIC_COMPARISON_PROPERTIES) {
        return res.status(400).json({ error: "Selecione no máximo 20 imóveis" });
      }
      if (
        !propertyIds.every(
          (id): id is string => typeof id === "string" && id.trim() !== "" && !id.includes(","),
        )
      ) {
        return res.status(400).json({ error: "Lista de imóveis inválida" });
      }

      // Segurança: NÃO aceitamos tenantId do body (permitiria gravar
      // comparações em nome de outro tenant). O tenant é derivado das
      // properties: todas precisam existir e pertencer ao MESMO tenant.
      const comparisonProps = await runWithPublicPropertyIdsRlsContext(propertyIds, () =>
        db.select({ id: properties.id, tenantId: properties.tenantId })
          .from(properties)
          .where(and(
            inArray(properties.id, propertyIds),
            eq(properties.status, 'available'),
          )),
      );
      if (comparisonProps.length !== propertyIds.length) {
        return res.status(400).json({ error: "Um ou mais imóveis são inválidos ou indisponíveis" });
      }
      const tenantIds = new Set(comparisonProps.map((p: { tenantId: string }) => p.tenantId));
      if (tenantIds.size !== 1) {
        return res.status(400).json({ error: "Todos os imóveis devem pertencer à mesma imobiliária" });
      }
      const tenantId = comparisonProps[0].tenantId;
      const safeUserId =
        req.isAuthenticated?.() &&
        req.user?.tenantId === tenantId &&
        userId === req.user.id
          ? req.user.id
          : undefined;
      let safeLeadId: string | undefined;

      if (typeof leadId === "string" && leadId) {
        const leadRows = await runWithTenantRlsContext(tenantId, () =>
          db
            .select({ id: leads.id })
            .from(leads)
            .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
            .limit(1),
        );
        if (leadRows.length === 0) {
          return res.status(400).json({ error: "Lead inválido para esta imobiliária" });
        }
        safeLeadId = leadId;
      }

      const comparison = await runWithTenantRlsContext(tenantId, () =>
        db.insert(propertyComparisons).values({
          id: nanoid(),
          tenantId,
          propertyIds: JSON.stringify(propertyIds),
          userId: safeUserId,
          leadId: safeLeadId,
          sessionId,
          notes,
        }).returning(),
      );

      res.json(comparison[0]);
    } catch (error: any) {
      console.error('Save comparison error:', error);
      res.status(500).json({ error: "Erro ao salvar comparação" });
    }
  });

  // Get comparison
  app.get("/api/property-comparisons/:comparisonId", async (req, res) => {
    try {
      const { comparisonId } = req.params;

      const comparison = await runWithPropertyComparisonRlsContext(comparisonId, () =>
        db.select().from(propertyComparisons).where(eq(propertyComparisons.id, comparisonId)),
      );

      if (comparison.length === 0) {
        return res.status(404).json({ error: "Comparação não encontrada" });
      }

      const propertyIds = JSON.parse(comparison[0].propertyIds);
      const comparisonProperties = await runWithTenantRlsContext(comparison[0].tenantId, () =>
        db.select()
          .from(properties)
          .where(and(
            inArray(properties.id, propertyIds),
            eq(properties.tenantId, comparison[0].tenantId),
            eq(properties.status, 'available'),
          )),
      );

      res.json({
        ...comparison[0],
        properties: comparisonProperties,
      });
    } catch (error: any) {
      console.error('Get comparison error:', error);
      res.status(500).json({ error: "Erro ao buscar comparação" });
    }
  });

  // Compare properties (without saving)
  app.post("/api/properties/compare", async (req, res) => {
    try {
      const { propertyIds } = req.body;

      if (!Array.isArray(propertyIds) || propertyIds.length < 2) {
        return res.status(400).json({ error: "Selecione pelo menos 2 imóveis" });
      }
      if (propertyIds.length > MAX_PUBLIC_COMPARISON_PROPERTIES) {
        return res.status(400).json({ error: "Selecione no máximo 20 imóveis" });
      }
      if (
        !propertyIds.every(
          (id): id is string => typeof id === "string" && id.trim() !== "" && !id.includes(","),
        )
      ) {
        return res.status(400).json({ error: "Lista de imóveis inválida" });
      }

      const comparisonProperties = await runWithPublicPropertyIdsRlsContext(propertyIds, () =>
        db.select()
          .from(properties)
          .where(and(
            inArray(properties.id, propertyIds),
            eq(properties.status, 'available'),
          )),
      );

      if (comparisonProperties.length !== propertyIds.length) {
        return res.status(400).json({ error: "Um ou mais imóveis são inválidos ou indisponíveis" });
      }

      const tenantIds = new Set(comparisonProperties.map((p: typeof comparisonProperties[number]) => p.tenantId));
      if (tenantIds.size !== 1) {
        return res.status(400).json({ error: "Todos os imóveis devem pertencer à mesma imobiliária" });
      }

      // Calculate comparison metrics
      type PropertyType = typeof comparisonProperties[number];
      const metrics = {
        priceRange: {
          min: Math.min(...comparisonProperties.map((p: PropertyType) => parseFloat(p.price))),
          max: Math.max(...comparisonProperties.map((p: PropertyType) => parseFloat(p.price))),
          avg: comparisonProperties.reduce((sum: number, p: PropertyType) => sum + parseFloat(p.price), 0) / comparisonProperties.length,
        },
        areaRange: (() => {
          const areas = comparisonProperties
            .filter((p: PropertyType) => p.area)
            .map((p: PropertyType) => p.area!);
          return {
            min: areas.length > 0 ? Math.min(...areas) : null,
            max: areas.length > 0 ? Math.max(...areas) : null,
          };
        })(),
        pricePerSqm: comparisonProperties.map((p: PropertyType) => ({
          id: p.id,
          pricePerSqm: p.area ? parseFloat(p.price) / p.area : null,
        })),
      };

      res.json({
        properties: comparisonProperties,
        metrics,
      });
    } catch (error: any) {
      console.error('Compare properties error:', error);
      res.status(500).json({ error: "Erro ao comparar" });
    }
  });

  // ==================== DIGITAL SIGNATURES ====================

  // Create signature request
  app.post("/api/contracts/:contractId/signatures", requireAuth, async (req, res) => {
    try {
      const { contractId } = req.params;
      const { signers } = req.body;

      if (!signers || signers.length === 0) {
        return res.status(400).json({ error: "Adicione pelo menos um assinante" });
      }

      const contract = await getTenantContract(contractId, req.user!.tenantId);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }

      const createdSignatures = [];

      for (const signer of signers) {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const signature = await db.insert(digitalSignatures).values({
          id: nanoid(),
          contractId,
          signerType: signer.type,
          signerName: signer.name,
          signerEmail: signer.email,
          signerDocument: signer.document,
          status: 'pending',
          token,
          expiresAt,
        }).returning();

        createdSignatures.push(signature[0]);
      }

      await createAuditLog(req.user!.tenantId, req.user!.id, 'create', 'digital_signatures', contractId, null, { signerCount: signers.length }, req);

      res.json(createdSignatures);
    } catch (error: any) {
      console.error('Create signatures error:', error);
      res.status(500).json({ error: "Erro ao criar assinaturas" });
    }
  });

  // Get signature by token (public)
  app.get("/api/signatures/token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const signature = await db.select().from(digitalSignatures).where(eq(digitalSignatures.token, token));

      if (signature.length === 0) {
        return res.status(404).json({ error: "Assinatura não encontrada" });
      }

      // Mark as viewed
      if (!signature[0].viewedAt) {
        await db.update(digitalSignatures)
          .set({ viewedAt: new Date().toISOString(), status: 'viewed' })
          .where(eq(digitalSignatures.id, signature[0].id));
      }

      // Get contract details
      const contract = await runWithDigitalSignatureTokenRlsContext(token, () =>
        db.select().from(contracts).where(eq(contracts.id, signature[0].contractId)),
      );

      res.json({
        signature: signature[0],
        contract: contract[0] || null,
      });
    } catch (error: any) {
      console.error('Get signature error:', error);
      res.status(500).json({ error: "Erro ao buscar assinatura" });
    }
  });

  // Sign document
  app.post("/api/signatures/token/:token/sign", async (req, res) => {
    try {
      const { token } = req.params;
      const { signatureData, ipAddress, userAgent, geoLocation } = req.body;

      const signature = await db.select().from(digitalSignatures).where(eq(digitalSignatures.token, token));

      if (signature.length === 0) {
        return res.status(404).json({ error: "Assinatura não encontrada" });
      }

      if (signature[0].status === 'signed') {
        return res.status(400).json({ error: "Documento já assinado" });
      }

      if (new Date(signature[0].expiresAt!) < new Date()) {
        return res.status(400).json({ error: "Link expirado" });
      }

      // Generate signature hash
      const signatureHash = createHash('sha256')
        .update(signatureData + signature[0].id + Date.now())
        .digest('hex');

      await db.update(digitalSignatures)
        .set({
          signatureData,
          signatureHash,
          ipAddress: ipAddress || req.ip,
          userAgent: userAgent || req.headers['user-agent'],
          geoLocation: geoLocation ? JSON.stringify(geoLocation) : null,
          status: 'signed',
          signedAt: new Date().toISOString(),
        })
        .where(eq(digitalSignatures.id, signature[0].id));

      // Check if all signatures are complete
      const allSignatures = await db.select()
        .from(digitalSignatures)
        .where(eq(digitalSignatures.contractId, signature[0].contractId));

      type SignatureType = typeof allSignatures[number];
      const allSigned = allSignatures.every((s: SignatureType) => s.status === 'signed');

      if (allSigned) {
        await runWithDigitalSignatureTokenRlsContext(token, () =>
          db.update(contracts)
            .set({ status: 'signed', signedAt: new Date().toISOString() })
            .where(eq(contracts.id, signature[0].contractId)),
        );
      }

      res.json({ success: true, allSigned });
    } catch (error: any) {
      console.error('Sign error:', error);
      res.status(500).json({ error: "Erro ao assinar" });
    }
  });

  // Get contract signatures status
  app.get("/api/contracts/:contractId/signatures", requireAuth, async (req, res) => {
    try {
      const { contractId } = req.params;

      const contract = await getTenantContract(contractId, req.user!.tenantId);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }

      const signatures = await db.select()
        .from(digitalSignatures)
        .where(eq(digitalSignatures.contractId, contractId));

      res.json(signatures);
    } catch (error: any) {
      console.error('Get signatures error:', error);
      res.status(500).json({ error: "Erro ao buscar assinaturas" });
    }
  });

  // ==================== DRIP CAMPAIGNS ====================

  // Create campaign
  app.post("/api/drip-campaigns", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const { name, description, triggerType, triggerConditions, steps } = req.body;

      const campaign = await db.insert(dripCampaigns).values({
        id: nanoid(),
        tenantId,
        name,
        description,
        triggerType,
        triggerConditions: triggerConditions ? JSON.stringify(triggerConditions) : null,
        isActive: false,
      }).returning();

      // Create steps
      if (steps && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await db.insert(campaignSteps).values({
            id: nanoid(),
            campaignId: campaign[0].id,
            stepOrder: i + 1,
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
            channel: step.channel,
            subject: step.subject,
            content: step.content,
            templateVariables: step.templateVariables ? JSON.stringify(step.templateVariables) : null,
            conditions: step.conditions ? JSON.stringify(step.conditions) : null,
          });
        }
      }

      await createAuditLog(tenantId, req.user!.id, 'create', 'drip_campaign', campaign[0].id, null, { name, triggerType }, req);

      res.json(campaign[0]);
    } catch (error: any) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: "Erro ao criar campanha" });
    }
  });

  // Get campaigns
  app.get("/api/drip-campaigns", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;

      const campaigns = await db.select()
        .from(dripCampaigns)
        .where(eq(dripCampaigns.tenantId, tenantId))
        .orderBy(desc(dripCampaigns.createdAt));

      res.json(campaigns);
    } catch (error: any) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: "Erro ao buscar campanhas" });
    }
  });

  // Get campaign with steps
  app.get("/api/drip-campaigns/:campaignId", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await db.select().from(dripCampaigns).where(eq(dripCampaigns.id, campaignId));

      // Anti-IDOR: 404 também quando a campanha é de outro tenant (não vaza
      // a existência do recurso).
      if (campaign.length === 0 || campaign[0].tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campanha não encontrada" });
      }

      const steps = await db.select()
        .from(campaignSteps)
        .where(eq(campaignSteps.campaignId, campaignId))
        .orderBy(campaignSteps.stepOrder);

      const enrollments = await db.select()
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.campaignId, campaignId));

      res.json({
        ...campaign[0],
        steps,
        enrollments,
      });
    } catch (error: any) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: "Erro ao buscar campanha" });
    }
  });

  // Toggle campaign active
  app.patch("/api/drip-campaigns/:campaignId/toggle", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await db.select().from(dripCampaigns).where(eq(dripCampaigns.id, campaignId));

      // Anti-IDOR: 404 quando a campanha não existe ou é de outro tenant.
      if (campaign.length === 0 || campaign[0].tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campanha não encontrada" });
      }

      await db.update(dripCampaigns)
        .set({
          isActive: !campaign[0].isActive,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(dripCampaigns.id, campaignId));

      res.json({ isActive: !campaign[0].isActive });
    } catch (error: any) {
      console.error('Toggle campaign error:', error);
      res.status(500).json({ error: "Erro ao alterar campanha" });
    }
  });

  // Enroll lead in campaign
  app.post("/api/drip-campaigns/:campaignId/enroll", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { leadId } = req.body;
      const tenantId = req.user!.tenantId;

      if (!leadId || typeof leadId !== "string") {
        return res.status(400).json({ error: "leadId é obrigatório" });
      }

      // Anti-IDOR: a campanha precisa ser do tenant da sessão.
      const campaign = await db.select({ id: dripCampaigns.id, tenantId: dripCampaigns.tenantId })
        .from(dripCampaigns)
        .where(eq(dripCampaigns.id, campaignId));
      if (campaign.length === 0 || campaign[0].tenantId !== tenantId) {
        return res.status(404).json({ error: "Campanha não encontrada" });
      }

      // Anti-IDOR: o lead inscrito também precisa pertencer ao tenant.
      const lead = await db.select({ id: leads.id }).from(leads).where(and(
        eq(leads.id, leadId),
        eq(leads.tenantId, tenantId)
      ));
      if (lead.length === 0) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      // Check if already enrolled
      const existing = await db.select()
        .from(campaignEnrollments)
        .where(and(
          eq(campaignEnrollments.campaignId, campaignId),
          eq(campaignEnrollments.leadId, leadId)
        ));

      if (existing.length > 0 && existing[0].status === 'active') {
        return res.status(400).json({ error: "Lead já inscrito nesta campanha" });
      }

      // Get first step delay
      const steps = await db.select()
        .from(campaignSteps)
        .where(eq(campaignSteps.campaignId, campaignId))
        .orderBy(campaignSteps.stepOrder)
        .limit(1);

      const nextStepAt = steps.length > 0
        ? new Date(Date.now() + (steps[0].delayDays * 24 + steps[0].delayHours) * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

      await db.insert(campaignEnrollments).values({
        id: nanoid(),
        campaignId,
        leadId,
        currentStep: 0,
        status: 'active',
        nextStepAt,
      });

      // Update campaign count
      await db.update(dripCampaigns)
        .set({ totalEnrolled: sql`total_enrolled + 1` })
        .where(eq(dripCampaigns.id, campaignId));

      res.json({ success: true });
    } catch (error: any) {
      console.error('Enroll error:', error);
      res.status(500).json({ error: "Erro ao inscrever lead" });
    }
  });

  // ==================== DASHBOARD LAYOUTS ====================

  // Get user dashboard
  app.get("/api/dashboard/layout", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      const layout = await db.select()
        .from(dashboardLayouts)
        .where(and(
          eq(dashboardLayouts.userId, userId),
          eq(dashboardLayouts.tenantId, tenantId),
          eq(dashboardLayouts.isDefault, true)
        ));

      if (layout.length === 0) {
        // Return default layout
        return res.json({
          id: null,
          name: 'Principal',
          layout: JSON.stringify({ columns: 12, rowHeight: 100 }),
          widgets: JSON.stringify([
            { id: 'leads-summary', type: 'metric', x: 0, y: 0, w: 3, h: 1 },
            { id: 'properties-summary', type: 'metric', x: 3, y: 0, w: 3, h: 1 },
            { id: 'revenue-summary', type: 'metric', x: 6, y: 0, w: 3, h: 1 },
            { id: 'tasks-summary', type: 'metric', x: 9, y: 0, w: 3, h: 1 },
            { id: 'leads-funnel', type: 'chart', x: 0, y: 1, w: 6, h: 2 },
            { id: 'revenue-chart', type: 'chart', x: 6, y: 1, w: 6, h: 2 },
          ]),
        });
      }

      res.json({
        ...layout[0],
        layout: JSON.parse(layout[0].layout),
        widgets: JSON.parse(layout[0].widgets),
      });
    } catch (error: any) {
      console.error('Get layout error:', error);
      res.status(500).json({ error: "Erro ao buscar layout" });
    }
  });

  // Save dashboard layout
  app.post("/api/dashboard/layout", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const { name, layout, widgets, isDefault } = req.body;

      const existing = await db.select()
        .from(dashboardLayouts)
        .where(and(
          eq(dashboardLayouts.userId, userId),
          eq(dashboardLayouts.tenantId, tenantId),
          eq(dashboardLayouts.name, name)
        ));

      if (existing.length > 0) {
        await db.update(dashboardLayouts)
          .set({
            layout: JSON.stringify(layout),
            widgets: JSON.stringify(widgets),
            isDefault: isDefault || false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(dashboardLayouts.id, existing[0].id));

        res.json({ id: existing[0].id, updated: true });
      } else {
        const newLayout = await db.insert(dashboardLayouts).values({
          id: nanoid(),
          userId,
          tenantId,
          name: name || 'Principal',
          layout: JSON.stringify(layout),
          widgets: JSON.stringify(widgets),
          isDefault: isDefault || false,
        }).returning();

        res.json({ id: newLayout[0].id, created: true });
      }
    } catch (error: any) {
      console.error('Save layout error:', error);
      res.status(500).json({ error: "Erro ao salvar layout" });
    }
  });

  // Get available widgets
  app.get("/api/dashboard/widgets", requireAuth, async (req, res) => {
    try {
      const widgets = await db.select()
        .from(widgetTypes)
        .where(eq(widgetTypes.isActive, true));

      if (widgets.length === 0) {
        // Return default widgets
        return res.json([
          { id: 'leads-summary', name: 'Resumo de Leads', category: 'metrics', component: 'LeadsSummary' },
          { id: 'properties-summary', name: 'Resumo de Imóveis', category: 'metrics', component: 'PropertiesSummary' },
          { id: 'revenue-summary', name: 'Receita', category: 'metrics', component: 'RevenueSummary' },
          { id: 'tasks-summary', name: 'Tarefas', category: 'metrics', component: 'TasksSummary' },
          { id: 'leads-funnel', name: 'Funil de Leads', category: 'charts', component: 'LeadsFunnel' },
          { id: 'revenue-chart', name: 'Gráfico de Receita', category: 'charts', component: 'RevenueChart' },
          { id: 'recent-leads', name: 'Leads Recentes', category: 'lists', component: 'RecentLeads' },
          { id: 'upcoming-visits', name: 'Próximas Visitas', category: 'lists', component: 'UpcomingVisits' },
          { id: 'properties-map', name: 'Mapa de Imóveis', category: 'map', component: 'PropertiesMap' },
          { id: 'calendar-widget', name: 'Calendário', category: 'calendar', component: 'CalendarWidget' },
        ]);
      }

      res.json(widgets);
    } catch (error: any) {
      console.error('Get widgets error:', error);
      res.status(500).json({ error: "Erro ao buscar widgets" });
    }
  });

  console.log("Feature routes registered (Lead Scoring, Maps, Tours, Comparisons, Signatures, Campaigns, Dashboards)");
}
