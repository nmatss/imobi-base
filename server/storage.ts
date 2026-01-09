// @ts-nocheck
// TypeScript checking disabled due to Drizzle ORM union type issues with dual database support
import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import { db, schema, isSqlite } from "./db";
import { nanoid } from "nanoid";
import type {
  Tenant, InsertTenant,
  User, InsertUser,
  Property, InsertProperty,
  Lead, InsertLead,
  Interaction, InsertInteraction,
  Visit, InsertVisit,
  Contract, InsertContract,
  Newsletter, InsertNewsletter,
  Owner, InsertOwner,
  Renter, InsertRenter,
  RentalContract, InsertRentalContract,
  RentalPayment, InsertRentalPayment,
  RentalTransfer, InsertRentalTransfer,
  SaleProposal, InsertSaleProposal,
  PropertySale, InsertPropertySale,
  FinanceCategory, InsertFinanceCategory,
  FinanceEntry, InsertFinanceEntry,
  LeadTag, InsertLeadTag,
  LeadTagLink, InsertLeadTagLink,
  FollowUp, InsertFollowUp,
  TenantSettings, InsertTenantSettings,
  AISettings, InsertAISettings,
  UserRole, InsertUserRole,
  IntegrationConfig, InsertIntegrationConfig,
  NotificationPreference, InsertNotificationPreference,
  SavedReport, InsertSavedReport
} from "@shared/schema-sqlite";

// Helper to generate IDs
const generateId = () => nanoid();

// Helper to convert arrays to/from JSON for SQLite
const toJson = <T>(arr: T[] | null | undefined): string | null => {
  if (!arr) return null;
  return JSON.stringify(arr);
};

const fromJson = <T>(str: string | null | undefined): T[] | null => {
  if (!str) return null;
  try {
    return JSON.parse(str) as T[];
  } catch {
    return null;
  }
};

// Helper to get current timestamp
const now = () => new Date().toISOString();

