/**
 * Plan Limits Middleware
 * Enforces subscription plan limits on resources
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import * as Sentry from "@sentry/node";

export interface PlanLimits {
  maxUsers: number;
  maxProperties: number;
  maxLeads: number;
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

// Default limits matching the free plan
const FREE_PLAN_LIMITS: PlanLimits = {
  maxUsers: 1,
  maxProperties: 15,
  maxLeads: 30,
  maxIntegrations: 0,
  features: ["basic_site", "basic_crm"],
};

/**
 * Get tenant's plan limits
 */
export async function getTenantPlanLimits(
  tenantId: string,
): Promise<PlanLimits> {
  try {
    const subscription = await storage.getTenantSubscription(tenantId);

    if (!subscription) {
      return { ...FREE_PLAN_LIMITS };
    }

    const plan = await storage.getPlan(subscription.planId);

    if (!plan) {
      return { ...FREE_PLAN_LIMITS };
    }

    return {
      maxUsers: plan.maxUsers ?? 1,
      maxProperties: plan.maxProperties ?? 15,
      maxLeads: ((plan as Record<string, unknown>).maxLeads as number) ?? -1,
      maxIntegrations: plan.maxIntegrations ?? 0,
      features: (plan.features as string[]) || [],
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: "plan-limits", operation: "getTenantPlanLimits" },
      extra: { tenantId },
    });

    return { ...FREE_PLAN_LIMITS };
  }
}

/**
 * Get tenant's subscription status
 */
export async function getTenantSubscriptionStatus(
  tenantId: string,
): Promise<string> {
  try {
    const subscription = await storage.getTenantSubscription(tenantId);
    if (!subscription) return "free";
    return subscription.status || "free";
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        middleware: "plan-limits",
        operation: "getTenantSubscriptionStatus",
      },
      extra: { tenantId },
    });
    return "free";
  }
}

/**
 * Check if tenant subscription is active
 */
export async function isSubscriptionActive(tenantId: string): Promise<boolean> {
  const status = await getTenantSubscriptionStatus(tenantId);
  return status === "active" || status === "trial" || status === "free";
}

/**
 * Generic limit check helper — handles -1 (unlimited)
 */
async function checkResourceLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  resourceName: string,
  getLimit: (limits: PlanLimits) => number,
  getCurrentCount: (tenantId: string) => Promise<number>,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const isActive = await isSubscriptionActive(tenantId);
    if (!isActive) {
      res.status(403).json({
        error: "Subscription not active",
        message:
          "Sua assinatura não está ativa. Atualize seu método de pagamento.",
      });
      return;
    }

    const limits = await getTenantPlanLimits(tenantId);
    const maxAllowed = getLimit(limits);

    // -1 means unlimited
    if (maxAllowed === -1) {
      next();
      return;
    }

    const currentCount = await getCurrentCount(tenantId);

    if (currentCount >= maxAllowed) {
      const upgradePrompt: UpgradePrompt = {
        limitReached: true,
        currentUsage: currentCount,
        maxAllowed,
        planName: "current",
        upgradeMessage: `Você atingiu o limite de ${resourceName} (${maxAllowed}) do seu plano. Faça upgrade para continuar.`,
      };

      res.status(403).json({
        error: `${resourceName} limit reached`,
        ...upgradePrompt,
      });
      return;
    }

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        middleware: "plan-limits",
        operation: `check${resourceName}Limit`,
      },
    });
    next(error);
  }
}

/**
 * Middleware to check user creation limit
 */
export async function checkUserLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return checkResourceLimit(
    req,
    res,
    next,
    "usuários",
    (l) => l.maxUsers,
    (tid) => storage.getTenantUserCount(tid),
  );
}

/**
 * Middleware to check property creation limit
 */
export async function checkPropertyLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return checkResourceLimit(
    req,
    res,
    next,
    "imóveis",
    (l) => l.maxProperties,
    (tid) => storage.getTenantPropertyCount(tid),
  );
}

/**
 * Middleware to check lead creation limit (monthly)
 */
export async function checkLeadLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return checkResourceLimit(
    req,
    res,
    next,
    "leads/mês",
    (l) => l.maxLeads,
    (tid) => storage.getTenantLeadCountThisMonth(tid),
  );
}

/**
 * Middleware to check integration creation limit
 */
export async function checkIntegrationLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return checkResourceLimit(
    req,
    res,
    next,
    "integrações",
    (l) => l.maxIntegrations,
    (tid) => storage.getTenantIntegrationCount(tid),
  );
}

/**
 * Middleware to check feature access
 */
