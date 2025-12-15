import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper for default timestamps
const now = () => new Date().toISOString();

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").notNull().default("#0066cc"),
  secondaryColor: text("secondary_color").notNull().default("#333333"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  avatar: text("avatar"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  category: text("category").notNull(),
  price: text("price").notNull(), // Stored as string for precision
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  features: text("features"), // JSON array stored as string
  images: text("images"), // JSON array stored as string
  status: text("status").notNull().default("available"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  budget: text("budget"), // Stored as string for precision
  interests: text("interests"), // JSON array stored as string
  notes: text("notes"),
  assignedTo: text("assigned_to").references(() => users.id),
  preferredType: text("preferred_type"),
  preferredCategory: text("preferred_category"),
  preferredCity: text("preferred_city"),
  preferredNeighborhood: text("preferred_neighborhood"),
  minBedrooms: integer("min_bedrooms"),
  maxBedrooms: integer("max_bedrooms"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({ id: true, createdAt: true });
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;

export const visits = sqliteTable("visits", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  leadId: text("lead_id").references(() => leads.id),
  scheduledFor: text("scheduled_for").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  assignedTo: text("assigned_to").references(() => users.id),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export const contracts = sqliteTable("contracts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  leadId: text("lead_id").notNull().references(() => leads.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  value: text("value").notNull(),
  terms: text("terms"),
  signedAt: text("signed_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const newsletterSubscriptions = sqliteTable("newsletter_subscriptions", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  tenantId: text("tenant_id").references(() => tenants.id),
  subscribedAt: text("subscribed_at").notNull().default(now()),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertNewsletterSchema = createInsertSchema(newsletterSubscriptions).omit({ id: true, subscribedAt: true });
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletterSubscriptions.$inferSelect;

export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  address: text("address"),
  bankName: text("bank_name"),
  bankAgency: text("bank_agency"),
  bankAccount: text("bank_account"),
  pixKey: text("pix_key"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true, createdAt: true });
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type Owner = typeof owners.$inferSelect;

export const renters = sqliteTable("renters", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  rg: text("rg"),
  profession: text("profession"),
  income: text("income"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertRenterSchema = createInsertSchema(renters).omit({ id: true, createdAt: true });
export type InsertRenter = z.infer<typeof insertRenterSchema>;
export type Renter = typeof renters.$inferSelect;

export const rentalContracts = sqliteTable("rental_contracts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  ownerId: text("owner_id").notNull().references(() => owners.id),
  renterId: text("renter_id").notNull().references(() => renters.id),
  rentValue: text("rent_value").notNull(),
  condoFee: text("condo_fee"),
  iptuValue: text("iptu_value"),
  dueDay: integer("due_day").notNull().default(10),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  adjustmentIndex: text("adjustment_index").default("IGPM"),
  depositValue: text("deposit_value"),
  administrationFee: text("administration_fee").default("10"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertRentalContractSchema = createInsertSchema(rentalContracts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRentalContract = z.infer<typeof insertRentalContractSchema>;
export type RentalContract = typeof rentalContracts.$inferSelect;

export const rentalPayments = sqliteTable("rental_payments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  rentalContractId: text("rental_contract_id").notNull().references(() => rentalContracts.id),
  referenceMonth: text("reference_month").notNull(),
  dueDate: text("due_date").notNull(),
  rentValue: text("rent_value").notNull(),
  condoFee: text("condo_fee"),
  iptuValue: text("iptu_value"),
  extraCharges: text("extra_charges"),
  discounts: text("discounts"),
  totalValue: text("total_value").notNull(),
  paidValue: text("paid_value"),
  paidDate: text("paid_date"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertRentalPaymentSchema = createInsertSchema(rentalPayments).omit({ id: true, createdAt: true });
export type InsertRentalPayment = z.infer<typeof insertRentalPaymentSchema>;
export type RentalPayment = typeof rentalPayments.$inferSelect;

// Repasses a Proprietários
export const rentalTransfers = sqliteTable("rental_transfers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  ownerId: text("owner_id").notNull().references(() => owners.id),
  referenceMonth: text("reference_month").notNull(), // "2024-01"
  grossAmount: text("gross_amount").notNull(),
  administrationFee: text("administration_fee"),
  maintenanceDeductions: text("maintenance_deductions"),
  otherDeductions: text("other_deductions"),
  netAmount: text("net_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid
  paidDate: text("paid_date"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertRentalTransferSchema = createInsertSchema(rentalTransfers).omit({ id: true, createdAt: true });
export type InsertRentalTransfer = z.infer<typeof insertRentalTransferSchema>;
export type RentalTransfer = typeof rentalTransfers.$inferSelect;

// Sales Module
export const saleProposals = sqliteTable("sale_proposals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  leadId: text("lead_id").notNull().references(() => leads.id),
  proposedValue: text("proposed_value").notNull(),
  validityDate: text("validity_date"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertSaleProposalSchema = createInsertSchema(saleProposals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSaleProposal = z.infer<typeof insertSaleProposalSchema>;
export type SaleProposal = typeof saleProposals.$inferSelect;

export const propertySales = sqliteTable("property_sales", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  buyerLeadId: text("buyer_lead_id").notNull().references(() => leads.id),
  sellerId: text("seller_id").references(() => owners.id),
  brokerId: text("broker_id").references(() => users.id),
  saleValue: text("sale_value").notNull(),
  saleDate: text("sale_date").notNull(),
  commissionRate: text("commission_rate").default("6"),
  commissionValue: text("commission_value"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPropertySaleSchema = createInsertSchema(propertySales).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertySale = z.infer<typeof insertPropertySaleSchema>;
export type PropertySale = typeof propertySales.$inferSelect;

// Finance Module
export const financeCategories = sqliteTable("finance_categories", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  color: text("color").default("#6b7280"),
  isSystemGenerated: integer("is_system_generated", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertFinanceCategorySchema = createInsertSchema(financeCategories).omit({ id: true, createdAt: true });
export type InsertFinanceCategory = z.infer<typeof insertFinanceCategorySchema>;
export type FinanceCategory = typeof financeCategories.$inferSelect;

// Commissions Module
export const commissions = sqliteTable("commissions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  saleId: text("sale_id").references(() => propertySales.id),
  rentalContractId: text("rental_contract_id").references(() => rentalContracts.id),
  brokerId: text("broker_id").notNull().references(() => users.id),
  transactionType: text("transaction_type").notNull(), // 'sale' | 'rental'
  transactionValue: text("transaction_value").notNull(),
  commissionRate: text("commission_rate").notNull(),
  grossCommission: text("gross_commission").notNull(),
  agencySplit: text("agency_split").notNull().default("50"),
  brokerCommission: text("broker_commission").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'paid'
  approvedAt: text("approved_at"),
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

export const financeEntries = sqliteTable("finance_entries", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  categoryId: text("category_id").references(() => financeCategories.id),
  sourceType: text("source_type"),
  sourceId: text("source_id"),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  flow: text("flow").notNull(),
  entryDate: text("entry_date").notNull(),
  notes: text("notes"),
  originType: text("origin_type"),
  originId: text("origin_id"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertFinanceEntrySchema = createInsertSchema(financeEntries).omit({ id: true, createdAt: true });
export type InsertFinanceEntry = z.infer<typeof insertFinanceEntrySchema>;
export type FinanceEntry = typeof financeEntries.$inferSelect;

// CRM Enhancements
export const leadTags = sqliteTable("lead_tags", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertLeadTagSchema = createInsertSchema(leadTags).omit({ id: true, createdAt: true });
export type InsertLeadTag = z.infer<typeof insertLeadTagSchema>;
export type LeadTag = typeof leadTags.$inferSelect;

export const leadTagLinks = sqliteTable("lead_tag_links", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  tagId: text("tag_id").notNull().references(() => leadTags.id),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertLeadTagLinkSchema = createInsertSchema(leadTagLinks).omit({ id: true, createdAt: true });
export type InsertLeadTagLink = z.infer<typeof insertLeadTagLinkSchema>;
export type LeadTagLink = typeof leadTagLinks.$inferSelect;

export const followUps = sqliteTable("follow_ups", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  leadId: text("lead_id").notNull().references(() => leads.id),
  assignedTo: text("assigned_to").references(() => users.id),
  dueAt: text("due_at").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({ id: true, createdAt: true });
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;

// ============== MULTI-TENANT ARCHITECTURE IMPROVEMENTS ==============

/**
 * TENANT SETTINGS
 * Extended configuration for each tenant including company data, branding,
 * banking information, and portal/public site settings
 */
export const tenantSettings = sqliteTable("tenant_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  // Company Data
  cnpj: text("cnpj"),
  municipalRegistration: text("municipal_registration"),
  creci: text("creci"),
  // Banking Information
  bankName: text("bank_name"),
  bankAgency: text("bank_agency"),
  bankAccount: text("bank_account"),
  pixKey: text("pix_key"),
  // Business Settings
  businessHours: text("business_hours"), // JSON: { monday: "9:00-18:00", ... }
  timezone: text("timezone").default("America/Sao_Paulo"),
  // Branding
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  // Domain Settings
  customDomain: text("custom_domain"),
  subdomain: text("subdomain"),
  // Social Links
  socialLinks: text("social_links"), // JSON: { facebook, instagram, linkedin, youtube }
  // Portal/Site Settings
  footerText: text("footer_text"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  portalSettings: text("portal_settings"), // JSON: { showBrokers, showWhatsApp, showLeadForm }
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;
export type TenantSettings = typeof tenantSettings.$inferSelect;

/**
 * BRAND SETTINGS
 * Brand and website settings for each tenant
 */
export const brandSettings = sqliteTable("brand_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  customDomain: text("custom_domain"),
  subdomain: text("subdomain"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  youtubeUrl: text("youtube_url"),
  footerText: text("footer_text"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  ogImage: text("og_image"),
  googleAnalyticsId: text("google_analytics_id"),
  whatsappEnabled: integer("whatsapp_enabled", { mode: "boolean" }).default(true),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertBrandSettingsSchema = createInsertSchema(brandSettings).omit({ id: true, updatedAt: true });
export type InsertBrandSettings = z.infer<typeof insertBrandSettingsSchema>;
export type BrandSettings = typeof brandSettings.$inferSelect;

/**
 * USER ROLES
 * Defines permission roles within a tenant
 * Multi-tenant isolation: Each tenant has its own roles
 */
export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(), // e.g., "Administrador", "Gestor", "Corretor"
  description: text("description"),
  permissions: text("permissions").notNull(), // JSON object with boolean flags
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  isSystemRole: integer("is_system_role", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

/**
 * USER PERMISSIONS
 * Links users to roles and allows custom permission overrides
 */
export const userPermissions = sqliteTable("user_permissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").references(() => userRoles.id),
  customPermissions: text("custom_permissions"), // JSON object for overrides
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({ id: true, createdAt: true });
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;

/**
 * INTEGRATION CONFIGS
 * Stores configuration for external integrations per tenant
 * Types: portal, whatsapp, email, signature, bi
 */
export const integrationConfigs = sqliteTable("integration_configs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  integrationType: text("integration_type"), // portal, whatsapp, email, signature, bi (deprecated, use integrationName)
  integrationName: text("integration_name").notNull(), // portal, whatsapp, email, signature, bi
  config: text("config").notNull(), // JSON configuration
  status: text("status").notNull().default("disconnected"), // connected, disconnected, error
  lastSync: text("last_sync"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;

/**
 * NOTIFICATION PREFERENCES
 * Defines notification settings per tenant
 */
export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  eventType: text("event_type").notNull(), // lead_created, payment_due, contract_expiring, etc.
  channel: text("channel").notNull(), // email, whatsapp, push
  recipientRole: text("recipient_role"), // which role should receive this notification
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true });
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

/**
 * AI SETTINGS
 * AI configuration per tenant for different modules
 */
export const aiSettings = sqliteTable("ai_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  language: text("language").default("pt-BR"),
  tone: text("tone").default("professional"), // professional, friendly, formal
  modulePresets: text("module_presets"), // JSON: settings by module (properties, leads, contracts, etc)
  allowBrokerEdits: integer("allow_broker_edits", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

/**
 * SAVED REPORTS
 * Users can save report configurations for quick access
 */
export const savedReports = sqliteTable("saved_reports", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(), // rentals, sales, financial, leads, etc.
  filters: text("filters").notNull(), // JSON object with report filters
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true });
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;
export type SavedReport = typeof savedReports.$inferSelect;
