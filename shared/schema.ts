import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, json, real } from "drizzle-orm/pg-core";
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
  deletedAt: timestamp("deleted_at"),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, deletedAt: true });
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
  // --- Auth/segurança (paridade com schema-sqlite; consumidores: server/auth/*) ---
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  oauthProvider: text("oauth_provider"), // google, microsoft, null
  oauthId: text("oauth_id"),
  oauthAccessToken: text("oauth_access_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  lastLogin: timestamp("last_login"),
  lastLoginIp: text("last_login_ip"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  passwordHistory: text("password_history"), // JSON array de hashes de senhas anteriores
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, deletedAt: true });
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
  deletedAt: timestamp("deleted_at"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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
  deletedAt: timestamp("deleted_at"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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
  clicksignDocumentKey: text("clicksign_document_key"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeReason: text("unsubscribe_reason"),
  resubscribedAt: timestamp("resubscribed_at"),
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
  deletedAt: timestamp("deleted_at"),
});

export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true, createdAt: true, deletedAt: true });
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
  deletedAt: timestamp("deleted_at"),
});

export const insertRenterSchema = createInsertSchema(renters).omit({ id: true, createdAt: true, deletedAt: true });
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
  deletedAt: timestamp("deleted_at"),
});

export const insertRentalContractSchema = createInsertSchema(rentalContracts).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
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
  deletedAt: timestamp("deleted_at"),
});

export const insertFinanceCategorySchema = createInsertSchema(financeCategories).omit({ id: true, createdAt: true, deletedAt: true });
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
  integrationType: text("integration_type"), // portal, whatsapp, email, signature, bi (deprecated, use integrationName)
  integrationName: text("integration_name").notNull(),
  status: text("status").notNull().default("disconnected"),
  config: json("config").default('{}'),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({ id: true, createdAt: true, updatedAt: true });
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
  slug: varchar("slug").notNull().unique(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }),
  maxUsers: integer("max_users").notNull().default(5),
  maxProperties: integer("max_properties").notNull().default(100),
  maxLeads: integer("max_leads").notNull().default(-1),
  maxIntegrations: integer("max_integrations").notNull().default(3),
  features: json("features").notNull().default('[]'),
  stripePriceId: varchar("stripe_price_id"),
  stripeYearlyPriceId: varchar("stripe_yearly_price_id"),
  trialDays: integer("trial_days").notNull().default(0),
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
  // Nullable: o fluxo de criação de sessão (server/auth/session-manager.ts) não
  // fornece tenantId; NOT NULL aqui quebrava o insert em produção.
  tenantId: varchar("tenant_id").references(() => tenants.id),
  sessionToken: text("session_token").notNull(),
  deviceName: text("device_name"),
  deviceType: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"), // Cidade, País a partir do IP
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
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
  tenantId: varchar("tenant_id").references(() => tenants.id),
  email: text("email"),
  consentType: text("consent_type").notNull(), // privacy, marketing, analytics, cookies, newsletter
  consentVersion: text("consent_version"), // Track document version
  status: text("status").notNull().default("active"), // active, given, withdrawn, expired
  purpose: text("purpose"),
  consentMethod: text("consent_method"), // form, email, checkbox
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  withdrawnAt: timestamp("withdrawn_at"),
  expiresAt: timestamp("expires_at"),
  metadata: json("metadata"), // additional consent metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;

/**
 * COMPLIANCE: AUDIT LOG
 * Track all data access and modifications for compliance
 */
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  actorId: varchar("actor_id"), // Who performed the action (user, system, admin)
  actorType: text("actor_type"), // user, admin, system, api
  action: text("action").notNull(), // view, create, update, delete, export, anonymize
  resourceType: text("resource_type"), // user, lead, property, etc.
  resourceId: varchar("resource_id"),
  entityType: text("entity_type"), // user, lead, property, contract, etc
  entityId: varchar("entity_id"), // ID of affected entity
  details: json("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestPath: text("request_path"), // API endpoint called
  requestMethod: text("request_method"), // GET, POST, DELETE, etc
  changedData: json("changed_data"), // before/after values (anonymized)
  legalBasis: text("legal_basis"), // consent, contract, legal_obligation, etc
  severity: text("severity").default("info"), // info, warning, critical
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLog).omit({ id: true, timestamp: true, createdAt: true });
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;
export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;

