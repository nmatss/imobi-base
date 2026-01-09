/**
 * ================================================================
 * IMOBIBASE - CACHED STORAGE LAYER (INTEGRATION EXAMPLE)
 * Created: 2024-12-25
 * Purpose: Show how to integrate Redis cache with existing storage
 * ================================================================
 *
 * INTEGRATION GUIDE:
 * This file demonstrates how to integrate the cache layer with
 * the existing storage.ts file. You can either:
 *
 * 1. Replace methods in storage.ts with these cached versions
 * 2. Create a new CachedStorage class that extends Storage
 * 3. Use a decorator pattern to wrap existing methods
 *
 * BEFORE (storage.ts):
 * async getPropertiesByTenant(tenantId: string, filters?: {...}): Promise<Property[]> {
 *   return db.select()...
 * }
 *
 * AFTER (with cache):
 * async getPropertiesByTenant(tenantId: string, filters?: {...}): Promise<Property[]> {
 *   return getCachedProperties(tenantId, filters, async () => {
 *     return db.select()...
 *   });
 * }
 */

import {
  getCachedProperties,
  getCachedLeads,
  getCachedDashboardStats,
  getCachedRentalContracts,
  getCachedRentalPayments,
  InvalidateCache,
} from './cache/query-cache';
import type { Property, Lead, InsertProperty, InsertLead } from '@shared/schema';

// ================================================================
// EXAMPLE 1: CACHED PROPERTIES QUERY
// ================================================================

/**
 * BEFORE: Direct database query
 */
/*
async getPropertiesByTenant(
  tenantId: string,
  filters?: { type?: string; category?: string; status?: string; featured?: boolean }
): Promise<Property[]> {
  const conditions = [eq(schema.properties.tenantId, tenantId)];
  if (filters?.type) conditions.push(eq(schema.properties.type, filters.type));
  if (filters?.category) conditions.push(eq(schema.properties.category, filters.category));
  if (filters?.status) conditions.push(eq(schema.properties.status, filters.status));
  if (filters?.featured !== undefined) conditions.push(eq(schema.properties.featured, filters.featured));

  return db.select()
    .from(schema.properties)
    .where(and(...conditions))
    .orderBy(desc(schema.properties.createdAt));
}
*/

/**
 * AFTER: With Redis cache (5 min TTL)
 * Performance: 10-50x faster on cache hit
 */
/*
async getPropertiesByTenant(
  tenantId: string,
  filters?: { type?: string; category?: string; status?: string; featured?: boolean }
): Promise<Property[]> {
  // Wrap the original query in cache helper
  return getCachedProperties(tenantId, filters, async () => {
    const conditions = [eq(schema.properties.tenantId, tenantId)];
    if (filters?.type) conditions.push(eq(schema.properties.type, filters.type));
    if (filters?.category) conditions.push(eq(schema.properties.category, filters.category));
    if (filters?.status) conditions.push(eq(schema.properties.status, filters.status));
    if (filters?.featured !== undefined) conditions.push(eq(schema.properties.featured, filters.featured));

    return db.select()
      .from(schema.properties)
      .where(and(...conditions))
      .orderBy(desc(schema.properties.createdAt));
  });
}
*/

// ================================================================
// EXAMPLE 2: CACHED LEADS QUERY
// ================================================================

/**
 * BEFORE: Direct database query
 */
/*
async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  return db.select()
    .from(schema.leads)
    .where(eq(schema.leads.tenantId, tenantId))
    .orderBy(desc(schema.leads.createdAt));
}
*/

/**
 * AFTER: With Redis cache (3 min TTL)
 * Performance: 10-30x faster on cache hit
 */
/*
async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  return getCachedLeads(tenantId, async () => {
    return db.select()
      .from(schema.leads)
      .where(eq(schema.leads.tenantId, tenantId))
      .orderBy(desc(schema.leads.createdAt));
  });
}
*/

// ================================================================
// EXAMPLE 3: CACHE INVALIDATION ON CREATE/UPDATE/DELETE
// ================================================================

/**
 * BEFORE: Create property without cache invalidation
 */
