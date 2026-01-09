/**
 * CONSENT MANAGEMENT SYSTEM
 * Implements LGPD Art. 8 and GDPR Art. 7 - Consent Management
 *
 * Tracks and manages user consents for data processing
 */

import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { logComplianceAudit, logConsentEvent } from "./audit-logger";

export type ConsentType = "privacy" | "marketing" | "analytics" | "cookies" | "newsletter";

export interface ConsentOptions {
  userId?: string;
  tenantId?: string;
  email?: string;
  sessionId?: string;
  consentType: ConsentType;
  consentVersion: string;
  purpose?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Give consent for data processing
 */
export async function giveConsent(options: ConsentOptions) {
  const { userId, tenantId, email, consentType, consentVersion, purpose, ipAddress, userAgent, metadata } = options;

  // Check if consent already exists and is active
  const [existing] = userId
    ? await db.select().from(schema.userConsents).where(
        and(
          eq(schema.userConsents.userId, userId),
          eq(schema.userConsents.consentType, consentType),
          eq(schema.userConsents.status, "active")
        )
      )
    : await db.select().from(schema.userConsents).where(
        and(
          eq(schema.userConsents.email, email!),
          eq(schema.userConsents.consentType, consentType),
          eq(schema.userConsents.status, "active")
        )
      );

  if (existing) {
    // Update consent version if changed
    if (existing.consentVersion !== consentVersion) {
      await db.update(schema.userConsents).set({
        consentVersion,
        acceptedAt: new Date().toISOString(),
        withdrawnAt: null,
        status: "active",
        ipAddress,
        userAgent,
      }).where(eq(schema.userConsents.id, existing.id));

      await logConsentEvent(userId, tenantId, consentType, "given", ipAddress, userAgent);

      return {
        message: "Consentimento atualizado com sucesso",
        consentId: existing.id,
      };
    }

    return {
      message: "Consentimento já registrado",
      consentId: existing.id,
    };
  }

  // Create new consent
  const [consent] = await db.insert(schema.userConsents).values({
    userId,
    tenantId,
    email,
    consentType,
    consentVersion,
    status: "active",
    purpose,
    ipAddress,
    userAgent,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    acceptedAt: new Date().toISOString(),
  }).returning();

  await logConsentEvent(userId, tenantId, consentType, "given", ipAddress, userAgent);

  return {
    message: "Consentimento registrado com sucesso",
    consentId: consent.id,
  };
}

/**
 * Withdraw consent
 */
export async function withdrawConsent(userId: string, tenantId: string, consentType: ConsentType, ipAddress?: string, userAgent?: string) {
  const [consent] = await db.select().from(schema.userConsents).where(
    and(
      eq(schema.userConsents.userId, userId),
      eq(schema.userConsents.consentType, consentType),
      eq(schema.userConsents.status, "active")
    )
  );

  if (!consent) {
    throw new Error("Consentimento não encontrado");
  }

  await db.update(schema.userConsents).set({
    status: "withdrawn",
    withdrawnAt: new Date().toISOString(),
  }).where(eq(schema.userConsents.id, consent.id));

  await logConsentEvent(userId, tenantId, consentType, "withdrawn", ipAddress, userAgent);

  return {
    message: "Consentimento retirado com sucesso",
  };
}

/**
 * Get user consents
 */
export async function getUserConsents(userId: string) {
  return await db.select().from(schema.userConsents).where(eq(schema.userConsents.userId, userId));
}

/**
 * Check if user has active consent
 */
export async function hasActiveConsent(userId: string, consentType: ConsentType): Promise<boolean> {
  const [consent] = await db.select().from(schema.userConsents).where(
    and(
      eq(schema.userConsents.userId, userId),
      eq(schema.userConsents.consentType, consentType),
      eq(schema.userConsents.status, "active")
    )
  );
  return !!consent;
}

/**
 * Get consent history for audit
 */
export async function getConsentHistory(userId: string) {
  const consents = await db.select().from(schema.userConsents).where(eq(schema.userConsents.userId, userId));

  return consents.map((consent: any) => ({
    id: consent.id,
    consentType: consent.consentType,
    version: consent.consentVersion,
    status: consent.status,
    purpose: consent.purpose,
    acceptedAt: consent.acceptedAt,
    withdrawnAt: consent.withdrawnAt,
    ipAddress: consent.ipAddress,
  }));
}

/**
 * Bulk update consents (for policy changes)
 */
export async function updateConsentsForNewPolicy(
  consentType: ConsentType,
  oldVersion: string,
  newVersion: string,
  tenantId?: string
) {
  // Mark old consents as expired
  const conditions = [
    eq(schema.userConsents.consentType, consentType)
  ];
  if (tenantId) {
    conditions.push(eq(schema.userConsents.tenantId, tenantId));
  }
  await db.update(schema.userConsents).set({
    status: "expired"
  }).where(and(...conditions));

  await logComplianceAudit({
    tenantId,
    actorId: "system",
    actorType: "system",
    action: "consent_policy_updated",
    entityType: "consent",
    entityId: consentType,
    details: JSON.stringify({ oldVersion, newVersion }),
    legalBasis: "legal_obligation",
    severity: "warning",
  });

  return {
    message: `Política de consentimento atualizada de ${oldVersion} para ${newVersion}`,
  };
}

/**
 * Get consent statistics (for DPO)
 */
export async function getConsentStatistics(tenantId: string) {
  const allConsents = await db.select().from(schema.userConsents).where(eq(schema.userConsents.tenantId, tenantId));

  const stats = {
    total: allConsents.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    activeCount: 0,
    withdrawnCount: 0,
  };

  for (const consent of allConsents) {
    // Count by type
    stats.byType[consent.consentType] = (stats.byType[consent.consentType] || 0) + 1;

    // Count by status
    stats.byStatus[consent.status] = (stats.byStatus[consent.status] || 0) + 1;

    if (consent.status === "active") {
      stats.activeCount++;
    } else if (consent.status === "withdrawn") {
      stats.withdrawnCount++;
    }
  }

  return stats;
}

/**
 * Cookie consent helper
 */
export async function setCookieConsent(
  sessionId: string,
  preferences: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  },
  consentVersion: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const [cookiePreference] = await db.insert(schema.cookiePreferences).values({
    userId,
    sessionId,
    essential: preferences.essential,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    personalization: preferences.personalization,
    consentVersion,
    ipAddress,
    userAgent,
  }).returning();

  // Create individual consents
  if (preferences.analytics) {
    await giveConsent({
      userId,
      sessionId,
      consentType: "analytics",
      consentVersion,
      purpose: "Análise de uso do site",
      ipAddress,
      userAgent,
    });
  }

  if (preferences.marketing) {
    await giveConsent({
      userId,
      sessionId,
      consentType: "marketing",
      consentVersion,
      purpose: "Marketing e publicidade",
      ipAddress,
      userAgent,
    });
  }

  return {
    message: "Preferências de cookies salvas",
    preferenceId: cookiePreference.id,
  };
}

/**
 * Get cookie preferences
 */
export async function getCookiePreferences(userId?: string, sessionId?: string) {
  if (userId) {
    return await db.select().from(schema.cookiePreferences).where(eq(schema.cookiePreferences.userId, userId));
  } else if (sessionId) {
    return await db.select().from(schema.cookiePreferences).where(eq(schema.cookiePreferences.sessionId, sessionId));
  }
  return null;
}
