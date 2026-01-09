/**
 * Intrusion Detection System (IDS)
 * Detects and prevents malicious activities, brute force attacks, and suspicious patterns
 */

import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/node';

// Configuration
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000; // 15 minutes
const BRUTE_FORCE_THRESHOLD = 5; // attempts
const CREDENTIAL_STUFFING_THRESHOLD = 10; // unique usernames
const SUSPICIOUS_PATTERN_THRESHOLD = 3;
const AUTO_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour

// In-memory stores (in production, use Redis)
interface ThreatData {
  count: number;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
  blockUntil?: number;
  patterns: string[];
}

const threatStore = new Map<string, ThreatData>();
const blockedIps = new Map<string, number>(); // IP -> block expiry timestamp
const suspiciousActivities = new Map<string, Set<string>>(); // IP -> Set of usernames attempted

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Clean up threats
  threatStore.forEach((data, key) => {
    if (now - data.lastSeen > BRUTE_FORCE_WINDOW) {
      threatStore.delete(key);
    }
  });

  // Clean up blocked IPs
  blockedIps.forEach((expiry, ip) => {
    if (now > expiry) {
      blockedIps.delete(ip);
    }
  });

  // Clean up suspicious activities
  suspiciousActivities.forEach((usernames, ip) => {
    if (usernames.size === 0) {
      suspiciousActivities.delete(ip);
    }
  });
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Generate fingerprint from request
 */
function generateFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
  ].join('|');

  return createHash('sha256').update(components).digest('hex').substring(0, 16);
}

/**
 * Check if IP is blocked
 */
export function isIpBlocked(ip: string): boolean {
  const blockUntil = blockedIps.get(ip);
  if (!blockUntil) {
    return false;
  }

  if (Date.now() > blockUntil) {
    blockedIps.delete(ip);
    return false;
  }

  return true;
}

/**
 * Block IP address
 */
export function blockIp(ip: string, duration: number = AUTO_BLOCK_DURATION): void {
  const blockUntil = Date.now() + duration;
  blockedIps.set(ip, blockUntil);

  // Log to Sentry
  Sentry.captureMessage(`IP blocked: ${ip}`, {
    level: 'warning',
    tags: { security: 'intrusion_detection', action: 'ip_blocked' },
    extra: { ip, blockUntil: new Date(blockUntil).toISOString() },
  });

  console.warn(`[IDS] IP blocked: ${ip} until ${new Date(blockUntil).toISOString()}`);
}

/**
 * Unblock IP address
 */
export function unblockIp(ip: string): void {
  blockedIps.delete(ip);
  console.info(`[IDS] IP unblocked: ${ip}`);
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(req: Request, username: string): void {
  const ip = getClientIp(req);
  const key = `login:${ip}`;
  const now = Date.now();

  // Update threat data
  let data = threatStore.get(key);
  if (!data) {
    data = {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      blocked: false,
      patterns: [],
    };
    threatStore.set(key, data);
  }

  data.count++;
  data.lastSeen = now;
  data.patterns.push('failed_login');

  // Track unique usernames for credential stuffing detection
  let usernames = suspiciousActivities.get(ip);
  if (!usernames) {
    usernames = new Set();
    suspiciousActivities.set(ip, usernames);
  }
  usernames.add(username);

  // Check for brute force attack
  if (data.count >= BRUTE_FORCE_THRESHOLD && !data.blocked) {
    data.blocked = true;
    blockIp(ip);

    Sentry.captureMessage('Brute force attack detected', {
      level: 'warning',
      tags: { security: 'brute_force' },
      extra: { ip, attempts: data.count, username },
    });
  }

  // Check for credential stuffing
  if (usernames.size >= CREDENTIAL_STUFFING_THRESHOLD) {
    blockIp(ip, AUTO_BLOCK_DURATION * 2); // Block for 2 hours

    Sentry.captureMessage('Credential stuffing attack detected', {
      level: 'warning',
      tags: { security: 'credential_stuffing' },
      extra: { ip, uniqueUsernames: usernames.size },
    });

    console.warn(`[IDS] Credential stuffing detected from ${ip} (${usernames.size} unique usernames)`);
  }
}

/**
 * Record successful login (clears failed attempts)
 */
export function recordSuccessfulLogin(req: Request): void {
  const ip = getClientIp(req);
  const key = `login:${ip}`;

  threatStore.delete(key);
  suspiciousActivities.delete(ip);
}

/**
 * Detect SQL injection attempt
 */
export function detectSqlInjectionAttempt(req: Request): boolean {
  const checkInput = (input: any): boolean => {
    if (typeof input === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(UNION\s+SELECT)/i,
        /--/,
        /;.*--/,
        /'.*OR.*'.*=/i,
        /".*OR.*".*=/i,
        /'.*OR.*=/i,
        /".*OR.*=/i,
      ];

      return sqlPatterns.some(pattern => pattern.test(input));
    }

    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkInput);
    }

    return false;
  };

  const hasInjection = checkInput(req.body) || checkInput(req.query) || checkInput(req.params);

  if (hasInjection) {
    const ip = getClientIp(req);
    recordSuspiciousActivity(req, 'sql_injection_attempt');

    Sentry.captureMessage('SQL injection attempt detected', {
      level: 'warning',
      tags: { security: 'sql_injection' },
      extra: {
        ip,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
      },
    });

    console.warn(`[IDS] SQL injection attempt from ${ip} on ${req.path}`);
  }

  return hasInjection;
}

