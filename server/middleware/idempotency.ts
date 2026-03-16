/**
 * Idempotency Middleware
 * Prevents duplicate payment processing by caching responses keyed by Idempotency-Key header.
 * Uses in-memory Map with TTL cleanup (24h expiry).
 */

import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  statusCode: number;
  body: any;
  createdAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run cleanup every hour

const cache = new Map<string, CachedResponse>();

// Periodic cleanup of expired entries
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Prevent the timer from keeping the process alive
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Idempotency check middleware.
 * If request has `Idempotency-Key` header:
 *   - Returns cached response if key was seen before (prevents double charges)
 *   - Otherwise proceeds and caches the response for 24h
 * If no header, proceeds normally (backward compatible).
 */
export function idempotencyCheck(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  // No header — proceed normally (backward compatible)
  if (!idempotencyKey) {
    next();
    return;
  }

  // Check cache for existing response
  const cached = cache.get(idempotencyKey);
  if (cached) {
    // Return cached response to prevent duplicate processing
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    cache.set(idempotencyKey, {
      statusCode: res.statusCode,
      body,
      createdAt: Date.now(),
    });
    return originalJson(body);
  };

  next();
}
