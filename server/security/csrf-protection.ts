/**
 * CSRF Protection Module
 * Implements double-submit cookie pattern and synchronizer token pattern
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Store for CSRF tokens (in production, use Redis)
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

/**
 * Hash token for double-submit cookie pattern
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe token comparison
 */
function compareTokens(token1: string, token2: string): boolean {
  if (!token1 || !token2 || token1.length !== token2.length) {
    return false;
  }

  try {
    const buf1 = Buffer.from(token1);
    const buf2 = Buffer.from(token2);
    return timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

/**
 * Clean expired tokens periodically
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  const toDelete: string[] = [];

  tokenStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      toDelete.push(key);
    }
  });

  toDelete.forEach(key => tokenStore.delete(key));
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

/**
 * Generate and set CSRF token in session and cookie
 */
export function generateCsrfTokenForSession(req: Request, res: Response): string {
  const token = generateCsrfToken();
  const hashedToken = hashToken(token);
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY;

  // Store hashed token in session
  if (req.session) {
    req.session.csrfToken = hashedToken;
    req.session.csrfExpiry = expiresAt;
  }

  // Also store in memory (fallback)
  const sessionId = req.sessionID || req.ip || 'anonymous';
  tokenStore.set(sessionId, { token: hashedToken, expiresAt });

  // Set double-submit cookie
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
  });

  return token;
}

/**
 * Verify CSRF token from request
 */
function verifyCsrfToken(req: Request): boolean {
  // Get token from header or body
  const token = (req.headers[CSRF_HEADER_NAME] as string) ||
                (req.body && req.body._csrf);

  if (!token) {
    return false;
  }

  const hashedToken = hashToken(token);

  // Check session token
  if (req.session && req.session.csrfToken && req.session.csrfExpiry) {
    if (Date.now() > req.session.csrfExpiry) {
      return false;
    }

    if (compareTokens(hashedToken, req.session.csrfToken)) {
      return true;
    }
  }

  // Fallback to memory store
  const sessionId = req.sessionID || req.ip || 'anonymous';
  const stored = tokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(sessionId);
    return false;
  }

  return compareTokens(hashedToken, stored.token);
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for whitelisted paths (webhooks, etc.)
  const whitelistedPaths = [
    '/api/webhooks/',
    '/api/payments/webhook',
    '/api/stripe/webhook',
    '/api/mercadopago/webhook',
    '/api/clicksign/webhook',
  ];

  if (whitelistedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Verify CSRF token
  if (!verifyCsrfToken(req)) {
    res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
    });
    return;
  }

  next();
}

/**
 * Middleware to generate CSRF token for authenticated users
 */
export function ensureCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Generate token if not already present
  if (!req.session?.csrfToken || !req.session?.csrfExpiry ||
      Date.now() > req.session.csrfExpiry) {
    generateCsrfTokenForSession(req, res);
  }

  next();
}

/**
 * API endpoint to get CSRF token
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfTokenForSession(req, res);

  res.json({
    csrfToken: token,
    headerName: CSRF_HEADER_NAME,
  });
}

/**
 * Double-submit cookie pattern middleware
 * Validates that cookie token matches header token
 */
export function doubleSubmitCookieProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Both must be present and match
  if (!cookieToken || !headerToken || !compareTokens(cookieToken, headerToken)) {
    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token',
    });
    return;
  }

  next();
}

/**
 * Rotate CSRF token (call after sensitive operations)
 */
export function rotateCsrfToken(req: Request, res: Response): string {
  // Delete old token
  if (req.session?.csrfToken) {
    delete req.session.csrfToken;
    delete req.session.csrfExpiry;
  }

  const sessionId = req.sessionID || req.ip || 'anonymous';
  tokenStore.delete(sessionId);

  // Generate new token
  return generateCsrfTokenForSession(req, res);
}

/**
 * Clean up CSRF token on logout
 */
export function clearCsrfToken(req: Request, res: Response): void {
  if (req.session?.csrfToken) {
    delete req.session.csrfToken;
    delete req.session.csrfExpiry;
  }

  const sessionId = req.sessionID || req.ip || 'anonymous';
  tokenStore.delete(sessionId);

  res.clearCookie(CSRF_COOKIE_NAME);
}

// Extend Express Request and Session types
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    csrfExpiry?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

/**
 * Add csrfToken() method to request object
 */
export function addCsrfTokenMethod(req: Request, res: Response, next: NextFunction): void {
  req.csrfToken = () => {
    if (req.session?.csrfToken && req.session?.csrfExpiry &&
        Date.now() <= req.session.csrfExpiry) {
      // Return existing token if valid
      return req.cookies[CSRF_COOKIE_NAME] || '';
    }
    // Generate new token
    return generateCsrfTokenForSession(req, res);
  };
  next();
}
