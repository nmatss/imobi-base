/**
 * API ROUTES EXTENSIONS FOR MULTI-TENANT ARCHITECTURE
 * These routes should be added to server/routes.ts
 *
 * All routes require authentication and enforce tenant isolation
 */

/**
 * TENANT SETTINGS ROUTES
 * Manage extended tenant configuration
 */

/*

// GET /api/tenant/settings - Get current tenant settings
app.get("/api/tenant/settings", requireAuth, async (req, res) => {
  try {
    const settings = await storage.getTenantSettings(req.user!.tenantId);
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
});

// PATCH /api/tenant/settings - Update tenant settings
app.patch("/api/tenant/settings", requireAuth, async (req, res) => {
  try {
    // Only admins can update tenant settings
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    let settings = await storage.getTenantSettings(req.user!.tenantId);

    if (!settings) {
      // Create new settings if they don't exist
      const data = insertTenantSettingsSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId
      });
      settings = await storage.createTenantSettings(data);
    } else {
      // Update existing settings
      settings = await storage.updateTenantSettings(req.user!.tenantId, req.body);
    }

    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar configurações" });
  }
});

*/

/**
 * USER ROLES & PERMISSIONS ROUTES
 * Manage roles and permissions within a tenant
 */

/*

// GET /api/roles - List all roles for current tenant
app.get("/api/roles", requireAuth, async (req, res) => {
  try {
    const roles = await storage.getUserRolesByTenant(req.user!.tenantId);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar roles" });
  }
});

// POST /api/roles - Create a new role
app.post("/api/roles", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const data = insertUserRoleSchema.parse({
      ...req.body,
      tenantId: req.user!.tenantId
    });
    const role = await storage.createUserRole(data);
    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar role" });
  }
});

// PATCH /api/roles/:id - Update a role
app.patch("/api/roles/:id", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const existing = await storage.getUserRole(req.params.id);
    if (!existing) return res.status(404).json({ error: "Role não encontrado" });
    if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });

    const { tenantId, id, ...allowedFields } = req.body;
    const role = await storage.updateUserRole(req.params.id, allowedFields);
    res.json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar role" });
  }
});

// DELETE /api/roles/:id - Delete a role
app.delete("/api/roles/:id", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const existing = await storage.getUserRole(req.params.id);
    if (!existing) return res.status(404).json({ error: "Role não encontrado" });
    if (existing.tenantId !== req.user!.tenantId) return res.status(403).json({ error: "Acesso negado" });
    if (existing.isDefault) return res.status(400).json({ error: "Não é possível deletar role padrão" });

    await storage.deleteUserRole(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar role" });
  }
});

// GET /api/permissions/matrix - Get full permissions matrix
app.get("/api/permissions/matrix", requireAuth, async (req, res) => {
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

*/

/**
 * INTEGRATION CONFIGS ROUTES
 * Manage external integrations
 */

/*

// GET /api/integrations - List all integrations for current tenant
app.get("/api/integrations", requireAuth, async (req, res) => {
  try {
    const integrations = await storage.getIntegrationConfigsByTenant(req.user!.tenantId);
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar integrações" });
  }
});

// GET /api/integrations/:type - Get specific integration by type
app.get("/api/integrations/:type", requireAuth, async (req, res) => {
  try {
    const integration = await storage.getIntegrationConfigByType(req.user!.tenantId, req.params.type);
    res.json(integration || {});
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar integração" });
  }
});

// PATCH /api/integrations/:type - Update integration config
app.patch("/api/integrations/:type", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    let integration = await storage.getIntegrationConfigByType(req.user!.tenantId, req.params.type);

    if (!integration) {
      // Create new integration config
      const data = insertIntegrationConfigSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        integrationType: req.params.type
      });
      integration = await storage.createIntegrationConfig(data);
    } else {
      // Update existing config
      integration = await storage.updateIntegrationConfig(integration.id, req.body);
    }

    res.json(integration);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar integração" });
  }
});

*/

/**
 * NOTIFICATION PREFERENCES ROUTES
 * Manage notification settings
 */

/*

// GET /api/notifications/preferences - Get notification preferences
app.get("/api/notifications/preferences", requireAuth, async (req, res) => {
  try {
    const preferences = await storage.getNotificationPreferences(req.user!.tenantId);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar preferências de notificação" });
  }
});

// PATCH /api/notifications/preferences - Update notification preferences
app.patch("/api/notifications/preferences", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const preferences = await storage.updateNotificationPreferences(
      req.user!.tenantId,
      req.body.preferences
    );
    res.json(preferences);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar preferências" });
  }
});

*/

/**
 * AI SETTINGS ROUTES
 * Manage AI configuration
 */

/*

// GET /api/ai/settings - Get AI settings
app.get("/api/ai/settings", requireAuth, async (req, res) => {
  try {
    const settings = await storage.getAISettings(req.user!.tenantId);
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar configurações de IA" });
  }
});

// PATCH /api/ai/settings - Update AI settings
app.patch("/api/ai/settings", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado" });
    }

    let settings = await storage.getAISettings(req.user!.tenantId);

    if (!settings) {
      // Create new AI settings
      const data = insertAISettingsSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId
      });
      settings = await storage.createAISettings(data);
    } else {
      // Update existing settings
      settings = await storage.updateAISettings(req.user!.tenantId, req.body);
    }

    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar configurações de IA" });
  }
});

*/

/**
 * SAVED REPORTS ROUTES
 * Manage saved report configurations
 */

/*

// GET /api/reports/saved - List saved reports for current user
app.get("/api/reports/saved", requireAuth, async (req, res) => {
  try {
    const reports = await storage.getSavedReportsByUser(req.user!.tenantId, req.user!.id);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar relatórios salvos" });
  }
});

// POST /api/reports/saved - Save a new report configuration
app.post("/api/reports/saved", requireAuth, async (req, res) => {
  try {
    const data = insertSavedReportSchema.parse({
      ...req.body,
      tenantId: req.user!.tenantId,
      userId: req.user!.id
    });
    const report = await storage.createSavedReport(data);
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao salvar relatório" });
  }
});

// PATCH /api/reports/saved/:id - Update saved report
app.patch("/api/reports/saved/:id", requireAuth, async (req, res) => {
  try {
    const existing = await storage.getSavedReport(req.params.id);
    if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
    if (existing.userId !== req.user!.id) return res.status(403).json({ error: "Acesso negado" });

    const { tenantId, userId, id, ...allowedFields } = req.body;
    const report = await storage.updateSavedReport(req.params.id, allowedFields);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao atualizar relatório" });
  }
});

// DELETE /api/reports/saved/:id - Delete saved report
app.delete("/api/reports/saved/:id", requireAuth, async (req, res) => {
  try {
    const existing = await storage.getSavedReport(req.params.id);
    if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
    if (existing.userId !== req.user!.id) return res.status(403).json({ error: "Acesso negado" });

    await storage.deleteSavedReport(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar relatório" });
  }
});

// POST /api/reports/saved/:id/favorite - Toggle favorite status
app.post("/api/reports/saved/:id/favorite", requireAuth, async (req, res) => {
  try {
    const existing = await storage.getSavedReport(req.params.id);
    if (!existing) return res.status(404).json({ error: "Relatório não encontrado" });
    if (existing.userId !== req.user!.id) return res.status(403).json({ error: "Acesso negado" });

    const report = await storage.updateSavedReport(req.params.id, {
      isFavorite: !existing.isFavorite
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar favorito" });
  }
});

*/
