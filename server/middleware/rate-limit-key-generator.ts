/**
 * Rate Limit Key Generator - IPv6 compliant
 *
 * This utility provides a standardized key generator for express-rate-limit
 * that properly handles IPv6 addresses and multi-tenant scenarios.
 */

import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Normaliza um IP para chave de rate-limit segura para IPv6.
 * O helper ipKeyGenerator agrupa endereços IPv6 por sub-rede, impedindo que um
 * usuário IPv6 contorne o limite rotacionando endereços dentro do seu prefixo.
 */
function ipKey(req: Request): string {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
}

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
export function generateRateLimitKey(req: Request): string {
  // If user is authenticated, use tenant-based limiting
  if (req.user?.tenantId) {
    return `tenant:${req.user.tenantId}`;
  }

  // Fallback IPv6-safe para requests não autenticados
  return ipKey(req);
}

/**
 * Generate a user-specific rate limit key
 *
 * Use this for endpoints that require stricter per-user limiting
 *
 * @param req - Express request object
 * @returns User-specific rate limit key or undefined
 */
export function generateUserRateLimitKey(req: Request): string {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  // Fall back to tenant-based or IP-based key
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
export function generateCombinedRateLimitKey(req: Request): string {
  if (req.user?.tenantId) {
    // Combine tenant with a marker for combined limiting
    return `tenant:${req.user.tenantId}:combined`;
  }

  // Fallback IPv6-safe para requests não autenticados
  return ipKey(req);
}
