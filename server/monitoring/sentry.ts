/**
 * Sentry Error Tracking Configuration
 *
 * Monitors production errors, performance, and exceptions
 * Docs: https://docs.sentry.io/platforms/node/guides/express/
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import {
  httpIntegration,
  expressIntegration,
  postgresIntegration,
} from "@sentry/node";
import type { Express, Request, Response, NextFunction } from "express";

const isDevelopment = process.env.NODE_ENV !== "production";
const SENTRY_DSN = process.env.SENTRY_DSN;

/**
 * Initialize Sentry for error tracking
 * Call this BEFORE any other middleware or route handlers
 */
export function initializeSentry(app: Express) {
  if (!SENTRY_DSN) {
    if (!isDevelopment) {
      console.warn("⚠️  SENTRY_DSN not configured. Error tracking disabled in production!");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 0 : 0.1, // Sample 10% of transactions in production

    // Profiling
    profilesSampleRate: isDevelopment ? 0 : 0.1, // Profile 10% of transactions

    integrations: [
      // Express integration (auto-instruments routes)
      httpIntegration(),
      expressIntegration(),

      // Performance profiling
      nodeProfilingIntegration(),

      // Database query tracking (PostgreSQL)
      postgresIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send errors in development
      if (isDevelopment) {
        console.log("Sentry event (dev mode, not sent):", event);
        return null;
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove password fields
            delete breadcrumb.data.password;
            delete breadcrumb.data.token;
            delete breadcrumb.data.apiKey;
            delete breadcrumb.data.secret;
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      "Network request failed",
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      // Add more patterns as needed
    ],

    // Tag all events with release version
    release: process.env.VERCEL_GIT_COMMIT_SHA || "development",
  });

  // Sentry middleware is automatically added by expressIntegration in v10+
  // No need for manual middleware setup

  console.log("✅ Sentry initialized for error tracking");
}

/**
 * Add Sentry error handler middleware
 * Call this AFTER all routes, but BEFORE other error handlers
 */
export function addSentryErrorHandler(app: Express) {
  if (!SENTRY_DSN) return;

  // In Sentry v10+, error handling is built into expressIntegration
  // Add custom error handler middleware
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    // Capture errors with Sentry
    if (error.status >= 500 || !error.status) {
      Sentry.captureException(error);
    }
    next(error);
  });
}

/**
 * Capture exception manually (for async errors, background jobs, etc.)
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    console.error("Error (Sentry not configured):", error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message/warning
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info", context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    console.log(`[${level}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context (call after authentication)
 */
export function setUser(user: { id: string; email?: string; tenantId?: string; role?: string }) {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId, // Custom field
    role: user.role, // Custom field
  });
}

/**
 * Clear user context (call on logout)
 */
export function clearUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 * Useful for tracking custom operations (e.g., report generation)
 */
export function startTransaction(name: string, op: string) {
  if (!SENTRY_DSN) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  }

  // In Sentry v10+, use startSpan instead
  return Sentry.startSpan({
    name,
    op,
  }, () => {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  });
}

/**
 * Wrap async function with error handling
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, {
        function: fn.name,
        arguments: args,
      });
      throw error;
    }
  }) as T;
}

/**
 * Express middleware to add tenant context to Sentry
 */
export function sentryTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!SENTRY_DSN) return next();

  // Add tenant context if user is authenticated
  if (req.user && 'tenantId' in req.user) {
    Sentry.setTag("tenant_id", req.user.tenantId);
    Sentry.setContext("tenant", {
      id: req.user.tenantId,
      user_role: req.user.role,
    });
  }

  next();
}

export default {
  initializeSentry,
  addSentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  withSentry,
  sentryTenantMiddleware,
};
