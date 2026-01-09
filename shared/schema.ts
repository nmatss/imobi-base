import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").notNull().default("#0066cc"),
  secondaryColor: text("secondary_color").notNull().default("#333333"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  category: text("category").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  features: text("features").array(),
  images: text("images").array(),
  status: text("status").notNull().default("available"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  interests: text("interests").array(),
  notes: text("notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  preferredType: text("preferred_type"),
  preferredCategory: text("preferred_category"),
  preferredCity: text("preferred_city"),
  preferredNeighborhood: text("preferred_neighborhood"),
  minBedrooms: integer("min_bedrooms"),
  maxBedrooms: integer("max_bedrooms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({ id: true, createdAt: true });
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;

export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  leadId: varchar("lead_id").references(() => leads.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  terms: text("terms"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const insertNewsletterSchema = createInsertSchema(newsletterSubscriptions).omit({ id: true, subscribedAt: true });
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletterSubscriptions.$inferSelect;

export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true, createdAt: true });
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type Owner = typeof owners.$inferSelect;

export const renters = pgTable("renters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  rg: text("rg"),
  profession: text("profession"),
  income: decimal("income", { precision: 12, scale: 2 }),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRenterSchema = createInsertSchema(renters).omit({ id: true, createdAt: true });
export type InsertRenter = z.infer<typeof insertRenterSchema>;
export type Renter = typeof renters.$inferSelect;

export const rentalContracts = pgTable("rental_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  ownerId: varchar("owner_id").notNull().references(() => owners.id),
  renterId: varchar("renter_id").notNull().references(() => renters.id),
  rentValue: decimal("rent_value", { precision: 12, scale: 2 }).notNull(),
  condoFee: decimal("condo_fee", { precision: 12, scale: 2 }),
  iptuValue: decimal("iptu_value", { precision: 12, scale: 2 }),
  dueDay: integer("due_day").notNull().default(10),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  adjustmentIndex: text("adjustment_index").default("IGPM"),
  depositValue: decimal("deposit_value", { precision: 12, scale: 2 }),
  administrationFee: decimal("administration_fee", { precision: 5, scale: 2 }).default("10"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRentalContractSchema = createInsertSchema(rentalContracts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRentalContract = z.infer<typeof insertRentalContractSchema>;
export type RentalContract = typeof rentalContracts.$inferSelect;

export const rentalPayments = pgTable("rental_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  rentalContractId: varchar("rental_contract_id").notNull().references(() => rentalContracts.id),
  referenceMonth: text("reference_month").notNull(),
  dueDate: timestamp("due_date").notNull(),
  rentValue: decimal("rent_value", { precision: 12, scale: 2 }).notNull(),
  condoFee: decimal("condo_fee", { precision: 12, scale: 2 }),
  iptuValue: decimal("iptu_value", { precision: 12, scale: 2 }),
  extraCharges: decimal("extra_charges", { precision: 12, scale: 2 }),
  discounts: decimal("discounts", { precision: 12, scale: 2 }),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  paidValue: decimal("paid_value", { precision: 12, scale: 2 }),
  paidDate: timestamp("paid_date"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRentalPaymentSchema = createInsertSchema(rentalPayments).omit({ id: true, createdAt: true });
export type InsertRentalPayment = z.infer<typeof insertRentalPaymentSchema>;
export type RentalPayment = typeof rentalPayments.$inferSelect;

// ============== REPASSES A PROPRIETÁRIOS ==============

export const rentalTransfers = pgTable("rental_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  ownerId: varchar("owner_id").notNull().references(() => owners.id),
  referenceMonth: text("reference_month").notNull(), // "2024-01"
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(),
  administrationFee: decimal("administration_fee", { precision: 12, scale: 2 }),
  maintenanceDeductions: decimal("maintenance_deductions", { precision: 12, scale: 2 }),
  otherDeductions: decimal("other_deductions", { precision: 12, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, paid
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRentalTransferSchema = createInsertSchema(rentalTransfers).omit({ id: true, createdAt: true });
export type InsertRentalTransfer = z.infer<typeof insertRentalTransferSchema>;
export type RentalTransfer = typeof rentalTransfers.$inferSelect;

// ============== MÓDULO DE VENDAS ==============

export const saleProposals = pgTable("sale_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  proposedValue: decimal("proposed_value", { precision: 12, scale: 2 }).notNull(),
  validityDate: timestamp("validity_date"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSaleProposalSchema = createInsertSchema(saleProposals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSaleProposal = z.infer<typeof insertSaleProposalSchema>;
export type SaleProposal = typeof saleProposals.$inferSelect;

export const propertySales = pgTable("property_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  buyerLeadId: varchar("buyer_lead_id").notNull().references(() => leads.id),
  sellerId: varchar("seller_id").references(() => owners.id),
  brokerId: varchar("broker_id").references(() => users.id),
  saleValue: decimal("sale_value", { precision: 12, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("6"),
  commissionValue: decimal("commission_value", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertySaleSchema = createInsertSchema(propertySales).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertySale = z.infer<typeof insertPropertySaleSchema>;
export type PropertySale = typeof propertySales.$inferSelect;

// ============== MÓDULO FINANCEIRO ==============

export const financeCategories = pgTable("finance_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  color: text("color").default("#6b7280"),
  isSystemGenerated: boolean("is_system_generated").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceCategorySchema = createInsertSchema(financeCategories).omit({ id: true, createdAt: true });
export type InsertFinanceCategory = z.infer<typeof insertFinanceCategorySchema>;
export type FinanceCategory = typeof financeCategories.$inferSelect;

// ============== COMISSÕES ==============

export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  saleId: varchar("sale_id").references(() => propertySales.id),
  rentalContractId: varchar("rental_contract_id").references(() => rentalContracts.id),
  brokerId: varchar("broker_id").notNull().references(() => users.id),
  transactionType: text("transaction_type").notNull(), // 'sale' | 'rental'
  transactionValue: decimal("transaction_value", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  grossCommission: decimal("gross_commission", { precision: 12, scale: 2 }).notNull(),
  agencySplit: decimal("agency_split", { precision: 5, scale: 2 }).notNull().default("50"),
  brokerCommission: decimal("broker_commission", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'paid'
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

export const financeEntries = pgTable("finance_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  categoryId: varchar("category_id").references(() => financeCategories.id),
  sourceType: text("source_type"),
  sourceId: varchar("source_id"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  flow: text("flow").notNull(),
  entryDate: timestamp("entry_date").notNull(),
  notes: text("notes"),
  originType: text("origin_type"),
  originId: varchar("origin_id"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceEntrySchema = createInsertSchema(financeEntries).omit({ id: true, createdAt: true });
export type InsertFinanceEntry = z.infer<typeof insertFinanceEntrySchema>;
export type FinanceEntry = typeof financeEntries.$inferSelect;

// ============== MELHORIAS NO CRM ==============

export const leadTags = pgTable("lead_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadTagSchema = createInsertSchema(leadTags).omit({ id: true, createdAt: true });
export type InsertLeadTag = z.infer<typeof insertLeadTagSchema>;
export type LeadTag = typeof leadTags.$inferSelect;

export const leadTagLinks = pgTable("lead_tag_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  tagId: varchar("tag_id").notNull().references(() => leadTags.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadTagLinkSchema = createInsertSchema(leadTagLinks).omit({ id: true, createdAt: true });
export type InsertLeadTagLink = z.infer<typeof insertLeadTagLinkSchema>;
export type LeadTagLink = typeof leadTagLinks.$inferSelect;

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueAt: timestamp("due_at").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({ id: true, createdAt: true });
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;

// ============== SETTINGS TABLES ==============

// Extended tenant/company settings
export const tenantSettings = pgTable("tenant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  cnpj: text("cnpj"),
  inscricaoMunicipal: text("inscricao_municipal"),
  creci: text("creci"),
  bankName: text("bank_name"),
  bankAgency: text("bank_agency"),
  bankAccount: text("bank_account"),
  pixKey: text("pix_key"),
  businessHoursStart: text("business_hours_start").default("09:00"),
  businessHoursEnd: text("business_hours_end").default("18:00"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({ id: true, updatedAt: true });
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;
export type TenantSettings = typeof tenantSettings.$inferSelect;

// Brand and website settings
export const brandSettings = pgTable("brand_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
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
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBrandSettingsSchema = createInsertSchema(brandSettings).omit({ id: true, updatedAt: true });
export type InsertBrandSettings = z.infer<typeof insertBrandSettingsSchema>;
export type BrandSettings = typeof brandSettings.$inferSelect;

// User roles and permissions
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  permissions: json("permissions").notNull().default('{}'),
  isSystemRole: boolean("is_system_role").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Permission structure interface
export interface RolePermissions {
  properties: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  leads: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  calendar: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  contracts: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  sales: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  rentals: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  financial: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewValues: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
    manageUsers: boolean;
  };
}

// Integration configurations
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  integrationName: text("integration_name").notNull(),
  status: text("status").notNull().default("disconnected"),
  config: json("config").default('{}'),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({ id: true, updatedAt: true });
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;

// Notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  eventType: text("event_type").notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  appPushEnabled: boolean("app_push_enabled").notNull().default(true),
  recipients: text("recipients").array().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, updatedAt: true });
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// AI settings
export const aiSettings = pgTable("ai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  aiActive: boolean("ai_active").notNull().default(true),
  language: text("language").notNull().default("pt-BR"),
  tone: text("tone").notNull().default("neutral"),
  modulePresets: json("module_presets").default('{}'),
  brokersCanEdit: boolean("brokers_can_edit").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAiSettingsSchema = createInsertSchema(aiSettings).omit({ id: true, updatedAt: true });
export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettings.$inferSelect;

/**
 * USER PERMISSIONS
 * Links users to roles and allows custom permission overrides
 */
export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").references(() => userRoles.id),
  customPermissions: json("custom_permissions"), // Object for overrides
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({ id: true, createdAt: true });
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;

/**
 * SAVED REPORTS
 * Users can save report configurations for quick access
 */
export const savedReports = pgTable("saved_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(), // rentals, sales, financial, leads, etc.
  filters: json("filters").notNull(), // Object with report filters
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true });
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;
export type SavedReport = typeof savedReports.$inferSelect;

// ============== ADMIN GLOBAL SYSTEM ==============

/**
 * PLANS
 * Subscription plans for tenants
 */
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxUsers: integer("max_users").notNull().default(5),
  maxProperties: integer("max_properties").notNull().default(100),
  maxIntegrations: integer("max_integrations").notNull().default(3),
  features: json("features").notNull().default('[]'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

/**
 * TENANT SUBSCRIPTIONS
 * Links tenants to plans with status and limits
 */
export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  planId: varchar("plan_id").notNull().references(() => plans.id),
  status: text("status").notNull().default("trial"), // trial, active, suspended, cancelled
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  metadata: json("metadata").default('{}'), // Store payment gateway IDs (stripeCustomerId, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;

/**
 * USAGE LOGS
 * Tracks important actions for auditing and analytics
 */
export const usageLogs = pgTable("usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: json("details").default('{}'),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUsageLogSchema = createInsertSchema(usageLogs).omit({ id: true, createdAt: true });
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;

// ============== WHATSAPP INTEGRATION ==============

/**
 * WHATSAPP TEMPLATES
 * Store WhatsApp message templates for Business API
 */
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(), // Template name/identifier
  category: text("category").notNull(), // leads, properties, visits, contracts, payments
  language: text("language").notNull().default("pt_BR"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  headerType: text("header_type"), // text, image, document, video
  headerContent: text("header_content"),
  bodyText: text("body_text").notNull(),
  footerText: text("footer_text"),
  buttons: json("buttons"), // Array of button objects
  variables: text("variables").array(), // Variable names like ["nome", "data", "hora"]
  wabaTemplateId: text("waba_template_id"), // WhatsApp Business API template ID
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;

/**
 * WHATSAPP CONVERSATIONS
 * Track WhatsApp conversations with leads/clients
 */
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  leadId: varchar("lead_id").references(() => leads.id),
  phoneNumber: text("phone_number").notNull(),
  contactName: text("contact_name"),
  status: text("status").notNull().default("active"), // active, waiting, closed
  assignedTo: varchar("assigned_to").references(() => users.id),
  lastMessageAt: timestamp("last_message_at"),
  lastMessageFrom: text("last_message_from"), // user, contact
  unreadCount: integer("unread_count").notNull().default(0),
  metadata: json("metadata").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;

/**
 * WHATSAPP MESSAGES
 * Store all WhatsApp messages (incoming and outgoing)
 */
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  conversationId: varchar("conversation_id").notNull().references(() => whatsappConversations.id),
  wabaMessageId: text("waba_message_id"), // WhatsApp Business API message ID
  direction: text("direction").notNull(), // inbound, outbound
  messageType: text("message_type").notNull().default("text"), // text, image, document, location, contact, template
  content: text("content"),
  mediaUrl: text("media_url"),
  caption: text("caption"),
  templateId: varchar("template_id").references(() => whatsappTemplates.id),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, read, failed
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  sentBy: varchar("sent_by").references(() => users.id), // For outbound messages
  metadata: json("metadata").default('{}'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

/**
 * WHATSAPP MESSAGE QUEUE
 * Queue for managing WhatsApp message sending with rate limiting
 */
export const whatsappMessageQueue = pgTable("whatsapp_message_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  phoneNumber: text("phone_number").notNull(),
  messageType: text("message_type").notNull(), // text, template, media
  templateId: varchar("template_id").references(() => whatsappTemplates.id),
  content: text("content"),
  mediaUrl: text("media_url"),
  variables: json("variables"),
  priority: integer("priority").notNull().default(5), // 1-10, higher = more priority
  status: text("status").notNull().default("pending"), // pending, processing, sent, failed
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  scheduledFor: timestamp("scheduled_for"),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  metadata: json("metadata").default('{}'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWhatsappMessageQueueSchema = createInsertSchema(whatsappMessageQueue).omit({ id: true, createdAt: true });
export type InsertWhatsappMessageQueue = z.infer<typeof insertWhatsappMessageQueueSchema>;
export type WhatsappMessageQueue = typeof whatsappMessageQueue.$inferSelect;

/**
 * WHATSAPP AUTO RESPONSES
 * Configure automatic responses based on keywords or business hours
 */
export const whatsappAutoResponses = pgTable("whatsapp_auto_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // keyword, business_hours, first_contact, all_messages
  keywords: text("keywords").array(),
  responseText: text("response_text").notNull(),
  templateId: varchar("template_id").references(() => whatsappTemplates.id),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(5),
  businessHoursOnly: boolean("business_hours_only").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWhatsappAutoResponseSchema = createInsertSchema(whatsappAutoResponses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhatsappAutoResponse = z.infer<typeof insertWhatsappAutoResponseSchema>;
export type WhatsappAutoResponse = typeof whatsappAutoResponses.$inferSelect;

/**
 * COMPLIANCE: USER SESSIONS
 * Track user login sessions for security and compliance
 */
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  sessionToken: text("session_token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * COMPLIANCE: USER CONSENTS
 * Track user consent for data processing (GDPR/LGPD)
 */
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  email: text("email"),
  consentType: text("consent_type").notNull(), // marketing, analytics, necessary
  status: text("status").notNull(), // given, withdrawn, expired
  purpose: text("purpose"),
  consentMethod: text("consent_method"), // form, email, checkbox
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * COMPLIANCE: AUDIT LOG
 * Track all data access and modifications for compliance
 */
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // view, create, update, delete, export, anonymize
  resourceType: text("resource_type").notNull(), // user, lead, property, etc.
  resourceId: varchar("resource_id"),
  details: json("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

/**
 * COMPLIANCE: ACCOUNT DELETION REQUESTS
 * Track and manage account deletion requests (GDPR Right to be Forgotten)
 */
export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, processing, completed, rejected
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id),
  deletionDate: timestamp("deletion_date"),
  notes: text("notes"),
});

/**
 * COMPLIANCE: DATA EXPORT REQUESTS
 * Track and manage data export requests (GDPR Right to Data Portability)
 */
export const dataExportRequests = pgTable("data_export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  format: text("format").notNull().default("json"), // json, csv, pdf
  exportUrl: text("export_url"),
  expiresAt: timestamp("expires_at"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  fileSize: integer("file_size"),
  error: text("error"),
});

/**
 * COMPLIANCE: DATA BREACH INCIDENTS
 * Track and manage data breach incidents for regulatory reporting
 */
export const dataBreachIncidents = pgTable("data_breach_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("detected"), // detected, investigating, contained, resolved
  affectedRecords: integer("affected_records"),
  dataTypes: text("data_types").array(), // personal_info, financial, medical, etc.
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  reportedAt: timestamp("reported_at"),
  resolvedAt: timestamp("resolved_at"),
  reportedBy: varchar("reported_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  regulatoryNotification: boolean("regulatory_notification").default(false),
  affectedUsersNotified: boolean("affected_users_notified").default(false),
  notes: text("notes"),
});

/**
 * COMPLIANCE: COOKIE PREFERENCES
 * Track user cookie preferences (GDPR/LGPD)
 */
export const cookiePreferences = pgTable("cookie_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  sessionId: text("session_id"),
  necessary: boolean("necessary").notNull().default(true),
  analytics: boolean("analytics").notNull().default(false),
  marketing: boolean("marketing").notNull().default(false),
  preferences: boolean("preferences").notNull().default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * COMPLIANCE: DATA PROCESSING ACTIVITIES
 * Record of processing activities (GDPR Article 30)
 */
export const dataProcessingActivities = pgTable("data_processing_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  legalBasis: text("legal_basis").notNull(), // consent, contract, legal_obligation, etc.
  dataCategories: text("data_categories").array(),
  dataSubjects: text("data_subjects").array(),
  recipients: text("recipients").array(),
  retentionPeriod: text("retention_period"),
  securityMeasures: text("security_measures"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * FILES
 * File storage metadata for uploaded files
 */
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  url: text("url"),
  category: text("category"), // document, image, video, etc.
  relatedTo: text("related_to"), // property, lead, contract, etc.
  relatedId: varchar("related_id"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type UsageLog = typeof usageLogs.$inferSelect;
