/**
 * URL Redirect Validator
 *
 * P2 Security Fix: Prevents open redirect vulnerabilities
 * OWASP: A01:2021 - Broken Access Control
 *
 * Validates redirect URLs to prevent:
 * - Phishing attacks via trusted domain
 * - Session token theft
 * - OAuth token interception
 * - Malware distribution
 */

/**
 * Allowed redirect domains/paths
 */
const ALLOWED_REDIRECT_DOMAINS = [
  'imobibase.com',
  'www.imobibase.com',
  'app.imobibase.com',
  'admin.imobibase.com',
  // Add your production domains here
];

/**
 * Allowed redirect path patterns (internal redirects)
 */
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/properties',
  '/leads',
  '/calendar',
  '/reports',
  '/settings',
  '/profile',
  '/auth/login',
  '/auth/callback',
  '/auth/verify-email',
  '/auth/reset-password',
];

/**
 * Validate redirect URL
 */
export function isValidRedirectUrl(url: string): {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
} {
  // Empty or null URLs are invalid
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      reason: 'URL is required',
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check for suspicious patterns
  if (hasSuspiciousPatterns(trimmedUrl)) {
    return {
      valid: false,
      reason: 'URL contains suspicious patterns',
    };
  }

  // Relative URLs (starts with /)
  if (trimmedUrl.startsWith('/')) {
    return validateRelativeUrl(trimmedUrl);
  }

  // Absolute URLs
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return validateAbsoluteUrl(trimmedUrl);
  }

  // Protocol-relative URLs (//example.com) - not allowed
  if (trimmedUrl.startsWith('//')) {
    return {
      valid: false,
      reason: 'Protocol-relative URLs are not allowed',
    };
  }

  // Invalid format
  return {
    valid: false,
    reason: 'Invalid URL format',
  };
}

/**
 * Validate relative URL (internal redirect)
 */
function validateRelativeUrl(url: string): {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
} {
  try {
    // Remove query params and hash for validation
    const pathOnly = url.split('?')[0].split('#')[0];

    // Check if path is in allowed list
    const isAllowed = ALLOWED_REDIRECT_PATHS.some(allowedPath => {
      return pathOnly === allowedPath || pathOnly.startsWith(allowedPath + '/');
    });

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Path '${pathOnly}' is not in allowed redirect paths`,
      };
    }

    // Sanitize URL
    const sanitized = sanitizeUrl(url);

    return {
      valid: true,
      sanitizedUrl: sanitized,
    };
  } catch (error) {
    return {
      valid: false,
      reason: 'Failed to parse relative URL',
    };
  }
}

/**
 * Validate absolute URL (external redirect)
 */
function validateAbsoluteUrl(url: string): {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
} {
  try {
    const parsedUrl = new URL(url);

    // Only HTTPS allowed for external redirects (HTTP only in development)
    const isDev = process.env.NODE_ENV === 'development';
    if (parsedUrl.protocol !== 'https:' && !(isDev && parsedUrl.protocol === 'http:')) {
      return {
        valid: false,
        reason: 'Only HTTPS protocol is allowed',
      };
    }

    // Check if domain is in allowed list
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowedDomain = ALLOWED_REDIRECT_DOMAINS.some(allowedDomain => {
      return hostname === allowedDomain || hostname.endsWith('.' + allowedDomain);
    });

    if (!isAllowedDomain) {
      return {
        valid: false,
        reason: `Domain '${hostname}' is not in allowed redirect domains`,
      };
    }

    // Sanitize URL
    const sanitized = sanitizeUrl(url);

    return {
      valid: true,
      sanitizedUrl: sanitized,
    };
  } catch (error) {
    return {
      valid: false,
      reason: 'Failed to parse absolute URL',
    };
  }
}

/**
 * Check for suspicious patterns in URL
 */
function hasSuspiciousPatterns(url: string): boolean {
  const suspiciousPatterns = [
    // JavaScript protocol
    /^javascript:/i,
    /^data:/i,
    /^vbscript:/i,
    /^file:/i,

    // Encoded variations
    /%6a%61%76%61%73%63%72%69%70%74/i, // javascript
    /%64%61%74%61/i, // data

    // HTML entity encoding
    /&#[xX]0*6[aA];/i, // j
    /&#[xX]0*61;/i, // a

    // Unicode escaping
    /\\u006a/i, // j
    /\\u0061/i, // a

    // Tab/newline/carriage return tricks
    /java\s*script:/i,
    /data\s*:/i,

    // Null byte
    /\0/,

    // Multiple slashes (path traversal)
    /\/{3,}/,

    // Backslash tricks
    /\\/,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

/**
 * Sanitize URL by removing dangerous characters
 */
function sanitizeUrl(url: string): string {
  return url
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\r\n\t]/g, '') // Remove newlines, carriage returns, tabs
    .trim();
}

/**
 * Safe redirect function for Express
 */
export function safeRedirect(
  res: any,
  url: string,
  statusCode: number = 302
): void {
  const validation = isValidRedirectUrl(url);

  if (!validation.valid) {
    console.warn('[SECURITY] Blocked unsafe redirect attempt', {
      url,
      reason: validation.reason,
    });

    // Redirect to safe default instead
    res.redirect(statusCode, '/dashboard');
    return;
  }

  res.redirect(statusCode, validation.sanitizedUrl || url);
}

/**
 * Add allowed redirect domain (for multi-tenant scenarios)
 */
export function addAllowedRedirectDomain(domain: string): void {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain must be a non-empty string');
  }

  const sanitizedDomain = domain.toLowerCase().trim();

  if (!ALLOWED_REDIRECT_DOMAINS.includes(sanitizedDomain)) {
    ALLOWED_REDIRECT_DOMAINS.push(sanitizedDomain);
  }
}

/**
 * Get allowed redirect domains (for debugging)
 */
export function getAllowedRedirectDomains(): string[] {
  return [...ALLOWED_REDIRECT_DOMAINS];
}

/**
 * Get allowed redirect paths (for debugging)
 */
export function getAllowedRedirectPaths(): string[] {
  return [...ALLOWED_REDIRECT_PATHS];
}

/**
 * Middleware to validate redirect parameter
 */
export function validateRedirectParam(paramName: string = 'redirect') {
  return (req: any, res: any, next: any) => {
    const redirectUrl = req.query[paramName] as string;

    if (redirectUrl) {
      const validation = isValidRedirectUrl(redirectUrl);

      if (!validation.valid) {
        console.warn('[SECURITY] Invalid redirect parameter', {
          url: redirectUrl,
          reason: validation.reason,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        // Remove invalid redirect parameter
        delete req.query[paramName];
      } else {
        // Replace with sanitized version
        req.query[paramName] = validation.sanitizedUrl;
      }
    }

    next();
  };
}
