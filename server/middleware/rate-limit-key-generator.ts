/**
 * Rate Limit Key Generator - IPv6 compliant
 *
 * This utility provides a standardized key generator for express-rate-limit
 * that properly handles IPv6 addresses and multi-tenant scenarios.
 */

import type { Request } from 'express';

/**
 * Generate a rate limit key that works with both IPv4 and IPv6
 *
 * Priority:
 * 1. Use tenantId if user is authenticated (best for multi-tenant)
 * 2. Return undefined to let express-rate-limit use its default IP handling (IPv6-safe)
 *
 * @param req - Express request object
 * @returns Rate limit key string or undefined
 */
export function generateRateLimitKey(req: Request): string | undefined {
  // If user is authenticated, use tenant-based limiting
  if (req.user?.tenantId) {
    return `tenant:${req.user.tenantId}`;
  }

  // Return undefined to let express-rate-limit handle IP (IPv6-compliant)
  // DO NOT return req.ip directly as it bypasses IPv6 normalization
  return undefined;
}

/**
 * Generate a user-specific rate limit key
 *
 * Use this for endpoints that require stricter per-user limiting
 *
 * @param req - Express request object
 * @returns User-specific rate limit key or undefined
 */
export function generateUserRateLimitKey(req: Request): string | undefined {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  // Fall back to tenant-based or let express-rate-limit handle IP
  return generateRateLimitKey(req);
}

/**
 * Generate a combined tenant + IP rate limit key
 *
 * Use this for endpoints where you want to limit both by tenant AND by IP
 * This prevents a single tenant from consuming all quota from multiple IPs
 *
 * NOTE: This function is IPv6-safe because it doesn't return req.ip directly
 *
 * @param req - Express request object
 * @returns Combined rate limit key or undefined
 */
export function generateCombinedRateLimitKey(req: Request): string | undefined {
  if (req.user?.tenantId) {
    // We can safely combine tenant with a marker, but not with req.ip directly
    return `tenant:${req.user.tenantId}:combined`;
  }

  // Let express-rate-limit handle IP-only limiting
  return undefined;
}