/*
async createProperty(property: InsertProperty): Promise<Property> {
  const id = generateId();
  const data = { ...property, id, createdAt: now(), updatedAt: now() };
  const [created] = await db.insert(schema.properties).values(data).returning();
  return created;
}
*/

/**
 * AFTER: Create property WITH cache invalidation
 */
/*
async createProperty(property: InsertProperty): Promise<Property> {
  const id = generateId();
  const data = { ...property, id, createdAt: now(), updatedAt: now() };
  const [created] = await db.insert(schema.properties).values(data).returning();

  // Invalidate cache after mutation
  await InvalidateCache.onPropertyChange(property.tenantId);

  return created;
}
*/

/**
 * Update property WITH cache invalidation
 */
/*
async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
  const data = { ...property, updatedAt: now() };
  const [updated] = await db.update(schema.properties)
    .set(data)
    .where(eq(schema.properties.id, id))
    .returning();

  if (updated) {
    // Invalidate cache for this property and tenant
    await InvalidateCache.onPropertyChange(updated.tenantId, id);
  }

  return updated;
}
*/

/**
 * Delete property WITH cache invalidation
 */
/*
async deleteProperty(id: string): Promise<boolean> {
  // Get property first to know which tenant to invalidate
  const property = await this.getProperty(id);

  await db.delete(schema.properties).where(eq(schema.properties.id, id));

  if (property) {
    await InvalidateCache.onPropertyChange(property.tenantId, id);
  }

  return true;
}
*/

// ================================================================
// EXAMPLE 4: DASHBOARD STATS WITH CACHE
// ================================================================

/**
 * Dashboard stats are perfect for caching (1 min TTL)
 * These queries are expensive and run on every page load
 */
/*
async getDashboardStats(tenantId: string): Promise<DashboardStats> {
  return getCachedDashboardStats(tenantId, async () => {
    // Expensive aggregation queries
    const properties = await this.getPropertiesByTenant(tenantId);
    const leads = await this.getLeadsByTenant(tenantId);
    const contracts = await this.getRentalContractsByTenant(tenantId);
    const payments = await this.getRentalPaymentsByTenant(tenantId);

    // Calculate stats
    return {
      totalProperties: properties.length,
      availableProperties: properties.filter(p => p.status === 'available').length,
      totalLeads: leads.length,
      activeLeads: leads.filter(l => l.status === 'active').length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      monthlyRevenue: contracts.reduce((sum, c) => sum + Number(c.rentValue || 0), 0),
      pendingPayments: payments.filter(p => p.status === 'pending').length,
    };
  });
}
*/

// ================================================================
// EXAMPLE 5: N+1 QUERY FIX WITH EAGER LOADING
// ================================================================

/**
 * BEFORE: N+1 Query Problem
 * This makes 1 query for payments + N queries for contracts
 */
/*
async getPaymentsWithContracts(tenantId: string): Promise<any[]> {
  const payments = await this.getRentalPaymentsByTenant(tenantId);

  // N+1 PROBLEM: Loop making individual queries
  const enriched = [];
  for (const payment of payments) {
    const contract = await this.getRentalContract(payment.rentalContractId); // ❌ N queries
    enriched.push({ ...payment, contract });
  }

  return enriched;
}
*/

/**
 * AFTER: Fixed with eager loading using Maps
 * Makes only 2 queries total (1 for payments + 1 for all contracts)
 */
/*
async getPaymentsWithContracts(tenantId: string): Promise<any[]> {
  // Fetch all data in parallel
  const [payments, contracts] = await Promise.all([
    this.getRentalPaymentsByTenant(tenantId),
    this.getRentalContractsByTenant(tenantId),
  ]);

  // Create lookup map (O(n) instead of O(n²))
  const contractsMap = new Map(contracts.map(c => [c.id, c]));

  // Enrich data using map lookup (O(1) per item)
  const enriched = payments.map(payment => ({
    ...payment,
    contract: contractsMap.get(payment.rentalContractId),
  }));

  return enriched;
}
*/

// ================================================================
// EXAMPLE 6: USING DRIZZLE JOINS (BEST APPROACH)
// ================================================================

/**
 * BEST: Use SQL JOIN for truly efficient queries
 * This makes only 1 query with all data
 */