/**
 * AUDIT LOGS
 * General audit logging for webhooks and system events (e.g. ClickSign)
 */
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  action: text("action").notNull(),
  oldValues: text("old_values"), // JSON dos valores anteriores
  newValues: text("new_values"), // JSON dos novos valores
  metadata: json("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

/**
 * WEBHOOK EVENTS
 * Persistent idempotency ledger for provider callbacks.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type"),
  status: text("status").notNull().default("processing"), // processing, processed, failed
  attempts: integer("attempts").notNull().default(1),
  payloadDigest: text("payload_digest"),
  signatureDigest: text("signature_digest"),
  lastError: text("last_error"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  failedAt: timestamp("failed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, receivedAt: true, updatedAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

/**
 * TWO FACTOR AUTHENTICATION
 * 2FA via TOTP (paridade com schema-sqlite; consumidor: server/routes-security.ts)
 */
export const twoFactorAuth = pgTable("two_factor_auth", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  secret: text("secret").notNull(), // Segredo TOTP criptografado
  backupCodes: text("backup_codes"), // JSON array de backup codes hasheados
  isEnabled: boolean("is_enabled").default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTwoFactorAuthSchema = createInsertSchema(twoFactorAuth).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTwoFactorAuth = z.infer<typeof insertTwoFactorAuthSchema>;
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;

/**
 * LOGIN HISTORY
 * Histórico de tentativas de login (paridade com schema-sqlite;
 * consumidores: server/auth/oauth-*.ts, password-reset.ts)
 */
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  email: text("email").notNull(),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // invalid_password, account_locked, 2fa_failed, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  suspicious: boolean("suspicious").default(false), // sinalizado por atividade incomum
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({ id: true, createdAt: true });
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;

/**
 * COMPLIANCE: ACCOUNT DELETION REQUESTS
 * Track and manage account deletion requests (GDPR Right to be Forgotten)
 */
export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  email: text("email"),
  confirmationToken: text("confirmation_token").unique(), // Email confirmation token
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, confirmed, approved, processing, completed, cancelled, rejected
  deletionType: text("deletion_type").default("anonymize"), // anonymize, hard_delete
  dataRetention: json("data_retention"), // what data to keep for legal/audit
  ipAddress: text("ip_address"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  deletionDate: timestamp("deletion_date"),
  certificateUrl: text("certificate_url"), // URL to deletion certificate
  certificateNumber: text("certificate_number").unique(), // Unique certificate ID
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountDeletionRequestSchema = createInsertSchema(accountDeletionRequests).omit({ id: true, requestedAt: true, createdAt: true });
export type InsertAccountDeletionRequest = z.infer<typeof insertAccountDeletionRequestSchema>;
export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;

/**
 * COMPLIANCE: DATA EXPORT REQUESTS
 * Track and manage data export requests (GDPR Right to Data Portability)
 */
export const dataExportRequests = pgTable("data_export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  email: text("email"),
  requestToken: text("request_token").unique(), // Token for export retrieval
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  format: text("format").notNull().default("json"), // json, csv, pdf
  dataScope: json("data_scope"), // which data to export
  exportUrl: text("export_url"),
  fileUrl: text("file_url"), // storage URL of generated export
  fileName: text("file_name"),
  expiresAt: timestamp("expires_at"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  downloadedAt: timestamp("downloaded_at"),
  downloadCount: integer("download_count").default(0),
  fileSize: integer("file_size"),
  ipAddress: text("ip_address"),
  error: text("error"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({ id: true, requestedAt: true, createdAt: true });
export type InsertDataExportRequest = z.infer<typeof insertDataExportRequestSchema>;
export type DataExportRequest = typeof dataExportRequests.$inferSelect;

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
  essential: boolean("essential").notNull().default(true), // alias of necessary, always true
  necessary: boolean("necessary").notNull().default(true),
  analytics: boolean("analytics").notNull().default(false),
  marketing: boolean("marketing").notNull().default(false),
  preferences: boolean("preferences").notNull().default(false),
  personalization: boolean("personalization").notNull().default(false),
  consentVersion: text("consent_version"), // Version of cookie policy
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCookiePreferenceSchema = createInsertSchema(cookiePreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCookiePreference = z.infer<typeof insertCookiePreferenceSchema>;
export type CookiePreference = typeof cookiePreferences.$inferSelect;

/**
 * COMPLIANCE: DATA PROCESSING ACTIVITIES
 * Record of processing activities (GDPR Article 30)
 */
export const dataProcessingActivities = pgTable("data_processing_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name"),
  activityName: text("activity_name"), // ROPA activity name
  purpose: text("purpose").notNull(),
  legalBasis: text("legal_basis").notNull(), // consent, contract, legal_obligation, etc.
  dataCategories: text("data_categories").array(),
  dataSubjects: text("data_subjects").array(),
  recipients: text("recipients").array(),
  dataTransfers: json("data_transfers"), // international transfers
  retentionPeriod: text("retention_period"),
  securityMeasures: text("security_measures"),
  dpoReviewed: boolean("dpo_reviewed").default(false),
  dpoReviewedAt: timestamp("dpo_reviewed_at"),
  dpoReviewedBy: varchar("dpo_reviewed_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDataProcessingActivitySchema = createInsertSchema(dataProcessingActivities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataProcessingActivity = z.infer<typeof insertDataProcessingActivitySchema>;
export type DataProcessingActivity = typeof dataProcessingActivities.$inferSelect;

// ==================== PROPERTY ENHANCEMENTS ====================

/**
 * PROPERTY COORDINATES
 * Geolocation data for map visualization (ported from schema-sqlite for prod parity)
 */
export const propertyCoordinates = pgTable("property_coordinates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id).unique(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  geocodedAddress: text("geocoded_address"),
  geocodedAt: timestamp("geocoded_at"),
  manuallySet: boolean("manually_set").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertyCoordinatesSchema = createInsertSchema(propertyCoordinates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyCoordinates = z.infer<typeof insertPropertyCoordinatesSchema>;
export type PropertyCoordinates = typeof propertyCoordinates.$inferSelect;

// ==================== CLIENT PORTAL ====================

/**
 * CLIENT PORTAL ACCESS
 * Self-service portal access for owners and renters (ported from schema-sqlite for prod parity)
 */
export const clientPortalAccess = pgTable("client_portal_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  clientType: text("client_type").notNull(), // owner, renter, buyer, lead
  clientId: varchar("client_id").notNull(), // Reference to owner/renter/lead ID
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  loginCount: integer("login_count").default(0),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientPortalAccess = z.infer<typeof insertClientPortalAccessSchema>;
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;

// ==================== MAINTENANCE ====================

/**
 * MAINTENANCE TICKETS
 * Maintenance/repair requests raised from the rental/owner portal.
 * Defined here (and in schema-sqlite) for prod parity — the portal create/list
 * endpoints in routes-portal.ts depend on this table.
 */
export const maintenanceTickets = pgTable("maintenance_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  rentalContractId: varchar("rental_contract_id"),
  requestedById: varchar("requested_by_id"), // portal user / renter / user id
  requestedByType: text("requested_by_type"), // renter, owner, broker, system
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // plumbing, electrical, structural, etc
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, scheduled, resolved, closed, cancelled
  assignedTo: varchar("assigned_to").references(() => users.id),
  photos: text("photos"), // JSON array of photo URLs
  cost: decimal("cost", { precision: 12, scale: 2 }),
  scheduledDate: timestamp("scheduled_date"),
  resolvedAt: timestamp("resolved_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"), // JSON array of note objects
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMaintenanceTicketSchema = createInsertSchema(maintenanceTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceTicket = z.infer<typeof insertMaintenanceTicketSchema>;
export type MaintenanceTicket = typeof maintenanceTickets.$inferSelect;

/**
 * FILES
 * File storage metadata for uploaded files
 */
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  bucket: text("bucket").notNull(), // Storage bucket name
  filePath: text("file_path").notNull(), // Full path in storage
  fileName: text("file_name").notNull(), // Original filename
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  category: text("category").notNull(), // property-image, document, avatar, logo, invoice, export
  entityType: text("entity_type"), // property, lead, contract, user, tenant
  entityId: varchar("entity_id"),
  isPublic: boolean("is_public").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type UsageLog = typeof usageLogs.$inferSelect;

// ==================== ANALYTICS ====================

/**
 * ANALYTICS EVENTS
 * Pageviews, web vitals and error tracking (ported from schema-sqlite for
 * prod parity — consumer: server/routes-analytics.ts + storage ANALYTICS)
 */
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// ==================== LEAD INTELLIGENCE ====================

/**
 * LEAD SCORES
 * Automated lead scoring (ported from schema-sqlite for prod parity —
 * consumer: server/routes-features.ts)
 */
export const leadScores = pgTable("lead_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id).unique(),
  totalScore: integer("total_score").notNull().default(0), // 0-100
  budgetScore: integer("budget_score").default(0),
  engagementScore: integer("engagement_score").default(0),
  profileScore: integer("profile_score").default(0),
  urgencyScore: integer("urgency_score").default(0),
  behaviorScore: integer("behavior_score").default(0),
  temperature: text("temperature").default("cold"), // cold, warm, hot
  lastCalculated: timestamp("last_calculated").notNull().defaultNow(),
  scoreHistory: text("score_history"), // JSON array of score changes over time
  predictedConversion: real("predicted_conversion"), // 0.0 to 1.0 probability
  nextBestAction: text("next_best_action"), // Recommended action
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadScoreSchema = createInsertSchema(leadScores).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadScore = z.infer<typeof insertLeadScoreSchema>;
export type LeadScore = typeof leadScores.$inferSelect;

/**
 * DRIP CAMPAIGNS
 * Automated email/message sequences for lead nurturing (ported from schema-sqlite)
 */
export const dripCampaigns = pgTable("drip_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // lead_created, status_change, tag_added, manual
  triggerConditions: text("trigger_conditions"), // JSON conditions
  isActive: boolean("is_active").default(true),
  totalEnrolled: integer("total_enrolled").default(0),
  totalCompleted: integer("total_completed").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDripCampaignSchema = createInsertSchema(dripCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripCampaign = typeof dripCampaigns.$inferSelect;

/**
 * CAMPAIGN STEPS
 * Individual steps within a drip campaign (ported from schema-sqlite)
 */
export const campaignSteps = pgTable("campaign_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id),
  stepOrder: integer("step_order").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  delayHours: integer("delay_hours").notNull().default(0),
  channel: text("channel").notNull(), // email, whatsapp, sms
  subject: text("subject"),
  content: text("content").notNull(),
  templateVariables: text("template_variables"), // JSON
  conditions: text("conditions"), // JSON - skip conditions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignStepSchema = createInsertSchema(campaignSteps).omit({ id: true, createdAt: true });
export type InsertCampaignStep = z.infer<typeof insertCampaignStepSchema>;
export type CampaignStep = typeof campaignSteps.$inferSelect;

/**
 * CAMPAIGN ENROLLMENTS
 * Tracks leads enrolled in campaigns (ported from schema-sqlite)
 */
export const campaignEnrollments = pgTable("campaign_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  currentStep: integer("current_step").default(0),
  status: text("status").notNull().default("active"), // active, completed, paused, exited
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  lastStepAt: timestamp("last_step_at"),
  nextStepAt: timestamp("next_step_at"),
});

export const insertCampaignEnrollmentSchema = createInsertSchema(campaignEnrollments).omit({ id: true });
export type InsertCampaignEnrollment = z.infer<typeof insertCampaignEnrollmentSchema>;
export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;

// ==================== PROPERTY FEATURE TABLES ====================

/**
 * VIRTUAL TOURS
 * 360° virtual tour links and configurations (ported from schema-sqlite)
 */
export const virtualTours = pgTable("virtual_tours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  tourType: text("tour_type").notNull(), // matterport, 360_photos, video, iframe
  tourUrl: text("tour_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVirtualTourSchema = createInsertSchema(virtualTours).omit({ id: true, createdAt: true });
export type InsertVirtualTour = z.infer<typeof insertVirtualTourSchema>;
export type VirtualTour = typeof virtualTours.$inferSelect;

/**
 * PROPERTY COMPARISONS
 * Saved property comparisons by users/leads (ported from schema-sqlite)
 */
export const propertyComparisons = pgTable("property_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  leadId: varchar("lead_id").references(() => leads.id),
  sessionId: text("session_id"), // For anonymous users
  propertyIds: text("property_ids").notNull(), // JSON array of property IDs
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertyComparisonSchema = createInsertSchema(propertyComparisons).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyComparison = z.infer<typeof insertPropertyComparisonSchema>;
export type PropertyComparison = typeof propertyComparisons.$inferSelect;

// ==================== DIGITAL SIGNATURES ====================

/**
 * DIGITAL SIGNATURES
 * E-signature workflow for contracts (ported from schema-sqlite)
 */
export const digitalSignatures = pgTable("digital_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
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
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  expiresAt: timestamp("expires_at"),
  token: text("token").unique(), // Unique token for signing link
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDigitalSignatureSchema = createInsertSchema(digitalSignatures).omit({ id: true, createdAt: true });
export type InsertDigitalSignature = z.infer<typeof insertDigitalSignatureSchema>;
export type DigitalSignature = typeof digitalSignatures.$inferSelect;

/**
 * CONTRACT DOCUMENTS
 * Generated PDF documents for contracts (ported from schema-sqlite)
 */
export const contractDocuments = pgTable("contract_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  documentType: text("document_type").notNull(), // contract, addendum, receipt, notice
  version: integer("version").notNull().default(1),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  fileHash: text("file_hash"), // SHA-256 hash for integrity
  generatedBy: varchar("generated_by").references(() => users.id),
  isFinalized: boolean("is_finalized").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContractDocumentSchema = createInsertSchema(contractDocuments).omit({ id: true, createdAt: true });
export type InsertContractDocument = z.infer<typeof insertContractDocumentSchema>;
export type ContractDocument = typeof contractDocuments.$inferSelect;

// ==================== DASHBOARD CUSTOMIZATION ====================

/**
 * DASHBOARD LAYOUTS
 * Custom dashboard configurations per user (ported from schema-sqlite)
 */
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull().default("Principal"),
  isDefault: boolean("is_default").default(false),
  layout: text("layout").notNull(), // JSON grid layout config
  widgets: text("widgets").notNull(), // JSON array of widget configs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;
export type DashboardLayout = typeof dashboardLayouts.$inferSelect;

/**
 * WIDGET TYPES
 * Available widget definitions (ported from schema-sqlite; global, no tenant)
 */
export const widgetTypes = pgTable("widget_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // metrics, charts, lists, calendar, map
  component: text("component").notNull(), // React component name
  defaultConfig: text("default_config"), // JSON default settings
  minWidth: integer("min_width").default(1),
  minHeight: integer("min_height").default(1),
  maxWidth: integer("max_width"),
  maxHeight: integer("max_height"),
  requiredPermissions: text("required_permissions"), // JSON array
  isActive: boolean("is_active").default(true),
});

export const insertWidgetTypeSchema = createInsertSchema(widgetTypes).omit({ id: true });
export type InsertWidgetType = z.infer<typeof insertWidgetTypeSchema>;
export type WidgetType = typeof widgetTypes.$inferSelect;

// ==================== INSPECTIONS (VISTORIAS) ====================

/**
 * PROPERTY INSPECTIONS
 * Vistorias de entrada/saída/periódicas — consumidores: server/storage.ts
 * (seção INSPECTIONS), server/routes-inspections.ts, services/inspection-service.ts.
 * Campos numéricos usam real (não decimal) porque o código faz aritmética JS
 * direta sobre eles (totalDamages, estimatedRepairCost).
 */
export const propertyInspections = pgTable("property_inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  rentalContractId: varchar("rental_contract_id"),
  type: text("type").notNull(), // entry, exit, periodic
  status: text("status").notNull().default("in_progress"), // in_progress, completed, signed
  inspectorName: text("inspector_name").notNull(),
  inspectorId: varchar("inspector_id").references(() => users.id),
  renterName: text("renter_name"),
  renterId: varchar("renter_id"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  signedAt: timestamp("signed_at"),
  overallCondition: text("overall_condition"), // excellent, good, fair, poor
  generalNotes: text("general_notes"),
  totalDamages: real("total_damages"),
  previousInspectionId: varchar("previous_inspection_id"),
  inspectorSignature: text("inspector_signature"), // base64
  renterSignature: text("renter_signature"), // base64
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPropertyInspectionSchema = createInsertSchema(propertyInspections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPropertyInspection = z.infer<typeof insertPropertyInspectionSchema>;
export type PropertyInspection = typeof propertyInspections.$inferSelect;

/**
 * INSPECTION ROOMS
 * Cômodos de uma vistoria
 */
export const inspectionRooms = pgTable("inspection_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull().references(() => propertyInspections.id),
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
export const inspectionItems = pgTable("inspection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => inspectionRooms.id),
  itemName: text("item_name").notNull(),
  condition: text("condition").notNull().default("good"), // excellent, good, fair, poor, not_applicable
  description: text("description"),
  hasDamage: boolean("has_damage").default(false),
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
 * server/services/avm-engine.ts, server/storage.ts (seção AVM).
 * Valores em real (não decimal) porque o engine faz aritmética JS direta.
 */
export const propertyValuations = pgTable("property_valuations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
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
  requestedBy: varchar("requested_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPropertyValuationSchema = createInsertSchema(propertyValuations).omit({ id: true, createdAt: true });
export type InsertPropertyValuation = z.infer<typeof insertPropertyValuationSchema>;
export type PropertyValuation = typeof propertyValuations.$inferSelect;

/**
 * MARKET INDICES
 * Índices de mercado agregados por cidade/tipo/categoria/período
 */
export const marketIndices = pgTable("market_indices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
export const isaConversations = pgTable("isa_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  leadId: varchar("lead_id").references(() => leads.id),
  phoneNumber: text("phone_number").notNull(),
  leadName: text("lead_name"),
  status: text("status").notNull().default("active"), // active, qualified, transferred, closed
  conversationStage: text("conversation_stage").default("greeting"),
  qualificationData: text("qualification_data"), // JSON (BANT + score)
  interestedPropertyIds: text("interested_property_ids"), // JSON array
  temperature: text("temperature").default("unknown"), // hot, warm, cold, unknown
  messageCount: integer("message_count").default(0),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  transferredAt: timestamp("transferred_at"),
  visitScheduledId: varchar("visit_scheduled_id"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertIsaConversationSchema = createInsertSchema(isaConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIsaConversation = z.infer<typeof insertIsaConversationSchema>;
export type IsaConversation = typeof isaConversations.$inferSelect;

/**
 * ISA MESSAGES
 * Mensagens trocadas em cada conversa ISA
 */
export const isaMessages = pgTable("isa_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => isaConversations.id),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  direction: text("direction").notNull(), // inbound, outbound
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIsaMessageSchema = createInsertSchema(isaMessages).omit({ id: true, createdAt: true });
export type InsertIsaMessage = z.infer<typeof insertIsaMessageSchema>;
export type IsaMessage = typeof isaMessages.$inferSelect;

/**
 * ISA SETTINGS
 * Configurações do agente ISA por tenant
 */
export const isaSettings = pgTable("isa_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  enabled: boolean("enabled").default(false),
  greeting: text("greeting"),
  personality: text("personality").default("professional"),
  workingHours: text("working_hours"), // JSON: { start, end, days }
  autoQualify: boolean("auto_qualify").default(true),
  autoScheduleVisits: boolean("auto_schedule_visits").default(false),
  transferToHumanThreshold: integer("transfer_to_human_threshold").default(10),
  faqResponses: text("faq_responses"), // JSON array
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
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
export const autoMarketingContent = pgTable("auto_marketing_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  description: text("description"),
  descriptionTone: text("description_tone"), // professional, casual, luxury...
  socialMediaPost: text("social_media_post"),
  socialMediaHashtags: text("social_media_hashtags"), // JSON array
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  micrositeContent: text("microsite_content"), // JSON/HTML
  status: text("status").notNull().default("draft"), // draft, published
  generatedAt: timestamp("generated_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAutoMarketingContentSchema = createInsertSchema(autoMarketingContent).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutoMarketingContent = z.infer<typeof insertAutoMarketingContentSchema>;
export type AutoMarketingContent = typeof autoMarketingContent.$inferSelect;
