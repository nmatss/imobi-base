import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
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
  SaleProposal, InsertSaleProposal,
  PropertySale, InsertPropertySale,
  FinanceCategory, InsertFinanceCategory,
  FinanceEntry, InsertFinanceEntry,
  LeadTag, InsertLeadTag,
  LeadTagLink, InsertLeadTagLink,
  FollowUp, InsertFollowUp
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Properties
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByTenant(tenantId: string, filters?: {
    type?: string;
    category?: string;
    status?: string;
    featured?: boolean;
  }): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  
  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByTenant(tenantId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  // Interactions
  getInteractionsByLead(leadId: string): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  
  // Visits
  getVisit(id: string): Promise<Visit | undefined>;
  getVisitsByTenant(tenantId: string): Promise<Visit[]>;
  getVisitsByProperty(propertyId: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined>;
  deleteVisit(id: string): Promise<boolean>;
  
  // Contracts
  getContract(id: string): Promise<Contract | undefined>;
  getContractsByTenant(tenantId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  
  // Newsletter
  subscribeNewsletter(subscription: InsertNewsletter): Promise<Newsletter>;
  unsubscribeNewsletter(email: string): Promise<boolean>;
  
  // Global search
  globalSearch(tenantId: string, query: string): Promise<{
    properties: Property[];
    leads: Lead[];
    contracts: Contract[];
  }>;
  
  // Dashboard stats
  getDashboardStats(tenantId: string): Promise<{
    totalProperties: number;
    totalLeads: number;
    totalContracts: number;
    totalVisits: number;
  }>;
  
  // Owners (Locadores)
  getOwner(id: string): Promise<Owner | undefined>;
  getOwnersByTenant(tenantId: string): Promise<Owner[]>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: string): Promise<boolean>;
  
  // Renters (Inquilinos)
  getRenter(id: string): Promise<Renter | undefined>;
  getRentersByTenant(tenantId: string): Promise<Renter[]>;
  createRenter(renter: InsertRenter): Promise<Renter>;
  updateRenter(id: string, renter: Partial<InsertRenter>): Promise<Renter | undefined>;
  deleteRenter(id: string): Promise<boolean>;
  
  // Rental Contracts (Contratos de Aluguel)
  getRentalContract(id: string): Promise<RentalContract | undefined>;
  getRentalContractsByTenant(tenantId: string): Promise<RentalContract[]>;
  getRentalContractsByOwner(ownerId: string): Promise<RentalContract[]>;
  getRentalContractsByRenter(renterId: string): Promise<RentalContract[]>;
  createRentalContract(contract: InsertRentalContract): Promise<RentalContract>;
  updateRentalContract(id: string, contract: Partial<InsertRentalContract>): Promise<RentalContract | undefined>;
  
  // Rental Payments (Pagamentos de Aluguel)
  getRentalPayment(id: string): Promise<RentalPayment | undefined>;
  getRentalPaymentsByTenant(tenantId: string, filters?: { status?: string; month?: string }): Promise<RentalPayment[]>;
  getRentalPaymentsByContract(contractId: string): Promise<RentalPayment[]>;
  createRentalPayment(payment: InsertRentalPayment): Promise<RentalPayment>;
  updateRentalPayment(id: string, payment: Partial<InsertRentalPayment>): Promise<RentalPayment | undefined>;
  
  // Reports
  getRentalReportData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    paymentsByMonth: { month: string; received: number; pending: number }[];
    occupancyRate: number;
    activeContracts: number;
  }>;
  
  // Sale Proposals
  getSaleProposal(id: string): Promise<SaleProposal | undefined>;
  getSaleProposalsByTenant(tenantId: string): Promise<SaleProposal[]>;
  getSaleProposalsByProperty(propertyId: string): Promise<SaleProposal[]>;
  createSaleProposal(proposal: InsertSaleProposal): Promise<SaleProposal>;
  updateSaleProposal(id: string, proposal: Partial<InsertSaleProposal>): Promise<SaleProposal | undefined>;
  deleteSaleProposal(id: string): Promise<boolean>;
  
  // Property Sales
  getPropertySale(id: string): Promise<PropertySale | undefined>;
  getPropertySalesByTenant(tenantId: string): Promise<PropertySale[]>;
  createPropertySale(sale: InsertPropertySale): Promise<PropertySale>;
  updatePropertySale(id: string, sale: Partial<InsertPropertySale>): Promise<PropertySale | undefined>;
  
  // Finance Categories
  getFinanceCategory(id: string): Promise<FinanceCategory | undefined>;
  getFinanceCategoriesByTenant(tenantId: string): Promise<FinanceCategory[]>;
  createFinanceCategory(category: InsertFinanceCategory): Promise<FinanceCategory>;
  updateFinanceCategory(id: string, category: Partial<InsertFinanceCategory>): Promise<FinanceCategory | undefined>;
  deleteFinanceCategory(id: string): Promise<boolean>;
  
  // Finance Entries
  getFinanceEntry(id: string): Promise<FinanceEntry | undefined>;
  getFinanceEntriesByTenant(tenantId: string, filters?: { startDate?: Date; endDate?: Date; flow?: string; categoryId?: string }): Promise<FinanceEntry[]>;
  createFinanceEntry(entry: InsertFinanceEntry): Promise<FinanceEntry>;
  updateFinanceEntry(id: string, entry: Partial<InsertFinanceEntry>): Promise<FinanceEntry | undefined>;
  deleteFinanceEntry(id: string): Promise<boolean>;
  
  // Lead Tags
  getLeadTag(id: string): Promise<LeadTag | undefined>;
  getLeadTagsByTenant(tenantId: string): Promise<LeadTag[]>;
  createLeadTag(tag: InsertLeadTag): Promise<LeadTag>;
  updateLeadTag(id: string, tag: Partial<InsertLeadTag>): Promise<LeadTag | undefined>;
  deleteLeadTag(id: string): Promise<boolean>;
  
  // Lead Tag Links
  getTagsByLead(leadId: string): Promise<LeadTag[]>;
  getTagsForAllLeads(tenantId: string): Promise<Record<string, LeadTag[]>>;
  addTagToLead(link: InsertLeadTagLink): Promise<LeadTagLink>;
  removeTagFromLead(leadId: string, tagId: string): Promise<boolean>;
  
  // Follow-ups
  getFollowUp(id: string): Promise<FollowUp | undefined>;
  getFollowUpsByTenant(tenantId: string, filters?: { status?: string }): Promise<FollowUp[]>;
  getFollowUpsByLead(leadId: string): Promise<FollowUp[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: string): Promise<boolean>;
  
  // Property Matching
  getMatchedProperties(leadId: string, tenantId: string): Promise<{ property: Property; score: number; matchReasons: string[] }[]>;
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
    const [created] = await db.insert(schema.tenants).values(tenant).returning();
    return created;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(schema.tenants)
      .set({ ...tenant, updatedAt: new Date() } as any)
      .where(eq(schema.tenants.id, id))
      .returning();
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
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users)
      .set(user)
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  // Properties
  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(schema.properties).where(eq(schema.properties.id, id));
    return property;
  }

  async getPropertiesByTenant(tenantId: string, filters?: {
    type?: string;
    category?: string;
    status?: string;
    featured?: boolean;
  }): Promise<Property[]> {
    const conditions = [eq(schema.properties.tenantId, tenantId)];
    
    if (filters?.type) {
      conditions.push(eq(schema.properties.type, filters.type));
    }
    if (filters?.category) {
      conditions.push(eq(schema.properties.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(schema.properties.status, filters.status));
    }
    if (filters?.featured !== undefined) {
      conditions.push(eq(schema.properties.featured, filters.featured));
    }
    
    return db.select().from(schema.properties)
      .where(and(...conditions))
      .orderBy(desc(schema.properties.createdAt));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(schema.properties).values(property).returning();
    return created;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(schema.properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(schema.properties.id, id))
      .returning();
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await db.delete(schema.properties).where(eq(schema.properties.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
    return lead;
  }

  async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
    return db.select().from(schema.leads)
      .where(eq(schema.leads.tenantId, tenantId))
      .orderBy(desc(schema.leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(schema.leads).values(lead).returning();
    return created;
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(schema.leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(schema.leads.id, id))
      .returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(schema.leads).where(eq(schema.leads.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Interactions
  async getInteractionsByLead(leadId: string): Promise<Interaction[]> {
    return db.select().from(schema.interactions)
      .where(eq(schema.interactions.leadId, leadId))
      .orderBy(desc(schema.interactions.createdAt));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [created] = await db.insert(schema.interactions).values(interaction).returning();
    return created;
  }

  // Visits
  async getVisit(id: string): Promise<Visit | undefined> {
    const [visit] = await db.select().from(schema.visits).where(eq(schema.visits.id, id));
    return visit;
  }

  async getVisitsByTenant(tenantId: string): Promise<Visit[]> {
    return db.select().from(schema.visits)
      .where(eq(schema.visits.tenantId, tenantId))
      .orderBy(desc(schema.visits.scheduledFor));
  }

  async getVisitsByProperty(propertyId: string): Promise<Visit[]> {
    return db.select().from(schema.visits)
      .where(eq(schema.visits.propertyId, propertyId))
      .orderBy(desc(schema.visits.scheduledFor));
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const [created] = await db.insert(schema.visits).values(visit).returning();
    return created;
  }

  async updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const [updated] = await db.update(schema.visits)
      .set(visit)
      .where(eq(schema.visits.id, id))
      .returning();
    return updated;
  }

  async deleteVisit(id: string): Promise<boolean> {
    const result = await db.delete(schema.visits).where(eq(schema.visits.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Contracts
  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
    return contract;
  }

  async getContractsByTenant(tenantId: string): Promise<Contract[]> {
    return db.select().from(schema.contracts)
      .where(eq(schema.contracts.tenantId, tenantId))
      .orderBy(desc(schema.contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(schema.contracts).values(contract).returning();
    return created;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(schema.contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(schema.contracts.id, id))
      .returning();
    return updated;
  }

  // Newsletter
  async subscribeNewsletter(subscription: InsertNewsletter): Promise<Newsletter> {
    const [created] = await db.insert(schema.newsletterSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: schema.newsletterSubscriptions.email,
        set: { active: true }
      })
      .returning();
    return created;
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const [updated] = await db.update(schema.newsletterSubscriptions)
      .set({ active: false })
      .where(eq(schema.newsletterSubscriptions.email, email))
      .returning();
    return !!updated;
  }

  // Global search
  async globalSearch(tenantId: string, query: string): Promise<{
    properties: Property[];
    leads: Lead[];
    contracts: Contract[];
  }> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const propertiesResult = await db.select().from(schema.properties)
      .where(and(
        eq(schema.properties.tenantId, tenantId),
        sql`(LOWER(${schema.properties.title}) LIKE ${searchTerm} OR LOWER(${schema.properties.address}) LIKE ${searchTerm} OR LOWER(${schema.properties.city}) LIKE ${searchTerm})`
      ))
      .limit(10);
    
    const leadsResult = await db.select().from(schema.leads)
      .where(and(
        eq(schema.leads.tenantId, tenantId),
        sql`(LOWER(${schema.leads.name}) LIKE ${searchTerm} OR LOWER(${schema.leads.email}) LIKE ${searchTerm} OR ${schema.leads.phone} LIKE ${searchTerm})`
      ))
      .limit(10);
    
    const contractsResult = await db.select().from(schema.contracts)
      .where(and(
        eq(schema.contracts.tenantId, tenantId),
        sql`CAST(${schema.contracts.value} AS TEXT) LIKE ${searchTerm}`
      ))
      .limit(5);

    return {
      properties: propertiesResult,
      leads: leadsResult,
      contracts: contractsResult,
    };
  }

  // Dashboard stats
  async getDashboardStats(tenantId: string): Promise<{
    totalProperties: number;
    totalLeads: number;
    totalContracts: number;
    totalVisits: number;
  }> {
    const [propertiesCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.properties)
      .where(eq(schema.properties.tenantId, tenantId));
    
    const [leadsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.leads)
      .where(eq(schema.leads.tenantId, tenantId));
    
    const [contractsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.contracts)
      .where(eq(schema.contracts.tenantId, tenantId));
    
    const [visitsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.visits)
      .where(eq(schema.visits.tenantId, tenantId));

    return {
      totalProperties: Number(propertiesCount.count),
      totalLeads: Number(leadsCount.count),
      totalContracts: Number(contractsCount.count),
      totalVisits: Number(visitsCount.count),
    };
  }

  // Owners (Locadores)
  async getOwner(id: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, id));
    return owner;
  }

  async getOwnersByTenant(tenantId: string): Promise<Owner[]> {
    return db.select().from(schema.owners)
      .where(eq(schema.owners.tenantId, tenantId))
      .orderBy(desc(schema.owners.createdAt));
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [created] = await db.insert(schema.owners).values(owner).returning();
    return created;
  }

  async updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [updated] = await db.update(schema.owners)
      .set(owner)
      .where(eq(schema.owners.id, id))
      .returning();
    return updated;
  }

  async deleteOwner(id: string): Promise<boolean> {
    const result = await db.delete(schema.owners).where(eq(schema.owners.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Renters (Inquilinos)
  async getRenter(id: string): Promise<Renter | undefined> {
    const [renter] = await db.select().from(schema.renters).where(eq(schema.renters.id, id));
    return renter;
  }

  async getRentersByTenant(tenantId: string): Promise<Renter[]> {
    return db.select().from(schema.renters)
      .where(eq(schema.renters.tenantId, tenantId))
      .orderBy(desc(schema.renters.createdAt));
  }

  async createRenter(renter: InsertRenter): Promise<Renter> {
    const [created] = await db.insert(schema.renters).values(renter).returning();
    return created;
  }

  async updateRenter(id: string, renter: Partial<InsertRenter>): Promise<Renter | undefined> {
    const [updated] = await db.update(schema.renters)
      .set(renter)
      .where(eq(schema.renters.id, id))
      .returning();
    return updated;
  }

  async deleteRenter(id: string): Promise<boolean> {
    const result = await db.delete(schema.renters).where(eq(schema.renters.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Rental Contracts
  async getRentalContract(id: string): Promise<RentalContract | undefined> {
    const [contract] = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.id, id));
    return contract;
  }

  async getRentalContractsByTenant(tenantId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts)
      .where(eq(schema.rentalContracts.tenantId, tenantId))
      .orderBy(desc(schema.rentalContracts.createdAt));
  }

  async getRentalContractsByOwner(ownerId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts)
      .where(eq(schema.rentalContracts.ownerId, ownerId))
      .orderBy(desc(schema.rentalContracts.createdAt));
  }

  async getRentalContractsByRenter(renterId: string): Promise<RentalContract[]> {
    return db.select().from(schema.rentalContracts)
      .where(eq(schema.rentalContracts.renterId, renterId))
      .orderBy(desc(schema.rentalContracts.createdAt));
  }

  async createRentalContract(contract: InsertRentalContract): Promise<RentalContract> {
    const [created] = await db.insert(schema.rentalContracts).values(contract).returning();
    return created;
  }

  async updateRentalContract(id: string, contract: Partial<InsertRentalContract>): Promise<RentalContract | undefined> {
    const [updated] = await db.update(schema.rentalContracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(schema.rentalContracts.id, id))
      .returning();
    return updated;
  }

  // Rental Payments
  async getRentalPayment(id: string): Promise<RentalPayment | undefined> {
    const [payment] = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.id, id));
    return payment;
  }

  async getRentalPaymentsByTenant(tenantId: string, filters?: { status?: string; month?: string }): Promise<RentalPayment[]> {
    const conditions = [eq(schema.rentalPayments.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(schema.rentalPayments.status, filters.status));
    }
    if (filters?.month) {
      conditions.push(eq(schema.rentalPayments.referenceMonth, filters.month));
    }
    
    return db.select().from(schema.rentalPayments)
      .where(and(...conditions))
      .orderBy(desc(schema.rentalPayments.dueDate));
  }

  async getRentalPaymentsByContract(contractId: string): Promise<RentalPayment[]> {
    return db.select().from(schema.rentalPayments)
      .where(eq(schema.rentalPayments.rentalContractId, contractId))
      .orderBy(desc(schema.rentalPayments.dueDate));
  }

  async createRentalPayment(payment: InsertRentalPayment): Promise<RentalPayment> {
    const [created] = await db.insert(schema.rentalPayments).values(payment).returning();
    return created;
  }

  async updateRentalPayment(id: string, payment: Partial<InsertRentalPayment>): Promise<RentalPayment | undefined> {
    const [updated] = await db.update(schema.rentalPayments)
      .set(payment)
      .where(eq(schema.rentalPayments.id, id))
      .returning();
    return updated;
  }

  // Reports
  async getRentalReportData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    paymentsByMonth: { month: string; received: number; pending: number }[];
    occupancyRate: number;
    activeContracts: number;
  }> {
    const payments = await db.select().from(schema.rentalPayments)
      .where(and(
        eq(schema.rentalPayments.tenantId, tenantId),
        sql`${schema.rentalPayments.dueDate} >= ${startDate}`,
        sql`${schema.rentalPayments.dueDate} <= ${endDate}`
      ));

    const totalReceived = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.paidValue || 0), 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    const now = new Date();
    const totalOverdue = payments
      .filter(p => p.status === 'pending' && new Date(p.dueDate) < now)
      .reduce((sum, p) => sum + Number(p.totalValue || 0), 0);

    const monthlyData: Record<string, { received: number; pending: number }> = {};
    payments.forEach(p => {
      const month = p.referenceMonth;
      if (!monthlyData[month]) {
        monthlyData[month] = { received: 0, pending: 0 };
      }
      if (p.status === 'paid') {
        monthlyData[month].received += Number(p.paidValue || 0);
      } else {
        monthlyData[month].pending += Number(p.totalValue || 0);
      }
    });

    const paymentsByMonth = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      received: data.received,
      pending: data.pending,
    })).sort((a, b) => a.month.localeCompare(b.month));

    const [activeContractsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.rentalContracts)
      .where(and(
        eq(schema.rentalContracts.tenantId, tenantId),
        eq(schema.rentalContracts.status, 'active')
      ));

    const [totalProperties] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.properties)
      .where(and(
        eq(schema.properties.tenantId, tenantId),
        eq(schema.properties.category, 'rent')
      ));

    const activeContracts = Number(activeContractsCount.count);
    const totalRentProps = Number(totalProperties.count);
    const occupancyRate = totalRentProps > 0 ? (activeContracts / totalRentProps) * 100 : 0;

    return {
      totalReceived,
      totalPending,
      totalOverdue,
      paymentsByMonth,
      occupancyRate: Math.round(occupancyRate),
      activeContracts,
    };
  }

  async getOwnerReport(tenantId: string, filters: { ownerId?: string; startDate?: Date; endDate?: Date }) {
    const owners = filters.ownerId 
      ? await db.select().from(schema.owners).where(and(eq(schema.owners.tenantId, tenantId), eq(schema.owners.id, filters.ownerId)))
      : await db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId));

    const contracts = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId));
    const payments = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.tenantId, tenantId));
    const now = new Date();

    return owners.map(owner => {
      const ownerContracts = contracts.filter(c => c.ownerId === owner.id);
      const contractIds = ownerContracts.map(c => c.id);
      const ownerPayments = payments.filter(p => contractIds.includes(p.rentalContractId));
      
      let filteredPayments = ownerPayments;
      if (filters.startDate) {
        filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) <= filters.endDate!);
      }

      const totalBilled = filteredPayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
      const totalReceived = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
      const totalOverdue = filteredPayments.filter(p => p.status === 'pending' && new Date(p.dueDate) < now).reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
      const delinquencyRate = totalBilled > 0 ? (totalOverdue / totalBilled) * 100 : 0;
      const adminFees = ownerContracts.reduce((sum, c) => {
        const fee = c.administrationFee ? (Number(c.rentValue) * Number(c.administrationFee) / 100) : 0;
        return sum + fee;
      }, 0);

      return {
        owner,
        activeContracts: ownerContracts.filter(c => c.status === 'active').length,
        totalContracts: ownerContracts.length,
        totalBilled,
        totalReceived,
        totalOverdue,
        delinquencyRate: Math.round(delinquencyRate * 10) / 10,
        adminFees,
      };
    });
  }

  async getRenterReport(tenantId: string, filters: { renterId?: string; startDate?: Date; endDate?: Date }) {
    const renters = filters.renterId
      ? await db.select().from(schema.renters).where(and(eq(schema.renters.tenantId, tenantId), eq(schema.renters.id, filters.renterId)))
      : await db.select().from(schema.renters).where(eq(schema.renters.tenantId, tenantId));

    const contracts = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId));
    const payments = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.tenantId, tenantId));
    const now = new Date();

    return renters.map(renter => {
      const renterContracts = contracts.filter(c => c.renterId === renter.id);
      const contractIds = renterContracts.map(c => c.id);
      const renterPayments = payments.filter(p => contractIds.includes(p.rentalContractId));

      let filteredPayments = renterPayments;
      if (filters.startDate) {
        filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredPayments = filteredPayments.filter(p => new Date(p.dueDate) <= filters.endDate!);
      }

      const totalScheduled = filteredPayments.reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
      const totalPaid = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.paidValue || 0), 0);
      const overdueCount = filteredPayments.filter(p => p.status === 'pending' && new Date(p.dueDate) < now).length;
      const overdueAmount = filteredPayments.filter(p => p.status === 'pending' && new Date(p.dueDate) < now).reduce((sum, p) => sum + Number(p.totalValue || 0), 0);
      const paidPayments = filteredPayments.filter(p => p.status === 'paid' && p.paidDate).sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime());
      const lastPaymentDate = paidPayments.length > 0 ? paidPayments[0].paidDate : null;

      return {
        renter,
        activeContracts: renterContracts.filter(c => c.status === 'active').length,
        totalScheduled,
        totalPaid,
        overdueCount,
        overdueAmount,
        lastPaymentDate,
        riskLevel: overdueCount >= 3 ? 'high' : overdueCount >= 1 ? 'medium' : 'low',
      };
    });
  }

  async getPaymentDetailedReport(tenantId: string, filters: { ownerId?: string; renterId?: string; status?: string; startDate?: Date; endDate?: Date }) {
    const contracts = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId));
    const owners = await db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId));
    const renters = await db.select().from(schema.renters).where(eq(schema.renters.tenantId, tenantId));
    const properties = await db.select().from(schema.properties).where(eq(schema.properties.tenantId, tenantId));
    let payments = await db.select().from(schema.rentalPayments).where(eq(schema.rentalPayments.tenantId, tenantId));

    if (filters.status) {
      payments = payments.filter(p => p.status === filters.status);
    }
    if (filters.startDate) {
      payments = payments.filter(p => new Date(p.dueDate) >= filters.startDate!);
    }
    if (filters.endDate) {
      payments = payments.filter(p => new Date(p.dueDate) <= filters.endDate!);
    }
    if (filters.ownerId) {
      const ownerContractIds = contracts.filter(c => c.ownerId === filters.ownerId).map(c => c.id);
      payments = payments.filter(p => ownerContractIds.includes(p.rentalContractId));
    }
    if (filters.renterId) {
      const renterContractIds = contracts.filter(c => c.renterId === filters.renterId).map(c => c.id);
      payments = payments.filter(p => renterContractIds.includes(p.rentalContractId));
    }

    return payments.map(payment => {
      const contract = contracts.find(c => c.id === payment.rentalContractId);
      const owner = contract ? owners.find(o => o.id === contract.ownerId) : null;
      const renter = contract ? renters.find(r => r.id === contract.renterId) : null;
      const property = contract ? properties.find(p => p.id === contract.propertyId) : null;

      return {
        ...payment,
        ownerName: owner?.name || '-',
        renterName: renter?.name || '-',
        propertyTitle: property?.title || '-',
        propertyAddress: property?.address || '-',
      };
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  async getOverdueReport(tenantId: string) {
    const now = new Date();
    const contracts = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId));
    const owners = await db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId));
    const renters = await db.select().from(schema.renters).where(eq(schema.renters.tenantId, tenantId));
    const properties = await db.select().from(schema.properties).where(eq(schema.properties.tenantId, tenantId));
    const payments = await db.select().from(schema.rentalPayments)
      .where(and(eq(schema.rentalPayments.tenantId, tenantId), eq(schema.rentalPayments.status, 'pending')));

    const overduePayments = payments.filter(p => new Date(p.dueDate) < now);

    const bucket0_30: any[] = [];
    const bucket31_60: any[] = [];
    const bucket61plus: any[] = [];

    overduePayments.forEach(payment => {
      const daysOverdue = Math.floor((now.getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const contract = contracts.find(c => c.id === payment.rentalContractId);
      const owner = contract ? owners.find(o => o.id === contract.ownerId) : null;
      const renter = contract ? renters.find(r => r.id === contract.renterId) : null;
      const property = contract ? properties.find(p => p.id === contract.propertyId) : null;

      const item = {
        ...payment,
        daysOverdue,
        ownerName: owner?.name || '-',
        renterName: renter?.name || '-',
        renterPhone: renter?.phone || '-',
        propertyTitle: property?.title || '-',
      };

      if (daysOverdue <= 30) bucket0_30.push(item);
      else if (daysOverdue <= 60) bucket31_60.push(item);
      else bucket61plus.push(item);
    });

    return {
      bucket0_30,
      bucket31_60,
      bucket61plus,
      total0_30: bucket0_30.reduce((sum, p) => sum + Number(p.totalValue || 0), 0),
      total31_60: bucket31_60.reduce((sum, p) => sum + Number(p.totalValue || 0), 0),
      total61plus: bucket61plus.reduce((sum, p) => sum + Number(p.totalValue || 0), 0),
    };
  }

  // Sale Proposals
  async getSaleProposal(id: string): Promise<SaleProposal | undefined> {
    const [proposal] = await db.select().from(schema.saleProposals).where(eq(schema.saleProposals.id, id));
    return proposal;
  }

  async getSaleProposalsByTenant(tenantId: string): Promise<SaleProposal[]> {
    return db.select().from(schema.saleProposals)
      .where(eq(schema.saleProposals.tenantId, tenantId))
      .orderBy(desc(schema.saleProposals.createdAt));
  }

  async getSaleProposalsByProperty(propertyId: string): Promise<SaleProposal[]> {
    return db.select().from(schema.saleProposals)
      .where(eq(schema.saleProposals.propertyId, propertyId))
      .orderBy(desc(schema.saleProposals.createdAt));
  }

  async createSaleProposal(proposal: InsertSaleProposal): Promise<SaleProposal> {
    const [created] = await db.insert(schema.saleProposals).values(proposal).returning();
    return created;
  }

  async updateSaleProposal(id: string, proposal: Partial<InsertSaleProposal>): Promise<SaleProposal | undefined> {
    const [updated] = await db.update(schema.saleProposals)
      .set({ ...proposal, updatedAt: new Date() })
      .where(eq(schema.saleProposals.id, id))
      .returning();
    return updated;
  }

  async deleteSaleProposal(id: string): Promise<boolean> {
    const result = await db.delete(schema.saleProposals).where(eq(schema.saleProposals.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Property Sales
  async getPropertySale(id: string): Promise<PropertySale | undefined> {
    const [sale] = await db.select().from(schema.propertySales).where(eq(schema.propertySales.id, id));
    return sale;
  }

  async getPropertySalesByTenant(tenantId: string): Promise<PropertySale[]> {
    return db.select().from(schema.propertySales)
      .where(eq(schema.propertySales.tenantId, tenantId))
      .orderBy(desc(schema.propertySales.saleDate));
  }

  async createPropertySale(sale: InsertPropertySale): Promise<PropertySale> {
    const [created] = await db.insert(schema.propertySales).values(sale).returning();
    return created;
  }

  async updatePropertySale(id: string, sale: Partial<InsertPropertySale>): Promise<PropertySale | undefined> {
    const [updated] = await db.update(schema.propertySales)
      .set({ ...sale, updatedAt: new Date() })
      .where(eq(schema.propertySales.id, id))
      .returning();
    return updated;
  }

  // Finance Categories
  async getFinanceCategory(id: string): Promise<FinanceCategory | undefined> {
    const [category] = await db.select().from(schema.financeCategories).where(eq(schema.financeCategories.id, id));
    return category;
  }

  async getFinanceCategoriesByTenant(tenantId: string): Promise<FinanceCategory[]> {
    return db.select().from(schema.financeCategories)
      .where(eq(schema.financeCategories.tenantId, tenantId))
      .orderBy(schema.financeCategories.name);
  }

  async createFinanceCategory(category: InsertFinanceCategory): Promise<FinanceCategory> {
    const [created] = await db.insert(schema.financeCategories).values(category).returning();
    return created;
  }

  async updateFinanceCategory(id: string, category: Partial<InsertFinanceCategory>): Promise<FinanceCategory | undefined> {
    const [updated] = await db.update(schema.financeCategories)
      .set(category)
      .where(eq(schema.financeCategories.id, id))
      .returning();
    return updated;
  }

  async deleteFinanceCategory(id: string): Promise<boolean> {
    const result = await db.delete(schema.financeCategories).where(eq(schema.financeCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Finance Entries
  async getFinanceEntry(id: string): Promise<FinanceEntry | undefined> {
    const [entry] = await db.select().from(schema.financeEntries).where(eq(schema.financeEntries.id, id));
    return entry;
  }

  async getFinanceEntriesByTenant(tenantId: string, filters?: { startDate?: Date; endDate?: Date; flow?: string; categoryId?: string }): Promise<FinanceEntry[]> {
    const conditions = [eq(schema.financeEntries.tenantId, tenantId)];
    
    if (filters?.flow) {
      conditions.push(eq(schema.financeEntries.flow, filters.flow));
    }
    if (filters?.categoryId) {
      conditions.push(eq(schema.financeEntries.categoryId, filters.categoryId));
    }
    if (filters?.startDate) {
      conditions.push(sql`${schema.financeEntries.entryDate} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${schema.financeEntries.entryDate} <= ${filters.endDate}`);
    }
    
    return db.select().from(schema.financeEntries)
      .where(and(...conditions))
      .orderBy(desc(schema.financeEntries.entryDate));
  }

  async createFinanceEntry(entry: InsertFinanceEntry): Promise<FinanceEntry> {
    const [created] = await db.insert(schema.financeEntries).values(entry).returning();
    return created;
  }

  async updateFinanceEntry(id: string, entry: Partial<InsertFinanceEntry>): Promise<FinanceEntry | undefined> {
    const [updated] = await db.update(schema.financeEntries)
      .set(entry)
      .where(eq(schema.financeEntries.id, id))
      .returning();
    return updated;
  }

  async deleteFinanceEntry(id: string): Promise<boolean> {
    const result = await db.delete(schema.financeEntries).where(eq(schema.financeEntries.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Lead Tags
  async getLeadTag(id: string): Promise<LeadTag | undefined> {
    const [tag] = await db.select().from(schema.leadTags).where(eq(schema.leadTags.id, id));
    return tag;
  }

  async getLeadTagsByTenant(tenantId: string): Promise<LeadTag[]> {
    return db.select().from(schema.leadTags)
      .where(eq(schema.leadTags.tenantId, tenantId))
      .orderBy(schema.leadTags.name);
  }

  async createLeadTag(tag: InsertLeadTag): Promise<LeadTag> {
    const [created] = await db.insert(schema.leadTags).values(tag).returning();
    return created;
  }

  async updateLeadTag(id: string, tag: Partial<InsertLeadTag>): Promise<LeadTag | undefined> {
    const [updated] = await db.update(schema.leadTags)
      .set(tag)
      .where(eq(schema.leadTags.id, id))
      .returning();
    return updated;
  }

  async deleteLeadTag(id: string): Promise<boolean> {
    await db.delete(schema.leadTagLinks).where(eq(schema.leadTagLinks.tagId, id));
    const result = await db.delete(schema.leadTags).where(eq(schema.leadTags.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Lead Tag Links
  async getTagsByLead(leadId: string): Promise<LeadTag[]> {
    const links = await db.select().from(schema.leadTagLinks).where(eq(schema.leadTagLinks.leadId, leadId));
    if (links.length === 0) return [];
    const tagIds = links.map(l => l.tagId);
    return db.select().from(schema.leadTags).where(sql`${schema.leadTags.id} = ANY(${tagIds})`);
  }

  async getTagsForAllLeads(tenantId: string): Promise<Record<string, LeadTag[]>> {
    const leads = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.tenantId, tenantId));
    if (leads.length === 0) return {};
    
    const leadIds = leads.map(l => l.id);
    const links = await db.select().from(schema.leadTagLinks).where(sql`${schema.leadTagLinks.leadId} = ANY(${leadIds})`);
    if (links.length === 0) return {};
    
    const tagIds = Array.from(new Set(links.map(l => l.tagId)));
    const tags = await db.select().from(schema.leadTags).where(sql`${schema.leadTags.id} = ANY(${tagIds})`);
    const tagsById = new Map(tags.map(t => [t.id, t]));
    
    const result: Record<string, LeadTag[]> = {};
    for (const link of links) {
      const tag = tagsById.get(link.tagId);
      if (tag) {
        if (!result[link.leadId]) result[link.leadId] = [];
        result[link.leadId].push(tag);
      }
    }
    return result;
  }

  async addTagToLead(link: InsertLeadTagLink): Promise<LeadTagLink> {
    const [created] = await db.insert(schema.leadTagLinks).values(link).returning();
    return created;
  }

  async removeTagFromLead(leadId: string, tagId: string): Promise<boolean> {
    const result = await db.delete(schema.leadTagLinks)
      .where(and(eq(schema.leadTagLinks.leadId, leadId), eq(schema.leadTagLinks.tagId, tagId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Follow-ups
  async getFollowUp(id: string): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(schema.followUps).where(eq(schema.followUps.id, id));
    return followUp;
  }

  async getFollowUpsByTenant(tenantId: string, filters?: { status?: string }): Promise<FollowUp[]> {
    const conditions = [eq(schema.followUps.tenantId, tenantId)];
    if (filters?.status) {
      conditions.push(eq(schema.followUps.status, filters.status));
    }
    return db.select().from(schema.followUps)
      .where(and(...conditions))
      .orderBy(schema.followUps.dueAt);
  }

  async getFollowUpsByLead(leadId: string): Promise<FollowUp[]> {
    return db.select().from(schema.followUps)
      .where(eq(schema.followUps.leadId, leadId))
      .orderBy(desc(schema.followUps.dueAt));
  }

  async createFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const [created] = await db.insert(schema.followUps).values(followUp).returning();
    return created;
  }

  async updateFollowUp(id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined> {
    const [updated] = await db.update(schema.followUps)
      .set(followUp)
      .where(eq(schema.followUps.id, id))
      .returning();
    return updated;
  }

  async deleteFollowUp(id: string): Promise<boolean> {
    const result = await db.delete(schema.followUps).where(eq(schema.followUps.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
      
      // Price/Budget match (40 points max)
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
      
      // Type match (20 points)
      if (lead.preferredType && lead.preferredType === property.type) {
        score += 20;
        matchReasons.push(`Tipo: ${property.type}`);
      }
      
      // Category match (15 points)
      if (lead.preferredCategory && lead.preferredCategory === property.category) {
        score += 15;
        matchReasons.push(`Categoria: ${property.category}`);
      }
      
      // City match (15 points)
      if (lead.preferredCity && property.city?.toLowerCase().includes(lead.preferredCity.toLowerCase())) {
        score += 15;
        matchReasons.push(`Cidade: ${property.city}`);
      }
      
      // Neighborhood match (10 points)
      if (lead.preferredNeighborhood && property.address?.toLowerCase().includes(lead.preferredNeighborhood.toLowerCase())) {
        score += 10;
        matchReasons.push(`Bairro: ${lead.preferredNeighborhood}`);
      }
      
      // Bedrooms match (10 points)
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
}

export const storage = new DbStorage();
