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
  Newsletter, InsertNewsletter
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
}

export const storage = new DbStorage();
