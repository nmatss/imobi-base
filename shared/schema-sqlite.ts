import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
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
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, deletedAt: true });
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
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpires: text("verification_token_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: text("password_reset_expires"),
  oauthProvider: text("oauth_provider"), // google, microsoft, null
  oauthId: text("oauth_id"),
  oauthAccessToken: text("oauth_access_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  lastLogin: text("last_login"),
  lastLoginIp: text("last_login_ip"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: text("locked_until"),
  passwordHistory: text("password_history"), // JSON array of hashed passwords
  createdAt: text("created_at").notNull().default(now()),
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, deletedAt: true });
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
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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
  // Confirmation / reschedule / feedback workflow (paridade com schema.ts/PG)
  confirmationToken: text("confirmation_token"),
  confirmationStatus: text("confirmation_status").default("pending"), // pending, confirmed, declined
  confirmedAt: text("confirmed_at"),
  rescheduledFromId: text("rescheduled_from_id"), // self-ref visits.id
  reminderSentAt: text("reminder_sent_at"),
  checklistJson: text("checklist_json"), // JSON array
  feedbackRating: integer("feedback_rating"),
  feedbackNotes: text("feedback_notes"),
  feedbackAt: text("feedback_at"),
  nextActionType: text("next_action_type"),
  nextActionDueAt: text("next_action_due_at"),
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
  clicksignDocumentKey: text("clicksign_document_key"),
  signedAt: text("signed_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const newsletterSubscriptions = sqliteTable("newsletter_subscriptions", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  tenantId: text("tenant_id").references(() => tenants.id),
  subscribedAt: text("subscribed_at").notNull().default(now()),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  unsubscribedAt: text("unsubscribed_at"),
  unsubscribeReason: text("unsubscribe_reason"),
  resubscribedAt: text("resubscribed_at"),
});

export const insertNewsletterSchema = createInsertSchema(newsletterSubscriptions).omit({
  id: true,
  subscribedAt: true,
  active: true,
  unsubscribedAt: true,
  unsubscribeReason: true,
  resubscribedAt: true,
});
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
  deletedAt: text("deleted_at"), // soft delete (paridade com schema.ts/PG)
});

export const insertRentalContractSchema = createInsertSchema(rentalContracts).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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

// ==================== SECURITY & COMPLIANCE ====================

/**
 * TWO FACTOR AUTHENTICATION
 * TOTP-based 2FA for enhanced security
 */
