/**
 * Enhanced Security Headers Middleware
 * Implements additional security headers beyond Helmet.js defaults
 * P3 Security Improvements
 */

import type { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersOptions {
  /**
   * Enable HSTS (HTTP Strict Transport Security)
   * Forces HTTPS for all requests
   */
  hsts?: {
    maxAge?: number; // seconds, default: 31536000 (1 year)
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  /**
   * Referrer Policy
   * Controls what information is sent in Referer header
   */
  referrerPolicy?: string; // default: 'strict-origin-when-cross-origin'

  /**
   * Permissions Policy (formerly Feature Policy)
   * Controls which browser features can be used
   */
  permissionsPolicy?: {
    camera?: string[];
    microphone?: string[];
    geolocation?: string[];
    payment?: string[];
    usb?: string[];
    autoplay?: string[];
    fullscreen?: string[];
  };

  /**
   * X-Permitted-Cross-Domain-Policies
   * Controls cross-domain requests (Flash, PDF, etc.)
   */
  permittedCrossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';

  /**
   * Cache Control for API responses
   */
  cacheControl?: {
    api?: string; // default: 'no-store, no-cache, must-revalidate, proxy-revalidate'
    static?: string; // default: 'public, max-age=31536000, immutable'
  };
}

const DEFAULT_OPTIONS: Required<SecurityHeadersOptions> = {
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: ['self'],
    payment: ['self'],
    usb: [],
    autoplay: [],
    fullscreen: ['self'],
  },
  permittedCrossDomainPolicies: 'none',
  cacheControl: {
    api: 'no-store, no-cache, must-revalidate, proxy-revalidate',
    static: 'public, max-age=31536000, immutable',
  },
};

/**
 * Formats Permissions-Policy header value
 */
function formatPermissionsPolicy(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([feature, allowList]) => {
      if (allowList.length === 0) {
        return `${feature}=()`;
      }
      const formatted = allowList.map(origin =>
        origin === 'self' ? 'self' : `"${origin}"`
      ).join(' ');
      return `${feature}=(${formatted})`;
    })
    .join(', ');
}

/**
 * Enhanced Security Headers Middleware
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    hsts: { ...DEFAULT_OPTIONS.hsts, ...options.hsts },
    permissionsPolicy: { ...DEFAULT_OPTIONS.permissionsPolicy, ...options.permissionsPolicy },
    cacheControl: { ...DEFAULT_OPTIONS.cacheControl, ...options.cacheControl },
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isApiRequest = req.path.startsWith('/api/');

    // HTTP Strict Transport Security (HSTS)
    // Only set in production and over HTTPS
    if (isProduction && req.secure) {
      const hstsValue = `max-age=${config.hsts.maxAge}${
        config.hsts.includeSubDomains ? '; includeSubDomains' : ''
      }${config.hsts.preload ? '; preload' : ''}`;

      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Referrer-Policy
    // Controls what information is sent in the Referer header
    res.setHeader('Referrer-Policy', config.referrerPolicy);

    // Permissions-Policy (Feature Policy)
    // Controls which browser features and APIs can be used
    const permissionsPolicyValue = formatPermissionsPolicy(config.permissionsPolicy);
    res.setHeader('Permissions-Policy', permissionsPolicyValue);

    // X-Permitted-Cross-Domain-Policies
    // Prevents Adobe Flash and PDF from loading data from this domain
    res.setHeader('X-Permitted-Cross-Domain-Policies', config.permittedCrossDomainPolicies);

    // X-Download-Options
    // Prevents Internet Explorer from executing downloads in site's context
    res.setHeader('X-Download-Options', 'noopen');

    // X-DNS-Prefetch-Control
    // Controls DNS prefetching to improve privacy
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // Cache-Control
    // Set appropriate caching based on request type
    if (isApiRequest) {
      // API responses: no caching
      res.setHeader('Cache-Control', config.cacheControl.api);
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.match(/\.(js|css|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$/)) {
      // Static assets: aggressive caching
      res.setHeader('Cache-Control', config.cacheControl.static);
    } else {
      // HTML pages: moderate caching
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }

    // Vary header for proper caching
    const varyHeaders = ['Accept-Encoding', 'Origin'];
    res.setHeader('Vary', varyHeaders.join(', '));

    next();
  };
}

/**
 * CORS Preflight Cache Middleware
 * Improves performance by caching CORS preflight responses
 */
export function corsPreflight(maxAge: number = 86400): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      // Cache preflight response for 24 hours (86400 seconds)
      res.setHeader('Access-Control-Max-Age', maxAge.toString());
    }
    next();
  };
}

/**
 * Content-Type Validation Middleware
 * Ensures requests with body have proper Content-Type header
 */
export function validateContentType(allowedTypes: string[] = ['application/json']): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip GET, HEAD, OPTIONS (no body expected)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip if no body
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    const contentType = req.get('Content-Type');

    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required',
        expected: allowedTypes,
      });
    }

    // Check if content type matches allowed types
    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        received: contentType,
        expected: allowedTypes,
      });
    }

    next();
  };
}

/**
 * MIME Type Sniffing Prevention
 * Already handled by Helmet's noSniff, but can be used standalone
 */
export function preventMimeSniffing(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

/**
 * Security Headers Summary Endpoint (for testing/debugging)
 * Only available in development
 */
export function securityHeadersDebug(req: Request, res: Response): void {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const headers = {
    'Strict-Transport-Security': res.getHeader('Strict-Transport-Security'),
    'Referrer-Policy': res.getHeader('Referrer-Policy'),
    'Permissions-Policy': res.getHeader('Permissions-Policy'),
    'X-Permitted-Cross-Domain-Policies': res.getHeader('X-Permitted-Cross-Domain-Policies'),
    'X-Download-Options': res.getHeader('X-Download-Options'),
    'X-DNS-Prefetch-Control': res.getHeader('X-DNS-Prefetch-Control'),
    'Cache-Control': res.getHeader('Cache-Control'),
    'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
    'X-Frame-Options': res.getHeader('X-Frame-Options'),
    'Content-Security-Policy': res.getHeader('Content-Security-Policy'),
  };

  res.json({
    message: 'Security headers configured on this response',
    headers: Object.fromEntries(
      Object.entries(headers).filter(([_, value]) => value !== undefined)
    ),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
