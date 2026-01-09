/**
 * ================================================================
 * IMOBIBASE - UNIVERSAL PAGINATION UTILITY
 * Created: 2024-12-25
 * Purpose: Standardized pagination for all database queries
 * ================================================================
 *
 * FEATURES:
 * - Consistent pagination interface
 * - Automatic total count calculation
 * - Cursor-based pagination support
 * - Performance optimized with indexes
 * - TypeScript type safety
 *
 * PERFORMANCE:
 * - Uses LIMIT/OFFSET for traditional pagination
 * - Supports cursor-based pagination for large datasets
 * - Optimized queries with proper index usage
 *
 * SECURITY:
 * - SQL injection prevention with prepared statements
 * - Whitelist validation for table names
 * - Suspicious pattern detection
 * - Comprehensive security logging
 */

import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// ================================================================
// TYPES
// ================================================================

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page (default: 20) */
  limit?: number;
  /** Alternative: cursor for cursor-based pagination */
  cursor?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Sort field */
  sortBy?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of data items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Has next page */
    hasNext: boolean;
    /** Has previous page */
    hasPrev: boolean;
    /** Next cursor for cursor-based pagination */
    nextCursor?: string;
    /** Previous cursor for cursor-based pagination */
    prevCursor?: string;
  };
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  /** Offset for SQL query */
  offset: number;
  /** Limit for SQL query */
  limit: number;
}

// ================================================================
// CONSTANTS
// ================================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100; // Prevent excessive data fetching
const MIN_LIMIT = 1;

