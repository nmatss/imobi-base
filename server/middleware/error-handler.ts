/**
 * Error Handling Middleware
 * Standardized error classes and global error handler for Express
 */

import { Request, Response, NextFunction } from 'express';
import { ZodIssue } from 'zod';
import * as Sentry from '@sentry/node';

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public errors?: ZodIssue[]
  ) {
    super(message, 400);
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      errors: this.errors?.map(e => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message,
        code: e.code,
      })),
    };
  }
}

/**
 * Authentication Error (401)
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * Authorization Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

/**
 * Global error handler middleware
 * Should be registered AFTER all routes
 * P3 Security: No stack traces or sensitive info in production
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error (server-side only, never exposed to client)
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: isProduction ? undefined : err.stack, // No stack in production logs
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;
  let errorCode: string | undefined = undefined;

  // Handle known errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    if (err instanceof ValidationError) {
      errorCode = 'VALIDATION_ERROR';
      errors = err.errors?.map(e => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message,
        code: e.code,
      }));
    }

    // Report operational errors to Sentry only if critical
    if (!err.isOperational || statusCode >= 500) {
      Sentry.captureException(err, {
        tags: {
          route: req.path,
          method: req.method,
          statusCode: statusCode.toString(),
        },
        extra: {
          // Sanitize sensitive data before sending to Sentry
          body: sanitizeSentryData(req.body),
          query: req.query,
          params: req.params,
        },
      });
    }
  } else {
    // Unknown errors - always report to Sentry
    Sentry.captureException(err, {
      tags: {
        route: req.path,
        method: req.method,
        errorType: 'unexpected',
      },
      extra: {
        body: sanitizeSentryData(req.body),
        query: req.query,
        params: req.params,
      },
    });

    // P3 Security: NEVER expose internal error details in production
    if (isProduction) {
      message = 'An unexpected error occurred. Please try again later.';
      errorCode = 'INTERNAL_ERROR';
      // Generate error ID for support reference
      const errorId = generateErrorId();
      console.error(`[ERROR_ID: ${errorId}] ${err.message}`);
      message = `An unexpected error occurred. Error ID: ${errorId}`;
    } else {
      message = err.message;
    }
  }

  // Build sanitized response
  const response: any = {
    error: message,
    statusCode,
  };

  // Add error code for programmatic handling
  if (errorCode) {
    response.code = errorCode;
  }

  if (errors) {
    response.errors = errors;
  }

  // P3 Security: NEVER include stack traces in production
  // Only include in development for debugging
  if (!isProduction) {
    response.stack = err.stack;
    response.details = {
      name: err.name,
      type: err.constructor.name,
    };
  }

  // Add request ID if available (for correlation)
  if ((req as any).id) {
    response.requestId = (req as any).id;
  }

  // Security headers for error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  res.status(statusCode).json(response);
}

/**
 * Sanitize data before sending to Sentry
 * Removes sensitive fields like passwords, tokens, etc.
 */
function sanitizeSentryData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'sessionId',
    'creditCard',
    'ssn',
    'cpf',
    'cnpj',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Async route wrapper to catch errors
 * Wraps async route handlers to automatically catch and forward errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler - should be registered after all routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