/**
 * Detect XSS attempt
 */
export function detectXssAttempt(req: Request): boolean {
  const checkInput = (input: any): boolean => {
    if (typeof input === 'string') {
      const xssPatterns = [
        /<script[^>]*>.*<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
      ];

      return xssPatterns.some(pattern => pattern.test(input));
    }

    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkInput);
    }

    return false;
  };

  const hasXss = checkInput(req.body) || checkInput(req.query) || checkInput(req.params);

  if (hasXss) {
    const ip = getClientIp(req);
    recordSuspiciousActivity(req, 'xss_attempt');

    Sentry.captureMessage('XSS attempt detected', {
      level: 'warning',
      tags: { security: 'xss' },
      extra: {
        ip,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
      },
    });

    console.warn(`[IDS] XSS attempt from ${ip} on ${req.path}`);
  }

  return hasXss;
}

/**
 * Detect path traversal attempt
 */
export function detectPathTraversalAttempt(req: Request): boolean {
  const checkInput = (input: any): boolean => {
    if (typeof input === 'string') {
      const traversalPatterns = [
        /\.\.\//,
        /\.\.\\/,
        /%2e%2e%2f/i,
        /%2e%2e%5c/i,
      ];

      return traversalPatterns.some(pattern => pattern.test(input));
    }

    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(checkInput);
    }

    return false;
  };

  const hasTraversal = checkInput(req.body) || checkInput(req.query) || checkInput(req.params) || checkInput(req.path);

  if (hasTraversal) {
    const ip = getClientIp(req);
    recordSuspiciousActivity(req, 'path_traversal_attempt');

    Sentry.captureMessage('Path traversal attempt detected', {
      level: 'warning',
      tags: { security: 'path_traversal' },
      extra: {
        ip,
        path: req.path,
        method: req.method,
      },
    });

    console.warn(`[IDS] Path traversal attempt from ${ip} on ${req.path}`);
  }

  return hasTraversal;
}

/**
 * Record suspicious activity
 */
export function recordSuspiciousActivity(req: Request, pattern: string): void {
  const ip = getClientIp(req);
  const key = `suspicious:${ip}`;
  const now = Date.now();

  let data = threatStore.get(key);
  if (!data) {
    data = {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      blocked: false,
      patterns: [],
    };
    threatStore.set(key, data);
  }

  data.count++;
  data.lastSeen = now;
  data.patterns.push(pattern);

  // Auto-block if too many suspicious activities
  if (data.count >= SUSPICIOUS_PATTERN_THRESHOLD && !data.blocked) {
    data.blocked = true;
    blockIp(ip);

    Sentry.captureMessage('Suspicious activity threshold exceeded', {
      level: 'warning',
      tags: { security: 'suspicious_activity' },
      extra: {
        ip,
        count: data.count,
        patterns: data.patterns,
        userAgent: req.headers['user-agent'],
      },
    });

    console.warn(`[IDS] Auto-blocking ${ip} due to ${data.count} suspicious activities`);
  }
}

