/**
 * Structured JSON Logger Middleware
 *
 * P2 Security Fix: Implements structured logging with request IDs for:
 * - Better security event correlation
 * - SIEM integration readiness
 * - LGPD/GDPR compliance audit trails
 * - Performance monitoring
 */

import type { Request, Response, NextFunction } from 'express';

export interface LogContext {
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  tenantId?: string;
  ip: string;
  userAgent: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
}

/**
 * Structured logger class for JSON output
 */
export class StructuredLogger {
  private level: LogLevel;
  private serviceName: string;
  private environment: string;

  constructor() {
    this.serviceName = 'imobibase-api';
    this.environment = process.env.NODE_ENV || 'development';
    this.level = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  private parseLogLevel(level: string): LogLevel {
    const validLevels = Object.values(LogLevel);
    return validLevels.includes(level as LogLevel) ? (level as LogLevel) : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SECURITY];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context: Partial<LogContext> = {}): string {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      ...context,
    };

    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  error(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, context));
    }
  }

  security(message: string, context?: Partial<LogContext>): void {
    // Security events are always logged
    console.error(this.formatLog(LogLevel.SECURITY, message, {
      ...context,
      security: true,
    }));
  }

  /**
   * Log HTTP request
   */
  logRequest(req: Request, res: Response, duration: number): void {
    const context: LogContext = {
      requestId: req.headers['x-request-id'] as string || 'unknown',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: (req.user as any)?.id,
      tenantId: (req.user as any)?.tenantId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    const level = this.getLogLevelForStatus(res.statusCode);
    const message = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

    if (level === LogLevel.ERROR) {
      this.error(message, context);
    } else if (level === LogLevel.WARN) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    req: Request,
    eventType: string,
    details: Record<string, any>
  ): void {
    this.security(`Security event: ${eventType}`, {
      requestId: req.headers['x-request-id'] as string || 'unknown',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      userId: (req.user as any)?.id,
      tenantId: (req.user as any)?.tenantId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: {
        eventType,
        ...details,
      },
    });
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getLogLevelForStatus(statusCode: number): LogLevel {
    if (statusCode >= 500) return LogLevel.ERROR;
    if (statusCode >= 400) return LogLevel.WARN;
    return LogLevel.INFO;
  }
}

/**
 * Singleton instance
 */
export const logger = new StructuredLogger();

/**
 * Express middleware for request logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request start (debug level)
  logger.debug(`Request started`, {
    requestId: req.headers['x-request-id'] as string,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  // Intercept response finish
  const originalSend = res.send;
  res.send = function (data: any): Response {
    res.send = originalSend;
    const duration = Date.now() - startTime;

    // Log completed request
    logger.logRequest(req, res, duration);

    return res.send(data);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context: LogContext = {
    requestId: req.headers['x-request-id'] as string || 'unknown',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: err.status || 500,
    userId: (req.user as any)?.id,
    tenantId: (req.user as any)?.tenantId,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    error: {
      message: err.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      code: err.code,
    },
  };

  logger.error(`Request error: ${err.message}`, context);

  next(err);
}

/**
 * Security event logging helper
 */
export function logSecurityEvent(
  req: Request,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any> = {}
): void {
  logger.logSecurityEvent(req, eventType, {
    severity,
    ...details,
  });
}
