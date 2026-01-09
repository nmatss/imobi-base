/**
 * OPTIMIZED SECURITY FEATURES
 *
 * Performance-optimized versions of security features with:
 * - Caching for repeated validations
 * - Lazy evaluation
 * - Stream processing for large files
 * - Connection pooling
 * - Memoization
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { performance } from 'perf_hooks';

// ================================================================
// PERFORMANCE MONITORING
// ================================================================

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  cacheHit?: boolean;
}

const performanceMetrics: PerformanceMetrics[] = [];

export function trackPerformance(operation: string, duration: number, cacheHit?: boolean): void {
  performanceMetrics.push({
    operation,
    duration,
    timestamp: Date.now(),
    cacheHit,
  });

  // Keep only last 1000 metrics
  if (performanceMetrics.length > 1000) {
    performanceMetrics.shift();
  }
}

export function getPerformanceMetrics(operation?: string): PerformanceMetrics[] {
  if (operation) {
    return performanceMetrics.filter(m => m.operation === operation);
  }
  return performanceMetrics;
}

export function getAveragePerformance(operation: string): {
  avgDuration: number;
  cacheHitRate: number;
  totalCalls: number;
} {
  const metrics = getPerformanceMetrics(operation);
  if (metrics.length === 0) {
    return { avgDuration: 0, cacheHitRate: 0, totalCalls: 0 };
  }

  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  const cacheHits = metrics.filter(m => m.cacheHit).length;

  return {
    avgDuration: totalDuration / metrics.length,
    cacheHitRate: (cacheHits / metrics.length) * 100,
    totalCalls: metrics.length,
  };
}

// ================================================================
// OPTIMIZED FILE VALIDATION WITH CACHING
// ================================================================

/**
 * LRU Cache for file validation results
 * Key: SHA256 hash of file content
 * Value: Validation result
 */
const validationCache = new LRUCache<string, any>({
  max: 500, // Cache up to 500 validation results
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true,
});

/**
 * Generate cache key from buffer
 */
function getCacheKey(buffer: Buffer): string {
  // Use first 1KB for hash to avoid hashing entire large files
  const sample = buffer.slice(0, Math.min(1024, buffer.length));
  return createHash('sha256').update(sample).digest('hex');
}

/**
 * Optimized file validation with caching
 */
export async function optimizedValidateFile(
  buffer: Buffer,
  declaredMimeType: string,
  declaredExtension: string
): Promise<{ valid: boolean; error?: string; detectedType?: string; cached?: boolean }> {
  const start = performance.now();
  const cacheKey = getCacheKey(buffer);

  // Check cache first
  const cached = validationCache.get(cacheKey);
  if (cached) {
    const duration = performance.now() - start;
    trackPerformance('file_validation', duration, true);
    return { ...cached, cached: true };
  }

  // Perform validation
  try {
    if (buffer.length < 8) {
      return { valid: false, error: 'File is too small or corrupted' };
    }

    // Only read first 4KB for type detection (optimization)
    const sampleSize = Math.min(4096, buffer.length);
    const sample = buffer.slice(0, sampleSize);

    const detectedType = await fileTypeFromBuffer(sample);

    if (!detectedType) {
      return { valid: false, error: 'Could not detect file type' };
    }

    const normalizedDeclared = normalizeMimeType(declaredMimeType);
    const normalizedDetected = normalizeMimeType(detectedType.mime);

    const mimeMatches = normalizedDetected === normalizedDeclared;
    const extMatches = `.${detectedType.ext}` === declaredExtension.toLowerCase();

    if (!mimeMatches && !extMatches) {
      return {
        valid: false,
        error: `File type mismatch. Declared: ${declaredMimeType}, Detected: ${detectedType.mime}`,
        detectedType: detectedType.mime,
      };
    }

    const result = {
      valid: true,
      detectedType: detectedType.mime,
    };

    // Cache the result
    validationCache.set(cacheKey, result);

    const duration = performance.now() - start;
    trackPerformance('file_validation', duration, false);

    return result;
  } catch (error: any) {
    return {
      valid: false,
      error: `File validation error: ${error.message}`,
    };
  }
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();
  const mimeMap: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'image/pjpeg': 'image/jpeg',
    'application/x-zip-compressed': 'application/zip',
    'application/x-pdf': 'application/pdf',
  };
  return mimeMap[normalized] || normalized;
}