export function checkFeatureAccess(featureName: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const isActive = await isSubscriptionActive(tenantId);
      if (!isActive) {
        res.status(403).json({
          error: "Subscription not active",
          message:
            "Sua assinatura não está ativa. Atualize seu método de pagamento.",
        });
        return;
      }

      const limits = await getTenantPlanLimits(tenantId);

      if (!limits.features.includes(featureName)) {
        res.status(403).json({
          error: "Feature not available",
          feature: featureName,
          message: `Este recurso não está disponível no seu plano atual. Faça upgrade para acessar.`,
          upgradeRequired: true,
        });
        return;
      }

      next();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { middleware: "plan-limits", operation: "checkFeatureAccess" },
        extra: { featureName },
      });
      next(error);
    }
  };
}

/**
 * Revoga integracoes excedentes quando o tenant faz downgrade de plano.
 *
 * Features baseadas em flags (`whatsapp`, `ai_marketing`, etc.) sao validadas a
 * cada request via `checkFeatureAccess`, portanto nao precisam de revogacao
 * explicita — o acesso simplesmente e negado na proxima chamada. Limites
 * baseados em contagem de registros ja criados (usuarios, imoveis, leads) nao
 * devem ser removidos automaticamente (risco de perda de dados). O unico
 * recurso que REALMENTE vaza apos downgrade sao integracoes ativas, que
 * continuam sincronizando com sistemas externos apos o plano caducar.
 *
 * Esta funcao desconecta as integracoes mais recentes, preservando as mais
 * antigas (tipicamente as mais criticas para o negocio do tenant).
 *
 * @returns numero de integracoes desconectadas
 */
export async function enforceIntegrationLimit(tenantId: string): Promise<number> {
  try {
    const limits = await getTenantPlanLimits(tenantId);
    // -1 = ilimitado, nada a fazer
    if (limits.maxIntegrations === -1) return 0;

    const integrations = await storage.getIntegrationsByTenant(tenantId);
    const connected = integrations
      .filter((i) => i.status === "connected")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    if (connected.length <= limits.maxIntegrations) return 0;

    // Desconectar as mais novas, preservando as mais antigas ate o limite
    const toDisconnect = connected.slice(limits.maxIntegrations);
    let count = 0;
    for (const integration of toDisconnect) {
      try {
        await storage.createOrUpdateIntegration(
          tenantId,
          integration.integrationName,
          { status: "disconnected", config: integration.config },
        );
        count++;
        console.log(
          `[enforce-plan] Disconnected integration ${integration.integrationName} for tenant ${tenantId}`,
        );
      } catch (err) {
        console.error(
          `[enforce-plan] Failed to disconnect ${integration.integrationName}:`,
          err,
        );
        Sentry.captureException(err, {
          tags: { component: "enforce-plan-limits" },
          extra: { tenantId, integrationName: integration.integrationName },
        });
      }
    }

    if (count > 0) {
      console.log(
        `[enforce-plan] Tenant ${tenantId}: disconnected ${count} integration(s) due to plan downgrade`,
      );
    }

    return count;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: "plan-limits", operation: "enforceIntegrationLimit" },
      extra: { tenantId },
    });
    return 0;
  }
}

/**
 * Executa todas as verificacoes de enforcement de plano para um tenant.
 * Chamado (a) no webhook customer.subscription.updated apos mudanca de plano
 * e (b) diariamente via scheduled-job como safety net.
 */
export async function enforceAllPlanLimits(
  tenantId: string,
): Promise<{ integrationsDisconnected: number }> {
  const integrationsDisconnected = await enforceIntegrationLimit(tenantId);
  return { integrationsDisconnected };
}

/**
 * Get usage statistics for a tenant
 */
export async function getUsageStats(tenantId: string): Promise<{
  users: { current: number; max: number };
  properties: { current: number; max: number };
  leads: { current: number; max: number };
  integrations: { current: number; max: number };
  features: string[];
  status: string;
}> {
  try {
    const limits = await getTenantPlanLimits(tenantId);
    const status = await getTenantSubscriptionStatus(tenantId);

    const [userCount, propertyCount, leadCount, integrationCount] =
      await Promise.all([
        storage.getTenantUserCount(tenantId),
        storage.getTenantPropertyCount(tenantId),
        storage.getTenantLeadCountThisMonth(tenantId),
        storage.getTenantIntegrationCount(tenantId),
      ]);

    return {
      users: { current: userCount, max: limits.maxUsers },
      properties: { current: propertyCount, max: limits.maxProperties },
      leads: { current: leadCount, max: limits.maxLeads },
      integrations: { current: integrationCount, max: limits.maxIntegrations },
      features: limits.features,
      status,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: "plan-limits", operation: "getUsageStats" },
      extra: { tenantId },
    });
    throw error;
  }
}
