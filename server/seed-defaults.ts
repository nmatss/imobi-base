/**
 * DEFAULT SEED DATA FOR NEW TENANTS
 * This file contains default configurations that should be created for each new tenant
 */

/**
 * DEFAULT USER ROLES
 * These roles should be created for every new tenant
 */
export const DEFAULT_ROLES = [
  {
    name: "Administrador",
    description: "Acesso total ao sistema",
    permissions: {
      // Properties
      properties_view: true,
      properties_create: true,
      properties_edit: true,
      properties_delete: true,
      properties_publish: true,
      // Leads
      leads_view: true,
      leads_create: true,
      leads_edit: true,
      leads_delete: true,
      leads_assign: true,
      // Contracts
      contracts_view: true,
      contracts_create: true,
      contracts_edit: true,
      contracts_delete: true,
      contracts_sign: true,
      // Financials
      finance_view: true,
      finance_create: true,
      finance_edit: true,
      finance_delete: true,
      finance_reports: true,
      // Rentals
      rentals_view: true,
      rentals_create: true,
      rentals_edit: true,
      rentals_payments: true,
      rentals_transfers: true,
      // Sales
      sales_view: true,
      sales_create: true,
      sales_proposals: true,
      sales_reports: true,
      // Users & Roles
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      roles_manage: true,
      // Settings
      settings_tenant: true,
      settings_integrations: true,
      settings_notifications: true,
      settings_ai: true,
      // Reports
      reports_view: true,
      reports_export: true,
      reports_save: true,
    },
    isDefault: true,
  },
  {
    name: "Gestor",
    description: "Gestão geral com restrições de exclusão",
    permissions: {
      properties_view: true,
      properties_create: true,
      properties_edit: true,
      properties_delete: false,
      properties_publish: true,
      leads_view: true,
      leads_create: true,
      leads_edit: true,
      leads_delete: false,
      leads_assign: true,
      contracts_view: true,
      contracts_create: true,
      contracts_edit: true,
      contracts_delete: false,
      contracts_sign: true,
      finance_view: true,
      finance_create: true,
      finance_edit: true,
      finance_delete: false,
      finance_reports: true,
      rentals_view: true,
      rentals_create: true,
      rentals_edit: true,
      rentals_payments: true,
      rentals_transfers: true,
      sales_view: true,
      sales_create: true,
      sales_proposals: true,
      sales_reports: true,
      users_view: true,
      users_create: false,
      users_edit: false,
      users_delete: false,
      roles_manage: false,
      settings_tenant: false,
      settings_integrations: false,
      settings_notifications: true,
      settings_ai: false,
      reports_view: true,
      reports_export: true,
      reports_save: true,
    },
    isDefault: true,
  },
  {
    name: "Corretor",
    description: "Foco em imóveis e leads",
    permissions: {
      properties_view: true,
      properties_create: true,
      properties_edit: true,
      properties_delete: false,
      properties_publish: false,
      leads_view: true,
      leads_create: true,
      leads_edit: true,
      leads_delete: false,
      leads_assign: false,
      contracts_view: true,
      contracts_create: true,
      contracts_edit: false,
      contracts_delete: false,
      contracts_sign: false,
      finance_view: false,
      finance_create: false,
      finance_edit: false,
      finance_delete: false,
      finance_reports: false,
      rentals_view: true,
      rentals_create: false,
      rentals_edit: false,
      rentals_payments: false,
      rentals_transfers: false,
      sales_view: true,
      sales_create: true,
      sales_proposals: true,
      sales_reports: false,
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      roles_manage: false,
      settings_tenant: false,
      settings_integrations: false,
      settings_notifications: false,
      settings_ai: false,
      reports_view: true,
      reports_export: false,
      reports_save: true,
    },
    isDefault: true,
  },
  {
    name: "Financeiro",
    description: "Gestão financeira e locações",
    permissions: {
      properties_view: true,
      properties_create: false,
      properties_edit: false,
      properties_delete: false,
      properties_publish: false,
      leads_view: true,
      leads_create: false,
      leads_edit: false,
      leads_delete: false,
      leads_assign: false,
      contracts_view: true,
      contracts_create: false,
      contracts_edit: false,
      contracts_delete: false,
      contracts_sign: false,
      finance_view: true,
      finance_create: true,
      finance_edit: true,
      finance_delete: true,
      finance_reports: true,
      rentals_view: true,
      rentals_create: false,
      rentals_edit: true,
      rentals_payments: true,
      rentals_transfers: true,
      sales_view: true,
      sales_create: false,
      sales_proposals: false,
      sales_reports: true,
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      roles_manage: false,
      settings_tenant: false,
      settings_integrations: false,
      settings_notifications: false,
      settings_ai: false,
      reports_view: true,
      reports_export: true,
      reports_save: true,
    },
    isDefault: true,
  },
];

