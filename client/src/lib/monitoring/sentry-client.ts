/**
 * Sentry Client Configuration for Frontend
 *
 * Handles error tracking, performance monitoring, and breadcrumbs on the client
 * Integrates with React Router, web vitals, and custom error boundaries
 */

import * as Sentry from "@sentry/react";
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from "react-router-dom";
import { useEffect } from "react";

const isDevelopment = import.meta.env.DEV;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry for the frontend application
 * Must be called before rendering the app
 */
export function initializeSentryClient() {
  if (!SENTRY_DSN) {
    if (!isDevelopment) {
      console.warn("⚠️ SENTRY_DSN not configured. Error tracking disabled!");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || "development",

    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 0 : 0.1, // 10% in production
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.imobibase\.com/,
      /^https:\/\/imobibase\.com/,
    ],

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      // Browser integrations
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),

      // React Router integration
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),

      // HTTP Client integration
      Sentry.httpClientIntegration(),

      // Breadcrumbs for console, DOM events, fetch/XHR
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send in development
      if (isDevelopment) {
        console.log("Sentry event (dev mode, not sent):", event);
        return null;
      }

      // Remove sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }

      // Remove password fields from extra data
      if (event.extra) {
        Object.keys(event.extra).forEach((key) => {
          if (
            key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("secret")
          ) {
            delete event.extra![key];
          }
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Network errors
      "Network request failed",
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "The network connection was lost",
      "The Internet connection appears to be offline",

      // Browser extension errors
      "top.GLOBALS",
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "atomicFindClose",

      // Random plugins/extensions
      "Can't find variable: ZiteReader",
      "jigsaw is not defined",
      "ComboSearch is not defined",
      "http://loading.retry.widdit.com/",
      "fb_xd_fragment",

      // React errors we don't care about
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],

    // Ignore errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Tag with release version
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || "development",
  });

  console.log("✅ Sentry client initialized for error tracking");
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
) {
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
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>
) {
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
 * Set user context
 */
export function setUser(user: {
  id: string;
  email?: string;
  tenantId?: string;
  role?: string;
}) {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
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
 * Set custom tag
 */
export function setTag(key: string, value: string) {
  if (!SENTRY_DSN) return;
  Sentry.setTag(key, value);
}

/**
 * Set custom context
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!SENTRY_DSN) return;
  Sentry.setContext(name, context);
}

/**
 * Start a performance span
 */
export function startSpan<T>(
  name: string,
  operation: string,
  callback: () => T
): T {
  if (!SENTRY_DSN) {
    return callback();
  }

  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    callback
  );
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  if (!SENTRY_DSN) {
    return callback();
  }

  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    callback
  );
}

/**
 * React Error Boundary wrapper
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for React component performance
 */
export const Profiler = Sentry.Profiler;

/**
 * withProfiler HOC for component profiling
 */
export const withProfiler = Sentry.withProfiler;

export default {
  initializeSentryClient,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setContext,
  startSpan,
  measureAsync,
  ErrorBoundary,
  Profiler,
  withProfiler,
};
