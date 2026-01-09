/**
 * Input Validation & Sanitization Module
 * Protects against XSS, SQL injection, command injection, and other attacks
 */

import path from 'path';
import { z } from 'zod';

/**
 * Sanitize string to prevent XSS attacks
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize HTML to prevent XSS
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script tags and content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Remove dangerous tags
  const dangerousTags = ['iframe', 'embed', 'object', 'applet', 'meta', 'link', 'style'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(email, 255);
  if (!sanitized) {
    return null;
  }

  // Email validation regex (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized.toLowerCase();
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: unknown): string | null {
  if (typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Validate length (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: unknown): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(url, 2048);
  if (!sanitized) {
    return null;
  }

  try {
    const parsed = new URL(sanitized);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Block local/private IPs to prevent SSRF
    const hostname = parsed.hostname;
    if (isPrivateIp(hostname)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Check if IP/hostname is private (SSRF protection)
 */
function isPrivateIp(hostname: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^127\./,                    // 127.0.0.0/8 (localhost)
    /^10\./,                     // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,               // 192.168.0.0/16
    /^169\.254\./,               // 169.254.0.0/16 (link-local)
    /^::1$/,                     // IPv6 localhost
    /^fe80:/,                    // IPv6 link-local
    /^fc00:/,                    // IPv6 unique local
  ];

  // Check for localhost variations
  const localHostnames = ['localhost', '0.0.0.0', '::1', '[::]'];
  if (localHostnames.includes(hostname.toLowerCase())) {
    return true;
  }

  return privateRanges.some(range => range.test(hostname));
}

/**
 * Sanitize filename to prevent path traversal and command injection
 */
export function sanitizeFilename(filename: unknown): string | null {
  if (typeof filename !== 'string') {
    return null;
  }

  // Remove path components
  let sanitized = path.basename(filename);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Only allow alphanumeric, dash, underscore, and dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext).substring(0, 255 - ext.length);
    sanitized = base + ext;
  }

  // Must have at least one character
  if (sanitized.length === 0) {
    return null;
  }

  return sanitized;
}

/**
 * Validate file extension against allowed list
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.map(e => e.toLowerCase()).includes(ext);
}

/**
 * Validate MIME type against allowed list
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Sanitize JSON to prevent prototype pollution
 */
export function sanitizeJson<T>(json: unknown): T | null {
  if (typeof json !== 'object' || json === null) {
    return null;
  }

  // Remove __proto__, constructor, and prototype properties
  const sanitized = JSON.parse(JSON.stringify(json, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  }));

  return sanitized as T;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: unknown,
  limit: unknown,
  maxLimit: number = 100
): { page: number; limit: number } {
  const parsedPage = Math.max(1, parseInt(String(page)) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(String(limit)) || 50));

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Validate and sanitize ID (nanoid, uuid, or numeric)
 */
export function sanitizeId(id: unknown): string | null {
  if (typeof id !== 'string' && typeof id !== 'number') {
    return null;
  }

  const sanitized = String(id).trim();

  // Allow nanoid (alphanumeric, dash, underscore)
  // Allow UUID (hex and dashes)
  // Allow numeric IDs
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return null;
  }

  // Limit length (nanoid is typically 21 chars, UUID is 36)
  if (sanitized.length > 50) {
    return null;
  }

  return sanitized;
}

/**
 * Validate date string
 */
export function validateDate(dateString: unknown): Date | null {
  if (typeof dateString !== 'string') {
    return null;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }

  // Reasonable date range (1900 - 2100)
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) {
    return null;
  }

  return date;
}

/**
 * Validate numeric value within range
 */
export function validateNumber(
  value: unknown,
  min: number = -Infinity,
  max: number = Infinity
): number | null {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return num;
}

/**
 * Validate boolean value
 */
export function validateBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return null;
}

/**
 * SQL injection detection (for logging/monitoring purposes)
 * Note: Primary protection should be parameterized queries
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /--/,
    /;.*--/,
    /'.*OR.*'.*=/i,
    /".*OR.*".*=/i,
    /\bOR\b.*=.*\bOR\b/i,
    /'.*\bOR\b.*/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS detection (for logging/monitoring purposes)
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Command injection detection
 */
export function detectCommandInjection(input: string): boolean {
  const cmdPatterns = [
    /[;&|`$]/,
    /\$\(/,
    /\.\.\//,
    /\\/,
    /\n|\r/,
  ];

  return cmdPatterns.some(pattern => pattern.test(input));
}

/**
 * Zod schema helpers for common validations
 */
export const commonSchemas = {
  email: z.string().email().max(255).transform(email => email.toLowerCase()),

  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),

  url: z.string().url().max(2048),

  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(50),

  filename: z.string().max(255).refine(
    (name) => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
    'Invalid filename characters'
  ),

  date: z.coerce.date().refine(
    (date) => date.getFullYear() >= 1900 && date.getFullYear() <= 2100,
    'Date out of valid range'
  ),

  positiveInt: z.number().int().positive(),

  nonNegativeInt: z.number().int().nonnegative(),

  percentage: z.number().min(0).max(100),

  currency: z.number().nonnegative().multipleOf(0.01),

  cpf: z.string().regex(/^\d{11}$/, 'Invalid CPF format'),

  cnpj: z.string().regex(/^\d{14}$/, 'Invalid CNPJ format'),

  cep: z.string().regex(/^\d{8}$/, 'Invalid CEP format'),

  uuid: z.string().uuid(),

  nanoid: z.string().regex(/^[a-zA-Z0-9_-]{21}$/, 'Invalid nanoid format'),
};

/**
 * Middleware to sanitize request body
 */
export function sanitizeRequestBody(req: any, _res: any, next: any): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeJson(req.body);
  }
  next();
}

/**
 * Middleware to detect and log malicious inputs
 */
export function detectMaliciousInput(req: any, _res: any, next: any): void {
  const checkInput = (obj: any, path: string = 'body'): void => {
    if (typeof obj === 'string') {
      if (detectSqlInjection(obj)) {
        console.warn(`[SECURITY] Potential SQL injection attempt detected in ${path}:`, obj);
      }
      if (detectXss(obj)) {
        console.warn(`[SECURITY] Potential XSS attempt detected in ${path}:`, obj);
      }
      if (detectCommandInjection(obj)) {
        console.warn(`[SECURITY] Potential command injection attempt detected in ${path}:`, obj);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        checkInput(value, `${path}.${key}`);
      });
    }
  };

  if (req.body) {
    checkInput(req.body, 'body');
  }

  if (req.query) {
    checkInput(req.query, 'query');
  }

  if (req.params) {
    checkInput(req.params, 'params');
  }

  next();
}