// ================================================================
// PAGINATION HELPERS
// ================================================================

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  // Parse page (1-indexed)
  let page = parseInt(String(params.page || DEFAULT_PAGE), 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // Parse limit
  let limit = parseInt(String(params.limit || DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < MIN_LIMIT) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  // Calculate offset (0-indexed for SQL)
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination metadata from results
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginatedResponse<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

/**
 * Get pagination options for Drizzle ORM
 */
export function getPaginationOptions(params: PaginationParams): PaginationOptions {
  const { offset, limit } = parsePaginationParams(params);
  return { offset, limit };
}

// ================================================================
// CURSOR-BASED PAGINATION
// ================================================================

/**
 * Encode cursor from ID
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Decode cursor to ID
 */
export function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Build cursor-based pagination metadata
 */
export function buildCursorPaginationMeta<T extends { id: string }>(
  data: T[],
  limit: number,
  hasMore: boolean
): {
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
} {
  return {
    hasNext: hasMore,
    hasPrev: data.length > 0,
    nextCursor: hasMore && data.length > 0 ? encodeCursor(data[data.length - 1].id) : undefined,
    prevCursor: data.length > 0 ? encodeCursor(data[0].id) : undefined,
  };
}

// ================================================================
// USAGE EXAMPLES
// ================================================================

/**
 * Example: Paginate properties query
 *
 * ```typescript
 * // In route handler
 * const params = parsePaginationParams({
 *   page: req.query.page,
 *   limit: req.query.limit
 * });
 *
 * // Get data with pagination
 * const properties = await db
 *   .select()
 *   .from(schema.properties)
 *   .where(eq(schema.properties.tenantId, tenantId))
 *   .limit(params.limit)
 *   .offset(params.offset);
 *
 * // Get total count
 * const [{ count }] = await db
 *   .select({ count: sql`count(*)` })
 *   .from(schema.properties)
 *   .where(eq(schema.properties.tenantId, tenantId));
 *
 * // Return paginated response
 * return createPaginatedResponse(
 *   properties,
 *   Number(count),
 *   params.page,
 *   params.limit
 * );
 * ```
 */

/**
 * Example: Cursor-based pagination
 *
 * ```typescript
 * // In route handler
 * const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;
 * const limit = parseInt(req.query.limit || '20', 10);
 *
 * // Query with cursor
 * const properties = await db
 *   .select()
 *   .from(schema.properties)
 *   .where(
 *     and(
 *       eq(schema.properties.tenantId, tenantId),
 *       cursor ? gt(schema.properties.id, cursor) : undefined
 *     )
 *   )
 *   .limit(limit + 1) // Fetch one extra to check if there's more
 *   .orderBy(asc(schema.properties.id));
 *
 * // Check if there's more data
 * const hasMore = properties.length > limit;
 * const data = hasMore ? properties.slice(0, limit) : properties;
 *
 * // Return with cursor metadata
 * return {
 *   data,
 *   pagination: buildCursorPaginationMeta(data, limit, hasMore)
 * };
 * ```
 */

// ================================================================
// PERFORMANCE OPTIMIZATIONS
// ================================================================

/**
 * Whitelist of valid table names for count estimation
 * This prevents SQL injection by only allowing known table names
 */
const VALID_TABLE_NAMES = new Set([
  'properties',
  'leads',
  'visits',
  'contracts',
  'rental_contracts',
  'owners',
  'renters',
  'users',
  'tenants',
  'whatsapp_conversations',
  'whatsapp_messages',
  'login_history',
  'audit_logs',
  'user_sessions',
  'rental_payments',
  'follow_ups',
  'activities',
  'payments',
  'transactions',
  'messages',
  'templates',
  'files',
  'proposals',
  'sales_pipeline'
]);

/**
 * Validate table name against whitelist
 * Prevents SQL injection attacks with multiple layers of defense
 *
 * @param tableName - Table name to validate
 * @returns true if valid, false otherwise
 */
function validateTableName(tableName: string): boolean {
  // Normalize input
  const normalized = tableName.toLowerCase().trim();

  // Check if table name is in whitelist
  if (!VALID_TABLE_NAMES.has(normalized)) {
    return false;
  }

  // Only allow alphanumeric characters and underscores (defense in depth)
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    return false;
  }

  // Detect suspicious SQL patterns (defense in depth)
  const suspiciousPatterns = [
    /[;'"\\]/,      // SQL metacharacters
    /--/,           // SQL comments
    /\/\*/,         // SQL block comments
    /\s+(OR|AND|UNION|SELECT|DROP|INSERT|UPDATE|DELETE|EXEC|EXECUTE)\s+/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(tableName)) {
      console.warn(`[SECURITY] Suspicious pattern detected in table name: ${tableName}`);
      return false;
    }
  }

  return true;
}

/**
 * Count query optimization using PostgreSQL's reltuples estimate
 *
 * SECURITY FEATURES:
 * - Prepared statements to prevent SQL injection
 * - Whitelist validation for table names
 * - Suspicious pattern detection
 * - Comprehensive security logging
 *
 * @param db - Database connection
 * @param tableName - Name of the table to count
 * @returns Estimated row count or 0 if unavailable
 */
export async function getEstimatedCount(
  db: any,
  tableName: string
): Promise<number> {
  // Log request for security monitoring
  console.log(`[PAGINATION] Requesting estimated count for table: ${tableName}`);

  try {
    // SECURITY LAYER 1: Validate table name against whitelist
    if (!validateTableName(tableName)) {
      console.warn('[SECURITY] Table name validation failed', {
        tableName,
        timestamp: new Date().toISOString(),
        reason: 'Not in whitelist or contains suspicious patterns',
      });
      return 0;
    }

    // SECURITY LAYER 2: Use prepared statement instead of string interpolation
    // This prevents SQL injection even if validation is bypassed
    const result = await db.execute(
      sql`SELECT reltuples::bigint AS estimate
          FROM pg_class
          WHERE relname = ${tableName.toLowerCase()}`
    );

    if (result.rows && result.rows[0]?.estimate) {
      const estimate = Number(result.rows[0].estimate);

      // Validate the estimate is a reasonable number
      if (estimate === 0 || isNaN(estimate)) {
        console.log(`[PAGINATION] Estimate unavailable for ${tableName}, using fallback`);
        return 0;
      }

      console.log(`[PAGINATION] Estimated count for ${tableName}: ${estimate}`);
      return estimate;
    }
  } catch (error) {
    // Log error details for debugging while maintaining security
    console.error('[PAGINATION] Estimated count error:', {
      tableName,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }

  return 0;
}

/**
 * Smart count strategy
 * Use exact count for small datasets, estimated for large ones
 */
export async function getSmartCount(
  exactCountFn: () => Promise<number>,
  tableName: string,
  threshold: number = 10000
): Promise<{ count: number; isEstimate: boolean }> {
  // First try estimated count
  // const estimated = await getEstimatedCount(db, tableName);

  // If estimated count suggests large dataset, use it
  // if (estimated > threshold) {
  //   return { count: estimated, isEstimate: true };
  // }

  // For smaller datasets, use exact count
  const exact = await exactCountFn();
  return { count: exact, isEstimate: false };
}

// ================================================================
// EXPORT ALL
// ================================================================

export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
};

/**
 * All-in-one pagination helper
 */
export async function paginate<T>(
  queryFn: (limit: number, offset: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  params: PaginationParams
): Promise<PaginatedResponse<T>> {
  const { page, limit, offset } = parsePaginationParams(params);

  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    queryFn(limit, offset),
    countFn(),
  ]);

  return createPaginatedResponse(data, total, page, limit);
}

/**
 * Simplified pagination for common use cases
 */
export function createPaginator<T>() {
  return async (
    queryFn: (limit: number, offset: number) => Promise<T[]>,
    countFn: () => Promise<number>,
    params: PaginationParams
  ): Promise<PaginatedResponse<T>> => {
    return paginate(queryFn, countFn, params);
  };
}