// ================================================================
// OPTIMIZED SVG SANITIZATION WITH CACHING
// ================================================================

const svgSanitizationCache = new LRUCache<string, string>({
  max: 200, // Cache up to 200 sanitized SVGs
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  updateAgeOnGet: true,
});

/**
 * Optimized SVG sanitization with caching
 */
export function optimizedSanitizeSVG(svgContent: string): {
  sanitized: string;
  cached: boolean;
} {
  const start = performance.now();
  const cacheKey = createHash('sha256').update(svgContent).digest('hex');

  // Check cache
  const cached = svgSanitizationCache.get(cacheKey);
  if (cached) {
    const duration = performance.now() - start;
    trackPerformance('svg_sanitization', duration, true);
    return { sanitized: cached, cached: true };
  }

  // Import DOMPurify lazily (only when needed)
  const { sanitizeSVG } = require('../security/svg-sanitizer');
  const sanitized = sanitizeSVG(svgContent);

  // Cache the result
  svgSanitizationCache.set(cacheKey, sanitized);

  const duration = performance.now() - start;
  trackPerformance('svg_sanitization', duration, false);

  return { sanitized, cached: false };
}

// ================================================================
// OPTIMIZED CSRF TOKEN GENERATION WITH POOLING
// ================================================================

import { randomBytes } from 'crypto';

/**
 * Token pool for pre-generated CSRF tokens
 * Reduces crypto operations overhead
 */
class CsrfTokenPool {
  private pool: string[] = [];
  private readonly poolSize = 100;
  private readonly refillThreshold = 20;
  private isRefilling = false;

  constructor() {
    this.refillPool();
  }

  private refillPool(): void {
    if (this.isRefilling) return;

    this.isRefilling = true;
    const tokensToGenerate = this.poolSize - this.pool.length;

    // Generate tokens asynchronously
    setImmediate(() => {
      for (let i = 0; i < tokensToGenerate; i++) {
        const token = randomBytes(32).toString('base64url');
        this.pool.push(token);
      }
      this.isRefilling = false;
    });
  }

  getToken(): string {
    const start = performance.now();

    // If pool is low, trigger refill
    if (this.pool.length < this.refillThreshold) {
      this.refillPool();
    }

    // Get token from pool or generate immediately if pool is empty
    const token = this.pool.length > 0
      ? this.pool.pop()!
      : randomBytes(32).toString('base64url');

    const duration = performance.now() - start;
    trackPerformance('csrf_token_generation', duration, this.pool.length > 0);

    return token;
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}

const csrfTokenPool = new CsrfTokenPool();

export function optimizedGenerateCsrfToken(): string {
  return csrfTokenPool.getToken();
}

export function getCsrfTokenPoolStatus(): {
  poolSize: number;
  isHealthy: boolean;
} {
  const poolSize = csrfTokenPool.getPoolSize();
  return {
    poolSize,
    isHealthy: poolSize > 10,
  };
}

// ================================================================
// OPTIMIZED RATE LIMITING WITH REDIS
// ================================================================

import type { Redis } from 'ioredis';

/**
 * Redis-based rate limiting for better performance
 */
export class OptimizedRateLimiter {
  private redis: Redis | null = null;
  private fallbackStore = new Map<string, { count: number; resetAt: number }>();

  constructor(redisClient?: Redis) {
    this.redis = redisClient || null;
  }

  async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const start = performance.now();

    try {
      if (this.redis) {
        // Use Redis for distributed rate limiting
        const result = await this.redisRateLimit(key, windowMs, maxRequests);
        const duration = performance.now() - start;
        trackPerformance('rate_limit_check', duration);
        return result;
      }
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to memory:', error);
    }