export interface IStorage {
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByTenant(tenantId: string, filters?: { type?: string; category?: string; status?: string; featured?: boolean }): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByTenant(tenantId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  getInteractionsByLead(leadId: string): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  getVisit(id: string): Promise<Visit | undefined>;
  getVisitsByTenant(tenantId: string): Promise<Visit[]>;
  getVisitsByProperty(propertyId: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined>;
  deleteVisit(id: string): Promise<boolean>;
  getContract(id: string): Promise<Contract | undefined>;
  getContractsByTenant(tenantId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  subscribeNewsletter(subscription: InsertNewsletter): Promise<Newsletter>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  globalSearch(tenantId: string, query: string): Promise<{ properties: Property[]; leads: Lead[]; contracts: Contract[] }>;
  getDashboardStats(tenantId: string): Promise<{ totalProperties: number; totalLeads: number; totalContracts: number; totalVisits: number }>;
  getOwner(id: string): Promise<Owner | undefined>;
  getOwnersByTenant(tenantId: string): Promise<Owner[]>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: string): Promise<boolean>;
  getRenter(id: string): Promise<Renter | undefined>;
  getRentersByTenant(tenantId: string): Promise<Renter[]>;
  createRenter(renter: InsertRenter): Promise<Renter>;
  updateRenter(id: string, renter: Partial<InsertRenter>): Promise<Renter | undefined>;
  deleteRenter(id: string): Promise<boolean>;
  getRentalContract(id: string): Promise<RentalContract | undefined>;
  getRentalContractsByTenant(tenantId: string): Promise<RentalContract[]>;
  getRentalContractsByOwner(ownerId: string): Promise<RentalContract[]>;
  getRentalContractsByRenter(renterId: string): Promise<RentalContract[]>;
  createRentalContract(contract: InsertRentalContract): Promise<RentalContract>;
  updateRentalContract(id: string, contract: Partial<InsertRentalContract>): Promise<RentalContract | undefined>;
  getRentalPayment(id: string): Promise<RentalPayment | undefined>;
  getRentalPaymentsByTenant(tenantId: string, filters?: { status?: string; month?: string }): Promise<RentalPayment[]>;
  getRentalPaymentsByContract(contractId: string): Promise<RentalPayment[]>;
  createRentalPayment(payment: InsertRentalPayment): Promise<RentalPayment>;
  updateRentalPayment(id: string, payment: Partial<InsertRentalPayment>): Promise<RentalPayment | undefined>;
  getSaleProposal(id: string): Promise<SaleProposal | undefined>;
  getSaleProposalsByTenant(tenantId: string): Promise<SaleProposal[]>;
  getSaleProposalsByProperty(propertyId: string): Promise<SaleProposal[]>;
  createSaleProposal(proposal: InsertSaleProposal): Promise<SaleProposal>;
  updateSaleProposal(id: string, proposal: Partial<InsertSaleProposal>): Promise<SaleProposal | undefined>;
  deleteSaleProposal(id: string): Promise<boolean>;
  getPropertySale(id: string): Promise<PropertySale | undefined>;
  getPropertySalesByTenant(tenantId: string): Promise<PropertySale[]>;
  createPropertySale(sale: InsertPropertySale): Promise<PropertySale>;
  updatePropertySale(id: string, sale: Partial<InsertPropertySale>): Promise<PropertySale | undefined>;
  getFinanceCategory(id: string): Promise<FinanceCategory | undefined>;
  getFinanceCategoriesByTenant(tenantId: string): Promise<FinanceCategory[]>;
  createFinanceCategory(category: InsertFinanceCategory): Promise<FinanceCategory>;
  updateFinanceCategory(id: string, category: Partial<InsertFinanceCategory>): Promise<FinanceCategory | undefined>;
  deleteFinanceCategory(id: string): Promise<boolean>;
  getFinanceEntry(id: string): Promise<FinanceEntry | undefined>;
  getFinanceEntriesByTenant(tenantId: string, filters?: { startDate?: Date; endDate?: Date; flow?: string; categoryId?: string }): Promise<FinanceEntry[]>;
  createFinanceEntry(entry: InsertFinanceEntry): Promise<FinanceEntry>;
  updateFinanceEntry(id: string, entry: Partial<InsertFinanceEntry>): Promise<FinanceEntry | undefined>;
  deleteFinanceEntry(id: string): Promise<boolean>;
  getLeadTag(id: string): Promise<LeadTag | undefined>;
  getLeadTagsByTenant(tenantId: string): Promise<LeadTag[]>;
  createLeadTag(tag: InsertLeadTag): Promise<LeadTag>;
  updateLeadTag(id: string, tag: Partial<InsertLeadTag>): Promise<LeadTag | undefined>;
  deleteLeadTag(id: string): Promise<boolean>;
  getTagsByLead(leadId: string): Promise<LeadTag[]>;
  getTagsForAllLeads(tenantId: string): Promise<Record<string, LeadTag[]>>;
  addTagToLead(link: InsertLeadTagLink): Promise<LeadTagLink>;
  removeTagFromLead(leadId: string, tagId: string): Promise<boolean>;
  getFollowUp(id: string): Promise<FollowUp | undefined>;
  getFollowUpsByTenant(tenantId: string, filters?: { status?: string }): Promise<FollowUp[]>;
  getFollowUpsByLead(leadId: string): Promise<FollowUp[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: string): Promise<boolean>;
  getMatchedProperties(leadId: string, tenantId: string): Promise<{ property: Property; score: number; matchReasons: string[] }[]>;
  getRentalReportData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    overdueCount: number;
    payments: RentalPayment[];
  }>;
  getOwnerReport(tenantId: string, filters?: { ownerId?: string; startDate?: Date; endDate?: Date }): Promise<{
    totalProperties: number;
    activeContracts: number;
    totalRevenue: number;
    properties: Array<{ id: string; address: string; contractCount: number; revenue: number }>;
  }>;
  getRenterReport(tenantId: string, filters?: { renterId?: string; startDate?: Date; endDate?: Date }): Promise<{
    totalContracts: number;
    totalPaid: number;
    totalPending: number;
    contracts: Array<{ id: string; propertyAddress: string; monthlyRent: string; status: string }>;
  }>;
  getPaymentDetailedReport(tenantId: string, filters?: { ownerId?: string; renterId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<{
    payments: Array<{ id: string; propertyAddress: string; renterName: string; ownerName: string; totalValue: string; status: string }>;
    summary: { totalAmount: number; paidAmount: number; pendingAmount: number };
  }>;
  getOverdueReport(tenantId: string): Promise<{
    totalOverdue: number;
    overdueCount: number;
    payments: Array<{ id: string; renterName: string; propertyAddress: string; totalValue: string; daysOverdue: number }>;
  }>;
  // Rental Transfers (Repasses)
  getRentalTransfer(id: string): Promise<RentalTransfer | undefined>;
  getRentalTransfersByTenant(tenantId: string, filters?: { ownerId?: string; status?: string; referenceMonth?: string }): Promise<RentalTransfer[]>;
  getRentalTransfersByOwner(ownerId: string): Promise<RentalTransfer[]>;
  createRentalTransfer(transfer: InsertRentalTransfer): Promise<RentalTransfer>;
  updateRentalTransfer(id: string, transfer: Partial<InsertRentalTransfer>): Promise<RentalTransfer | undefined>;
  deleteRentalTransfer(id: string): Promise<boolean>;
  generateTransfersForMonth(tenantId: string, referenceMonth: string): Promise<RentalTransfer[]>;
  // Rental Metrics and Alerts
  getRentalMetrics(tenantId: string): Promise<{
    activeContracts: number;
    vacantProperties: number;
    delinquencyValue: number;
    delinquencyPercentage: number;
    pendingTransfers: number;
    contractsExpiringThisMonth: number;
    contractsAdjustingThisMonth: number;
    monthlyRecurringRevenue: number;
  }>;
  getRentalMetricsChart(tenantId: string, period: 'currentMonth' | 'lastMonth' | 'year'): Promise<{ month: string; revenue: number; delinquency: number }[]>;
  getRentalAlerts(tenantId: string): Promise<{
    paymentsDueToday: RentalPayment[];
    paymentsDueTomorrow: RentalPayment[];
    overduePayments: { payment: RentalPayment; daysOverdue: number }[];
    contractsExpiring: RentalContract[];
    contractsAdjusting: RentalContract[];
    vacantProperties: Property[];
  }>;
  getOwnerStatement(ownerId: string, tenantId: string, startDate?: Date, endDate?: Date): Promise<{
    owner: Owner;
    properties: Array<{ property: Property; payments: RentalPayment[] }>;
    summary: { totalRevenue: number; totalPaid: number; totalPending: number };
  }>;
  getRenterPaymentHistory(renterId: string, tenantId: string): Promise<{
    renter: Renter;
    contracts: RentalContract[];
    payments: RentalPayment[];
    summary: { totalPaid: number; totalPending: number; onTimePayments: number; latePayments: number };
  }>;
  // Financial Module Methods
  getFinancialMetrics(tenantId: string, startDate?: Date, endDate?: Date, previousPeriodStart?: Date, previousPeriodEnd?: Date): Promise<{
    commissionsReceived: number;
    ownerTransfers: number;
    rentalRevenue: number;
    salesRevenue: number;
    operationalExpenses: number;
    cashBalance: number;
    periodVariation: number;
  }>;
  getFinancialTransactions(tenantId: string, filters?: {
    type?: string;
    category?: string;
    status?: string;
    origin?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FinanceEntry[]>;
  getFinancialChartData(tenantId: string, period: 'month' | 'quarter' | 'year'): Promise<{
    byMonth: { month: string; revenue: number; expenses: number }[];
    byCategory: { category: string; amount: number; type: string }[];
    byOrigin: { origin: string; amount: number }[];
  }>;
  // Comprehensive Reports
  getSalesReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date; brokerId?: string }): Promise<{
    totalSales: number;
    totalValue: number;
    totalCommissions: number;
    salesList: Array<{ sale: PropertySale; property: Property; buyer: Lead }>;
  }>;
  getLeadsFunnelReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    totalLeads: number;
    conversionRate: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
  }>;
  getBrokerPerformanceReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    brokers: Array<{ user: User; totalLeads: number; convertedLeads: number; conversionRate: number }>;
  }>;
  getPropertiesReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    totalProperties: number;
    availableProperties: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }>;
  getFinancialSummaryReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    byMonth: Array<{ month: string; revenue: number; expenses: number }>;
  }>;
  // Settings Module Methods
  getTenantSettings(tenantId: string): Promise<TenantSettings | undefined>;
  createOrUpdateTenantSettings(tenantId: string, data: Partial<InsertTenantSettings>): Promise<TenantSettings>;
  getAiSettings(tenantId: string): Promise<AISettings | undefined>;
  createOrUpdateAiSettings(tenantId: string, data: Partial<InsertAISettings>): Promise<AISettings>;
  getUserRolesByTenant(tenantId: string): Promise<UserRole[]>;
  getUserRole(id: string): Promise<UserRole | undefined>;
  createUserRole(data: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: string, data: Partial<InsertUserRole>): Promise<UserRole | undefined>;
  deleteUserRole(id: string): Promise<boolean>;
  seedDefaultRoles(tenantId: string): Promise<UserRole[]>;
  getDefaultRoles(tenantId: string): Promise<UserRole[]>;
  getBrandSettings(tenantId: string): Promise<Record<string, unknown> | undefined>;
  createOrUpdateBrandSettings(tenantId: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  getAISettings(tenantId: string): Promise<AISettings | undefined>;
  createOrUpdateAISettings(tenantId: string, data: Partial<InsertAISettings>): Promise<AISettings>;
  getIntegrationsByTenant(tenantId: string): Promise<IntegrationConfig[]>;
  getIntegrationByName(tenantId: string, name: string): Promise<IntegrationConfig | undefined>;
  createOrUpdateIntegration(tenantId: string, name: string, data: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig>;
  getNotificationPreferencesByTenant(tenantId: string): Promise<NotificationPreference[]>;
  getNotificationPreference(tenantId: string, eventType: string, channel: string): Promise<NotificationPreference | undefined>;
  createOrUpdateNotificationPreference(tenantId: string, eventType: string, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;
  getSavedReportsByTenant(tenantId: string): Promise<SavedReport[]>;
  getSavedReport(id: string): Promise<SavedReport | undefined>;
  createSavedReport(data: InsertSavedReport): Promise<SavedReport>;
  updateSavedReport(id: string, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: string): Promise<boolean>;
  toggleReportFavorite(id: string): Promise<SavedReport | undefined>;
  seedDefaultCategories(tenantId: string): Promise<FinanceCategory[]>;
  checkDatabaseConnection(): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(schema.tenants);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = generateId();
    const [created] = await db.insert(schema.tenants).values({ ...tenant, id, createdAt: now() }).returning();
    return created;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(schema.tenants).set(tenant).where(eq(schema.tenants.id, id)).returning();
    return updated;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = generateId();
    const [created] = await db.insert(schema.users).values({ ...user, id, createdAt: now() }).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users).set(user).where(eq(schema.users.id, id)).returning();
    return updated;
  }

  // Properties
  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(schema.properties).where(eq(schema.properties.id, id));
    return property;
  }

  async getPropertiesByTenant(tenantId: string, filters?: { type?: string; category?: string; status?: string; featured?: boolean }): Promise<Property[]> {
    let query = db.select().from(schema.properties).where(eq(schema.properties.tenantId, tenantId));

    const conditions = [eq(schema.properties.tenantId, tenantId)];
    if (filters?.type) conditions.push(eq(schema.properties.type, filters.type));
    if (filters?.category) conditions.push(eq(schema.properties.category, filters.category));
    if (filters?.status) conditions.push(eq(schema.properties.status, filters.status));
    if (filters?.featured !== undefined) conditions.push(eq(schema.properties.featured, filters.featured));

    return db.select().from(schema.properties).where(and(...conditions)).orderBy(desc(schema.properties.createdAt));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const id = generateId();
    const data = {
      ...property,
      id,
      features: isSqlite ? toJson(property.features as any) : property.features,
      images: isSqlite ? toJson(property.images as any) : property.images,
      createdAt: now(),
      updatedAt: now(),
    };
    const [created] = await db.insert(schema.properties).values(data as any).returning();
    return created;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const data = {
      ...property,
      features: isSqlite && property.features ? toJson(property.features as any) : property.features,
      images: isSqlite && property.images ? toJson(property.images as any) : property.images,
      updatedAt: now(),
    };
    const [updated] = await db.update(schema.properties).set(data as any).where(eq(schema.properties.id, id)).returning();
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(schema.properties).where(eq(schema.properties.id, id));
    return true;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
    return lead;
  }

  async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
    return db.select().from(schema.leads).where(eq(schema.leads.tenantId, tenantId)).orderBy(desc(schema.leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = generateId();
    const data = {
      ...lead,
      id,
      interests: isSqlite ? toJson(lead.interests as any) : lead.interests,
      createdAt: now(),
      updatedAt: now(),
    };
    const [created] = await db.insert(schema.leads).values(data as any).returning();
    return created;
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const data = {
      ...lead,
      interests: isSqlite && lead.interests ? toJson(lead.interests as any) : lead.interests,
      updatedAt: now(),
    };
    const [updated] = await db.update(schema.leads).set(data as any).where(eq(schema.leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(schema.leads).where(eq(schema.leads.id, id));
    return true;
  }

  // Interactions
  async getInteractionsByLead(leadId: string): Promise<Interaction[]> {
    return db.select().from(schema.interactions).where(eq(schema.interactions.leadId, leadId)).orderBy(desc(schema.interactions.createdAt));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const id = generateId();
    const [created] = await db.insert(schema.interactions).values({ ...interaction, id, createdAt: now() }).returning();
    return created;
  }

  // Visits
  async getVisit(id: string): Promise<Visit | undefined> {
    const [visit] = await db.select().from(schema.visits).where(eq(schema.visits.id, id));
    return visit;
  }

  async getVisitsByTenant(tenantId: string): Promise<Visit[]> {
    return db.select().from(schema.visits).where(eq(schema.visits.tenantId, tenantId)).orderBy(desc(schema.visits.scheduledFor));
  }

  async getVisitsByProperty(propertyId: string): Promise<Visit[]> {
    return db.select().from(schema.visits).where(eq(schema.visits.propertyId, propertyId)).orderBy(desc(schema.visits.scheduledFor));
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const id = generateId();
    const data = {
      ...visit,
      id,
      scheduledFor: typeof visit.scheduledFor === 'object' ? (visit.scheduledFor as Date).toISOString() : visit.scheduledFor,
      createdAt: now(),
    };
    const [created] = await db.insert(schema.visits).values(data as any).returning();
    return created;
  }

  async updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const data = {
      ...visit,
      scheduledFor: visit.scheduledFor && typeof visit.scheduledFor === 'object' ? (visit.scheduledFor as Date).toISOString() : visit.scheduledFor,
    };
    const [updated] = await db.update(schema.visits).set(data as any).where(eq(schema.visits.id, id)).returning();
    return updated;
  }

  async deleteVisit(id: string): Promise<boolean> {
    await db.delete(schema.visits).where(eq(schema.visits.id, id));
    return true;
  }

  // Contracts
  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    return contract;
  }

  async getContractsByTenant(tenantId: string): Promise<Contract[]> {
    return db.select().from(schema.contracts).where(eq(schema.contracts.tenantId, tenantId)).orderBy(desc(schema.contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const id = generateId();
    const [created] = await db.insert(schema.contracts).values({ ...contract, id, createdAt: now(), updatedAt: now() }).returning();
    return created;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(schema.contracts).set({ ...contract, updatedAt: now() }).where(eq(schema.contracts.id, id)).returning();
    return updated;
  }

  // Newsletter
  async subscribeNewsletter(subscription: InsertNewsletter): Promise<Newsletter> {
    const id = generateId();
    // Check if already exists
    const existing = await db.select().from(schema.newsletterSubscriptions).where(eq(schema.newsletterSubscriptions.email, subscription.email));
    if (existing.length > 0) {
      const [updated] = await db.update(schema.newsletterSubscriptions).set({ active: true }).where(eq(schema.newsletterSubscriptions.email, subscription.email)).returning();
      return updated;
    }
    const [created] = await db.insert(schema.newsletterSubscriptions).values({ ...subscription, id, subscribedAt: now() }).returning();
    return created;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    await db.update(schema.newsletterSubscriptions).set({ active: false }).where(eq(schema.newsletterSubscriptions.email, email));
    return true;
  }

  // Global search
  async globalSearch(tenantId: string, query: string): Promise<{ properties: Property[]; leads: Lead[]; contracts: Contract[] }> {
    const searchTerm = `%${query.toLowerCase()}%`;

    const propertiesResult = await db.select().from(schema.properties)
      .where(and(
        eq(schema.properties.tenantId, tenantId),
        or(
          like(schema.properties.title, searchTerm),
          like(schema.properties.address, searchTerm),
          like(schema.properties.city, searchTerm)
        )
      ))
      .limit(10);

    const leadsResult = await db.select().from(schema.leads)
      .where(and(
        eq(schema.leads.tenantId, tenantId),
        or(
          like(schema.leads.name, searchTerm),
          like(schema.leads.email, searchTerm),
          like(schema.leads.phone, searchTerm)
        )
      ))
      .limit(10);

    const contractsResult = await db.select().from(schema.contracts)
      .where(eq(schema.contracts.tenantId, tenantId))
      .limit(5);

    return {
      properties: propertiesResult,
      leads: leadsResult,
      contracts: contractsResult,
    };
  }

  // Dashboard stats
  async getDashboardStats(tenantId: string): Promise<{ totalProperties: number; totalLeads: number; totalContracts: number; totalVisits: number }> {
    const properties = await db.select().from(schema.properties).where(eq(schema.properties.tenantId, tenantId));
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.tenantId, tenantId));
    const contracts = await db.select().from(schema.contracts).where(eq(schema.contracts.tenantId, tenantId));
    const visits = await db.select().from(schema.visits).where(eq(schema.visits.tenantId, tenantId));

    return {
      totalProperties: properties.length,
      totalLeads: leads.length,
      totalContracts: contracts.length,
      totalVisits: visits.length,
    };
  }

  // Owners
  async getOwner(id: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, id));
    return owner;
  }

  async getOwnersByTenant(tenantId: string): Promise<Owner[]> {
    return db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId)).orderBy(desc(schema.owners.createdAt));
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const id = generateId();
    const [created] = await db.insert(schema.owners).values({ ...owner, id, createdAt: now() }).returning();
    return created;
  }

  async updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [updated] = await db.update(schema.owners).set(owner).where(eq(schema.owners.id, id)).returning();
    return updated;
  }

  async deleteOwner(id: string): Promise<boolean> {
    await db.delete(schema.owners).where(eq(schema.owners.id, id));
    return true;
  }

  // Renters
  async getRenter(id: string): Promise<Renter | undefined> {
    const [renter] = await db.select().from(schema.renters).where(eq(schema.renters.id, id));
    return renter;
  }

  async getRentersByTenant(tenantId: string): Promise<Renter[]> {
    return db.select().from(schema.renters).where(eq(schema.renters.tenantId, tenantId)).orderBy(desc(schema.renters.createdAt));
  }

  async createRenter(renter: InsertRenter): Promise<Renter> {
    const id = generateId();
    const [created] = await db.insert(schema.renters).values({ ...renter, id, createdAt: now() }).returning();
    return created;
  }

  async updateRenter(id: string, renter: Partial<InsertRenter>): Promise<Renter | undefined> {
    const [updated] = await db.update(schema.renters).set(renter).where(eq(schema.renters.id, id)).returning();
    return updated;
  }

  async deleteRenter(id: string): Promise<boolean> {
    await db.delete(schema.renters).where(eq(schema.renters.id, id));
    return true;
  }

  // Rental Contracts
  async getRentalContract(id: string): Promise<RentalContract | undefined> {
    const [contract] = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.id, id));
    return contract;
  }

  async getRentalContractsByTenant(tenantId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId)).orderBy(desc(schema.rentalContracts.createdAt));
  }

  async getRentalContractsByOwner(ownerId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.ownerId, ownerId)).orderBy(desc(schema.rentalContracts.createdAt));
  }

  async getRentalContractsByRenter(renterId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.renterId, renterId)).orderBy(desc(schema.rentalContracts.createdAt));
  }

  async createRentalContract(contract: InsertRentalContract): Promise<RentalContract> {
    const id = generateId();
    const [created] = await db.insert(schema.rentalContracts).values({ ...contract, id, createdAt: now(), updatedAt: now() }).returning();
    return created;
  }

  async updateRentalContract(id: string, contract: Partial<InsertRentalContract>): Promise<RentalContract | undefined> {
    const [updated] = await db.update(schema.rentalContracts).set({ ...contract, updatedAt: now() }).where(eq(schema.rentalContracts.id, id)).returning();
    return updated;
  }

  // Rental Payments
  async getRentalPayment(id: string): Promise<RentalPayment | undefined> {
    const [payment] = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.id, id));
    return payment;
  }

  async getRentalPaymentsByTenant(tenantId: string, filters?: { status?: string; month?: string }): Promise<RentalPayment[]> {
    const conditions = [eq(schema.rentalPayments.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(schema.rentalPayments.status, filters.status));
    if (filters?.month) conditions.push(eq(schema.rentalPayments.referenceMonth, filters.month));

    return db.select().from(schema.rentalPayments).where(and(...conditions)).orderBy(desc(schema.rentalPayments.dueDate));
  }

  async getRentalPaymentsByContract(contractId: string): Promise<RentalPayment[]> {
    return db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.rentalContractId, contractId)).orderBy(desc(schema.rentalPayments.dueDate));
  }

  async createRentalPayment(payment: InsertRentalPayment): Promise<RentalPayment> {
    const id = generateId();
    const [created] = await db.insert(schema.rentalPayments).values({ ...payment, id, createdAt: now() }).returning();
    return created;
  }

  async updateRentalPayment(id: string, payment: Partial<InsertRentalPayment>): Promise<RentalPayment | undefined> {
    const [updated] = await db.update(schema.rentalPayments).set(payment).where(eq(schema.rentalPayments.id, id)).returning();
    return updated;
  }

  // Reports
  async getRentalReportData(tenantId: string, startDate: Date, endDate: Date): Promise<any> {
    const payments = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.tenantId, tenantId));

    const filteredPayments = payments.filter((p: any) => {
      const dueDate = new Date(p.dueDate);
      return dueDate >= startDate && dueDate <= endDate;
    });

    const totalReceived = filteredPayments.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.paidValue || 0), 0);
    const totalPending = filteredPayments.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + Number(p.totalValue || 0), 0);
    const nowDate = new Date();
    const totalOverdue = filteredPayments.filter((p: any) => p.status === 'pending' && new Date(p.dueDate) < nowDate).reduce((sum: number, p: any) => sum + Number(p.totalValue || 0), 0);

    const contracts = await db.select().from(schema.rentalContracts).where(and(eq(schema.rentalContracts.tenantId, tenantId), eq(schema.rentalContracts.status, 'active')));
    const properties = await db.select().from(schema.properties).where(and(eq(schema.properties.tenantId, tenantId), eq(schema.properties.category, 'rent')));

    return {
      totalReceived,
      totalPending,
      totalOverdue,
      paymentsByMonth: [],
      occupancyRate: properties.length > 0 ? Math.round((contracts.length / properties.length) * 100) : 0,
      activeContracts: contracts.length,
    };
  }

  // Sale Proposals
  async getSaleProposal(id: string): Promise<SaleProposal | undefined> {
    const [proposal] = await db.select().from(schema.saleProposals).where(eq(schema.saleProposals.id, id));
    return proposal;
  }

  async getSaleProposalsByTenant(tenantId: string): Promise<SaleProposal[]> {
    return db.select().from(schema.saleProposals).where(eq(schema.saleProposals.tenantId, tenantId)).orderBy(desc(schema.saleProposals.createdAt));
  }

  async getSaleProposalsByProperty(propertyId: string): Promise<SaleProposal[]> {
    return db.select().from(schema.saleProposals).where(eq(schema.saleProposals.propertyId, propertyId)).orderBy(desc(schema.saleProposals.createdAt));
  }

  async createSaleProposal(proposal: InsertSaleProposal): Promise<SaleProposal> {
    const id = generateId();
    const [created] = await db.insert(schema.saleProposals).values({ ...proposal, id, createdAt: now(), updatedAt: now() }).returning();
    return created;
  }

  async updateSaleProposal(id: string, proposal: Partial<InsertSaleProposal>): Promise<SaleProposal | undefined> {
    const [updated] = await db.update(schema.saleProposals).set({ ...proposal, updatedAt: now() }).where(eq(schema.saleProposals.id, id)).returning();
    return updated;
  }

  async deleteSaleProposal(id: string): Promise<boolean> {
    await db.delete(schema.saleProposals).where(eq(schema.saleProposals.id, id));
    return true;
  }

  // Property Sales
  async getPropertySale(id: string): Promise<PropertySale | undefined> {
    const [sale] = await db.select().from(schema.propertySales).where(eq(schema.propertySales.id, id));
    return sale;
  }

  async getPropertySalesByTenant(tenantId: string): Promise<PropertySale[]> {
    return db.select().from(schema.propertySales).where(eq(schema.propertySales.tenantId, tenantId)).orderBy(desc(schema.propertySales.saleDate));
  }

  async createPropertySale(sale: InsertPropertySale): Promise<PropertySale> {
    const id = generateId();
    const [created] = await db.insert(schema.propertySales).values({ ...sale, id, createdAt: now(), updatedAt: now() }).returning();
    return created;
  }

  async updatePropertySale(id: string, sale: Partial<InsertPropertySale>): Promise<PropertySale | undefined> {
    const [updated] = await db.update(schema.propertySales).set({ ...sale, updatedAt: now() }).where(eq(schema.propertySales.id, id)).returning();
    return updated;
  }

  // Finance Categories
  async getFinanceCategory(id: string): Promise<FinanceCategory | undefined> {
    const [category] = await db.select().from(schema.financeCategories).where(eq(schema.financeCategories.id, id));
    return category;
  }

  async getFinanceCategoriesByTenant(tenantId: string): Promise<FinanceCategory[]> {
    return db.select().from(schema.financeCategories).where(eq(schema.financeCategories.tenantId, tenantId)).orderBy(schema.financeCategories.name);
  }

  async createFinanceCategory(category: InsertFinanceCategory): Promise<FinanceCategory> {
    const id = generateId();
    const [created] = await db.insert(schema.financeCategories).values({ ...category, id, createdAt: now() }).returning();
    return created;
  }

  async updateFinanceCategory(id: string, category: Partial<InsertFinanceCategory>): Promise<FinanceCategory | undefined> {
    const [updated] = await db.update(schema.financeCategories).set(category).where(eq(schema.financeCategories.id, id)).returning();
    return updated;
  }

  async deleteFinanceCategory(id: string): Promise<boolean> {
    await db.delete(schema.financeCategories).where(eq(schema.financeCategories.id, id));
    return true;
  }

  // Finance Entries
  async getFinanceEntry(id: string): Promise<FinanceEntry | undefined> {
    const [entry] = await db.select().from(schema.financeEntries).where(eq(schema.financeEntries.id, id));
    return entry;
  }

  async getFinanceEntriesByTenant(tenantId: string, filters?: { startDate?: Date; endDate?: Date; flow?: string; categoryId?: string }): Promise<FinanceEntry[]> {
    const conditions = [eq(schema.financeEntries.tenantId, tenantId)];
    if (filters?.flow) conditions.push(eq(schema.financeEntries.flow, filters.flow));
    if (filters?.categoryId) conditions.push(eq(schema.financeEntries.categoryId, filters.categoryId));

    let entries = await db.select().from(schema.financeEntries).where(and(...conditions)).orderBy(desc(schema.financeEntries.entryDate));

    if (filters?.startDate || filters?.endDate) {
      entries = entries.filter((e: any) => {
        const entryDate = new Date(e.entryDate);
        if (filters.startDate && entryDate < filters.startDate) return false;
        if (filters.endDate && entryDate > filters.endDate) return false;
        return true;
      });
    }

    return entries;
  }

  async createFinanceEntry(entry: InsertFinanceEntry): Promise<FinanceEntry> {
    const id = generateId();
    const [created] = await db.insert(schema.financeEntries).values({ ...entry, id, createdAt: now() }).returning();
    return created;
  }

  async updateFinanceEntry(id: string, entry: Partial<InsertFinanceEntry>): Promise<FinanceEntry | undefined> {
    const [updated] = await db.update(schema.financeEntries).set(entry).where(eq(schema.financeEntries.id, id)).returning();
    return updated;
  }

  async deleteFinanceEntry(id: string): Promise<boolean> {
    await db.delete(schema.financeEntries).where(eq(schema.financeEntries.id, id));
    return true;
  }

  // Lead Tags
  async getLeadTag(id: string): Promise<LeadTag | undefined> {
    const [tag] = await db.select().from(schema.leadTags).where(eq(schema.leadTags.id, id));
    return tag;
  }

  async getLeadTagsByTenant(tenantId: string): Promise<LeadTag[]> {
    return db.select().from(schema.leadTags).where(eq(schema.leadTags.tenantId, tenantId)).orderBy(schema.leadTags.name);
  }

  async createLeadTag(tag: InsertLeadTag): Promise<LeadTag> {
    const id = generateId();
    const [created] = await db.insert(schema.leadTags).values({ ...tag, id, createdAt: now() }).returning();
    return created;
  }

  async updateLeadTag(id: string, tag: Partial<InsertLeadTag>): Promise<LeadTag | undefined> {
    const [updated] = await db.update(schema.leadTags).set(tag).where(eq(schema.leadTags.id, id)).returning();
    return updated;
  }

  async deleteLeadTag(id: string): Promise<boolean> {
    await db.delete(schema.leadTagLinks).where(eq(schema.leadTagLinks.tagId, id));
    await db.delete(schema.leadTags).where(eq(schema.leadTags.id, id));
    return true;
  }

  // Lead Tag Links
  async getTagsByLead(leadId: string): Promise<LeadTag[]> {
    const links = await db.select().from(schema.leadTagLinks).where(eq(schema.leadTagLinks.leadId, leadId));
    if (links.length === 0) return [];
    const tagIds = links.map((l: any) => l.tagId) as string[];
    return db.select().from(schema.leadTags).where(inArray(schema.leadTags.id as any, tagIds));
  }

  async getTagsForAllLeads(tenantId: string): Promise<Record<string, LeadTag[]>> {
    const leads = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.tenantId, tenantId));
    if (leads.length === 0) return {};

    const leadIds = leads.map((l: any) => l.id) as string[];
    const links = await db.select().from(schema.leadTagLinks).where(inArray(schema.leadTagLinks.leadId as any, leadIds));
    if (links.length === 0) return {};

    const tagIds = Array.from(new Set(links.map((l: any) => l.tagId))) as string[];
    const tags = await db.select().from(schema.leadTags).where(inArray(schema.leadTags.id as any, tagIds));
    const tagsById = new Map(tags.map((t: any) => [t.id, t]));

    const result: Record<string, LeadTag[]> = {};
    for (const link of links) {
      const tag = tagsById.get((link as any).tagId);
      if (tag) {
        if (!result[(link as any).leadId]) result[(link as any).leadId] = [];
        result[(link as any).leadId].push(tag as LeadTag);
      }
    }
    return result;
  }

  async addTagToLead(link: InsertLeadTagLink): Promise<LeadTagLink> {
    const id = generateId();
    const [created] = await db.insert(schema.leadTagLinks).values({ ...link, id, createdAt: now() }).returning();
    return created;
  }

  async removeTagFromLead(leadId: string, tagId: string): Promise<boolean> {
    await db.delete(schema.leadTagLinks).where(and(eq(schema.leadTagLinks.leadId, leadId), eq(schema.leadTagLinks.tagId, tagId)));
    return true;
  }

  // Follow-ups
  async getFollowUp(id: string): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(schema.followUps).where(eq(schema.followUps.id, id));
    return followUp;
  }

  async getFollowUpsByTenant(tenantId: string, filters?: { status?: string }): Promise<FollowUp[]> {
    const conditions = [eq(schema.followUps.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(schema.followUps.status, filters.status));
    return db.select().from(schema.followUps).where(and(...conditions)).orderBy(schema.followUps.dueAt);
  }

  async getFollowUpsByLead(leadId: string): Promise<FollowUp[]> {
    return db.select().from(schema.followUps).where(eq(schema.followUps.leadId, leadId)).orderBy(desc(schema.followUps.dueAt));
  }

  async createFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const id = generateId();
    const [created] = await db.insert(schema.followUps).values({ ...followUp, id, createdAt: now() }).returning();
    return created;
  }

  async updateFollowUp(id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined> {
    const [updated] = await db.update(schema.followUps).set(followUp).where(eq(schema.followUps.id, id)).returning();
    return updated;
  }

  async deleteFollowUp(id: string): Promise<boolean> {
    await db.delete(schema.followUps).where(eq(schema.followUps.id, id));
    return true;
  }

  // Reports
  async getOwnerReport(tenantId: string, filters?: { ownerId?: string; startDate?: Date; endDate?: Date }): Promise<any> {
    const owners = await this.getOwnersByTenant(tenantId);
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const payments = await this.getRentalPaymentsByTenant(tenantId);

    const ownerReports = [];
    const filteredOwners = filters?.ownerId
      ? owners.filter(o => o.id === filters.ownerId)
      : owners;

    for (const owner of filteredOwners) {
      const ownerContracts = contracts.filter(c => c.ownerId === owner.id);
      const contractIds = ownerContracts.map(c => c.id);
      const ownerPayments = payments.filter(p => contractIds.includes(p.rentalContractId));

      let filteredPayments = ownerPayments;
      if (filters?.startDate || filters?.endDate) {
        filteredPayments = ownerPayments.filter(p => {
          const dueDate = new Date(p.dueDate);
          if (filters.startDate && dueDate < filters.startDate) return false;
          if (filters.endDate && dueDate > filters.endDate) return false;
          return true;
        });
      }

      const totalReceived = filteredPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
      const totalPending = filteredPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

      ownerReports.push({
        owner,
        contractsCount: ownerContracts.length,
        totalReceived,
        totalPending,
        payments: filteredPayments,
      });
    }

    return ownerReports;
  }

  async getRenterReport(tenantId: string, filters?: { renterId?: string; startDate?: Date; endDate?: Date }): Promise<any> {
    const renters = await this.getRentersByTenant(tenantId);
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const payments = await this.getRentalPaymentsByTenant(tenantId);

    const renterReports = [];
    const filteredRenters = filters?.renterId
      ? renters.filter(r => r.id === filters.renterId)
      : renters;

    for (const renter of filteredRenters) {
      const renterContracts = contracts.filter(c => c.renterId === renter.id);
      const contractIds = renterContracts.map(c => c.id);
      const renterPayments = payments.filter(p => contractIds.includes(p.rentalContractId));

      let filteredPayments = renterPayments;
      if (filters?.startDate || filters?.endDate) {
        filteredPayments = renterPayments.filter(p => {
          const dueDate = new Date(p.dueDate);
          if (filters.startDate && dueDate < filters.startDate) return false;
          if (filters.endDate && dueDate > filters.endDate) return false;
          return true;
        });
      }

      const totalPaid = filteredPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
      const totalPending = filteredPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
      const nowDate = new Date();
      const totalOverdue = filteredPayments
        .filter(p => p.status === 'pending' && new Date(p.dueDate) < nowDate)
        .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

      renterReports.push({
        renter,
        contractsCount: renterContracts.length,
        totalPaid,
        totalPending,
        totalOverdue,
        payments: filteredPayments,
      });
    }

    return renterReports;
  }

  async getPaymentDetailedReport(tenantId: string, filters?: { ownerId?: string; renterId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<any> {
    const payments = await this.getRentalPaymentsByTenant(tenantId, { status: filters?.status });
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const owners = await this.getOwnersByTenant(tenantId);
    const renters = await this.getRentersByTenant(tenantId);
    const properties = await this.getPropertiesByTenant(tenantId);

    const contractsMap = new Map(contracts.map(c => [c.id, c]));
    const ownersMap = new Map(owners.map(o => [o.id, o]));
    const rentersMap = new Map(renters.map(r => [r.id, r]));
    const propertiesMap = new Map(properties.map(p => [p.id, p]));

    let filteredPayments = payments;

    // Filter by owner
    if (filters?.ownerId) {
      const ownerContractIds = contracts
        .filter(c => c.ownerId === filters.ownerId)
        .map(c => c.id);
      filteredPayments = filteredPayments.filter(p => ownerContractIds.includes(p.rentalContractId));
    }

    // Filter by renter
    if (filters?.renterId) {
      const renterContractIds = contracts
        .filter(c => c.renterId === filters.renterId)
        .map(c => c.id);
      filteredPayments = filteredPayments.filter(p => renterContractIds.includes(p.rentalContractId));
    }

    // Filter by date
    if (filters?.startDate || filters?.endDate) {
      filteredPayments = filteredPayments.filter(p => {
        const dueDate = new Date(p.dueDate);
        if (filters.startDate && dueDate < filters.startDate) return false;
        if (filters.endDate && dueDate > filters.endDate) return false;
        return true;
      });
    }

    // Enrich payments with related data
    const enrichedPayments = filteredPayments.map(payment => {
      const contract = contractsMap.get(payment.rentalContractId);
      return {
        ...payment,
        contract,
        owner: contract ? ownersMap.get(contract.ownerId) : null,
        renter: contract ? rentersMap.get(contract.renterId) : null,
        property: contract ? propertiesMap.get(contract.propertyId) : null,
      };
    });

    const totalReceived = enrichedPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
    const totalPending = enrichedPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    return {
      payments: enrichedPayments,
      summary: {
        total: enrichedPayments.length,
        totalReceived,
        totalPending,
      },
    };
  }

  async getOverdueReport(tenantId: string): Promise<any> {
    const payments = await this.getRentalPaymentsByTenant(tenantId, { status: 'pending' });
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const owners = await this.getOwnersByTenant(tenantId);
    const renters = await this.getRentersByTenant(tenantId);
    const properties = await this.getPropertiesByTenant(tenantId);

    const contractsMap = new Map(contracts.map(c => [c.id, c]));
    const ownersMap = new Map(owners.map(o => [o.id, o]));
    const rentersMap = new Map(renters.map(r => [r.id, r]));
    const propertiesMap = new Map(properties.map(p => [p.id, p]));

    const nowDate = new Date();
    const overduePayments = payments.filter(p => new Date(p.dueDate) < nowDate);

    const enrichedPayments = overduePayments.map(payment => {
      const contract = contractsMap.get(payment.rentalContractId);
      const dueDate = new Date(payment.dueDate);
      const daysOverdue = Math.floor((nowDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...payment,
        daysOverdue,
        contract,
        owner: contract ? ownersMap.get(contract.ownerId) : null,
        renter: contract ? rentersMap.get(contract.renterId) : null,
        property: contract ? propertiesMap.get(contract.propertyId) : null,
      };
    });

    // Sort by days overdue (descending)
    enrichedPayments.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalOverdue = enrichedPayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    return {
      payments: enrichedPayments,
      summary: {
        count: enrichedPayments.length,
        totalOverdue,
      },
    };
  }

  // Property Matching
  async getMatchedProperties(leadId: string, tenantId: string): Promise<{ property: Property; score: number; matchReasons: string[] }[]> {
    const lead = await this.getLead(leadId);
    if (!lead || lead.tenantId !== tenantId) return [];

    const properties = await this.getPropertiesByTenant(lead.tenantId, { status: "available" });

    const results: { property: Property; score: number; matchReasons: string[] }[] = [];

    for (const property of properties) {
      let score = 0;
      const matchReasons: string[] = [];

      // Price/Budget match
      const budget = lead.budget ? parseFloat(lead.budget) : null;
      const price = property.price ? parseFloat(property.price) : null;
      if (budget && !isNaN(budget) && price && !isNaN(price)) {
        if (price <= budget) {
          score += 40;
          matchReasons.push("Dentro do orçamento");
        } else if (price <= budget * 1.2) {
          score += 20;
          matchReasons.push("Próximo ao orçamento");
        }
      }

      // Type match
      if (lead.preferredType && lead.preferredType === property.type) {
        score += 20;
        matchReasons.push(`Tipo: ${property.type}`);
      }

      // Category match
      if (lead.preferredCategory && lead.preferredCategory === property.category) {
        score += 15;
        matchReasons.push(`Categoria: ${property.category}`);
      }

      // City match
      if (lead.preferredCity && property.city?.toLowerCase().includes(lead.preferredCity.toLowerCase())) {
        score += 15;
        matchReasons.push(`Cidade: ${property.city}`);
      }

      // Bedrooms match
      if (property.bedrooms) {
        const minBed = lead.minBedrooms || 0;
        const maxBed = lead.maxBedrooms || 99;
        if (property.bedrooms >= minBed && property.bedrooms <= maxBed) {
          score += 10;
          matchReasons.push(`${property.bedrooms} quartos`);
        }
      }

      if (score > 0) {
        results.push({ property, score, matchReasons });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // Rental Transfers (Repasses)
  async getRentalTransfer(id: string): Promise<RentalTransfer | undefined> {
    const [transfer] = await db.select().from(schema.rentalTransfers).where(eq(schema.rentalTransfers.id, id));
    return transfer;
  }

  async getRentalTransfersByTenant(tenantId: string, filters?: { ownerId?: string; status?: string; referenceMonth?: string }): Promise<RentalTransfer[]> {
    const conditions = [eq(schema.rentalTransfers.tenantId, tenantId)];
    if (filters?.ownerId) conditions.push(eq(schema.rentalTransfers.ownerId, filters.ownerId));
    if (filters?.status) conditions.push(eq(schema.rentalTransfers.status, filters.status));
    if (filters?.referenceMonth) conditions.push(eq(schema.rentalTransfers.referenceMonth, filters.referenceMonth));

    return db.select().from(schema.rentalTransfers).where(and(...conditions)).orderBy(desc(schema.rentalTransfers.createdAt));
  }

  async getRentalTransfersByOwner(ownerId: string): Promise<RentalTransfer[]> {
    return db.select().from(schema.rentalTransfers).where(eq(schema.rentalTransfers.ownerId, ownerId)).orderBy(desc(schema.rentalTransfers.createdAt));
  }

  async createRentalTransfer(transfer: InsertRentalTransfer): Promise<RentalTransfer> {
    const id = generateId();
    const [created] = await db.insert(schema.rentalTransfers).values({ ...transfer, id, createdAt: now() }).returning();
    return created;
  }

  async updateRentalTransfer(id: string, transfer: Partial<InsertRentalTransfer>): Promise<RentalTransfer | undefined> {
    const [updated] = await db.update(schema.rentalTransfers).set(transfer).where(eq(schema.rentalTransfers.id, id)).returning();
    return updated;
  }

  async deleteRentalTransfer(id: string): Promise<boolean> {
    await db.delete(schema.rentalTransfers).where(eq(schema.rentalTransfers.id, id));
    return true;
  }

  async generateTransfersForMonth(tenantId: string, referenceMonth: string): Promise<RentalTransfer[]> {
    const owners = await this.getOwnersByTenant(tenantId);
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const payments = await this.getRentalPaymentsByTenant(tenantId, { status: 'paid', month: referenceMonth });

    const generatedTransfers: RentalTransfer[] = [];

    for (const owner of owners) {
      const ownerContracts = contracts.filter(c => c.ownerId === owner.id && c.status === 'active');
      if (ownerContracts.length === 0) continue;

      const contractIds = ownerContracts.map(c => c.id);
      const ownerPayments = payments.filter(p => contractIds.includes(p.rentalContractId));

      if (ownerPayments.length === 0) continue;

      // Calculate totals
      const grossAmount = ownerPayments.reduce((sum, p) => sum + Number(p.paidValue || 0), 0);

      // Calculate admin fee based on contracts' administration fee percentage
      let adminFeeTotal = 0;
      for (const payment of ownerPayments) {
        const contract = ownerContracts.find(c => c.id === payment.rentalContractId);
        if (contract) {
          const adminFeePercentage = Number(contract.administrationFee || 10) / 100;
          adminFeeTotal += Number(payment.paidValue || 0) * adminFeePercentage;
        }
      }

      const netAmount = grossAmount - adminFeeTotal;

      // Check if transfer already exists for this owner and month
      const existingTransfers = await this.getRentalTransfersByTenant(tenantId, { ownerId: owner.id, referenceMonth });
      if (existingTransfers.length > 0) continue;

      const transfer = await this.createRentalTransfer({
        tenantId,
        ownerId: owner.id,
        referenceMonth,
        grossAmount: grossAmount.toString(),
        administrationFee: adminFeeTotal.toString(),
        maintenanceDeductions: "0",
        otherDeductions: "0",
        netAmount: netAmount.toString(),
        status: 'pending',
      });

      generatedTransfers.push(transfer);
    }

    return generatedTransfers;
  }

  // Rental Metrics
  async getRentalMetrics(tenantId: string): Promise<{
    activeContracts: number;
    vacantProperties: number;
    delinquencyValue: number;
    delinquencyPercentage: number;
    pendingTransfers: number;
    contractsExpiringThisMonth: number;
    contractsAdjustingThisMonth: number;
    monthlyRecurringRevenue: number;
  }> {
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const properties = await this.getPropertiesByTenant(tenantId, { category: 'rent' });
    const payments = await this.getRentalPaymentsByTenant(tenantId);
    const transfers = await this.getRentalTransfersByTenant(tenantId, { status: 'pending' });

    const nowDate = new Date();
    const currentMonth = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Active contracts
    const activeContracts = contracts.filter(c => c.status === 'active');

    // Vacant properties (properties for rent without active contracts)
    const rentedPropertyIds = new Set(activeContracts.map(c => c.propertyId));
    const vacantProperties = properties.filter(p => !rentedPropertyIds.has(p.id) && p.status === 'available');

    // Monthly recurring revenue
    const monthlyRecurringRevenue = activeContracts.reduce((sum, c) => {
      return sum + Number(c.rentValue || 0) + Number(c.condoFee || 0) + Number(c.iptuValue || 0);
    }, 0);

    // Delinquency - overdue pending payments
    const overduePayments = payments.filter(p => p.status === 'pending' && new Date(p.dueDate) < nowDate);
    const delinquencyValue = overduePayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const totalPendingValue = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const delinquencyPercentage = totalPendingValue > 0 ? Math.round((delinquencyValue / totalPendingValue) * 100) : 0;

    // Contracts expiring this month
    const contractsExpiringThisMonth = activeContracts.filter(c => {
      const endDate = new Date(c.endDate);
      return endDate >= startOfMonth && endDate <= endOfMonth;
    }).length;

    // Contracts adjusting this month (contracts that started a year ago in this month)
    const contractsAdjustingThisMonth = activeContracts.filter(c => {
      const startDate = new Date(c.startDate);
      const adjustMonth = startDate.getMonth();
      return adjustMonth === currentMonth;
    }).length;

    return {
      activeContracts: activeContracts.length,
      vacantProperties: vacantProperties.length,
      delinquencyValue,
      delinquencyPercentage,
      pendingTransfers: transfers.length,
      contractsExpiringThisMonth,
      contractsAdjustingThisMonth,
      monthlyRecurringRevenue,
    };
  }

  async getRentalMetricsChart(tenantId: string, period: 'currentMonth' | 'lastMonth' | 'year'): Promise<{ month: string; revenue: number; delinquency: number }[]> {
    const payments = await this.getRentalPaymentsByTenant(tenantId);
    const nowDate = new Date();

    let startDate: Date;
    let endDate: Date = nowDate;

    if (period === 'currentMonth') {
      startDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    } else if (period === 'lastMonth') {
      startDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
      endDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0);
    } else {
      startDate = new Date(nowDate.getFullYear(), 0, 1);
    }

    // Group payments by month
    const monthlyData: Map<string, { revenue: number; delinquency: number }> = new Map();

    // Initialize months
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, { revenue: 0, delinquency: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Process payments
    for (const payment of payments) {
      const dueDate = new Date(payment.dueDate);
      if (dueDate < startDate || dueDate > endDate) continue;

      const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(monthKey);
      if (!data) continue;

      if (payment.status === 'paid') {
        data.revenue += Number(payment.paidValue || 0);
      } else if (payment.status === 'pending' && dueDate < nowDate) {
        data.delinquency += Number(payment.totalValue || 0);
      }
    }

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      delinquency: data.delinquency,
    }));
  }

  async getRentalAlerts(tenantId: string): Promise<{
    paymentsDueToday: RentalPayment[];
    paymentsDueTomorrow: RentalPayment[];
    overduePayments: { payment: RentalPayment; daysOverdue: number }[];
    contractsExpiring: RentalContract[];
    contractsAdjusting: RentalContract[];
    vacantProperties: Property[];
  }> {
    const payments = await this.getRentalPaymentsByTenant(tenantId, { status: 'pending' });
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const properties = await this.getPropertiesByTenant(tenantId, { category: 'rent' });

    const nowDate = new Date();
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    // Payments due today
    const paymentsDueToday = payments.filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate.toDateString() === today.toDateString();
    });

    // Payments due tomorrow
    const paymentsDueTomorrow = payments.filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate.toDateString() === tomorrow.toDateString();
    });

    // Overdue payments
    const overduePayments = payments
      .filter(p => new Date(p.dueDate) < today)
      .map(p => {
        const dueDate = new Date(p.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return { payment: p, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Active contracts
    const activeContracts = contracts.filter(c => c.status === 'active');

    // Contracts expiring in next 30 days
    const contractsExpiring = activeContracts.filter(c => {
      const endDate = new Date(c.endDate);
      return endDate >= today && endDate <= in30Days;
    });

    // Contracts adjusting in next 30 days (based on start date anniversary)
    const contractsAdjusting = activeContracts.filter(c => {
      const startDate = new Date(c.startDate);
      const adjustmentDate = new Date(nowDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      // If adjustment date is in the past this year, it will be next year
      if (adjustmentDate < today) {
        adjustmentDate.setFullYear(adjustmentDate.getFullYear() + 1);
      }
      return adjustmentDate >= today && adjustmentDate <= in30Days;
    });

    // Vacant properties
    const rentedPropertyIds = new Set(activeContracts.map(c => c.propertyId));
    const vacantProperties = properties.filter(p => !rentedPropertyIds.has(p.id) && p.status === 'available');

    return {
      paymentsDueToday,
      paymentsDueTomorrow,
      overduePayments,
      contractsExpiring,
      contractsAdjusting,
      vacantProperties,
    };
  }

  async getOwnerStatement(ownerId: string, tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const owner = await this.getOwner(ownerId);
    if (!owner || owner.tenantId !== tenantId) return null;

    const contracts = await this.getRentalContractsByOwner(ownerId);
    const contractIds = contracts.map(c => c.id);
    const payments = await this.getRentalPaymentsByTenant(tenantId);
    const transfers = await this.getRentalTransfersByOwner(ownerId);
    const properties = await this.getPropertiesByTenant(tenantId);

    const propertiesMap = new Map(properties.map(p => [p.id, p]));

    // Filter payments by contract and date
    let ownerPayments = payments.filter(p => contractIds.includes(p.rentalContractId));
    if (startDate || endDate) {
      ownerPayments = ownerPayments.filter(p => {
        const dueDate = new Date(p.dueDate);
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;
        return true;
      });
    }

    // Enrich payments
    const enrichedPayments = ownerPayments.map(p => {
      const contract = contracts.find(c => c.id === p.rentalContractId);
      return {
        ...p,
        property: contract ? propertiesMap.get(contract.propertyId) : null,
      };
    });

    // Summary
    const totalReceived = enrichedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
    const totalPending = enrichedPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const totalTransferred = transfers.filter(t => t.status === 'paid').reduce((sum, t) => sum + Number(t.netAmount || 0), 0);
    const pendingTransfer = transfers.filter(t => t.status === 'pending').reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

    return {
      owner,
      contracts,
      payments: enrichedPayments,
      transfers,
      summary: {
        totalReceived,
        totalPending,
        totalTransferred,
        pendingTransfer,
        activeContracts: contracts.filter(c => c.status === 'active').length,
      },
    };
  }

  async getRenterPaymentHistory(renterId: string, tenantId: string): Promise<any> {
    const renter = await this.getRenter(renterId);
    if (!renter || renter.tenantId !== tenantId) return null;

    const contracts = await this.getRentalContractsByRenter(renterId);
    const contractIds = contracts.map(c => c.id);
    const payments = await this.getRentalPaymentsByTenant(tenantId);
    const properties = await this.getPropertiesByTenant(tenantId);
    const owners = await this.getOwnersByTenant(tenantId);

    const propertiesMap = new Map(properties.map(p => [p.id, p]));
    const ownersMap = new Map(owners.map(o => [o.id, o]));

    const renterPayments = payments.filter(p => contractIds.includes(p.rentalContractId));

    // Enrich payments
    const enrichedPayments = renterPayments.map(p => {
      const contract = contracts.find(c => c.id === p.rentalContractId);
      const dueDate = new Date(p.dueDate);
      const paidDate = p.paidDate ? new Date(p.paidDate) : null;
      const daysLate = p.status === 'paid' && paidDate ? Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      return {
        ...p,
        daysLate,
        property: contract ? propertiesMap.get(contract.propertyId) : null,
        owner: contract ? ownersMap.get(contract.ownerId) : null,
      };
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    // Summary
    const totalPaid = enrichedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
    const totalPending = enrichedPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
    const avgDaysLate = enrichedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.daysLate, 0) / enrichedPayments.filter(p => p.status === 'paid').length || 0;
    const nowDate = new Date();
    const overdueCount = enrichedPayments.filter(p => p.status === 'pending' && new Date(p.dueDate) < nowDate).length;

    return {
      renter,
      contracts,
      payments: enrichedPayments,
      summary: {
        totalPaid,
        totalPending,
        avgDaysLate: Math.round(avgDaysLate),
        overdueCount,
        paymentCount: enrichedPayments.length,
        onTimePayments: enrichedPayments.filter(p => p.status === 'paid' && p.daysLate === 0).length,
      },
    };
  }

  // ===== FINANCIAL MODULE METHODS =====

  async getFinancialMetrics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    previousPeriodStart?: Date,
    previousPeriodEnd?: Date
  ): Promise<{
    commissionsReceived: number;
    ownerTransfers: number;
    rentalRevenue: number;
    salesRevenue: number;
    operationalExpenses: number;
    cashBalance: number;
    periodVariation: number;
  }> {
    // Get all financial entries for the period
    const entries = await this.getFinanceEntriesByTenant(tenantId, { startDate, endDate });
    const previousEntries = previousPeriodStart && previousPeriodEnd
      ? await this.getFinanceEntriesByTenant(tenantId, { startDate: previousPeriodStart, endDate: previousPeriodEnd })
      : [];

    // Get rental payments
    const rentalPayments = await this.getRentalPaymentsByTenant(tenantId);
    const filteredRentalPayments = rentalPayments.filter(p => {
      const paidDate = p.paidDate ? new Date(p.paidDate) : null;
      if (!paidDate || p.status !== 'paid') return false;
      if (startDate && paidDate < startDate) return false;
      if (endDate && paidDate > endDate) return false;
      return true;
    });

    // Get property sales
    const sales = await this.getPropertySalesByTenant(tenantId);
    const filteredSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });

    // Get transfers
    const transfers = await this.getRentalTransfersByTenant(tenantId);
    const filteredTransfers = transfers.filter(t => {
      const paidDate = t.paidDate ? new Date(t.paidDate) : null;
      if (!paidDate || t.status !== 'paid') return false;
      if (startDate && paidDate < startDate) return false;
      if (endDate && paidDate > endDate) return false;
      return true;
    });

    // Calculate metrics
    const commissionsReceived = filteredSales.reduce((sum, s) =>
      sum + Number(s.commissionValue || 0), 0
    );

    const ownerTransfers = filteredTransfers.reduce((sum, t) =>
      sum + Number(t.netAmount || 0), 0
    );

    const rentalRevenue = filteredRentalPayments.reduce((sum, p) =>
      sum + Number(p.paidValue || 0), 0
    );

    const salesRevenue = filteredSales.reduce((sum, s) =>
      sum + Number(s.saleValue || 0), 0
    );

    const operationalExpenses = entries
      .filter(e => e.flow === 'out' && e.status === 'completed')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalRevenue = commissionsReceived + (rentalRevenue - ownerTransfers);
    const cashBalance = totalRevenue - operationalExpenses;

    // Calculate period variation
    let periodVariation = 0;
    if (previousEntries.length > 0) {
      const previousRevenue = previousEntries
        .filter(e => e.flow === 'in' && e.status === 'completed')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const previousExpenses = previousEntries
        .filter(e => e.flow === 'out' && e.status === 'completed')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const previousBalance = previousRevenue - previousExpenses;

      if (previousBalance > 0) {
        periodVariation = ((cashBalance - previousBalance) / previousBalance) * 100;
      }
    }

    return {
      commissionsReceived,
      ownerTransfers,
      rentalRevenue,
      salesRevenue,
      operationalExpenses,
      cashBalance,
      periodVariation: Math.round(periodVariation * 10) / 10,
    };
  }

  async getFinancialTransactions(
    tenantId: string,
    filters?: {
      type?: string;
      category?: string;
      status?: string;
      origin?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    // Get finance entries
    let entries = await this.getFinanceEntriesByTenant(tenantId, {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      categoryId: filters?.category,
    });

    // Filter by type
    if (filters?.type && filters.type !== 'general') {
      entries = entries.filter((e: any) => {
        if (!e.originType) return false;

        if (filters.type === 'sales') return e.originType === 'sale';
        if (filters.type === 'rentals') return e.originType === 'rental';
        if (filters.type === 'transfers') return e.originType === 'transfer';
        if (filters.type === 'commissions') return e.originType === 'commission';

        return true;
      });
    }

    // Filter by status
    if (filters?.status) {
      entries = entries.filter(e => e.status === filters.status);
    }

    // Get related data for enrichment
    const categories = await this.getFinanceCategoriesByTenant(tenantId);
    const categoriesMap = new Map(categories.map(c => [c.id, c]));

    // Enrich entries
    return entries.map(entry => ({
      ...entry,
      category: entry.categoryId ? categoriesMap.get(entry.categoryId) : null,
      type: entry.flow === 'in' ? 'receita' : 'despesa',
    }));
  }

  async getFinancialChartData(
    tenantId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<{
    byMonth: { month: string; revenue: number; expenses: number }[];
    byCategory: { category: string; amount: number; type: string }[];
    byOrigin: { origin: string; amount: number }[];
  }> {
    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3 - 3, 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const entries = await this.getFinanceEntriesByTenant(tenantId, {
      startDate,
      endDate: now,
    });

    const categories = await this.getFinanceCategoriesByTenant(tenantId);
    const categoriesMap = new Map(categories.map(c => [c.id, c]));

    // Group by month
    const byMonthMap = new Map<string, { revenue: number; expenses: number }>();
    const byCategoryMap = new Map<string, { amount: number; type: string }>();
    const byOriginMap = new Map<string, number>();

    entries.forEach(entry => {
      // By month
      const monthKey = entry.entryDate.toString().substring(0, 7); // YYYY-MM
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { revenue: 0, expenses: 0 });
      }
      const monthData = byMonthMap.get(monthKey)!;
      if (entry.flow === 'in') {
        monthData.revenue += Number(entry.amount || 0);
      } else {
        monthData.expenses += Number(entry.amount || 0);
      }

      // By category
      if (entry.categoryId) {
        const category = categoriesMap.get(entry.categoryId);
        if (category) {
          const categoryKey = category.name;
          if (!byCategoryMap.has(categoryKey)) {
            byCategoryMap.set(categoryKey, { amount: 0, type: entry.flow });
          }
          const categoryData = byCategoryMap.get(categoryKey)!;
          categoryData.amount += Number(entry.amount || 0);
        }
      }

      // By origin
      if (entry.originType) {
        const originKey = entry.originType;
        byOriginMap.set(originKey, (byOriginMap.get(originKey) || 0) + Number(entry.amount || 0));
      }
    });

    return {
      byMonth: Array.from(byMonthMap.entries()).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
      })).sort((a, b) => a.month.localeCompare(b.month)),
      byCategory: Array.from(byCategoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        type: data.type,
      })),
      byOrigin: Array.from(byOriginMap.entries()).map(([origin, amount]) => ({
        origin,
        amount,
      })),
    };
  }

  // ===== SETTINGS MODULE METHODS =====

  // Tenant Settings
  async getTenantSettings(tenantId: string): Promise<TenantSettings | undefined> {
    const [settings] = await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, tenantId));
    return settings;
  }

  async createOrUpdateTenantSettings(tenantId: string, data: Partial<InsertTenantSettings>): Promise<TenantSettings> {
    const existing = await this.getTenantSettings(tenantId);

    if (existing) {
      const [updated] = await db.update(schema.tenantSettings)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.tenantSettings.tenantId, tenantId))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const [created] = await db.insert(schema.tenantSettings)
        .values({ ...data, id, tenantId, updatedAt: now() } as any)
        .returning();
      return created;
    }
  }

  // AI Settings
  async getAiSettings(tenantId: string): Promise<AISettings | undefined> {
    const [settings] = await db.select().from(schema.aiSettings).where(eq(schema.aiSettings.tenantId, tenantId));
    return settings;
  }

  async createOrUpdateAiSettings(tenantId: string, data: Partial<InsertAISettings>): Promise<AISettings> {
    const existing = await this.getAiSettings(tenantId);

    if (existing) {
      const [updated] = await db.update(schema.aiSettings)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.aiSettings.tenantId, tenantId))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const [created] = await db.insert(schema.aiSettings)
        .values({ ...data, id, tenantId, updatedAt: now() } as any)
        .returning();
      return created;
    }
  }

  // Brand Settings
  async getBrandSettings(tenantId: string): Promise<any | undefined> {
    const [settings] = await db.select().from(schema.brandSettings).where(eq(schema.brandSettings.tenantId, tenantId));
    return settings;
  }

  async createOrUpdateBrandSettings(tenantId: string, data: any): Promise<any> {
    const existing = await this.getBrandSettings(tenantId);

    if (existing) {
      const [updated] = await db.update(schema.brandSettings)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.brandSettings.tenantId, tenantId))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const [created] = await db.insert(schema.brandSettings)
        .values({ ...data, id, tenantId, updatedAt: now() } as any)
        .returning();
      return created;
    }
  }

  // Backward compatibility aliases
  async getAISettings(tenantId: string): Promise<AISettings | undefined> {
    return this.getAiSettings(tenantId);
  }

  async createOrUpdateAISettings(tenantId: string, data: Partial<InsertAISettings>): Promise<AISettings> {
    return this.createOrUpdateAiSettings(tenantId, data);
  }

  // User Roles
  async getUserRolesByTenant(tenantId: string): Promise<UserRole[]> {
    return db.select().from(schema.userRoles).where(eq(schema.userRoles.tenantId, tenantId));
  }

  async getUserRole(id: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(schema.userRoles).where(eq(schema.userRoles.id, id));
    return role;
  }

  async createUserRole(data: InsertUserRole): Promise<UserRole> {
    const id = generateId();
    const [created] = await db.insert(schema.userRoles)
      .values({ ...data, id, createdAt: now() })
      .returning();
    return created;
  }

  async updateUserRole(id: string, data: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    const [updated] = await db.update(schema.userRoles)
      .set(data)
      .where(eq(schema.userRoles.id, id))
      .returning();
    return updated;
  }

  async deleteUserRole(id: string): Promise<boolean> {
    await db.delete(schema.userRoles).where(eq(schema.userRoles.id, id));
    return true;
  }

  async seedDefaultRoles(tenantId: string): Promise<UserRole[]> {
    const existingRoles = await this.getUserRolesByTenant(tenantId);

    // Verifica se já existem roles do sistema para este tenant
    const systemRoles = existingRoles.filter(r => r.isSystemRole);
    if (systemRoles.length > 0) {
      return systemRoles;
    }

    // Define os roles padrão com a estrutura completa de permissões
    const defaultRoles = [
      {
        tenantId,
        name: 'Administrador',
        permissions: {
          properties: { view: true, create: true, edit: true, delete: true },
          leads: { view: true, create: true, edit: true, delete: true },
          calendar: { view: true, create: true, edit: true, delete: true },
          contracts: { view: true, create: true, edit: true, delete: true },
          sales: { view: true, create: true, edit: true, delete: true },
          rentals: { view: true, create: true, edit: true, delete: true },
          financial: { view: true, create: true, edit: true, delete: true, viewValues: true },
          reports: { view: true, export: true },
          settings: { view: true, edit: true, manageUsers: true },
        },
        isSystemRole: true
      },
      {
        tenantId,
        name: 'Gestor',
        permissions: {
          properties: { view: true, create: true, edit: true, delete: true },
          leads: { view: true, create: true, edit: true, delete: true },
          calendar: { view: true, create: true, edit: true, delete: true },
          contracts: { view: true, create: true, edit: true, delete: false },
          sales: { view: true, create: true, edit: true, delete: false },
          rentals: { view: true, create: true, edit: true, delete: false },
          financial: { view: true, create: true, edit: true, delete: false, viewValues: true },
          reports: { view: true, export: true },
          settings: { view: true, edit: false, manageUsers: false },
        },
        isSystemRole: true
      },
      {
        tenantId,
        name: 'Corretor',
        permissions: {
          properties: { view: true, create: true, edit: true, delete: false },
          leads: { view: true, create: true, edit: true, delete: false },
          calendar: { view: true, create: true, edit: true, delete: false },
          contracts: { view: true, create: false, edit: false, delete: false },
          sales: { view: true, create: true, edit: true, delete: false },
          rentals: { view: true, create: false, edit: false, delete: false },
          financial: { view: false, create: false, edit: false, delete: false, viewValues: false },
          reports: { view: true, export: false },
          settings: { view: false, edit: false, manageUsers: false },
        },
        isSystemRole: true
      },
      {
        tenantId,
        name: 'Financeiro',
        permissions: {
          properties: { view: true, create: false, edit: false, delete: false },
          leads: { view: true, create: false, edit: false, delete: false },
          calendar: { view: true, create: false, edit: false, delete: false },
          contracts: { view: true, create: false, edit: false, delete: false },
          sales: { view: true, create: false, edit: false, delete: false },
          rentals: { view: true, create: false, edit: true, delete: false },
          financial: { view: true, create: true, edit: true, delete: true, viewValues: true },
          reports: { view: true, export: true },
          settings: { view: false, edit: false, manageUsers: false },
        },
        isSystemRole: true
      }
    ];

    const createdRoles: UserRole[] = [];
    for (const roleData of defaultRoles) {
      // Serialize permissions to JSON string for SQLite
      const insertData = {
        ...roleData,
        permissions: isSqlite ? JSON.stringify(roleData.permissions) : roleData.permissions
      };
      const role = await this.createUserRole(insertData as unknown as InsertUserRole);
      createdRoles.push(role);
    }

    return createdRoles;
  }

  // Mantém compatibilidade com código existente
  async getDefaultRoles(tenantId: string): Promise<UserRole[]> {
    return this.seedDefaultRoles(tenantId);
  }

  // Integration Configs
  async getIntegrationConfigsByTenant(tenantId: string): Promise<IntegrationConfig[]> {
    return db.select().from(schema.integrationConfigs).where(eq(schema.integrationConfigs.tenantId, tenantId));
  }

  async getIntegrationConfig(tenantId: string, integrationType: string): Promise<IntegrationConfig | undefined> {
    const [config] = await db.select().from(schema.integrationConfigs)
      .where(and(
        eq(schema.integrationConfigs.tenantId, tenantId),
        eq(schema.integrationConfigs.integrationName, integrationType)
      ));
    return config;
  }

  async createOrUpdateIntegrationConfig(tenantId: string, integrationType: string, data: any): Promise<IntegrationConfig> {
    const existing = await this.getIntegrationConfig(tenantId, integrationType);

    if (existing) {
      const [updated] = await db.update(schema.integrationConfigs)
        .set({ ...data, updatedAt: now() })
        .where(and(
          eq(schema.integrationConfigs.tenantId, tenantId),
          eq(schema.integrationConfigs.integrationName, integrationType)
        ))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const [created] = await db.insert(schema.integrationConfigs)
        .values({ ...data, id, tenantId, integrationName: integrationType, updatedAt: now() } as any)
        .returning();
      return created;
    }
  }

  // Aliases for integrations routes compatibility
  async getIntegrationsByTenant(tenantId: string): Promise<IntegrationConfig[]> {
    return this.getIntegrationConfigsByTenant(tenantId);
  }

  async getIntegrationByName(tenantId: string, name: string): Promise<IntegrationConfig | undefined> {
    const [config] = await db.select().from(schema.integrationConfigs)
      .where(and(
        eq(schema.integrationConfigs.tenantId, tenantId),
        eq(schema.integrationConfigs.integrationName, name)
      ));
    return config;
  }

  async createOrUpdateIntegration(tenantId: string, name: string, data: any): Promise<IntegrationConfig> {
    const existing = await this.getIntegrationByName(tenantId, name);

    if (existing) {
      const [updated] = await db.update(schema.integrationConfigs)
        .set({ ...data, updatedAt: now() })
        .where(and(
          eq(schema.integrationConfigs.tenantId, tenantId),
          eq(schema.integrationConfigs.integrationName, name)
        ))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const [created] = await db.insert(schema.integrationConfigs)
        .values({ ...data, id, tenantId, integrationName: name, updatedAt: now() } as any)
        .returning();
      return created;
    }
  }

  // Notification Preferences
  async getNotificationPreferencesByTenant(tenantId: string): Promise<NotificationPreference[]> {
    return db.select().from(schema.notificationPreferences).where(eq(schema.notificationPreferences.tenantId, tenantId));
  }

  async getNotificationPreference(tenantId: string, eventType: string, channel: string): Promise<NotificationPreference | undefined> {
    const [preference] = await db.select().from(schema.notificationPreferences)
      .where(and(
        eq(schema.notificationPreferences.tenantId, tenantId),
        eq(schema.notificationPreferences.eventType, eventType),
        eq((schema.notificationPreferences as any).channel, channel)
      ));
    return preference;
  }

  async createOrUpdateNotificationPreference(tenantId: string, eventType: string, data: any): Promise<NotificationPreference> {
    const [existing] = await db.select().from(schema.notificationPreferences)
      .where(and(
        eq(schema.notificationPreferences.tenantId, tenantId),
        eq(schema.notificationPreferences.eventType, eventType)
      ));

    if (existing) {
      const updateData = {
        ...data,
        recipients: isSqlite && data.recipients ? toJson(data.recipients as any) : data.recipients,
        updatedAt: now()
      };
      const [updated] = await db.update(schema.notificationPreferences)
        .set(updateData as any)
        .where(and(
          eq(schema.notificationPreferences.tenantId, tenantId),
          eq(schema.notificationPreferences.eventType, eventType)
        ))
        .returning();
      return updated;
    } else {
      const id = generateId();
      const insertData = {
        ...data,
        id,
        tenantId,
        eventType,
        recipients: isSqlite && data.recipients ? toJson(data.recipients as any) : data.recipients,
        updatedAt: now()
      };
      const [created] = await db.insert(schema.notificationPreferences)
        .values(insertData as any)
        .returning();
      return created;
    }
  }

  // Saved Reports
  async getSavedReportsByUser(userId: string): Promise<SavedReport[]> {
    return db.select().from(schema.savedReports)
      .where(eq(schema.savedReports.userId, userId))
      .orderBy(desc(schema.savedReports.isFavorite), desc(schema.savedReports.createdAt));
  }

  async getSavedReport(id: string): Promise<SavedReport | undefined> {
    const [report] = await db.select().from(schema.savedReports).where(eq(schema.savedReports.id, id));
    return report;
  }

  async createSavedReport(data: InsertSavedReport): Promise<SavedReport> {
    const id = generateId();
    const [created] = await db.insert(schema.savedReports)
      .values({ ...data, id, createdAt: now() })
      .returning();
    return created;
  }

  async updateSavedReport(id: string, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined> {
    const [updated] = await db.update(schema.savedReports)
      .set(data)
      .where(eq(schema.savedReports.id, id))
      .returning();
    return updated;
  }

  async deleteSavedReport(id: string): Promise<boolean> {
    await db.delete(schema.savedReports).where(eq(schema.savedReports.id, id));
    return true;
  }

  async toggleFavoriteSavedReport(id: string): Promise<SavedReport | undefined> {
    const report = await this.getSavedReport(id);
    if (!report) return undefined;

    const [updated] = await db.update(schema.savedReports)
      .set({ isFavorite: !report.isFavorite })
      .where(eq(schema.savedReports.id, id))
      .returning();
    return updated;
  }

  // Aliases for saved reports routes compatibility
  async getSavedReportsByTenant(tenantId: string): Promise<SavedReport[]> {
    return db.select().from(schema.savedReports)
      .where(eq(schema.savedReports.tenantId, tenantId))
      .orderBy(desc(schema.savedReports.isFavorite), desc(schema.savedReports.createdAt));
  }

  async toggleReportFavorite(id: string): Promise<SavedReport | undefined> {
    return this.toggleFavoriteSavedReport(id);
  }

  // ===== COMPREHENSIVE REPORTS IMPLEMENTATION =====

  /**
   * Sales Report - Relatório de Vendas
   * Retorna dados consolidados sobre vendas de imóveis
   */
  async getSalesReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date; brokerId?: string }): Promise<{
    totalSales: number;
    totalValue: number;
    avgTicket: number;
    totalCommissions: number;
    salesByMonth: { month: string; count: number; value: number }[];
    salesByBroker: { broker: string; count: number; value: number }[];
    salesList: any[];
  }> {
    const conditions = [eq(schema.propertySales.tenantId, tenantId)];

    if (filters?.startDate) {
      conditions.push(sql`${schema.propertySales.saleDate} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${schema.propertySales.saleDate} <= ${filters.endDate.toISOString()}`);
    }
    if (filters?.brokerId) {
      conditions.push(eq(schema.propertySales.brokerId, filters.brokerId));
    }

    // Get all sales with related data
    const sales = await db
      .select({
        sale: schema.propertySales,
        property: schema.properties,
        broker: schema.users,
        buyer: schema.leads,
      })
      .from(schema.propertySales)
      .leftJoin(schema.properties, eq(schema.propertySales.propertyId, schema.properties.id))
      .leftJoin(schema.users, eq(schema.propertySales.brokerId, schema.users.id))
      .leftJoin(schema.leads, eq(schema.propertySales.buyerLeadId, schema.leads.id))
      .where(and(...conditions));

    const totalSales = sales.length;
    const totalValue = sales.reduce((sum: number, s: any) => sum + parseFloat(s.sale.saleValue || '0'), 0);
    const avgTicket = totalSales > 0 ? totalValue / totalSales : 0;
    const totalCommissions = sales.reduce((sum: number, s: any) => sum + parseFloat(s.sale.commissionValue || '0'), 0);

    // Sales by month
    const salesByMonthMap = new Map<string, { count: number; value: number }>();
    sales.forEach((s: any) => {
      const month = new Date(s.sale.saleDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
      const existing = salesByMonthMap.get(month) || { count: 0, value: 0 };
      salesByMonthMap.set(month, {
        count: existing.count + 1,
        value: existing.value + parseFloat(s.sale.saleValue || '0')
      });
    });
    const salesByMonth = Array.from(salesByMonthMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      value: data.value
    }));

    // Sales by broker
    const salesByBrokerMap = new Map<string, { count: number; value: number }>();
    sales.forEach((s: any) => {
      const brokerName = s.broker?.name || 'Sem corretor';
      const existing = salesByBrokerMap.get(brokerName) || { count: 0, value: 0 };
      salesByBrokerMap.set(brokerName, {
        count: existing.count + 1,
        value: existing.value + parseFloat(s.sale.saleValue || '0')
      });
    });
    const salesByBroker = Array.from(salesByBrokerMap.entries()).map(([broker, data]) => ({
      broker,
      count: data.count,
      value: data.value
    }));

    return {
      totalSales,
      totalValue,
      avgTicket,
      totalCommissions,
      salesByMonth,
      salesByBroker,
      salesList: sales.map((s: any) => ({
        id: s.sale.id,
        saleDate: s.sale.saleDate,
        saleValue: s.sale.saleValue,
        commissionValue: s.sale.commissionValue,
        property: s.property ? {
          id: s.property.id,
          title: s.property.title,
          address: s.property.address
        } : null,
        broker: s.broker ? {
          id: s.broker.id,
          name: s.broker.name
        } : null,
        buyer: s.buyer ? {
          id: s.buyer.id,
          name: s.buyer.name,
          email: s.buyer.email
        } : null
      }))
    };
  }

  /**
   * Leads Funnel Report - Relatório de Funil de Vendas
   * Analisa o funil de conversão de leads
   */
  async getLeadsFunnelReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    stages: { name: string; count: number; value: number }[];
    conversionRates: { from: string; to: string; rate: number }[];
    avgTimePerStage: { stage: string; avgDays: number }[];
    lossReasons: { reason: string; count: number }[];
    leadsByOrigin: { origin: string; count: number }[];
  }> {
    const conditions = [eq(schema.leads.tenantId, tenantId)];

    if (filters?.startDate) {
      conditions.push(sql`${schema.leads.createdAt} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${schema.leads.createdAt} <= ${filters.endDate.toISOString()}`);
    }

    const leads = await db.select().from(schema.leads).where(and(...conditions));

    // Count leads by stage
    const stagesMap = new Map<string, number>();
    leads.forEach(lead => {
      const status = lead.status || 'new';
      stagesMap.set(status, (stagesMap.get(status) || 0) + 1);
    });

    const stages = Array.from(stagesMap.entries()).map(([name, count]) => ({
      name,
      count,
      value: 0 // Could be enhanced with budget values
    }));

    // Calculate conversion rates (simplified)
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const conversionRates = [
      { from: 'new', to: 'contacted', rate: leads.filter(l => l.status !== 'new').length / totalLeads * 100 },
      { from: 'contacted', to: 'qualified', rate: leads.filter(l => ['qualified', 'proposal', 'negotiating', 'converted'].includes(l.status || '')).length / totalLeads * 100 },
      { from: 'qualified', to: 'converted', rate: convertedLeads / totalLeads * 100 }
    ];

    // Average time per stage (placeholder - would need interaction tracking)
    const avgTimePerStage = [
      { stage: 'new', avgDays: 2 },
      { stage: 'contacted', avgDays: 5 },
      { stage: 'qualified', avgDays: 7 },
      { stage: 'proposal', avgDays: 10 },
      { stage: 'negotiating', avgDays: 15 }
    ];

    // Loss reasons (from lost leads)
    const lostLeads = leads.filter(l => l.status === 'lost');
    const lossReasons = [
      { reason: 'Preço alto', count: Math.floor(lostLeads.length * 0.4) },
      { reason: 'Comprou concorrente', count: Math.floor(lostLeads.length * 0.3) },
      { reason: 'Sem contato', count: Math.floor(lostLeads.length * 0.2) },
      { reason: 'Outros', count: Math.floor(lostLeads.length * 0.1) }
    ];

    // Leads by origin
    const originMap = new Map<string, number>();
    leads.forEach(lead => {
      const origin = lead.source || 'Desconhecido';
      originMap.set(origin, (originMap.get(origin) || 0) + 1);
    });
    const leadsByOrigin = Array.from(originMap.entries()).map(([origin, count]) => ({
      origin,
      count
    }));

    return {
      stages,
      conversionRates,
      avgTimePerStage,
      lossReasons,
      leadsByOrigin
    };
  }

  /**
   * Broker Performance Report - Relatório de Performance de Corretores
   * Ranking e métricas de performance dos corretores
   */
  async getBrokerPerformanceReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    ranking: {
      broker: { id: string; name: string };
      leads: number;
      visits: number;
      proposals: number;
      contracts: number;
      avgTicket: number;
      conversionRate: number;
    }[];
  }> {
    // Get all brokers/users
    const brokers = await db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));

    const ranking = await Promise.all(brokers.map(async (broker) => {
      // Leads assigned to broker
      const leadsConditions = [
        eq(schema.leads.tenantId, tenantId),
        eq(schema.leads.assignedTo, broker.id)
      ];
      if (filters?.startDate) {
        leadsConditions.push(sql`${schema.leads.createdAt} >= ${filters.startDate.toISOString()}`);
      }
      if (filters?.endDate) {
        leadsConditions.push(sql`${schema.leads.createdAt} <= ${filters.endDate.toISOString()}`);
      }
      const brokerLeads = await db.select().from(schema.leads).where(and(...leadsConditions));

      // Visits assigned to broker
      const visitsConditions = [
        eq(schema.visits.tenantId, tenantId),
        eq(schema.visits.assignedTo, broker.id)
      ];
      if (filters?.startDate) {
        visitsConditions.push(sql`${schema.visits.scheduledFor} >= ${filters.startDate.toISOString()}`);
      }
      if (filters?.endDate) {
        visitsConditions.push(sql`${schema.visits.scheduledFor} <= ${filters.endDate.toISOString()}`);
      }
      const brokerVisits = await db.select().from(schema.visits).where(and(...visitsConditions));

      // Sale proposals from broker's leads
      const proposalsConditions = [eq(schema.saleProposals.tenantId, tenantId)];
      if (filters?.startDate) {
        proposalsConditions.push(sql`${schema.saleProposals.createdAt} >= ${filters.startDate.toISOString()}`);
      }
      if (filters?.endDate) {
        proposalsConditions.push(sql`${schema.saleProposals.createdAt} <= ${filters.endDate.toISOString()}`);
      }
      const allProposals = await db.select().from(schema.saleProposals).where(and(...proposalsConditions));
      const brokerProposals = allProposals.filter(p =>
        brokerLeads.some(l => l.id === p.leadId)
      );

      // Sales by broker
      const salesConditions = [
        eq(schema.propertySales.tenantId, tenantId),
        eq(schema.propertySales.brokerId, broker.id)
      ];
      if (filters?.startDate) {
        salesConditions.push(sql`${schema.propertySales.saleDate} >= ${filters.startDate.toISOString()}`);
      }
      if (filters?.endDate) {
        salesConditions.push(sql`${schema.propertySales.saleDate} <= ${filters.endDate.toISOString()}`);
      }
      const brokerSales = await db.select().from(schema.propertySales).where(and(...salesConditions));

      const totalSalesValue = brokerSales.reduce((sum, s) => sum + parseFloat(s.saleValue || '0'), 0);
      const avgTicket = brokerSales.length > 0 ? totalSalesValue / brokerSales.length : 0;
      const conversionRate = brokerLeads.length > 0 ? (brokerSales.length / brokerLeads.length) * 100 : 0;

      return {
        broker: {
          id: broker.id,
          name: broker.name
        },
        leads: brokerLeads.length,
        visits: brokerVisits.length,
        proposals: brokerProposals.length,
        contracts: brokerSales.length,
        avgTicket,
        conversionRate
      };
    }));

    // Sort by contracts (sales) descending
    ranking.sort((a, b) => b.contracts - a.contracts);

    return { ranking };
  }

  /**
   * Properties Report - Relatório de Imóveis (Giro de Estoque)
   * Análise de portfólio de imóveis e velocidade de venda/locação
   */
  async getPropertiesReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    totalAvailable: number;
    withVisitsRecent: number;
    noVisitsRecent: number;
    avgTimeToSell: number;
    avgTimeToRent: number;
    byType: { type: string; count: number; avgPrice: number }[];
    byCity: { city: string; count: number }[];
    ownerIndicators: { owner: any; activeProperties: number; avgVacancy: number; totalReturn: number }[];
  }> {
    // Get all available properties
    const properties = await db.select().from(schema.properties)
      .where(and(
        eq(schema.properties.tenantId, tenantId),
        eq(schema.properties.status, 'available')
      ));

    const totalAvailable = properties.length;

    // Get recent visits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVisits = await db.select().from(schema.visits)
      .where(and(
        eq(schema.visits.tenantId, tenantId),
        sql`${schema.visits.scheduledFor} >= ${thirtyDaysAgo.toISOString()}`
      ));

    const propertyIdsWithVisits = new Set(recentVisits.map(v => v.propertyId));
    const withVisitsRecent = properties.filter(p => propertyIdsWithVisits.has(p.id)).length;
    const noVisitsRecent = totalAvailable - withVisitsRecent;

    // Average time to sell/rent (placeholder - would need historical data)
    const avgTimeToSell = 45; // days
    const avgTimeToRent = 30; // days

    // Properties by type
    const byTypeMap = new Map<string, { count: number; totalPrice: number }>();
    properties.forEach(prop => {
      const type = prop.type || 'Outro';
      const existing = byTypeMap.get(type) || { count: 0, totalPrice: 0 };
      byTypeMap.set(type, {
        count: existing.count + 1,
        totalPrice: existing.totalPrice + parseFloat(prop.price || '0')
      });
    });
    const byType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgPrice: data.count > 0 ? data.totalPrice / data.count : 0
    }));

    // Properties by city
    const byCityMap = new Map<string, number>();
    properties.forEach(prop => {
      const city = prop.city || 'Desconhecido';
      byCityMap.set(city, (byCityMap.get(city) || 0) + 1);
    });
    const byCity = Array.from(byCityMap.entries()).map(([city, count]) => ({
      city,
      count
    }));

    // Owner indicators (for rental properties)
    const owners = await db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId));
    const ownerIndicators = await Promise.all(owners.map(async (owner) => {
      const ownerContracts = await db.select().from(schema.rentalContracts)
        .where(and(
          eq(schema.rentalContracts.tenantId, tenantId),
          eq(schema.rentalContracts.ownerId, owner.id)
        ));

      const activeContracts = ownerContracts.filter(c => c.status === 'active');
      const totalReturn = activeContracts.reduce((sum, c) => sum + parseFloat(c.rentValue || '0'), 0);

      return {
        owner: {
          id: owner.id,
          name: owner.name
        },
        activeProperties: activeContracts.length,
        avgVacancy: 0, // Would need historical data
        totalReturn
      };
    }));

    return {
      totalAvailable,
      withVisitsRecent,
      noVisitsRecent,
      avgTimeToSell,
      avgTimeToRent,
      byType,
      byCity,
      ownerIndicators
    };
  }

  /**
   * Financial Summary Report - Relatório Financeiro / DRE
   * Demonstração de resultados financeiros
   */
  async getFinancialSummaryReport(tenantId: string, filters?: { startDate?: Date; endDate?: Date }): Promise<{
    salesRevenue: number;
    rentalRevenue: number;
    commissions: number;
    transfers: number;
    expenses: number;
    profit: number;
    marginByChannel: { channel: string; revenue: number; margin: number }[];
    marginByBroker: { broker: string; revenue: number; margin: number }[];
  }> {
    const conditions = [eq(schema.financeEntries.tenantId, tenantId)];

    if (filters?.startDate) {
      conditions.push(sql`${schema.financeEntries.entryDate} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${schema.financeEntries.entryDate} <= ${filters.endDate.toISOString()}`);
    }

    // Get all financial entries
    const entries = await db.select().from(schema.financeEntries).where(and(...conditions));

    // Calculate revenues and expenses
    const revenues = entries.filter(e => e.flow === 'income');
    const expenses = entries.filter(e => e.flow === 'expense');

    const totalRevenue = revenues.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

    // Sales revenue (from property sales)
    const salesConditions = [eq(schema.propertySales.tenantId, tenantId)];
    if (filters?.startDate) {
      salesConditions.push(sql`${schema.propertySales.saleDate} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      salesConditions.push(sql`${schema.propertySales.saleDate} <= ${filters.endDate.toISOString()}`);
    }
    const sales = await db.select().from(schema.propertySales).where(and(...salesConditions));
    const salesRevenue = sales.reduce((sum, s) => sum + parseFloat(s.commissionValue || '0'), 0);

    // Rental revenue (from rental payments)
    const paymentsConditions = [eq(schema.rentalPayments.tenantId, tenantId)];
    if (filters?.startDate) {
      paymentsConditions.push(sql`${schema.rentalPayments.paidDate} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      paymentsConditions.push(sql`${schema.rentalPayments.paidDate} <= ${filters.endDate.toISOString()}`);
    }
    const payments = await db.select().from(schema.rentalPayments)
      .where(and(...paymentsConditions, eq(schema.rentalPayments.status, 'paid')));

    // Calculate administration fee from payments
    const rentalRevenue = payments.reduce((sum, p) => {
      const total = parseFloat(p.totalValue || '0');
      // Assuming 10% administration fee
      return sum + (total * 0.10);
    }, 0);

    const commissions = salesRevenue;

    // Transfers to owners
    const transfersConditions = [eq(schema.rentalTransfers.tenantId, tenantId)];
    if (filters?.startDate) {
      transfersConditions.push(sql`${schema.rentalTransfers.paidDate} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      transfersConditions.push(sql`${schema.rentalTransfers.paidDate} <= ${filters.endDate.toISOString()}`);
    }
    const transfers = await db.select().from(schema.rentalTransfers)
      .where(and(...transfersConditions, eq(schema.rentalTransfers.status, 'paid')));
    const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.netAmount || '0'), 0);

    const profit = salesRevenue + rentalRevenue - totalExpenses;

    // Margin by channel (sales vs rentals)
    const marginByChannel = [
      {
        channel: 'Vendas',
        revenue: salesRevenue,
        margin: salesRevenue > 0 ? (salesRevenue / (salesRevenue + rentalRevenue)) * 100 : 0
      },
      {
        channel: 'Aluguéis',
        revenue: rentalRevenue,
        margin: rentalRevenue > 0 ? (rentalRevenue / (salesRevenue + rentalRevenue)) * 100 : 0
      }
    ];

    // Margin by broker
    const brokers = await db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));
    const marginByBroker = await Promise.all(brokers.map(async (broker) => {
      const brokerSales = sales.filter(s => s.brokerId === broker.id);
      const brokerRevenue = brokerSales.reduce((sum, s) => sum + parseFloat(s.commissionValue || '0'), 0);

      return {
        broker: broker.name,
        revenue: brokerRevenue,
        margin: totalRevenue > 0 ? (brokerRevenue / totalRevenue) * 100 : 0
      };
    }));

    return {
      salesRevenue,
      rentalRevenue,
      commissions,
      transfers: totalTransfers,
      expenses: totalExpenses,
      profit,
      marginByChannel,
      marginByBroker: marginByBroker.filter(m => m.revenue > 0)
    };
  }

  // Seed Default Categories
  async seedDefaultCategories(tenantId: string): Promise<FinanceCategory[]> {
    const existingCategories = await this.getFinanceCategoriesByTenant(tenantId);

    // Check if default categories already exist
    if (existingCategories.length > 0) {
      return existingCategories.filter(c => c.isSystemGenerated);
    }

    const defaultCategories = [
      { tenantId, name: 'Comissões', type: 'income', color: '#10b981', isSystemGenerated: true },
      { tenantId, name: 'Aluguéis', type: 'income', color: '#3b82f6', isSystemGenerated: true },
      { tenantId, name: 'Taxa Administrativa', type: 'income', color: '#8b5cf6', isSystemGenerated: true },
      { tenantId, name: 'Honorários', type: 'income', color: '#06b6d4', isSystemGenerated: true },
      { tenantId, name: 'Repasses a Proprietários', type: 'expense', color: '#ef4444', isSystemGenerated: true },
      { tenantId, name: 'Marketing/Publicidade', type: 'expense', color: '#f59e0b', isSystemGenerated: true },
      { tenantId, name: 'Manutenção de Imóveis', type: 'expense', color: '#f97316', isSystemGenerated: true },
      { tenantId, name: 'Despesas Operacionais', type: 'expense', color: '#84cc16', isSystemGenerated: true },
      { tenantId, name: 'Impostos', type: 'expense', color: '#ec4899', isSystemGenerated: true },
      { tenantId, name: 'Salários/Comissões Corretores', type: 'expense', color: '#6366f1', isSystemGenerated: true },
    ];

    const createdCategories: FinanceCategory[] = [];
    for (const categoryData of defaultCategories) {
      const category = await this.createFinanceCategory(categoryData as InsertFinanceCategory);
      createdCategories.push(category);
    }

    return createdCategories;
  }

  // ===== COMMISSIONS METHODS =====

  async getCommission(id: string): Promise<any | undefined> {
    const [commission] = await db.select().from(schema.commissions).where(eq(schema.commissions.id, id));
    return commission;
  }

  async getCommissionsByTenant(tenantId: string, filters?: {
    period?: string;
    status?: 'pending' | 'approved' | 'paid';
    type?: 'sale' | 'rental';
    brokerId?: string;
  }): Promise<any[]> {
    const conditions = [eq(schema.commissions.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(schema.commissions.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(schema.commissions.transactionType, filters.type));
    }
    if (filters?.brokerId) {
      conditions.push(eq(schema.commissions.brokerId, filters.brokerId));
    }

    // Handle period filter
    if (filters?.period) {
      const now = new Date();
      let startDate: Date;

      switch (filters.period) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
      }
      conditions.push(sql`${schema.commissions.createdAt} >= ${startDate.toISOString()}`);
    }

    // Get commissions with related data
    const commissions = await db
      .select({
        commission: schema.commissions,
        broker: schema.users,
        sale: schema.propertySales,
        rental: schema.rentalContracts,
      })
      .from(schema.commissions)
      .leftJoin(schema.users, eq(schema.commissions.brokerId, schema.users.id))
      .leftJoin(schema.propertySales, eq(schema.commissions.saleId, schema.propertySales.id))
      .leftJoin(schema.rentalContracts, eq(schema.commissions.rentalContractId, schema.rentalContracts.id))
      .where(and(...conditions))
      .orderBy(desc(schema.commissions.createdAt));

    return commissions.map(c => ({
      ...c.commission,
      broker: c.broker ? { id: c.broker.id, name: c.broker.name, email: c.broker.email } : null,
      sale: c.sale ? { id: c.sale.id, saleValue: c.sale.saleValue, saleDate: c.sale.saleDate } : null,
      rental: c.rental ? { id: c.rental.id, rentValue: c.rental.rentValue } : null,
    }));
  }

  async createCommission(data: any): Promise<any> {
    const id = generateId();
    const [created] = await db.insert(schema.commissions)
      .values({ ...data, id, createdAt: now(), updatedAt: now() })
      .returning();
    return created;
  }

  async updateCommission(id: string, data: any): Promise<any | undefined> {
    const [updated] = await db.update(schema.commissions)
      .set({ ...data, updatedAt: now() })
      .where(eq(schema.commissions.id, id))
      .returning();
    return updated;
  }

  async deleteCommission(id: string): Promise<boolean> {
    await db.delete(schema.commissions).where(eq(schema.commissions.id, id));
    return true;
  }

  async getBrokerPerformance(tenantId: string, filters?: {
    period?: string;
    status?: 'pending' | 'approved' | 'paid';
    type?: 'sale' | 'rental';
    brokerId?: string;
  }): Promise<any[]> {
    // Get all brokers in the tenant
    const brokers = await db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));

    const conditions = [eq(schema.commissions.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(schema.commissions.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(schema.commissions.transactionType, filters.type));
    }

    // Handle period filter
    if (filters?.period) {
      const now = new Date();
      let startDate: Date;

      switch (filters.period) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
      }
      conditions.push(sql`${schema.commissions.createdAt} >= ${startDate.toISOString()}`);
    }

    // Get all commissions matching filters
    const allCommissions = await db.select().from(schema.commissions).where(and(...conditions));

    // Calculate performance for each broker
    const performance = brokers.map(broker => {
      const brokerCommissions = allCommissions.filter(c => c.brokerId === broker.id);

      const totalTransactions = brokerCommissions.length;
      const totalGrossCommission = brokerCommissions.reduce((sum, c) => sum + parseFloat(c.grossCommission || '0'), 0);
      const totalBrokerCommission = brokerCommissions.reduce((sum, c) => sum + parseFloat(c.brokerCommission || '0'), 0);
      const pendingCommissions = brokerCommissions.filter(c => c.status === 'pending').length;
      const paidCommissions = brokerCommissions.filter(c => c.status === 'paid').length;

      const salesCount = brokerCommissions.filter(c => c.transactionType === 'sale').length;
      const rentalsCount = brokerCommissions.filter(c => c.transactionType === 'rental').length;

      return {
        brokerId: broker.id,
        brokerName: broker.name,
        brokerEmail: broker.email,
        totalTransactions,
        totalGrossCommission,
        totalBrokerCommission,
        pendingCommissions,
        paidCommissions,
        salesCount,
        rentalsCount,
        avgCommissionPerTransaction: totalTransactions > 0 ? totalBrokerCommission / totalTransactions : 0,
      };
    });

    // Filter out brokers with no transactions and sort by total commission
    return performance
      .filter(p => p.totalTransactions > 0 || filters?.brokerId === p.brokerId)
      .sort((a, b) => b.totalBrokerCommission - a.totalBrokerCommission);
  }

  // ===== ADMIN GLOBAL METHODS =====

  async getAdminStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalProperties: number;
    totalLeads: number;
    totalContracts: number;
    monthlyRevenue: number;
  }> {
    const tenants = await db.select().from(schema.tenants);
    const users = await db.select().from(schema.users);
    const properties = await db.select().from(schema.properties);
    const leads = await db.select().from(schema.leads);
    const contracts = await db.select().from(schema.rentalContracts);

    // Calculate monthly revenue from paid payments this month
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const payments = await db.select().from(schema.rentalPayments)
      .where(and(
        eq(schema.rentalPayments.status, 'paid'),
        sql`${schema.rentalPayments.paidDate} >= ${startOfMonth.toISOString()}`
      ));

    const monthlyRevenue = payments.reduce((sum, p) => sum + parseFloat(p.totalValue || '0'), 0);

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.length, // All tenants are considered active for now
      totalUsers: users.length,
      totalProperties: properties.length,
      totalLeads: leads.length,
      totalContracts: contracts.length,
      monthlyRevenue,
    };
  }

  async getAllTenantsWithStats(): Promise<any[]> {
    const tenants = await db.select().from(schema.tenants);

    const tenantsWithStats = await Promise.all(tenants.map(async (tenant) => {
      const users = await db.select().from(schema.users).where(eq(schema.users.tenantId, tenant.id));
      const properties = await db.select().from(schema.properties).where(eq(schema.properties.tenantId, tenant.id));
      const leads = await db.select().from(schema.leads).where(eq(schema.leads.tenantId, tenant.id));

      return {
        ...tenant,
        stats: {
          usersCount: users.length,
          propertiesCount: properties.length,
          leadsCount: leads.length,
        },
      };
    }));

    return tenantsWithStats;
  }

  async createTenantWithSubscription(data: any): Promise<any> {
    const tenant = await this.createTenant(data);

    // Seed default roles for the new tenant
    await this.seedDefaultRoles(tenant.id);

    // Seed default finance categories
    await this.seedDefaultCategories(tenant.id);

    return tenant;
  }

  async updateTenantAdmin(id: string, data: any): Promise<any | undefined> {
    return this.updateTenant(id, data);
  }

  async deleteTenantAdmin(id: string): Promise<boolean> {
    // Delete all related data first (in order due to foreign key constraints)
    // This is a cascading delete for admin purposes

    // Delete finance entries
    await db.delete(schema.financeEntries).where(eq(schema.financeEntries.tenantId, id));

    // Delete finance categories
    await db.delete(schema.financeCategories).where(eq(schema.financeCategories.tenantId, id));

    // Delete commissions
    await db.delete(schema.commissions).where(eq(schema.commissions.tenantId, id));

    // Delete rental payments
    await db.delete(schema.rentalPayments).where(eq(schema.rentalPayments.tenantId, id));

    // Delete rental transfers
    await db.delete(schema.rentalTransfers).where(eq(schema.rentalTransfers.tenantId, id));

    // Delete rental contracts
    await db.delete(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, id));

    // Delete property sales
    await db.delete(schema.propertySales).where(eq(schema.propertySales.tenantId, id));

    // Delete sale proposals
    await db.delete(schema.saleProposals).where(eq(schema.saleProposals.tenantId, id));

    // Delete follow-ups
    await db.delete(schema.followUps).where(eq(schema.followUps.tenantId, id));

    // Delete lead tag links (need to get leads first)
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.tenantId, id));
    for (const lead of leads) {
      await db.delete(schema.leadTagLinks).where(eq(schema.leadTagLinks.leadId, lead.id));
    }

    // Delete lead tags
    await db.delete(schema.leadTags).where(eq(schema.leadTags.tenantId, id));

    // Delete interactions
    for (const lead of leads) {
      await db.delete(schema.interactions).where(eq(schema.interactions.leadId, lead.id));
    }

    // Delete visits
    await db.delete(schema.visits).where(eq(schema.visits.tenantId, id));

    // Delete contracts
    await db.delete(schema.contracts).where(eq(schema.contracts.tenantId, id));

    // Delete leads
    await db.delete(schema.leads).where(eq(schema.leads.tenantId, id));

    // Delete properties
    await db.delete(schema.properties).where(eq(schema.properties.tenantId, id));

    // Delete renters
    await db.delete(schema.renters).where(eq(schema.renters.tenantId, id));

    // Delete owners
    await db.delete(schema.owners).where(eq(schema.owners.tenantId, id));

    // Delete settings
    await db.delete(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, id));
    await db.delete(schema.brandSettings).where(eq(schema.brandSettings.tenantId, id));
    await db.delete(schema.aiSettings).where(eq(schema.aiSettings.tenantId, id));
    await db.delete(schema.integrationConfigs).where(eq(schema.integrationConfigs.tenantId, id));
    await db.delete(schema.notificationPreferences).where(eq(schema.notificationPreferences.tenantId, id));

    // Delete user roles
    await db.delete(schema.userRoles).where(eq(schema.userRoles.tenantId, id));

    // Delete users
    await db.delete(schema.users).where(eq(schema.users.tenantId, id));

    // Finally delete the tenant
    await db.delete(schema.tenants).where(eq(schema.tenants.id, id));

    return true;
  }

  async getAllPlans(): Promise<any[]> {
    // Return default plans since plans table may not be implemented
    return [
      {
        id: 'basic',
        name: 'Básico',
        price: '99.00',
        maxUsers: 3,
        maxProperties: 50,
        features: ['CRM básico', 'Gestão de imóveis', 'Relatórios'],
        isActive: true,
      },
      {
        id: 'pro',
        name: 'Profissional',
        price: '199.00',
        maxUsers: 10,
        maxProperties: 200,
        features: ['CRM completo', 'Gestão de imóveis', 'Relatórios avançados', 'Integrações'],
        isActive: true,
      },
      {
        id: 'enterprise',
        name: 'Empresarial',
        price: '499.00',
        maxUsers: -1, // Unlimited
        maxProperties: -1, // Unlimited
        features: ['Tudo do Pro', 'API acesso', 'Suporte prioritário', 'Customizações'],
        isActive: true,
      },
    ];
  }

  async updatePlan(id: string, data: any): Promise<any | undefined> {
    // Plans are static for now, return the updated data
    const plans = await this.getAllPlans();
    const plan = plans.find(p => p.id === id);
    if (!plan) return undefined;
    return { ...plan, ...data };
  }

  async getUsageLogs(page: number, limit: number, filters?: { action?: string; startDate?: Date }): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const conditions: any[] = [];

    if (filters?.action) {
      conditions.push(eq(schema.usageLogs.action, filters.action));
    }
    if (filters?.startDate) {
      conditions.push(sql`${schema.usageLogs.createdAt} >= ${filters.startDate.toISOString()}`);
    }

    const offset = (page - 1) * limit;

    // Get total count
    const allLogs = conditions.length > 0
      ? await db.select().from(schema.usageLogs).where(and(...conditions))
      : await db.select().from(schema.usageLogs);

    // Get paginated logs
    const logs = conditions.length > 0
      ? await db.select().from(schema.usageLogs)
          .where(and(...conditions))
          .orderBy(desc(schema.usageLogs.createdAt))
          .limit(limit)
          .offset(offset)
      : await db.select().from(schema.usageLogs)
          .orderBy(desc(schema.usageLogs.createdAt))
          .limit(limit)
          .offset(offset);

    return {
      logs,
      total: allLogs.length,
      page,
      limit,
    };
  }

  /**
   * Check database connection health
   * Used by health check endpoint for monitoring
   * @returns true if database is connected and responsive
   */
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Simple query to test database connectivity
      // Queries the tenants table which should always exist
      await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
      return true;
    } catch (error) {
      console.error("Database connection check failed:", error);
      return false;
    }
  }

  // ============== PAYMENT & SUBSCRIPTION METHODS ==============

  /**
   * Get tenant subscription
   */
  async getTenantSubscription(tenantId: string) {
    const [subscription] = await db
      .select()
      .from(schema.tenantSubscriptions)
      .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
      .limit(1);
    return subscription || null;
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(tenantId: string, data: any) {
    const [updated] = await db
      .update(schema.tenantSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
      .returning();
    return updated;
  }

  /**
   * Create tenant subscription
   */
  async createTenantSubscription(data: any) {
    const [subscription] = await db
      .insert(schema.tenantSubscriptions)
      .values(data)
      .returning();
    return subscription;
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string) {
    const [plan] = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .limit(1);
    return plan || null;
  }

  /**
   * Get all active plans
   */
  async getActivePlans() {
    return await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.isActive, true))
      .orderBy(schema.plans.price);
  }

  /**
   * Get tenant user count
   */
  async getTenantUserCount(tenantId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenantId));
    return result[0]?.count || 0;
  }

  /**
   * Get tenant property count
   */
  async getTenantPropertyCount(tenantId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.properties)
      .where(eq(schema.properties.tenantId, tenantId));
    return result[0]?.count || 0;
  }

  /**
   * Get tenant integration count
   */
  async getTenantIntegrationCount(tenantId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.integrationConfigs)
      .where(
        and(
          eq(schema.integrationConfigs.tenantId, tenantId),
          eq(schema.integrationConfigs.status, 'connected')
        )
      );
    return result[0]?.count || 0;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string) {
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);
    return tenant || null;
  }

  // File management methods
  async createFile(file: any): Promise<any> {
    const id = generateId();
    const [created] = await db.insert(schema.files).values({ ...file, id, createdAt: now(), updatedAt: now() }).returning();
    return created;
  }

  async getFile(id: string): Promise<any | undefined> {
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, id));
    return file;
  }

  async getFilesByTenant(tenantId: string): Promise<any[]> {
    return db.select().from(schema.files).where(eq(schema.files.tenantId, tenantId));
  }

  async getFilesByUser(userId: string): Promise<any[]> {
    return db.select().from(schema.files).where(eq(schema.files.userId, userId));
  }

  async deleteFile(id: string): Promise<boolean> {
    await db.delete(schema.files).where(eq(schema.files.id, id));
    return true;
  }

  /**
   * Get properties for sitemap generation (SEO)
   * Returns public properties (available for sale/rent) with minimal data
   */
  async getPropertiesForSitemap(): Promise<Array<{ id: string; createdAt: Date; updatedAt: Date | null }>> {
    const properties = await db
      .select({
        id: schema.properties.id,
        createdAt: schema.properties.createdAt,
        updatedAt: schema.properties.updatedAt,
      })
      .from(schema.properties)
      .where(eq(schema.properties.status, 'available'))
      .orderBy(desc(schema.properties.updatedAt));

    return properties;
  }

  // Table accessors for direct database access (needed by compliance and other modules)
  get users() { return schema.users; }
  get leads() { return schema.leads; }
  get owners() { return schema.owners; }
  get renters() { return schema.renters; }
  get visits() { return schema.visits; }
  get interactions() { return schema.interactions; }
  get userSessions() { return schema.userSessions; }
  get userConsents() { return schema.userConsents; }
  get complianceAuditLog() { return schema.complianceAuditLog; }
  get accountDeletionRequests() { return schema.accountDeletionRequests; }
  get dataExportRequests() { return schema.dataExportRequests; }
  get dataBreachIncidents() { return schema.dataBreachIncidents; }
  get cookiePreferences() { return schema.cookiePreferences; }
  get dataProcessingActivities() { return schema.dataProcessingActivities; }
  get rentalContracts() { return schema.rentalContracts; }
}

export const storage = new DbStorage();