export const twoFactorAuth = sqliteTable("two_factor_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  secret: text("secret").notNull(), // Encrypted TOTP secret
  backupCodes: text("backup_codes"), // JSON array of hashed backup codes
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(false),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertTwoFactorAuthSchema = createInsertSchema(twoFactorAuth).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTwoFactorAuth = z.infer<typeof insertTwoFactorAuthSchema>;
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;

/**
 * AUDIT LOGS
 * Complete audit trail for all system actions
 */
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(), // create, update, delete, view, login, logout, export
  entityType: text("entity_type").notNull(), // property, lead, contract, user, etc.
  entityId: text("entity_id"),
  oldValues: text("old_values"), // JSON of previous values
  newValues: text("new_values"), // JSON of new values
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // Additional context as JSON
  occurredAt: text("occurred_at").notNull().default(now()),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

/**
 * WEBHOOK EVENTS
 * Persistent idempotency ledger for provider callbacks.
 */
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type"),
  status: text("status").notNull().default("processing"),
  attempts: integer("attempts").notNull().default(1),
  payloadDigest: text("payload_digest"),
  signatureDigest: text("signature_digest"),
  lastError: text("last_error"),
  receivedAt: text("received_at").notNull().default(now()),
  processedAt: text("processed_at"),
  failedAt: text("failed_at"),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, receivedAt: true, updatedAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

/**
 * USER SESSIONS
 * Track active user sessions for security
 */
export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenantId: text("tenant_id").references(() => tenants.id), // nullable (paridade com schema.ts/PG)
  sessionToken: text("session_token").notNull().unique(),
  deviceName: text("device_name"),
  deviceType: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"), // paridade com schema.ts/PG
  location: text("location"), // City, Country from IP
  lastActivity: text("last_activity").notNull().default(now()),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

/**
 * LOGIN HISTORY
 * Track all login attempts for security monitoring
 */
export const loginHistory = sqliteTable("login_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  email: text("email").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  failureReason: text("failure_reason"), // invalid_password, account_locked, 2fa_failed, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  suspicious: integer("suspicious", { mode: "boolean" }).default(false), // flagged for unusual activity
  createdAt: text("created_at").notNull().default(now()),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({ id: true, createdAt: true });
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;

// ==================== LEAD INTELLIGENCE ====================

/**
 * LEAD SCORES
 * Automated lead scoring based on behavior and profile
 */
export const leadScores = sqliteTable("lead_scores", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id).unique(),
  totalScore: integer("total_score").notNull().default(0), // 0-100
  budgetScore: integer("budget_score").default(0),
  engagementScore: integer("engagement_score").default(0),
  profileScore: integer("profile_score").default(0),
  urgencyScore: integer("urgency_score").default(0),
  behaviorScore: integer("behavior_score").default(0),
  temperature: text("temperature").default("cold"), // cold, warm, hot
  lastCalculated: text("last_calculated").notNull().default(now()),
  scoreHistory: text("score_history"), // JSON array of score changes over time
  predictedConversion: real("predicted_conversion"), // 0.0 to 1.0 probability
  nextBestAction: text("next_best_action"), // Recommended action
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertLeadScoreSchema = createInsertSchema(leadScores).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadScore = z.infer<typeof insertLeadScoreSchema>;
export type LeadScore = typeof leadScores.$inferSelect;

/**
 * DRIP CAMPAIGNS
 * Automated email/message sequences for lead nurturing
 */
export const dripCampaigns = sqliteTable("drip_campaigns", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // lead_created, status_change, tag_added, manual
  triggerConditions: text("trigger_conditions"), // JSON conditions
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  totalEnrolled: integer("total_enrolled").default(0),
  totalCompleted: integer("total_completed").default(0),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertDripCampaignSchema = createInsertSchema(dripCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripCampaign = typeof dripCampaigns.$inferSelect;

/**
 * CAMPAIGN STEPS
 * Individual steps within a drip campaign
 */
export const campaignSteps = sqliteTable("campaign_steps", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => dripCampaigns.id),
  stepOrder: integer("step_order").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  delayHours: integer("delay_hours").notNull().default(0),
  channel: text("channel").notNull(), // email, whatsapp, sms
  subject: text("subject"),
  content: text("content").notNull(),
  templateVariables: text("template_variables"), // JSON
  conditions: text("conditions"), // JSON - skip conditions
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertCampaignStepSchema = createInsertSchema(campaignSteps).omit({ id: true, createdAt: true });
export type InsertCampaignStep = z.infer<typeof insertCampaignStepSchema>;
export type CampaignStep = typeof campaignSteps.$inferSelect;

/**
 * CAMPAIGN ENROLLMENTS
 * Tracks leads enrolled in campaigns
 */
export const campaignEnrollments = sqliteTable("campaign_enrollments", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => dripCampaigns.id),
  leadId: text("lead_id").notNull().references(() => leads.id),
  currentStep: integer("current_step").default(0),
  status: text("status").notNull().default("active"), // active, completed, paused, exited
  enrolledAt: text("enrolled_at").notNull().default(now()),
  completedAt: text("completed_at"),
  lastStepAt: text("last_step_at"),
  nextStepAt: text("next_step_at"),
});

export const insertCampaignEnrollmentSchema = createInsertSchema(campaignEnrollments).omit({ id: true });
export type InsertCampaignEnrollment = z.infer<typeof insertCampaignEnrollmentSchema>;
export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;

// ==================== PROPERTY ENHANCEMENTS ====================

/**
 * PROPERTY COORDINATES
 * Geolocation data for map visualization
 */
export const propertyCoordinates = sqliteTable("property_coordinates", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id).unique(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  geocodedAddress: text("geocoded_address"),
  geocodedAt: text("geocoded_at"),
  manuallySet: integer("manually_set", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPropertyCoordinatesSchema = createInsertSchema(propertyCoordinates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyCoordinates = z.infer<typeof insertPropertyCoordinatesSchema>;
export type PropertyCoordinates = typeof propertyCoordinates.$inferSelect;

/**
 * VIRTUAL TOURS
 * 360° virtual tour links and configurations
 */
export const virtualTours = sqliteTable("virtual_tours", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  tourType: text("tour_type").notNull(), // matterport, 360_photos, video, iframe
  tourUrl: text("tour_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  viewCount: integer("view_count").default(0),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertVirtualTourSchema = createInsertSchema(virtualTours).omit({ id: true, createdAt: true });
export type InsertVirtualTour = z.infer<typeof insertVirtualTourSchema>;
export type VirtualTour = typeof virtualTours.$inferSelect;

/**
 * PROPERTY COMPARISONS
 * Saved property comparisons by users/leads
 */
export const propertyComparisons = sqliteTable("property_comparisons", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  leadId: text("lead_id").references(() => leads.id),
  sessionId: text("session_id"), // For anonymous users
  propertyIds: text("property_ids").notNull(), // JSON array of property IDs
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPropertyComparisonSchema = createInsertSchema(propertyComparisons).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyComparison = z.infer<typeof insertPropertyComparisonSchema>;
export type PropertyComparison = typeof propertyComparisons.$inferSelect;

// ==================== DIGITAL SIGNATURES ====================

/**
 * DIGITAL SIGNATURES
 * E-signature workflow for contracts
 */
export const digitalSignatures = sqliteTable("digital_signatures", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  signerType: text("signer_type").notNull(), // client, owner, broker, witness
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email").notNull(),
  signerDocument: text("signer_document"), // CPF/CNPJ
  signatureData: text("signature_data"), // Base64 signature image or hash
  signatureHash: text("signature_hash"), // SHA-256 hash for verification
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  geoLocation: text("geo_location"), // JSON with lat/lng
  status: text("status").notNull().default("pending"), // pending, sent, viewed, signed, declined, expired
  sentAt: text("sent_at"),
  viewedAt: text("viewed_at"),
  signedAt: text("signed_at"),
  expiresAt: text("expires_at"),
  token: text("token").unique(), // Unique token for signing link
  createdAt: text("created_at").notNull().default(now()),
});

export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({ id: true, createdAt: true });
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;

/**
 * CONTRACT DOCUMENTS
 * Generated PDF documents for contracts
 */
export const contractDocuments = sqliteTable("contract_documents", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  documentType: text("document_type").notNull(), // contract, addendum, receipt, notice
  version: integer("version").notNull().default(1),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  fileHash: text("file_hash"), // SHA-256 hash for integrity
  generatedBy: text("generated_by").references(() => users.id),
  isFinalized: integer("is_finalized", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertContractDocumentSchema = createInsertSchema(contractDocuments).omit({ id: true, createdAt: true });
export type InsertContractDocument = z.infer<typeof insertContractDocumentSchema>;
export type ContractDocument = typeof contractDocuments.$inferSelect;

// ==================== CLIENT PORTAL ====================

/**
 * CLIENT PORTAL ACCESS
 * Self-service portal access for owners and renters
 */
export const clientPortalAccess = sqliteTable("client_portal_access", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  clientType: text("client_type").notNull(), // owner, renter, buyer, lead
  clientId: text("client_id").notNull(), // Reference to owner/renter/lead ID
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastLogin: text("last_login"),
  loginCount: integer("login_count").default(0),
  resetToken: text("reset_token"),
  resetTokenExpires: text("reset_token_expires"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientPortalAccess = z.infer<typeof insertClientPortalAccessSchema>;
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;

// ==================== MAINTENANCE ====================

/**
 * MAINTENANCE TICKETS
 * Maintenance/repair requests raised from the rental/owner portal.
 * Mirror of maintenanceTickets in schema.ts (kept in parity for dual-DB).
 */
export const maintenanceTickets = sqliteTable("maintenance_tickets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  rentalContractId: text("rental_contract_id"),
  requestedById: text("requested_by_id"), // portal user / renter / user id
  requestedByType: text("requested_by_type"), // renter, owner, broker, system
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // plumbing, electrical, structural, etc
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, scheduled, resolved, closed, cancelled
  assignedTo: text("assigned_to").references(() => users.id),
  photos: text("photos"), // JSON array of photo URLs
  cost: real("cost"),
  scheduledDate: text("scheduled_date"),
  resolvedAt: text("resolved_at"),
  completedAt: text("completed_at"),
  notes: text("notes"), // JSON array of note objects
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertMaintenanceTicketSchema = createInsertSchema(maintenanceTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceTicket = z.infer<typeof insertMaintenanceTicketSchema>;
export type MaintenanceTicket = typeof maintenanceTickets.$inferSelect;

// ==================== DASHBOARD CUSTOMIZATION ====================

/**
 * DASHBOARD LAYOUTS
 * Custom dashboard configurations per user
 */
export const dashboardLayouts = sqliteTable("dashboard_layouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull().default("Principal"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  layout: text("layout").notNull(), // JSON grid layout config
  widgets: text("widgets").notNull(), // JSON array of widget configs
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;
export type DashboardLayout = typeof dashboardLayouts.$inferSelect;

/**
 * WIDGET TYPES
 * Available widget definitions
 */
export const widgetTypes = sqliteTable("widget_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // metrics, charts, lists, calendar, map
  component: text("component").notNull(), // React component name
  defaultConfig: text("default_config"), // JSON default settings
  minWidth: integer("min_width").default(1),
  minHeight: integer("min_height").default(1),
  maxWidth: integer("max_width"),
  maxHeight: integer("max_height"),
  requiredPermissions: text("required_permissions"), // JSON array
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const insertWidgetTypeSchema = createInsertSchema(widgetTypes).omit({ id: true });
export type InsertWidgetType = z.infer<typeof insertWidgetTypeSchema>;
export type WidgetType = typeof widgetTypes.$inferSelect;

// ==================== LGPD/GDPR COMPLIANCE ====================

/**
 * USER CONSENTS
 * Track user consent for data processing according to LGPD/GDPR
 */
export const userConsents = sqliteTable("user_consents", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  email: text("email"), // For non-registered users (newsletter, etc)
  consentType: text("consent_type").notNull(), // privacy, marketing, analytics, cookies, newsletter
  consentVersion: text("consent_version").notNull(), // Track document version
  status: text("status").notNull().default("active"), // active, withdrawn, expired
  purpose: text("purpose"), // What the data will be used for
  ipAddress: text("ip_address"), // Record IP for audit
  userAgent: text("user_agent"), // Browser info for audit
  acceptedAt: text("accepted_at").notNull().default(now()),
  withdrawnAt: text("withdrawn_at"),
  expiresAt: text("expires_at"), // Optional expiration date
  metadata: text("metadata"), // JSON: additional consent metadata
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({ id: true, createdAt: true });
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;

/**
 * DATA EXPORT REQUESTS
 * Track user requests to export their personal data (LGPD Art. 18, GDPR Art. 20)
 */
export const dataExportRequests = sqliteTable("data_export_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  requestToken: text("request_token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  format: text("format").notNull().default("json"), // json, csv, pdf
  dataScope: text("data_scope"), // JSON: which data to export
  fileUrl: text("file_url"), // S3/storage URL of generated export
  fileName: text("file_name"),
  fileSize: text("file_size"), // In bytes
  expiresAt: text("expires_at"), // Export link expiration (7 days recommended)
  downloadedAt: text("downloaded_at"),
  downloadCount: integer("download_count").default(0),
  ipAddress: text("ip_address"),
  errorMessage: text("error_message"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({ id: true, createdAt: true });
export type InsertDataExportRequest = z.infer<typeof insertDataExportRequestSchema>;
export type DataExportRequest = typeof dataExportRequests.$inferSelect;

/**
 * ACCOUNT DELETION REQUESTS
 * Track requests to delete user accounts (Right to Erasure - LGPD Art. 18, GDPR Art. 17)
 */
export const accountDeletionRequests = sqliteTable("account_deletion_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  confirmationToken: text("confirmation_token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, confirmed, processing, completed, cancelled
  reason: text("reason"), // Optional: why user wants deletion
  deletionType: text("deletion_type").notNull().default("anonymize"), // anonymize, hard_delete
  dataRetention: text("data_retention"), // JSON: what data to keep for legal/audit
  ipAddress: text("ip_address"),
  confirmedAt: text("confirmed_at"),
  processedAt: text("processed_at"),
  completedAt: text("completed_at"),
  cancelledAt: text("cancelled_at"),
  certificateUrl: text("certificate_url"), // URL to deletion certificate
  certificateNumber: text("certificate_number").unique(), // Unique certificate ID
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertAccountDeletionRequestSchema = createInsertSchema(accountDeletionRequests).omit({ id: true, createdAt: true });
export type InsertAccountDeletionRequest = z.infer<typeof insertAccountDeletionRequestSchema>;
export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;

/**
 * COMPLIANCE AUDIT LOG
 * Comprehensive audit trail for LGPD/GDPR compliance
 */
export const complianceAuditLog = sqliteTable("compliance_audit_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  actorId: text("actor_id"), // Who performed the action (user, system, admin)
  actorType: text("actor_type").notNull(), // user, admin, system, api
  action: text("action").notNull(), // data_access, data_export, data_deletion, consent_given, consent_withdrawn, etc
  entityType: text("entity_type"), // user, lead, property, contract, etc
  entityId: text("entity_id"), // ID of affected entity
  details: text("details"), // JSON: detailed information about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestPath: text("request_path"), // API endpoint called
  requestMethod: text("request_method"), // GET, POST, DELETE, etc
  changedData: text("changed_data"), // JSON: before/after values (anonymized)
  legalBasis: text("legal_basis"), // Legal basis for processing (consent, contract, legal_obligation, etc)
  severity: text("severity").default("info"), // info, warning, critical
  createdAt: text("created_at").notNull().default(now()),
});

export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLog).omit({ id: true, createdAt: true });
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;
export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;

/**
 * DATA BREACH INCIDENTS
 * Track data security incidents (LGPD Art. 48, GDPR Art. 33)
 */
export const dataBreachIncidents = sqliteTable("data_breach_incidents", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id),
  incidentNumber: text("incident_number").notNull().unique(), // BR-2024-001
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("reported"), // reported, investigating, contained, resolved
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedDataTypes: text("affected_data_types"), // JSON: types of data affected
  affectedRecordsCount: integer("affected_records_count"),
  affectedUserIds: text("affected_user_ids"), // JSON: array of affected user IDs
  discoveredAt: text("discovered_at").notNull(),
  reportedToAuthorityAt: text("reported_to_authority_at"), // ANPD notification
  reportedToUsersAt: text("reported_to_users_at"),
  containedAt: text("contained_at"),
  resolvedAt: text("resolved_at"),
  rootCause: text("root_cause"),
  mitigationActions: text("mitigation_actions"), // JSON: actions taken
  preventiveActions: text("preventive_actions"), // JSON: future prevention
  reportedBy: text("reported_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id), // DPO or security officer
  authorityReference: text("authority_reference"), // ANPD case number
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertDataBreachIncidentSchema = createInsertSchema(dataBreachIncidents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataBreachIncident = z.infer<typeof insertDataBreachIncidentSchema>;
export type DataBreachIncident = typeof dataBreachIncidents.$inferSelect;

/**
 * DATA PROCESSING ACTIVITIES
 * Record of processing activities (ROPA - GDPR Art. 30)
 */
export const dataProcessingActivities = sqliteTable("data_processing_activities", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  activityName: text("activity_name").notNull(),
  purpose: text("purpose").notNull(), // Purpose of data processing
  legalBasis: text("legal_basis").notNull(), // consent, contract, legal_obligation, legitimate_interest, etc
  dataCategories: text("data_categories"), // JSON: types of personal data
  dataSubjects: text("data_subjects"), // JSON: categories of data subjects (clients, employees, etc)
  recipients: text("recipients"), // JSON: who receives the data
  dataTransfers: text("data_transfers"), // JSON: international transfers
  retentionPeriod: text("retention_period"), // How long data is kept
  securityMeasures: text("security_measures"), // JSON: technical and organizational measures
  dpoReviewed: integer("dpo_reviewed", { mode: "boolean" }).default(false),
  dpoReviewedAt: text("dpo_reviewed_at"),
  dpoReviewedBy: text("dpo_reviewed_by").references(() => users.id),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertDataProcessingActivitySchema = createInsertSchema(dataProcessingActivities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataProcessingActivity = z.infer<typeof insertDataProcessingActivitySchema>;
export type DataProcessingActivity = typeof dataProcessingActivities.$inferSelect;

/**
 * LEGAL DOCUMENTS
 * Version-controlled legal documents (Privacy Policy, Terms, etc)
 */
export const legalDocuments = sqliteTable("legal_documents", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  documentType: text("document_type").notNull(), // privacy_policy, terms_of_service, cookie_policy, dpa
  version: text("version").notNull(), // Semantic versioning: 1.0.0, 1.1.0, 2.0.0
  language: text("language").notNull().default("pt-BR"), // pt-BR, en-US, es-ES
  title: text("title").notNull(),
  content: text("content").notNull(), // Full document in markdown
  contentHtml: text("content_html"), // Rendered HTML version
  effectiveDate: text("effective_date").notNull(),
  expiryDate: text("expiry_date"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  requiresConsent: integer("requires_consent", { mode: "boolean" }).default(false),
  publishedBy: text("published_by").references(() => users.id),
  publishedAt: text("published_at"),
  reviewedBy: text("reviewed_by").references(() => users.id), // Legal counsel
  reviewedAt: text("reviewed_at"),
  checksum: text("checksum"), // SHA-256 hash for integrity
  metadata: text("metadata"), // JSON: additional document metadata
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type LegalDocument = typeof legalDocuments.$inferSelect;

/**
 * COOKIE PREFERENCES
 * Track individual cookie preferences (LGPD/GDPR cookie consent)
 */
export const cookiePreferences = sqliteTable("cookie_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"), // For non-authenticated users
  essential: integer("essential", { mode: "boolean" }).default(true), // Always true
  analytics: integer("analytics", { mode: "boolean" }).default(false),
  marketing: integer("marketing", { mode: "boolean" }).default(false),
  personalization: integer("personalization", { mode: "boolean" }).default(false),
  consentVersion: text("consent_version").notNull(), // Version of cookie policy
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: text("accepted_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertCookiePreferenceSchema = createInsertSchema(cookiePreferences).omit({ id: true, acceptedAt: true, updatedAt: true });
export type InsertCookiePreference = z.infer<typeof insertCookiePreferenceSchema>;
export type CookiePreference = typeof cookiePreferences.$inferSelect;

// ==================== FILE STORAGE ====================

/**
 * FILES
 * Metadata tracking for all files uploaded to Supabase Storage
 */
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  bucket: text("bucket").notNull(), // Storage bucket name
  filePath: text("file_path").notNull(), // Full path in storage
  fileName: text("file_name").notNull(), // Original filename
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  category: text("category").notNull(), // property-image, document, avatar, logo, invoice, export
  entityType: text("entity_type"), // property, lead, contract, user, tenant
  entityId: text("entity_id"), // ID of related entity
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  metadata: text("metadata"), // JSON: additional metadata (dimensions, blurhash, etc)
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id"),
  eventType: text("event_type").notNull(), // pageview, event, vital, error
  eventName: text("event_name"), // for custom events
  path: text("path"),
  // Web Vitals
  metricName: text("metric_name"), // CLS, FCP, LCP, TTFB, INP, FID
  metricValue: real("metric_value"),
  metricRating: text("metric_rating"), // good, needs-improvement, poor
  // Error tracking
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  // Metadata
  properties: text("properties"), // JSON
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// ============== ADMIN GLOBAL SYSTEM (paridade com schema.ts/PG) ==============

/**
 * PLANS
 * Subscription plans for tenants (espelho de schema.ts; valores decimais
 * armazenados como text no SQLite, como as demais colunas monetárias)
 */
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  yearlyPrice: text("yearly_price"),
  maxUsers: integer("max_users").notNull().default(5),
  maxProperties: integer("max_properties").notNull().default(100),
  maxLeads: integer("max_leads").notNull().default(-1),
  maxIntegrations: integer("max_integrations").notNull().default(3),
  features: text("features").notNull().default("[]"), // JSON array
  stripePriceId: text("stripe_price_id"),
  stripeYearlyPriceId: text("stripe_yearly_price_id"),
  trialDays: integer("trial_days").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

/**
 * TENANT SUBSCRIPTIONS
 * Links tenants to plans with status and limits (espelho de schema.ts)
 */
export const tenantSubscriptions = sqliteTable("tenant_subscriptions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  planId: text("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull().default("trial"), // trial, active, suspended, cancelled
  trialEndsAt: text("trial_ends_at"),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelledAt: text("cancelled_at"),
  metadata: text("metadata").default("{}"), // JSON: gateway IDs (stripeCustomerId, etc.)
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;

/**
 * USAGE LOGS
 * Tracks important actions for auditing and analytics (espelho de schema.ts)
 */
export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details").default("{}"), // JSON
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertUsageLogSchema = createInsertSchema(usageLogs).omit({ id: true, createdAt: true });
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;
export type UsageLog = typeof usageLogs.$inferSelect;

// ==================== INSPECTIONS (VISTORIAS) ====================

/**
 * PROPERTY INSPECTIONS
 * Vistorias de entrada/saída/periódicas — consumidores: server/storage.ts
 * (seção INSPECTIONS), server/routes-inspections.ts, services/inspection-service.ts
 */
export const propertyInspections = sqliteTable("property_inspections", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  rentalContractId: text("rental_contract_id"),
  type: text("type").notNull(), // entry, exit, periodic
  status: text("status").notNull().default("in_progress"), // in_progress, completed, signed
  inspectorName: text("inspector_name").notNull(),
  inspectorId: text("inspector_id").references(() => users.id),
  renterName: text("renter_name"),
  renterId: text("renter_id"),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  signedAt: text("signed_at"),
  overallCondition: text("overall_condition"), // excellent, good, fair, poor
  generalNotes: text("general_notes"),
  totalDamages: real("total_damages"),
  previousInspectionId: text("previous_inspection_id"),
  inspectorSignature: text("inspector_signature"), // base64
  renterSignature: text("renter_signature"), // base64
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertPropertyInspectionSchema = createInsertSchema(propertyInspections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyInspection = z.infer<typeof insertPropertyInspectionSchema>;
export type PropertyInspection = typeof propertyInspections.$inferSelect;

/**
 * INSPECTION ROOMS
 * Cômodos de uma vistoria
 */
export const inspectionRooms = sqliteTable("inspection_rooms", {
  id: text("id").primaryKey(),
  inspectionId: text("inspection_id").notNull().references(() => propertyInspections.id),
  roomType: text("room_type").notNull(), // living_room, kitchen, bedroom_1...
  roomLabel: text("room_label").notNull(),
  overallCondition: text("overall_condition"),
  notes: text("notes"),
  photos: text("photos"), // JSON array of URLs
  order: integer("order").notNull().default(0),
});

export const insertInspectionRoomSchema = createInsertSchema(inspectionRooms).omit({ id: true });
export type InsertInspectionRoom = z.infer<typeof insertInspectionRoomSchema>;
export type InspectionRoom = typeof inspectionRooms.$inferSelect;

/**
 * INSPECTION ITEMS
 * Itens avaliados em cada cômodo
 */
export const inspectionItems = sqliteTable("inspection_items", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => inspectionRooms.id),
  itemName: text("item_name").notNull(),
  condition: text("condition").notNull().default("good"), // excellent, good, fair, poor, not_applicable
  description: text("description"),
  hasDamage: integer("has_damage", { mode: "boolean" }).default(false),
  damageDescription: text("damage_description"),
  estimatedRepairCost: real("estimated_repair_cost"),
  photos: text("photos"), // JSON array of URLs
  previousCondition: text("previous_condition"), // condição na vistoria de entrada
  order: integer("order").notNull().default(0),
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({ id: true });
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;
export type InspectionItem = typeof inspectionItems.$inferSelect;

// ==================== AVM (AUTOMATED VALUATION MODEL) ====================

/**
 * PROPERTY VALUATIONS
 * Histórico de avaliações do AVM — consumidores: server/routes-avm.ts,
 * server/services/avm-engine.ts, server/storage.ts (seção AVM)
 */
export const propertyValuations = sqliteTable("property_valuations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").references(() => properties.id),
  propertyType: text("property_type").notNull(),
  category: text("category").notNull(), // sale, rent
  city: text("city").notNull(),
  state: text("state").notNull(),
  neighborhood: text("neighborhood"),
  address: text("address"),
  area: real("area").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parkingSpaces: integer("parking_spaces"),
  features: text("features"), // JSON array
  condition: text("condition"),
  yearBuilt: integer("year_built"),
  estimatedValue: real("estimated_value"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  pricePerSqm: real("price_per_sqm"),
  confidenceScore: real("confidence_score"), // 0-100
  comparablesCount: integer("comparables_count"),
  comparablesData: text("comparables_data"), // JSON array
  marketTrend: text("market_trend"), // up, down, stable
  adjustments: text("adjustments"), // JSON object
  methodology: text("methodology"),
  reportUrl: text("report_url"),
  requestedBy: text("requested_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertPropertyValuationSchema = createInsertSchema(propertyValuations).omit({ id: true, createdAt: true });
export type InsertPropertyValuation = z.infer<typeof insertPropertyValuationSchema>;
export type PropertyValuation = typeof propertyValuations.$inferSelect;

/**
 * MARKET INDICES
 * Índices de mercado agregados por cidade/tipo/categoria/período
 */
export const marketIndices = sqliteTable("market_indices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  city: text("city").notNull(),
  state: text("state"),
  propertyType: text("property_type").notNull(),
  category: text("category").notNull(), // sale, rent
  avgPricePerSqm: real("avg_price_per_sqm"),
  medianPrice: real("median_price"),
  sampleSize: integer("sample_size"),
  trend: text("trend").default("stable"), // up, down, stable
  trendPercentage: real("trend_percentage"),
  period: text("period").notNull(), // YYYY-MM
  createdAt: text("created_at").notNull().default(now()),
});

export const insertMarketIndexSchema = createInsertSchema(marketIndices).omit({ id: true, createdAt: true });
export type InsertMarketIndex = z.infer<typeof insertMarketIndexSchema>;
export type MarketIndex = typeof marketIndices.$inferSelect;

// ==================== ISA (INSIDE SALES AGENT) ====================

/**
 * ISA CONVERSATIONS
 * Conversas do agente virtual via WhatsApp — consumidores: server/routes-isa.ts,
 * server/integrations/whatsapp/isa-engine.ts, server/storage.ts (seção ISA)
 */
export const isaConversations = sqliteTable("isa_conversations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  leadId: text("lead_id").references(() => leads.id),
  phoneNumber: text("phone_number").notNull(),
  leadName: text("lead_name"),
  status: text("status").notNull().default("active"), // active, qualified, transferred, closed
  conversationStage: text("conversation_stage").default("greeting"),
  qualificationData: text("qualification_data"), // JSON (BANT + score)
  interestedPropertyIds: text("interested_property_ids"), // JSON array
  temperature: text("temperature").default("unknown"), // hot, warm, cold, unknown
  messageCount: integer("message_count").default(0),
  assignedAgentId: text("assigned_agent_id").references(() => users.id),
  transferredAt: text("transferred_at"),
  visitScheduledId: text("visit_scheduled_id"),
  lastMessageAt: text("last_message_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at"),
});

export const insertIsaConversationSchema = createInsertSchema(isaConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIsaConversation = z.infer<typeof insertIsaConversationSchema>;
export type IsaConversation = typeof isaConversations.$inferSelect;

/**
 * ISA MESSAGES
 * Mensagens trocadas em cada conversa ISA
 */
export const isaMessages = sqliteTable("isa_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => isaConversations.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  direction: text("direction").notNull(), // inbound, outbound
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertIsaMessageSchema = createInsertSchema(isaMessages).omit({ id: true, createdAt: true });
export type InsertIsaMessage = z.infer<typeof insertIsaMessageSchema>;
export type IsaMessage = typeof isaMessages.$inferSelect;

/**
 * ISA SETTINGS
 * Configurações do agente ISA por tenant
 */
export const isaSettings = sqliteTable("isa_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  greeting: text("greeting"),
  personality: text("personality").default("professional"),
  workingHours: text("working_hours"), // JSON: { start, end, days }
  autoQualify: integer("auto_qualify", { mode: "boolean" }).default(true),
  autoScheduleVisits: integer("auto_schedule_visits", { mode: "boolean" }).default(false),
  transferToHumanThreshold: integer("transfer_to_human_threshold").default(10),
  faqResponses: text("faq_responses"), // JSON array
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at"),
});

export const insertIsaSettingsSchema = createInsertSchema(isaSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIsaSettings = z.infer<typeof insertIsaSettingsSchema>;
export type IsaSettings = typeof isaSettings.$inferSelect;

// ==================== AUTO-MARKETING ====================

/**
 * AUTO MARKETING CONTENT
 * Conteúdo de marketing gerado por imóvel — consumidores:
 * server/routes-auto-marketing.ts, server/storage.ts (seção AUTO-MARKETING)
 */
export const autoMarketingContent = sqliteTable("auto_marketing_content", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  description: text("description"),
  descriptionTone: text("description_tone"), // professional, casual, luxury...
  socialMediaPost: text("social_media_post"),
  socialMediaHashtags: text("social_media_hashtags"), // JSON array
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  micrositeContent: text("microsite_content"), // JSON/HTML
  status: text("status").notNull().default("draft"), // draft, published
  generatedAt: text("generated_at"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at"),
});

export const insertAutoMarketingContentSchema = createInsertSchema(autoMarketingContent).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutoMarketingContent = z.infer<typeof insertAutoMarketingContentSchema>;
export type AutoMarketingContent = typeof autoMarketingContent.$inferSelect;

// ==================== BUYER SELECTIONS (curadoria de imóveis p/ comprador) ====================

/**
 * BUYER SELECTIONS
 * Curated list of properties shared publicly with a buyer for feedback.
 */
export const buyerSelections = sqliteTable("buyer_selections", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  leadId: text("lead_id").references(() => leads.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  publicToken: text("public_token").notNull().unique(),
  status: text("status").notNull().default("active"), // active, closed, expired
  message: text("message"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertBuyerSelectionSchema = createInsertSchema(buyerSelections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyerSelection = z.infer<typeof insertBuyerSelectionSchema>;
export type BuyerSelection = typeof buyerSelections.$inferSelect;

/**
 * BUYER SELECTION ITEMS
 * Individual properties within a buyer selection + buyer response.
 */
export const buyerSelectionItems = sqliteTable("buyer_selection_items", {
  id: text("id").primaryKey(),
  selectionId: text("selection_id").notNull().references(() => buyerSelections.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  sortOrder: integer("sort_order").default(0),
  response: text("response"), // accepted, rejected, maybe
  comment: text("comment"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertBuyerSelectionItemSchema = createInsertSchema(buyerSelectionItems).omit({ id: true, createdAt: true });
export type InsertBuyerSelectionItem = z.infer<typeof insertBuyerSelectionItemSchema>;
export type BuyerSelectionItem = typeof buyerSelectionItems.$inferSelect;

// ==================== AI ACTIONS (proposta/aprovação/execução de ações por IA) ====================

/**
 * AI ACTIONS
 * Human-in-the-loop ledger of actions proposed by AI agents.
 */
export const aiActions = sqliteTable("ai_actions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  actionType: text("action_type").notNull(),
  status: text("status").notNull().default("proposed"), // proposed, approved, rejected, executed, failed, expired
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  payload: text("payload", { mode: "json" }).notNull(),
  rationale: text("rationale"),
  confidence: real("confidence"),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull().default(true),
  riskLevel: text("risk_level").default("low"),
  proposedBy: text("proposed_by").notNull().default("ai"),
  aiModel: text("ai_model"),
  conversationId: text("conversation_id"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  executedAt: text("executed_at"),
  result: text("result", { mode: "json" }),
  error: text("error"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(now()),
  updatedAt: text("updated_at").notNull().default(now()),
}, (table) => ({
  tenantStatusIdx: index("idx_ai_actions_tenant_status").on(table.tenantId, table.status),
  tenantTargetIdx: index("idx_ai_actions_tenant_target").on(table.tenantId, table.targetType, table.targetId),
}));

export const insertAiActionSchema = createInsertSchema(aiActions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAction = z.infer<typeof insertAiActionSchema>;
export type AiAction = typeof aiActions.$inferSelect;

/**
 * AI ACTION AUDIT
 * Append-only audit trail for ai_actions lifecycle events.
 */
export const aiActionAudit = sqliteTable("ai_action_audit", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  actionId: text("action_id").notNull().references(() => aiActions.id),
  event: text("event").notNull(),
  actorId: text("actor_id").references(() => users.id),
  actorType: text("actor_type").notNull(),
  beforeState: text("before_state", { mode: "json" }),
  afterState: text("after_state", { mode: "json" }),
  details: text("details", { mode: "json" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(now()),
}, (table) => ({
  tenantActionCreatedIdx: index("idx_ai_action_audit_tenant_action_created").on(table.tenantId, table.actionId, table.createdAt),
}));

export const insertAiActionAuditSchema = createInsertSchema(aiActionAudit).omit({ id: true, createdAt: true });
export type InsertAiActionAudit = z.infer<typeof insertAiActionAuditSchema>;
export type AiActionAudit = typeof aiActionAudit.$inferSelect;

// ==================== LEAD SCORING / ASSIGNMENT CONFIG ====================

/**
 * LEAD SCORE WEIGHTS
 * Per-tenant tunable weights/thresholds for the lead scoring engine.
 */
export const leadScoreWeights = sqliteTable("lead_score_weights", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  budgetWeight: integer("budget_weight").default(25),
  engagementWeight: integer("engagement_weight").default(25),
  profileWeight: integer("profile_weight").default(20),
  urgencyWeight: integer("urgency_weight").default(15),
  behaviorWeight: integer("behavior_weight").default(15),
  hotThreshold: integer("hot_threshold").default(70),
  warmThreshold: integer("warm_threshold").default(40),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertLeadScoreWeightsSchema = createInsertSchema(leadScoreWeights).omit({ id: true, updatedAt: true });
export type InsertLeadScoreWeights = z.infer<typeof insertLeadScoreWeightsSchema>;
export type LeadScoreWeights = typeof leadScoreWeights.$inferSelect;

/**
 * LEAD ASSIGNMENT STATE
 * Per-tenant round-robin / assignment cursor.
 */
export const leadAssignmentState = sqliteTable("lead_assignment_state", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id).unique(),
  strategy: text("strategy").default("round_robin"),
  lastAssignedUserId: text("last_assigned_user_id").references(() => users.id),
  updatedAt: text("updated_at").notNull().default(now()),
});

export const insertLeadAssignmentStateSchema = createInsertSchema(leadAssignmentState).omit({ id: true, updatedAt: true });
export type InsertLeadAssignmentState = z.infer<typeof insertLeadAssignmentStateSchema>;
export type LeadAssignmentState = typeof leadAssignmentState.$inferSelect;

// ==================== SIGNATURE CERTIFICATES (ICP-Brasil / e-sign) ====================

/**
 * SIGNATURE CERTIFICATES
 * Stored digital signing certificates (PEM) per tenant/user.
 */
export const signatureCertificates = sqliteTable("signature_certificates", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  serialNumber: text("serial_number"),
  subject: text("subject"),
  issuer: text("issuer"),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  certificatePem: text("certificate_pem").notNull(),
  fingerprint: text("fingerprint"),
  createdAt: text("created_at").notNull().default(now()),
});

export const insertSignatureCertificateSchema = createInsertSchema(signatureCertificates).omit({ id: true, createdAt: true });
export type InsertSignatureCertificate = z.infer<typeof insertSignatureCertificateSchema>;
export type SignatureCertificate = typeof signatureCertificates.$inferSelect;