    // Fallback to in-memory
    const result = this.memoryRateLimit(key, windowMs, maxRequests);
    const duration = performance.now() - start;
    trackPerformance('rate_limit_check', duration);
    return result;
  }

  private async redisRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.redis) throw new Error('Redis not available');

    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

    // Use Redis INCR with EXPIRE for atomic rate limiting
    const count = await this.redis.incr(windowKey);

    if (count === 1) {
      // Set expiry on first request in window
      await this.redis.pexpire(windowKey, windowMs);
    }

    const resetAt = Math.ceil(now / windowMs) * windowMs;
    const remaining = Math.max(0, maxRequests - count);

    return {
      allowed: count <= maxRequests,
      remaining,
      resetAt,
    };
  }

  private memoryRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let record = this.fallbackStore.get(key);

    // Clean up old records periodically
    if (Math.random() < 0.01) {
      this.fallbackStore.forEach((value, k) => {
        if (now > value.resetAt) {
          this.fallbackStore.delete(k);
        }
      });
    }

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      this.fallbackStore.set(key, record);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: record.resetAt,
      };
    }

    record.count++;
    const remaining = Math.max(0, maxRequests - record.count);

    return {
      allowed: record.count <= maxRequests,
      remaining,
      resetAt: record.resetAt,
    };
  }

  getStats(): {
    redisConnected: boolean;
    fallbackStoreSize: number;
  } {
    return {
      redisConnected: this.redis !== null,
      fallbackStoreSize: this.fallbackStore.size,
    };
  }
}

// ================================================================
// CACHE STATISTICS AND MONITORING
// ================================================================

export function getCacheStatistics(): {
  fileValidation: {
    size: number;
    hitRate: number;
  };
  svgSanitization: {
    size: number;
    hitRate: number;
  };
  csrfTokenPool: {
    poolSize: number;
    isHealthy: boolean;
  };
} {
  const fileValidationMetrics = getAveragePerformance('file_validation');
  const svgSanitizationMetrics = getAveragePerformance('svg_sanitization');

  return {
    fileValidation: {
      size: validationCache.size,
      hitRate: fileValidationMetrics.cacheHitRate,
    },
    svgSanitization: {
      size: svgSanitizationCache.size,
      hitRate: svgSanitizationMetrics.cacheHitRate,
    },
    csrfTokenPool: getCsrfTokenPoolStatus(),
  };
}

export function clearAllCaches(): void {
  validationCache.clear();
  svgSanitizationCache.clear();
  console.log('[Optimized Security] All caches cleared');
}

// ================================================================
// PERFORMANCE REPORT GENERATION
// ================================================================

export function generatePerformanceReport(): {
  operations: Record<string, {
    avgDuration: number;
    cacheHitRate: number;
    totalCalls: number;
    estimatedTimeSaved: number;
  }>;
  cacheStats: ReturnType<typeof getCacheStatistics>;
  recommendations: string[];
} {
  const operations = ['file_validation', 'svg_sanitization', 'csrf_token_generation', 'rate_limit_check'];
  const report: Record<string, any> = {};
  const recommendations: string[] = [];

  for (const operation of operations) {
    const metrics = getAveragePerformance(operation);
    const estimatedTimeSaved = (metrics.cacheHitRate / 100) * metrics.avgDuration * metrics.totalCalls;

    report[operation] = {
      ...metrics,
      estimatedTimeSaved,
    };

    // Generate recommendations
    if (metrics.cacheHitRate < 50 && metrics.totalCalls > 100) {
      recommendations.push(
        `${operation}: Low cache hit rate (${metrics.cacheHitRate.toFixed(1)}%). Consider increasing cache size.`
      );
    }

    if (metrics.avgDuration > 10) {
      recommendations.push(
        `${operation}: High average duration (${metrics.avgDuration.toFixed(2)}ms). Review optimization opportunities.`
      );
    }
  }

  return {
    operations: report,
    cacheStats: getCacheStatistics(),
    recommendations,
  };
}