/**
 * Middleware: Block requests from blocked IPs
 */
export function blockBlacklistedIps(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);

  if (isIpBlocked(ip)) {
    const blockUntil = blockedIps.get(ip);
    const remainingTime = blockUntil ? Math.ceil((blockUntil - Date.now()) / 1000) : 0;

    res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been temporarily blocked due to suspicious activity.',
      retryAfter: remainingTime,
    });
    return;
  }

  next();
}

/**
 * Middleware: Detect malicious patterns
 */
export function detectMaliciousPatterns(req: Request, res: Response, next: NextFunction): void {
  // Check for various attack patterns
  const hasSqlInjection = detectSqlInjectionAttempt(req);
  const hasXss = detectXssAttempt(req);
  const hasPathTraversal = detectPathTraversalAttempt(req);

  // If attack detected, block the request
  if (hasSqlInjection || hasXss || hasPathTraversal) {
    const ip = getClientIp(req);

    // Auto-block aggressive attackers
    const key = `suspicious:${ip}`;
    const data = threatStore.get(key);
    if (data && data.count >= 2) {
      blockIp(ip);
    }

    res.status(400).json({
      error: 'Invalid request',
      message: 'Your request contains potentially malicious content and has been blocked.',
    });
    return;
  }

  next();
}

/**
 * Middleware: Rate limit by IP and fingerprint
 */
export function compositeRateLimit(windowMs: number, maxRequests: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const fingerprint = generateFingerprint(req);
    const key = `${ip}:${fingerprint}`;
    const now = Date.now();

    let record = requests.get(key);

    // Clean up old records
    if (Math.random() < 0.01) {
      requests.forEach((value, k) => {
        if (now > value.resetAt) {
          requests.delete(k);
        }
      });
    }

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      requests.set(key, record);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      // Record as suspicious activity
      recordSuspiciousActivity(req, 'rate_limit_exceeded');

      res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter,
      });
      return;
    }

    record.count++;
    next();
  };
}

/**
 * Get threat statistics
 */
export function getThreatStatistics(): {
  blockedIps: number;
  activeThreats: number;
  recentBlocks: Array<{ ip: string; blockUntil: string }>;
} {
  const now = Date.now();

  return {
    blockedIps: blockedIps.size,
    activeThreats: threatStore.size,
    recentBlocks: Array.from(blockedIps.entries())
      .filter(([_, expiry]) => expiry > now)
      .map(([ip, expiry]) => ({
        ip,
        blockUntil: new Date(expiry).toISOString(),
      }))
      .slice(0, 100),
  };
}

/**
 * Export blocked IPs for external firewall/WAF
 */
export function getBlockedIpList(): string[] {
  const now = Date.now();
  return Array.from(blockedIps.entries())
    .filter(([_, expiry]) => expiry > now)
    .map(([ip]) => ip);
}

/**
 * Manually add IP to blocklist
 */
export function addToBlocklist(ip: string, duration: number = AUTO_BLOCK_DURATION): void {
  blockIp(ip, duration);
  console.info(`[IDS] IP manually added to blocklist: ${ip}`);
}

/**
 * Manually remove IP from blocklist
 */
export function removeFromBlocklist(ip: string): void {
  unblockIp(ip);
  threatStore.delete(`login:${ip}`);
  threatStore.delete(`suspicious:${ip}`);
  suspiciousActivities.delete(ip);
  console.info(`[IDS] IP manually removed from blocklist: ${ip}`);
}

/**
 * Get threat details for IP
 */
export function getThreatDetails(ip: string): {
  blocked: boolean;
  blockUntil?: string;
  loginAttempts?: number;
  suspiciousActivities?: number;
  patterns?: string[];
} {
  const blockUntil = blockedIps.get(ip);
  const loginData = threatStore.get(`login:${ip}`);
  const suspiciousData = threatStore.get(`suspicious:${ip}`);

  return {
    blocked: isIpBlocked(ip),
    blockUntil: blockUntil ? new Date(blockUntil).toISOString() : undefined,
    loginAttempts: loginData?.count,
    suspiciousActivities: suspiciousData?.count,
    patterns: [...(loginData?.patterns || []), ...(suspiciousData?.patterns || [])],
  };
}
