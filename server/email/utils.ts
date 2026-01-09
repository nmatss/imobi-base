import { randomBytes } from 'crypto';

/**
 * Validates email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates multiple email addresses
 */
export function validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

/**
 * Generates an unsubscribe token for a user
 */
export function generateUnsubscribeToken(userId: string, email: string): string {
  const data = `${userId}:${email}:${Date.now()}`;
  const token = Buffer.from(data).toString('base64url');
  return token;
}

/**
 * Validates and decodes an unsubscribe token
 */
export function validateUnsubscribeToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [userId, email, timestamp] = decoded.split(':');

    if (!userId || !email || !timestamp) {
      return null;
    }

    // Token expires after 30 days
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (tokenAge > maxAge) {
      return null;
    }

    return { userId, email };
  } catch {
    return null;
  }
}

/**
 * Generates tracking parameters for email analytics
 */
export function generateTrackingParams(params: {
  campaign?: string;
  source?: string;
  medium?: string;
  content?: string;
}): string {
  const searchParams = new URLSearchParams();

  if (params.campaign) searchParams.set('utm_campaign', params.campaign);
  if (params.source) searchParams.set('utm_source', params.source);
  if (params.medium) searchParams.set('utm_medium', params.medium);
  if (params.content) searchParams.set('utm_content', params.content);

  return searchParams.toString();
}

/**
 * Adds tracking parameters to URLs in email content
 */
export function addTrackingToUrls(
  html: string,
  trackingParams: Record<string, string>
): string {
  const params = generateTrackingParams(trackingParams);

  if (!params) {
    return html;
  }

  // Replace href attributes in anchor tags
  return html.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      try {
        const urlObj = new URL(url);
        const separator = urlObj.search ? '&' : '?';
        return `href="${url}${separator}${params}"`;
      } catch {
        // If URL parsing fails, return original
        return match;
      }
    }
  );
}

/**
 * Generates a unique message ID for email tracking
 */
export function generateMessageId(domain: string = 'imobibase.com'): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString('hex');
  return `<${timestamp}.${random}@${domain}>`;
}

/**
 * Formats email address with name
 */
export function formatEmailAddress(email: string, name?: string): string {
  if (!name) {
    return email;
  }
  return `"${name}" <${email}>`;
}

/**
 * Extracts email address from formatted string
 */
export function extractEmailAddress(formatted: string): string {
  const match = formatted.match(/<([^>]+)>/);
  return match ? match[1] : formatted;
}

/**
 * Sanitizes email content to prevent XSS
 */
export function sanitizeEmailContent(html: string): string {
  // Remove script tags
  html = html.replace(/<script[^>]*>.*?<\/script>/gis, '');

  // Remove event handlers
  html = html.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocols
  html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  return html;
}

/**
 * Truncates text for email subject or preview
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Converts HTML to plain text for email
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

/**
 * Handles email bounce notifications
 */
export interface BounceInfo {
  email: string;
  bounceType: 'hard' | 'soft' | 'complaint';
  reason?: string;
  timestamp: Date;
}

export function parseBounceNotification(data: any): BounceInfo | null {
  try {
    // This is a generic parser - adjust based on your email provider's format
    return {
      email: data.email || data.recipient,
      bounceType: data.bounceType || 'hard',
      reason: data.reason || data.diagnosticCode,
      timestamp: new Date(data.timestamp || Date.now()),
    };
  } catch {
    return null;
  }
}

/**
 * Rate limiting helper for email sending
 */
export class EmailRateLimiter {
  private tokens: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxEmails: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  canSend(identifier: string): boolean {
    const now = Date.now();
    const bucket = this.tokens.get(identifier);

    if (!bucket || bucket.resetTime < now) {
      this.tokens.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (bucket.count < this.maxEmails) {
      bucket.count++;
      return true;
    }

    return false;
  }

  getRemainingTime(identifier: string): number {
    const bucket = this.tokens.get(identifier);
    if (!bucket) {
      return 0;
    }

    const remaining = bucket.resetTime - Date.now();
    return Math.max(0, remaining);
  }

  reset(identifier: string): void {
    this.tokens.delete(identifier);
  }
}

/**
 * Email template variable validator
 */
export function validateTemplateVariables(
  template: string,
  data: Record<string, any>
): { valid: boolean; missing: string[] } {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const matches = template.matchAll(variableRegex);
  const missing: string[] = [];

  for (const match of matches) {
    const variable = match[1];
    if (!(variable in data)) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Formats currency for email display
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats date for email display
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'long'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}
