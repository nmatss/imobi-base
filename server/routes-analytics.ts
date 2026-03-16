/**
 * Analytics Routes
 *
 * Endpoints for collecting and querying analytics data
 */

import express, { Request, Response } from "express";
import { captureMessage } from "./monitoring/sentry.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth.js";
import { storage } from "./storage.js";

// Extend Express User type for TypeScript
declare global {
  namespace Express {
    interface User {
      id: string;
      tenantId: string;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
    }
  }
}

const router = express.Router();

/**
 * Rate limiter for analytics endpoints
 * Allows 100 requests per minute to prevent abuse
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many analytics events. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Schema for Web Vitals
const webVitalSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'LCP', 'TTFB', 'INP', 'FID']),
  value: z.number(),
  id: z.string(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  navigationType: z.string().optional(),
  tenantId: z.string().optional(),
});

// Schema for custom events
const customEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
});

// Schema for page views
const pageViewSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  referrer: z.string().optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
});

// Schema for errors
const errorEventSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(),
  sessionId: z.string().optional(),
});

/**
 * POST /api/analytics/vitals
 * Collect Web Vitals metrics
 * @protected Requires authentication
 */
router.post("/vitals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = webVitalSchema.parse(req.body);
    const userTenantId = req.user!.tenantId;

    // Validate tenant isolation
    if (data.tenantId && data.tenantId !== userTenantId) {
      console.warn('[Analytics] Tenant mismatch in web vital:', {
        userId: req.user!.id,
        userTenantId,
        dataTenantId: data.tenantId,
      });
      res.status(403).json({
        error: 'Forbidden: Invalid tenant access',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    // Log critical metrics to Sentry
    if (data.rating === 'poor') {
      captureMessage(
        `Poor Web Vital: ${data.name} = ${data.value}`,
        'warning',
        {
          metric: data.name,
          value: data.value,
          rating: data.rating,
          id: data.id,
          userId: req.user!.id,
          tenantId: userTenantId,
          userAgent: req.headers['user-agent'],
          url: req.headers.referer || 'unknown',
        }
      );
    }

    // Persist to database
    await storage.createAnalyticsEvent({
      tenantId: userTenantId,
      userId: req.user!.id,
      eventType: 'vital',
      metricName: data.name,
      metricValue: data.value,
      metricRating: data.rating,
      userAgent: req.headers['user-agent'] || null,
      sessionId: data.id,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing web vital:', error);
    res.status(400).json({ error: 'Invalid web vital data' });
  }
});

/**
 * POST /api/analytics/events
 * Track custom events
 * @protected Requires authentication
 */
router.post("/events", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = customEventSchema.parse(req.body);
    const userTenantId = req.user!.tenantId;

    // Validate tenant isolation
    if (data.tenantId && data.tenantId !== userTenantId) {
      console.warn('[Analytics] Tenant mismatch in custom event:', {
        userId: req.user!.id,
        userTenantId,
        dataTenantId: data.tenantId,
      });
      res.status(403).json({
        error: 'Forbidden: Invalid tenant access',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    // Persist to database
    await storage.createAnalyticsEvent({
      tenantId: userTenantId,
      userId: req.user!.id,
      eventType: 'event',
      eventName: data.event,
      properties: data.properties ? JSON.stringify(data.properties) : null,
      userAgent: req.headers['user-agent'] || null,
      sessionId: data.sessionId || null,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing event:', error);
    res.status(400).json({ error: 'Invalid event data' });
  }
});

/**
 * POST /api/analytics/pageviews
 * Track page views
 * @protected Requires authentication
 */
router.post("/pageviews", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = pageViewSchema.parse(req.body);
    const userTenantId = req.user!.tenantId;

    // Validate tenant isolation
    if (data.tenantId && data.tenantId !== userTenantId) {
      console.warn('[Analytics] Tenant mismatch in page view:', {
        userId: req.user!.id,
        userTenantId,
        dataTenantId: data.tenantId,
      });
      res.status(403).json({
        error: 'Forbidden: Invalid tenant access',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    // Persist to database
    await storage.createAnalyticsEvent({
      tenantId: userTenantId,
      userId: req.user!.id,
      eventType: 'pageview',
      path: data.path,
      properties: data.referrer ? JSON.stringify({ title: data.title, referrer: data.referrer }) : (data.title ? JSON.stringify({ title: data.title }) : null),
      userAgent: req.headers['user-agent'] || null,
      sessionId: data.sessionId || null,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing page view:', error);
    res.status(400).json({ error: 'Invalid page view data' });
  }
});

/**
 * POST /api/analytics/errors
 * Track frontend errors (supplement to Sentry)
 * @protected Requires authentication
 */
router.post("/errors", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = errorEventSchema.parse(req.body);
    const userTenantId = req.user!.tenantId;

    // Validate tenant isolation
    if (data.tenantId && data.tenantId !== userTenantId) {
      console.warn('[Analytics] Tenant mismatch in error event:', {
        userId: req.user!.id,
        userTenantId,
        dataTenantId: data.tenantId,
      });
      res.status(403).json({
        error: 'Forbidden: Invalid tenant access',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    // Capture in Sentry
    captureMessage(
      `Frontend Error: ${data.message}`,
      'error',
      {
        stack: data.stack,
        context: data.context,
        userId: req.user!.id,
        tenantId: userTenantId,
        userAgent: req.headers['user-agent'],
      }
    );

    // Persist to database
    await storage.createAnalyticsEvent({
      tenantId: userTenantId,
      userId: req.user!.id,
      eventType: 'error',
      errorMessage: data.message,
      errorStack: data.stack || null,
      properties: data.context ? JSON.stringify(data.context) : null,
      userAgent: req.headers['user-agent'] || null,
      sessionId: data.sessionId || null,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing error event:', error);
    res.status(400).json({ error: 'Invalid error data' });
  }
});

/**
 * GET /api/analytics/dashboard
 * Returns analytics summary for the dashboard
 * @protected Requires authentication
 */
router.get("/dashboard", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userTenantId = req.user!.tenantId;
    const period = (req.query.period as string) || 'month';

    if (!['today', 'week', 'month'].includes(period)) {
      res.status(400).json({ error: 'Invalid period. Use today, week, or month.' });
      return;
    }

    const summary = await storage.getAnalyticsSummary(userTenantId, period as 'today' | 'week' | 'month');

    // Also get recent errors for the error log
    const recentErrors = await storage.getAnalyticsEventsByTenant(userTenantId, {
      eventType: 'error',
      limit: 20,
    });

    res.status(200).json({
      ...summary,
      recentErrors: recentErrors.map(e => ({
        id: e.id,
        message: e.errorMessage,
        stack: e.errorStack,
        userAgent: e.userAgent,
        createdAt: e.createdAt,
        userId: e.userId,
      })),
    });
  } catch (error) {
    console.error('[Analytics] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
  }
});

/**
 * GET /api/analytics/events
 * List analytics events with filters
 * @protected Requires authentication
 */
router.get("/events", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userTenantId = req.user!.tenantId;
    const { eventType, startDate, endDate, limit } = req.query;

    const events = await storage.getAnalyticsEventsByTenant(userTenantId, {
      eventType: eventType as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.status(200).json(events);
  } catch (error) {
    console.error('[Analytics] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch analytics events' });
  }
});

/**
 * GET /api/analytics/health
 * Health check endpoint
 * @protected Requires authentication
 */
router.get("/health", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
  });
});

export default router;
