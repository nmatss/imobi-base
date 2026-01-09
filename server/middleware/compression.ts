/**
 * Response Compression Middleware
 * Compresses API responses to reduce bandwidth and improve performance
 * P3 Security & Performance Improvement
 */

import compression from 'compression';
import type { Request, Response } from 'express';

export interface CompressionOptions {
  /**
   * Compression level (0-9)
   * Higher = better compression but slower
   * Default: 6
   */
  level?: number;

  /**
   * Minimum response size to compress (bytes)
   * Default: 1024 (1kb)
   */
  threshold?: number;

  /**
   * Filter function to determine what should be compressed
   */
  filter?: (req: Request, res: Response) => boolean;

  /**
   * Memory level (1-9)
   * Higher = more memory but better compression
   * Default: 8
   */
  memLevel?: number;
}

/**
 * Default filter for compression
 * Compresses text-based responses, skips already compressed formats
 */
function defaultFilter(req: Request, res: Response): boolean {
  // Skip compression if explicitly disabled
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Get content type
  const contentType = res.getHeader('Content-Type');
  if (!contentType) {
    return false;
  }

  const type = typeof contentType === 'string' ? contentType : contentType.toString();

  // Compressible types
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-javascript',
    'application/rss+xml',
    'application/atom+xml',
    'application/vnd.api+json',
  ];

  // Already compressed types (skip)
  const preCompressedTypes = [
    'image/',
    'video/',
    'audio/',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-compress',
    'application/x-compressed',
  ];

  // Check if already compressed
  if (preCompressedTypes.some(t => type.includes(t))) {
    return false;
  }

  // Check if compressible
  return compressibleTypes.some(t => type.includes(t));
}

/**
 * Enhanced compression middleware with security considerations
 */
export function responseCompression(options: CompressionOptions = {}) {
  const config = {
    level: options.level ?? 6,
    threshold: options.threshold ?? 1024, // 1kb minimum
    memLevel: options.memLevel ?? 8,
    filter: options.filter ?? defaultFilter,
  };

  return compression({
    level: config.level,
    threshold: config.threshold,
    memLevel: config.memLevel,
    filter: config.filter,

    // Use zlib defaults for other options
    chunkSize: 16 * 1024, // 16kb chunks
    windowBits: 15,
    strategy: 0, // Z_DEFAULT_STRATEGY
  });
}

/**
 * Compression configuration for different environments
 */
export const compressionPresets = {
  /**
   * Production: Balanced compression (level 6)
   */
  production: {
    level: 6,
    threshold: 1024,
    memLevel: 8,
  },

  /**
   * Development: Fast compression (level 1)
   */
  development: {
    level: 1,
    threshold: 1024,
    memLevel: 8,
  },

  /**
   * High compression: Best compression ratio (level 9)
   * Use for static assets or low-traffic endpoints
   */
  high: {
    level: 9,
    threshold: 512,
    memLevel: 9,
  },

  /**
   * Fast compression: Fastest (level 1)
   * Use for high-traffic endpoints where speed matters
   */
  fast: {
    level: 1,
    threshold: 2048,
    memLevel: 7,
  },

  /**
   * API: Optimized for JSON responses
   */
  api: {
    level: 6,
    threshold: 1024,
    memLevel: 8,
    filter: (req: Request, res: Response) => {
      // Only compress JSON responses
      const contentType = res.getHeader('Content-Type');
      return contentType ? contentType.toString().includes('application/json') : false;
    },
  },
};

/**
 * Compression middleware factory
 * Creates compression middleware based on environment
 */
export function createCompression(preset?: keyof typeof compressionPresets) {
  const env = process.env.NODE_ENV || 'development';

  let config: CompressionOptions;

  if (preset) {
    config = compressionPresets[preset];
  } else {
    // Auto-select based on environment
    config = env === 'production'
      ? compressionPresets.production
      : compressionPresets.development;
  }

  return responseCompression(config);
}

/**
 * Compression statistics middleware
 * Adds compression stats to response headers (dev only)
 */
export function compressionStats(req: Request, res: Response, next: Function) {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const originalWrite = res.write;
  const originalEnd = res.end;

  let originalSize = 0;
  let compressedSize = 0;

  // Track original size
  res.write = function(chunk: any, ...args: any[]) {
    if (chunk) {
      originalSize += Buffer.byteLength(chunk);
    }
    return originalWrite.apply(res, [chunk, ...args] as any);
  };

  res.end = function(chunk: any, ...args: any[]) {
    if (chunk) {
      originalSize += Buffer.byteLength(chunk);
    }

    // Get compressed size from Content-Length header
    const contentLength = res.getHeader('Content-Length');
    if (contentLength) {
      compressedSize = parseInt(contentLength.toString(), 10);
    } else {
      compressedSize = originalSize;
    }

    // Calculate compression ratio
    const ratio = originalSize > 0
      ? ((1 - compressedSize / originalSize) * 100).toFixed(2)
      : '0.00';

    // Add stats to headers (dev only)
    res.setHeader('X-Original-Size', originalSize.toString());
    res.setHeader('X-Compressed-Size', compressedSize.toString());
    res.setHeader('X-Compression-Ratio', `${ratio}%`);

    return originalEnd.apply(res, [chunk, ...args] as any);
  };

  next();
}

/**
 * Selective compression middleware
 * Applies different compression levels based on path
 */
export function selectiveCompression(config: {
  api?: CompressionOptions;
  static?: CompressionOptions;
  default?: CompressionOptions;
} = {}) {
  const apiCompression = responseCompression(config.api || compressionPresets.api);
  const staticCompression = responseCompression(config.static || compressionPresets.high);
  const defaultCompression = responseCompression(config.default || compressionPresets.production);

  return (req: Request, res: Response, next: Function) => {
    if (req.path.startsWith('/api/')) {
      return apiCompression(req, res, next);
    }

    if (req.path.match(/\.(js|css|json|xml|svg)$/)) {
      return staticCompression(req, res, next);
    }

    return defaultCompression(req, res, next);
  };
}