/**
 * DEFAULT FINANCIAL CATEGORIES
 * Real estate specific categories for financial management
 */
export const DEFAULT_FINANCE_CATEGORIES = {
  income: [
    { name: "Comissão de Venda", color: "#10b981" },
    { name: "Taxa de Administração", color: "#059669" },
    { name: "Taxa de Locação", color: "#047857" },
    { name: "Multas e Juros", color: "#065f46" },
    { name: "Serviços Extras", color: "#064e3b" },
  ],
  expense: [
    { name: "Salários e Encargos", color: "#ef4444" },
    { name: "Marketing e Publicidade", color: "#dc2626" },
    { name: "Manutenção de Imóveis", color: "#b91c1c" },
    { name: "Escritório e Infraestrutura", color: "#991b1b" },
    { name: "Taxas e Impostos", color: "#7f1d1d" },
    { name: "Comissões a Pagar", color: "#6b1c1c" },
    { name: "Serviços Profissionais", color: "#5c1919" },
  ],
};

/**
 * DEFAULT AI PRESETS
 * Module-specific AI configurations
 */
export const DEFAULT_AI_PRESETS = {
  properties: {
    descriptionLength: "medium", // short, medium, long
    includeFeatures: true,
    includeLocation: true,
    tone: "professional",
  },
  leads: {
    followUpTone: "friendly",
    includeProperties: true,
    maxProperties: 3,
    personalizeMessage: true,
  },
  contracts: {
    formalTone: true,
    includeTerms: true,
    language: "pt-BR",
  },
  rentals: {
    reminderTone: "polite",
    includePaymentDetails: true,
    suggestPaymentMethods: true,
  },
  sales: {
    proposalTone: "professional",
    includePropertyDetails: true,
    includeFinancing: false,
  },
  financial: {
    analysisDepth: "detailed", // summary, detailed, comprehensive
    includeTrends: true,
    includeForecast: false,
  },
  reports: {
    summaryStyle: "executive", // executive, detailed, technical
    includeCharts: true,
    includeRecommendations: true,
  },
};

/**
 * DEFAULT NOTIFICATION PREFERENCES
 * Event-based notification settings
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = [
  // Lead Notifications
  {
    eventType: "lead_created",
    channel: "email",
    recipientRole: "admin",
    isActive: true,
  },
  {
    eventType: "lead_status_changed",
    channel: "email",
    recipientRole: "broker",
    isActive: true,
  },

  // Rental Payment Notifications
  {
    eventType: "payment_due_tomorrow",
    channel: "email",
    recipientRole: "financial",
    isActive: true,
  },
  {
    eventType: "payment_overdue",
    channel: "email",
    recipientRole: "financial",
    isActive: true,
  },
  {
    eventType: "payment_received",
    channel: "email",
    recipientRole: "financial",
    isActive: true,
  },

  // Contract Notifications
  {
    eventType: "contract_expiring_30days",
    channel: "email",
    recipientRole: "manager",
    isActive: true,
  },
  {
    eventType: "contract_signed",
    channel: "email",
    recipientRole: "admin",
    isActive: true,
  },

  // Property Notifications
  {
    eventType: "property_published",
    channel: "email",
    recipientRole: "admin",
    isActive: false,
  },
  {
    eventType: "property_visit_scheduled",
    channel: "email",
    recipientRole: "broker",
    isActive: true,
  },
];

/**
 * DEFAULT TENANT SETTINGS
 * Initial configuration for new tenants
 */