/*
import { eq } from 'drizzle-orm';

async getPaymentsWithContractsJoin(tenantId: string): Promise<any[]> {
  // Single query with JOIN - most efficient!
  const results = await db
    .select({
      payment: schema.rentalPayments,
      contract: schema.rentalContracts,
      property: schema.properties,
      owner: schema.owners,
      renter: schema.renters,
    })
    .from(schema.rentalPayments)
    .leftJoin(
      schema.rentalContracts,
      eq(schema.rentalPayments.rentalContractId, schema.rentalContracts.id)
    )
    .leftJoin(
      schema.properties,
      eq(schema.rentalContracts.propertyId, schema.properties.id)
    )
    .leftJoin(
      schema.owners,
      eq(schema.rentalContracts.ownerId, schema.owners.id)
    )
    .leftJoin(
      schema.renters,
      eq(schema.rentalContracts.renterId, schema.renters.id)
    )
    .where(eq(schema.rentalPayments.tenantId, tenantId));

  return results.map(row => ({
    ...row.payment,
    contract: row.contract,
    property: row.property,
    owner: row.owner,
    renter: row.renter,
  }));
}
*/

// ================================================================
// PERFORMANCE COMPARISON
// ================================================================

/**
 * QUERY PERFORMANCE COMPARISON:
 *
 * 1. N+1 Queries (WORST):
 *    - 1 query for payments (100 results)
 *    - 100 queries for individual contracts
 *    - Total: 101 queries
 *    - Time: ~5-10 seconds
 *    - ❌ NEVER DO THIS
 *
 * 2. Maps Approach (GOOD):
 *    - 1 query for payments (100 results)
 *    - 1 query for all contracts
 *    - Total: 2 queries
 *    - Time: ~200-500ms
 *    - ✅ Good for complex joins
 *
 * 3. SQL JOIN (BEST):
 *    - 1 query with JOIN
 *    - Total: 1 query
 *    - Time: ~100-300ms
 *    - ✅ Best performance
 *
 * 4. Cached Query (FASTEST):
 *    - 0 database queries (cache hit)
 *    - Time: ~10-50ms
 *    - ⚡ 100x faster!
 */

// ================================================================
// INTEGRATION STEPS
// ================================================================

/**
 * STEP 1: Add cache imports to storage.ts
 * ```typescript
 * import {
 *   getCachedProperties,
 *   getCachedLeads,
 *   InvalidateCache,
 * } from './cache/query-cache';
 * ```
 *
 * STEP 2: Wrap expensive queries
 * Replace direct queries with cached wrappers
 *
 * STEP 3: Add cache invalidation
 * Add InvalidateCache calls after CREATE/UPDATE/DELETE
 *
 * STEP 4: Fix N+1 queries
 * Use Maps or SQL JOINs instead of loops
 *
 * STEP 5: Add pagination
 * Use pagination helpers for large datasets
 */

// ================================================================
// MONITORING
// ================================================================

/**
 * Monitor cache performance in production:
 *
 * 1. Cache hit rate (aim for >80%)
 * 2. Average query time (before/after)
 * 3. Redis memory usage
 * 4. Database query count (should decrease significantly)
 *
 * Access cache stats endpoint:
 * GET /api/admin/cache-stats
 */

export const PERFORMANCE_TIPS = `
PERFORMANCE OPTIMIZATION SUMMARY
================================

✅ DO:
- Use getCached* wrappers for frequent queries
- Invalidate cache after mutations
- Use Maps for in-memory lookups
- Use SQL JOINs for related data
- Add indexes on foreign keys
- Use pagination for large datasets

❌ DON'T:
- Make queries inside loops (N+1)
- Forget to invalidate cache
- Cache user-specific data without isolation
- Use cache for real-time data
- Query without proper indexes

EXPECTED PERFORMANCE GAINS:
- Properties listing: 10-50x faster
- Dashboard stats: 20-100x faster
- Lead queries: 10-30x faster
- Financial reports: 15-50x faster
- Overall backend: 5-10x improvement

CACHE TTL STRATEGY:
- Dashboard stats: 1 min (fresh data)
- Properties list: 5 min (moderate changes)
- Leads list: 3 min (frequent updates)
- Reports: 10 min (expensive queries)
- Static data: 1 hour (rarely changes)
`;
