/**
 * Subscription Guard Middleware
 * Enforces subscription status globally for all authenticated requests.
 * Suspended or cancelled tenants are blocked from using the platform
 * (except billing/auth/public routes).
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import * as Sentry from '@sentry/node';

const GRACE_PERIOD_DAYS = 7;

/**
 * Route prefixes that should bypass subscription checks
 */
const BYPASS_PREFIXES = [
  '/api/billing',
  '/api/payments',
  '/api/webhooks',
  '/api/stripe',
  '/api/mercadopago',
  '/api/public',
  '/api/portal',
];

/**
 * Exact route paths that should bypass subscription checks
 */
const BYPASS_EXACT = [
  '/api/login',
  '/api/logout',
  '/api/register',
  '/api/user',
];

/**
 * Check if a given path should bypass the subscription guard
 */
function shouldBypass(path: string): boolean {
  for (const prefix of BYPASS_PREFIXES) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  for (const exact of BYPASS_EXACT) {
    if (path === exact) {
      return true;
    }
  }

  return false;
}

/**
 * Global subscription enforcement middleware.
 * Must be registered after authentication middleware so that req.user is populated.
 */
export async function subscriptionGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Skip unauthenticated requests – auth middleware handles those
    if (!req.user) {
      next();
      return;
    }

    // Skip exempt routes (billing, auth, public, etc.)
    if (shouldBypass(req.path)) {
      next();
      return;
    }

    const tenantId = (req.user as any).tenantId;

    if (!tenantId) {
      next();
      return;
    }

    const subscription = await storage.getTenantSubscription(tenantId);

    // No subscription record – treat as trial, allow through
    if (!subscription) {
      next();
      return;
    }

    const status = subscription.status as string | undefined;

    // Active or trial – allow through unconditionally
    if (!status || status === 'active' || status === 'trial') {
      next();
      return;
    }

    // Past due – allow through with warning header during grace period
    if (status === 'past_due') {
      const currentPeriodEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd as string | number)
        : null;

      if (currentPeriodEnd) {
        const graceDeadline = new Date(currentPeriodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

        if (graceDeadline.getTime() <= Date.now()) {
          // Grace period expired – block access
          res.status(403).json({
            error: 'subscription_inactive',
            message:
              'Sua assinatura está suspensa. Atualize seu método de pagamento para continuar.',
            redirectTo: '/settings/billing',
          });
          return;
        }
      }

      // Still within grace period (or no period end date) – allow with warning
      res.setHeader('X-Subscription-Warning', 'past_due');
      next();
      return;
    }

    // Suspended or cancelled – block access
    if (status === 'suspended' || status === 'cancelled') {
      res.status(403).json({
        error: 'subscription_inactive',
        message:
          'Sua assinatura está suspensa. Atualize seu método de pagamento para continuar.',
        redirectTo: '/settings/billing',
      });
      return;
    }

    // Unknown status – allow through (fail open to avoid locking out tenants)
    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'subscription-guard' },
      extra: { path: req.path, userId: (req.user as any)?.id },
    });

    // Fail open – don't block requests due to internal errors
    next();
  }
}
