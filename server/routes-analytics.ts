/**
 * Analytics Routes
 *
 * Endpoints for collecting analytics data from the frontend
 */

import express, { Request, Response } from "express";
import { captureMessage } from "./monitoring/sentry.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth.js";

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
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
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
  tenantId: z.string().optional(), // For tenant isolation validation
});

// Schema for custom events
const customEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(), // For tenant isolation validation
});

// Schema for page views
const pageViewSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  referrer: z.string().optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(), // For tenant isolation validation
});

// Schema for errors
const errorEventSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
  timestamp: z.number().optional(),
  tenantId: z.string().optional(), // For tenant isolation validation
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

    // Log critical metrics
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

    // In production, you could store these in a database or send to a third-party service
    // For now, we'll just log them
    console.log('[Analytics] Web Vital:', {
      ...data,
      userId: req.user!.id,
      tenantId: userTenantId,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in analytics database or send to external service
    // Example: await analyticsService.trackWebVital({ ...data, tenantId: userTenantId });

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

    console.log('[Analytics] Event:', {
      ...data,
      userId: req.user!.id,
      tenantId: userTenantId,
      userAgent: req.headers['user-agent'],
      timestamp: data.timestamp || Date.now(),
    });

    // TODO: Store in analytics database
    // Example: await analyticsService.trackEvent({ ...data, tenantId: userTenantId });

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

    console.log('[Analytics] Page View:', {
      ...data,
      userId: req.user!.id,
      tenantId: userTenantId,
      userAgent: req.headers['user-agent'],
      timestamp: data.timestamp || Date.now(),
    });

    // TODO: Store in analytics database
    // Example: await analyticsService.trackPageView({ ...data, tenantId: userTenantId });

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

    // Log the error
    console.error('[Analytics] Frontend Error:', {
      ...data,
      userId: req.user!.id,
      tenantId: userTenantId,
      userAgent: req.headers['user-agent'],
      timestamp: data.timestamp || Date.now(),
    });

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

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error processing error event:', error);
    res.status(400).json({ error: 'Invalid error data' });
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
