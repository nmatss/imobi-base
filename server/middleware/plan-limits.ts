/**
 * Plan Limits Middleware
 * Enforces subscription plan limits on resources
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import * as Sentry from '@sentry/node';

export interface PlanLimits {
  maxUsers: number;
  maxProperties: number;
  maxIntegrations: number;
  features: string[];
}

export interface UpgradePrompt {
  limitReached: boolean;
  currentUsage: number;
  maxAllowed: number;
  planName: string;
  upgradeMessage: string;
}

/**
 * Get tenant's plan limits
 */
export async function getTenantPlanLimits(tenantId: string): Promise<PlanLimits> {
  try {
    const subscription = await storage.getTenantSubscription(tenantId);

    if (!subscription) {
      // Return default trial limits
      return {
        maxUsers: 2,
        maxProperties: 10,
        maxIntegrations: 0,
        features: ['basic'],
      };
    }

    const plan = await storage.getPlan(subscription.planId);

    if (!plan) {
      throw new Error('Plan not found');
    }

    return {
      maxUsers: plan.maxUsers || 5,
      maxProperties: plan.maxProperties || 100,
      maxIntegrations: plan.maxIntegrations || 3,
      features: (plan.features as string[]) || [],
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'getTenantPlanLimits' },
      extra: { tenantId },
    });

    // Return default limits on error
    return {
      maxUsers: 5,
      maxProperties: 100,
      maxIntegrations: 3,
      features: ['basic'],
    };
  }
}

/**
 * Get tenant's subscription status
 */
export async function getTenantSubscriptionStatus(tenantId: string): Promise<string> {
  try {
    const subscription = await storage.getTenantSubscription(tenantId);

    if (!subscription) {
      return 'trial';
    }

    return subscription.status || 'trial';
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'getTenantSubscriptionStatus' },
      extra: { tenantId },
    });
    return 'trial';
  }
}

/**
 * Check if tenant subscription is active
 */
export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  const status = await getTenantSubscriptionStatus(tenantId);
  return status === 'active' || status === 'trial';
}

/**
 * Middleware to check user creation limit
 */
export async function checkUserLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if subscription is active
    const isActive = await isSubscriptionActive(tenantId);
    if (!isActive) {
      res.status(403).json({
        error: 'Subscription not active',
        message: 'Your subscription is not active. Please update your payment method.',
      });
      return;
    }

    const limits = await getTenantPlanLimits(tenantId);
    const currentUserCount = await storage.getTenantUserCount(tenantId);

    if (currentUserCount >= limits.maxUsers) {
      const upgradePrompt: UpgradePrompt = {
        limitReached: true,
        currentUsage: currentUserCount,
        maxAllowed: limits.maxUsers,
        planName: 'current',
        upgradeMessage: `You have reached the maximum number of users (${limits.maxUsers}) for your plan. Please upgrade to add more users.`,
      };

      res.status(403).json({
        error: 'User limit reached',
        ...upgradePrompt,
      });
      return;
    }

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'checkUserLimit' },
    });
    next(error);
  }
}

/**
 * Middleware to check property creation limit
 */
export async function checkPropertyLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if subscription is active
    const isActive = await isSubscriptionActive(tenantId);
    if (!isActive) {
      res.status(403).json({
        error: 'Subscription not active',
        message: 'Your subscription is not active. Please update your payment method.',
      });
      return;
    }

    const limits = await getTenantPlanLimits(tenantId);
    const currentPropertyCount = await storage.getTenantPropertyCount(tenantId);

    if (currentPropertyCount >= limits.maxProperties) {
      const upgradePrompt: UpgradePrompt = {
        limitReached: true,
        currentUsage: currentPropertyCount,
        maxAllowed: limits.maxProperties,
        planName: 'current',
        upgradeMessage: `You have reached the maximum number of properties (${limits.maxProperties}) for your plan. Please upgrade to add more properties.`,
      };

      res.status(403).json({
        error: 'Property limit reached',
        ...upgradePrompt,
      });
      return;
    }

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'checkPropertyLimit' },
    });
    next(error);
  }
}

/**
 * Middleware to check feature access
 */
export function checkFeatureAccess(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if subscription is active
      const isActive = await isSubscriptionActive(tenantId);
      if (!isActive) {
        res.status(403).json({
          error: 'Subscription not active',
          message: 'Your subscription is not active. Please update your payment method.',
        });
        return;
      }

      const limits = await getTenantPlanLimits(tenantId);

      if (!limits.features.includes(featureName)) {
        res.status(403).json({
          error: 'Feature not available',
          message: `The feature "${featureName}" is not available in your current plan. Please upgrade to access this feature.`,
          upgradeRequired: true,
        });
        return;
      }

      next();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { middleware: 'plan-limits', operation: 'checkFeatureAccess' },
        extra: { featureName },
      });
      next(error);
    }
  };
}

/**
 * Get usage statistics for a tenant
 */
export async function getUsageStats(tenantId: string): Promise<{
  users: { current: number; max: number };
  properties: { current: number; max: number };
  integrations: { current: number; max: number };
  status: string;
}> {
  try {
    const limits = await getTenantPlanLimits(tenantId);
    const status = await getTenantSubscriptionStatus(tenantId);

    const [userCount, propertyCount, integrationCount] = await Promise.all([
      storage.getTenantUserCount(tenantId),
      storage.getTenantPropertyCount(tenantId),
      storage.getTenantIntegrationCount(tenantId),
    ]);

    return {
      users: {
        current: userCount,
        max: limits.maxUsers,
      },
      properties: {
        current: propertyCount,
        max: limits.maxProperties,
      },
      integrations: {
        current: integrationCount,
        max: limits.maxIntegrations,
      },
      status,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'getUsageStats' },
      extra: { tenantId },
    });
    throw error;
  }
}

/**
 * Middleware to check if tenant can create integrations
 */
export async function checkIntegrationLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limits = await getTenantPlanLimits(tenantId);
    const currentIntegrationCount = await storage.getTenantIntegrationCount(tenantId);

    if (currentIntegrationCount >= limits.maxIntegrations) {
      const upgradePrompt: UpgradePrompt = {
        limitReached: true,
        currentUsage: currentIntegrationCount,
        maxAllowed: limits.maxIntegrations,
        planName: 'current',
        upgradeMessage: `You have reached the maximum number of integrations (${limits.maxIntegrations}) for your plan. Please upgrade to add more integrations.`,
      };

      res.status(403).json({
        error: 'Integration limit reached',
        ...upgradePrompt,
      });
      return;
    }

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'plan-limits', operation: 'checkIntegrationLimit' },
    });
    next(error);
  }
}
