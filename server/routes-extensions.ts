// @ts-nocheck
/**
 * API ROUTES EXTENSIONS FOR MULTI-TENANT ARCHITECTURE
 * These routes extend the base routes with additional tenant-scoped endpoints
 *
 * All routes require authentication and enforce tenant isolation
 */

import type { Express, Request, Response } from 'express';
import { requireAuth } from './middleware/auth';
import { checkFeatureAccess } from './middleware/plan-limits';
import { storage } from './storage';
import {
  insertTenantSettingsSchema,
  insertUserRoleSchema,
  insertIntegrationConfigSchema,
  insertAISettingsSchema,
  insertSavedReportSchema,
} from '@shared/schema-sqlite';

export function registerExtensionRoutes(app: Express) {

  /**
   * TENANT SETTINGS ROUTES
   * Manage extended tenant configuration
   */

  // GET /api/tenant/settings - Get current tenant settings
  app.get("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const settings = await storage.getTenantSettings(tenantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  // PATCH /api/tenant/settings - Update tenant settings
  app.patch("/api/tenant/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      // Only admins can update tenant settings
      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const settings = await storage.createOrUpdateTenantSettings(tenantId, req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar configurações" });
    }
  });

  /**
   * USER ROLES & PERMISSIONS ROUTES
   * Manage roles and permissions within a tenant
   */

  // GET /api/roles - List all roles for current tenant
  app.get("/api/roles", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const roles = await storage.getUserRolesByTenant(tenantId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar roles" });
    }
  });

  // POST /api/roles - Create a new role
  app.post("/api/roles", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const data = insertUserRoleSchema.parse({
        ...req.body,
        tenantId,
      });
      const role = await storage.createUserRole(data);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar role" });
    }
  });

  // PATCH /api/roles/:id - Update a role
  app.patch("/api/roles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const existing = await storage.getUserRole(req.params.id);
      if (!existing) return res.status(404).json({ error: "Role não encontrado" });
      if (existing.tenantId !== tenantId) return res.status(403).json({ error: "Acesso negado" });

      const { tenantId: _tid, id: _id, ...allowedFields } = req.body;
      const role = await storage.updateUserRole(req.params.id, allowedFields);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar role" });
    }
  });

  // DELETE /api/roles/:id - Delete a role
  app.delete("/api/roles/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const existing = await storage.getUserRole(req.params.id);
      if (!existing) return res.status(404).json({ error: "Role não encontrado" });
      if (existing.tenantId !== tenantId) return res.status(403).json({ error: "Acesso negado" });
      if (existing.isSystemRole) return res.status(400).json({ error: "Não é possível deletar role do sistema" });

      await storage.deleteUserRole(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar role" });
    }
  });

  // GET /api/permissions/matrix - Get full permissions matrix
  app.get("/api/permissions/matrix", requireAuth, async (req: Request, res: Response) => {
    try {
      // Return the permissions structure for the UI
      res.json({
        categories: [
          { name: "Imóveis", permissions: ["properties_view", "properties_create", "properties_edit", "properties_delete", "properties_publish"] },
          { name: "Leads", permissions: ["leads_view", "leads_create", "leads_edit", "leads_delete", "leads_assign"] },
          { name: "Contratos", permissions: ["contracts_view", "contracts_create", "contracts_edit", "contracts_delete", "contracts_sign"] },
          { name: "Financeiro", permissions: ["finance_view", "finance_create", "finance_edit", "finance_delete", "finance_reports"] },
          { name: "Locações", permissions: ["rentals_view", "rentals_create", "rentals_edit", "rentals_payments", "rentals_transfers"] },
          { name: "Vendas", permissions: ["sales_view", "sales_create", "sales_proposals", "sales_reports"] },
          { name: "Usuários", permissions: ["users_view", "users_create", "users_edit", "users_delete", "roles_manage"] },
          { name: "Configurações", permissions: ["settings_tenant", "settings_integrations", "settings_notifications", "settings_ai"] },
          { name: "Relatórios", permissions: ["reports_view", "reports_export", "reports_save"] },
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar matriz de permissões" });
    }
  });

  /**
   * INTEGRATION CONFIGS ROUTES
   * Manage external integrations
   */

  // GET /api/integrations - List all integrations for current tenant
  app.get("/api/integrations", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const integrations = await storage.getIntegrationsByTenant(tenantId);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar integrações" });
    }
  });

  // GET /api/integrations/:type - Get specific integration by type
  app.get("/api/integrations/:type", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const integration = await storage.getIntegrationByName(tenantId, req.params.type);
      res.json(integration || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar integração" });
    }
  });

  // PATCH /api/integrations/:type - Update integration config
  app.patch("/api/integrations/:type", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const integration = await storage.createOrUpdateIntegration(tenantId, req.params.type, req.body);
      res.json(integration);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar integração" });
    }
  });

  /**
   * NOTIFICATION PREFERENCES ROUTES
   * Manage notification settings
   */

  // GET /api/notifications/preferences - Get notification preferences
  app.get("/api/notifications/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const preferences = await storage.getNotificationPreferencesByTenant(tenantId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar preferências de notificação" });
    }
  });

  // PATCH /api/notifications/preferences - Update notification preferences
  app.patch("/api/notifications/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { preferences } = req.body;
      if (Array.isArray(preferences)) {
        const results = [];
        for (const pref of preferences) {
          const result = await storage.createOrUpdateNotificationPreference(
            tenantId,
            pref.eventType,
            pref
          );
          results.push(result);
        }
        res.json(results);
      } else if (preferences && preferences.eventType) {
        const result = await storage.createOrUpdateNotificationPreference(
          tenantId,
          preferences.eventType,
          preferences
        );
        res.json(result);
      } else {
        res.status(400).json({ error: "Formato de preferências inválido" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar preferências" });
    }
  });

  /**
   * AI SETTINGS ROUTES
   * Manage AI configuration
   */

  // GET /api/ai/settings - Get AI settings
  app.get("/api/ai/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const settings = await storage.getAISettings(tenantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações de IA" });
    }
  });

  // PATCH /api/ai/settings - Update AI settings
  app.patch("/api/ai/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;

      if ((req.user as any).role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const settings = await storage.createOrUpdateAISettings(tenantId, req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar configurações de IA" });
    }
  });

  /**
   * SAVED REPORTS ROUTES
   * Manage saved report configurations
   */

  // GET /api/reports/saved - List saved reports for current user
  app.get("/api/reports/saved", requireAuth, checkFeatureAccess('advanced_reports'), async (req: Request, res: Response) => {
    try {
      const reports = await storage.getSavedReportsByUser((req.user as any).id);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar relatórios salvos" });
    }
  });

  // POST /api/reports/saved - Save a new report configuration
  app.post("/api/reports/saved", requireAuth, checkFeatureAccess('advanced_reports'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = insertSavedReportSchema.parse({
        ...req.body,
        tenantId,
        userId: (req.user as any).id,
      });
      const report = await storage.createSavedReport(data);
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao salvar relatório" });
    }
  });

  // PATCH /api/reports/saved/:id - Update saved report
  app.patch("/api/reports/saved/:id", requireAuth, checkFeatureAccess('advanced_reports'), async (req: Request, res: Response) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.userId !== (req.user as any).id) return res.status(403).json({ error: "Acesso negado" });

      const { tenantId: _tid, userId: _uid, id: _id, ...allowedFields } = req.body;
      const report = await storage.updateSavedReport(req.params.id, allowedFields);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar relatório" });
    }
  });

  // DELETE /api/reports/saved/:id - Delete saved report
  app.delete("/api/reports/saved/:id", requireAuth, checkFeatureAccess('advanced_reports'), async (req: Request, res: Response) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.userId !== (req.user as any).id) return res.status(403).json({ error: "Acesso negado" });

      await storage.deleteSavedReport(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar relatório" });
    }
  });

  // POST /api/reports/saved/:id/favorite - Toggle favorite status
  app.post("/api/reports/saved/:id/favorite", requireAuth, checkFeatureAccess('advanced_reports'), async (req: Request, res: Response) => {
    try {
      const existing = await storage.getSavedReport(req.params.id);
      if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
      if (existing.userId !== (req.user as any).id) return res.status(403).json({ error: "Acesso negado" });

      const report = await storage.toggleReportFavorite(req.params.id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar favorito" });
    }
  });
}
