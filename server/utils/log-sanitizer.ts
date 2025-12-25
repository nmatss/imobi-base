/**
 * Log Sanitizer - Remove sensitive data from logs
 * Prevents leaking passwords, tokens, API keys, and other sensitive information
 */

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
  'cpf',
  'rg',
  'authorization',
  'auth',
  'bearer',
];

const REDACTED = '[REDACTED]';

/**
 * Recursively sanitize an object by replacing sensitive field values
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize response data for logging
 * Removes sensitive fields and limits data size
 */
export function sanitizeResponse(response: any, maxLength: number = 1000): string {
  try {
    const sanitized = sanitizeObject(response);
    const jsonStr = JSON.stringify(sanitized);

    // Truncate if too long
    if (jsonStr.length > maxLength) {
      return jsonStr.substring(0, maxLength) + '... [truncated]';
    }

    return jsonStr;
  } catch (error) {
    return '[Unable to sanitize response]';
  }
}

/**
 * Sanitize error messages to prevent sensitive data leakage
 */
export function sanitizeError(error: any): any {
  if (!error) return error;

  const sanitized: any = {
    message: error.message,
    name: error.name,
    code: error.code,
  };

  // Don't include stack traces in production
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    sanitized.stack = error.stack;
  }

  // Sanitize any additional properties
  if (error.details) {
    sanitized.details = sanitizeObject(error.details);
  }

  return sanitized;
}

/**
 * Check if a route should be excluded from detailed logging
 * (e.g., health checks, metrics endpoints)
 */
export function shouldSkipDetailedLogging(path: string): boolean {
  const skipPaths = [
    '/health',
    '/api/health',
    '/metrics',
    '/api/metrics',
    '/favicon.ico',
  ];

  return skipPaths.some(skipPath => path.startsWith(skipPath));
}