export const getDefaultTenantSettings = (tenant: any) => ({
  tenantId: tenant.id,
  timezone: "America/Sao_Paulo",
  businessHours: JSON.stringify({
    monday: "09:00-18:00",
    tuesday: "09:00-18:00",
    wednesday: "09:00-18:00",
    thursday: "09:00-18:00",
    friday: "09:00-18:00",
    saturday: "09:00-13:00",
    sunday: "closed",
  }),
  portalSettings: JSON.stringify({
    showBrokers: true,
    showWhatsApp: true,
    showLeadForm: true,
    enableVirtualTours: false,
  }),
  socialLinks: JSON.stringify({
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  }),
  seoTitle: `${tenant.name} - Imóveis de Qualidade`,
  seoDescription: `Encontre seu imóvel ideal com ${tenant.name}. Apartamentos, casas e terrenos para venda e locação.`,
  footerText: `© ${new Date().getFullYear()} ${tenant.name}. Todos os direitos reservados.`,
});

/**
 * DEFAULT AI SETTINGS
 * Initial AI configuration for new tenants
 */
export const getDefaultAISettings = (tenant: any) => ({
  tenantId: tenant.id,
  isActive: true,
  language: "pt-BR",
  tone: "professional",
  modulePresets: JSON.stringify(DEFAULT_AI_PRESETS),
  allowBrokerEdits: true,
});

/**
 * SEED HELPER FUNCTIONS
 * Functions to create default data for a tenant
 */

/**
 * Seed default roles for a tenant
 */
export async function seedDefaultRoles(storage: any, tenantId: string) {
  const roles = [];
  for (const roleData of DEFAULT_ROLES) {
    const role = await storage.createUserRole({
      ...roleData,
      tenantId,
      permissions: JSON.stringify(roleData.permissions),
    });
    roles.push(role);
  }
  return roles;
}

/**
 * Seed default finance categories for a tenant
 */
export async function seedDefaultFinanceCategories(storage: any, tenantId: string) {
  const categories = [];

  for (const category of DEFAULT_FINANCE_CATEGORIES.income) {
    const created = await storage.createFinanceCategory({
      ...category,
      tenantId,
      type: "income",
      isSystemGenerated: true,
    });
    categories.push(created);
  }

  for (const category of DEFAULT_FINANCE_CATEGORIES.expense) {
    const created = await storage.createFinanceCategory({
      ...category,
      tenantId,
      type: "expense",
      isSystemGenerated: true,
    });
    categories.push(created);
  }

  return categories;
}

/**
 * Seed default notification preferences for a tenant
 */
export async function seedDefaultNotificationPreferences(storage: any, tenantId: string) {
  const preferences = DEFAULT_NOTIFICATION_PREFERENCES.map(pref => ({
    ...pref,
    tenantId,
  }));

  return await storage.updateNotificationPreferences(tenantId, preferences);
}

/**
 * Complete setup for a new tenant
 * Call this after creating a tenant to set up all defaults
 */
export async function setupNewTenant(storage: any, tenant: any) {
  console.log(`Setting up defaults for tenant: ${tenant.name}`);

  // Create default roles
  await seedDefaultRoles(storage, tenant.id);
  console.log("  ✅ Default roles created");

  // Create default finance categories
  await seedDefaultFinanceCategories(storage, tenant.id);
  console.log("  ✅ Default finance categories created");

  // Create tenant settings
  await storage.createTenantSettings(getDefaultTenantSettings(tenant));
  console.log("  ✅ Tenant settings created");

  // Create AI settings
  await storage.createAISettings(getDefaultAISettings(tenant));
  console.log("  ✅ AI settings created");

  // Create notification preferences
  await seedDefaultNotificationPreferences(storage, tenant.id);
  console.log("  ✅ Notification preferences created");

  console.log(`✅ Tenant ${tenant.name} fully configured`);
}
