/**
 * Request Size Limits Middleware
 * Protects against DoS attacks via large payloads
 * P3 Security Improvement
 */

import type { Request, Response, NextFunction } from 'express';
import bytes from 'bytes';

export interface RequestLimitsOptions {
  /**
   * Maximum request body size
   * Default: 10mb
   */
  maxBodySize?: string | number;

  /**
   * Maximum URL length
   * Default: 2048 characters
   */
  maxUrlLength?: number;

  /**
   * Maximum number of query parameters
   * Default: 50
   */
  maxQueryParams?: number;

  /**
   * Maximum header size
   * Default: 8kb
   */
  maxHeaderSize?: string | number;

  /**
   * Maximum number of headers
   * Default: 50
   */
  maxHeaders?: number;

  /**
   * Maximum JSON depth
   * Default: 10 levels
   */
  maxJsonDepth?: number;

  /**
   * Maximum array length in JSON
   * Default: 1000 items
   */
  maxArrayLength?: number;
}

const DEFAULT_OPTIONS: Required<RequestLimitsOptions> = {
  maxBodySize: '10mb',
  maxUrlLength: 2048,
  maxQueryParams: 50,
  maxHeaderSize: '8kb',
  maxHeaders: 50,
  maxJsonDepth: 10,
  maxArrayLength: 1000,
};

/**
 * Converts size string to bytes
 */
function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  const parsed = bytes.parse(size);
  if (parsed === null) {
    throw new Error(`Invalid size format: ${size}`);
  }
  return parsed;
}

/**
 * Calculates depth of nested object
 */
function getObjectDepth(obj: any, currentDepth: number = 1): number {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  const depths = Object.values(obj).map(value =>
    getObjectDepth(value, currentDepth + 1)
  );

  return depths.length > 0 ? Math.max(...depths) : currentDepth;
}

/**
 * Finds maximum array length in object
 */
function getMaxArrayLength(obj: any): number {
  if (!obj || typeof obj !== 'object') {
    return 0;
  }

  let maxLength = 0;

  if (Array.isArray(obj)) {
    maxLength = obj.length;
    obj.forEach(item => {
      const itemMax = getMaxArrayLength(item);
      maxLength = Math.max(maxLength, itemMax);
    });
  } else {
    Object.values(obj).forEach(value => {
      const valueMax = getMaxArrayLength(value);
      maxLength = Math.max(maxLength, valueMax);
    });
  }

  return maxLength;
}

/**
 * Request Size Limits Middleware
 */
export function requestLimits(options: RequestLimitsOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Check URL length
      const url = req.url || '';
      if (url.length > config.maxUrlLength) {
        return res.status(414).json({
          error: 'URL too long',
          limit: config.maxUrlLength,
          received: url.length,
        });
      }

      // 2. Check number of query parameters
      const queryParams = Object.keys(req.query);
      if (queryParams.length > config.maxQueryParams) {
        return res.status(400).json({
          error: 'Too many query parameters',
          limit: config.maxQueryParams,
          received: queryParams.length,
        });
      }

      // 3. Check number of headers
      const headerCount = Object.keys(req.headers).length;
      if (headerCount > config.maxHeaders) {
        return res.status(431).json({
          error: 'Too many headers',
          limit: config.maxHeaders,
          received: headerCount,
        });
      }

      // 4. Check header sizes
      const maxHeaderSizeBytes = parseSize(config.maxHeaderSize);
      for (const [name, value] of Object.entries(req.headers)) {
        const headerSize = Buffer.byteLength(`${name}: ${value}`);
        if (headerSize > maxHeaderSizeBytes) {
          return res.status(431).json({
            error: 'Request header too large',
            header: name,
            limit: config.maxHeaderSize,
            received: bytes.format(headerSize),
          });
        }
      }

      // 5. Check JSON body depth (if applicable)
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        const depth = getObjectDepth(req.body);
        if (depth > config.maxJsonDepth) {
          return res.status(400).json({
            error: 'JSON nesting too deep',
            limit: config.maxJsonDepth,
            received: depth,
            message: 'Reduce the nesting level of your JSON payload',
          });
        }

        // 6. Check array lengths
        const maxArrayLen = getMaxArrayLength(req.body);
        if (maxArrayLen > config.maxArrayLength) {
          return res.status(400).json({
            error: 'Array too large',
            limit: config.maxArrayLength,
            received: maxArrayLen,
            message: 'Reduce the size of arrays in your JSON payload',
          });
        }
      }

      next();
    } catch (error) {
      console.error('[Request Limits] Error validating request:', error);
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'Request could not be validated',
      });
    }
  };
}

/**
 * Body Size Validator
 * Works in conjunction with express.json() limit option
 */
export function bodySize(limit: string | number = '10mb'): (req: Request, res: Response, next: NextFunction) => void {
  const maxSize = parseSize(limit);

  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');

    if (contentLength) {
      const size = parseInt(contentLength, 10);

      if (isNaN(size)) {
        return res.status(400).json({
          error: 'Invalid Content-Length header',
        });
      }

      if (size > maxSize) {
        return res.status(413).json({
          error: 'Payload too large',
          limit: bytes.format(maxSize),
          received: bytes.format(size),
        });
      }
    }

    next();
  };
}

/**
 * Rate limit for file uploads
 * Separate from general rate limiting
 */
export function uploadLimits(options: {
  maxFileSize?: string | number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
} = {}): (req: Request, res: Response, next: NextFunction) => void {
  const defaults = {
    maxFileSize: '50mb',
    maxFiles: 10,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  };

  const config = { ...defaults, ...options };
  const maxFileSize = parseSize(config.maxFileSize);

  return (req: Request, res: Response, next: NextFunction) => {
    // This is a placeholder - actual implementation would work with multer or similar
    // Just validates that upload limits are configured
    (req as any).uploadLimits = {
      maxFileSize,
      maxFiles: config.maxFiles,
      allowedMimeTypes: config.allowedMimeTypes,
    };

    next();
  };
}

/**
 * Request complexity score
 * Combines multiple factors to calculate request complexity
 */
export function requestComplexity(maxScore: number = 100): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    let score = 0;

    // URL length (1 point per 100 chars)
    score += Math.floor((req.url?.length || 0) / 100);

    // Query params (2 points each)
    score += Object.keys(req.query).length * 2;

    // Headers (1 point each)
    score += Object.keys(req.headers).length;

    // Body complexity
    if (req.body && typeof req.body === 'object') {
      // Object depth (5 points per level)
      score += getObjectDepth(req.body) * 5;

      // Number of fields (1 point per 10 fields)
      const fieldCount = JSON.stringify(req.body).split(',').length;
      score += Math.floor(fieldCount / 10);
    }

    if (score > maxScore) {
      return res.status(400).json({
        error: 'Request too complex',
        score,
        maxScore,
        message: 'Simplify your request or break it into multiple requests',
      });
    }

    // Attach score to request for monitoring
    (req as any).complexityScore = score;

    next();
  };
}
