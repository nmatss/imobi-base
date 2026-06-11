/**
 * COMPLIANCE AUDIT LOGGER
 * Centralized logging for LGPD/GDPR compliance activities
 */

import { db, schema } from "../db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { maskByFieldName } from "../utils/pii-mask";

interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  actorId: string;
  actorType: "user" | "admin" | "system" | "api";
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  changedData?: string;
  legalBasis?: string;
  severity?: "info" | "warning" | "critical";
}

/**
 * Log a compliance audit event
 */
export async function logComplianceAudit(entry: AuditLogEntry) {
  try {
    await db.insert(schema.complianceAuditLog).values({
      // id explícito: a coluna não tem default no schema SQLite (dev/test).
      id: randomUUID(),
      tenantId: entry.tenantId,
      userId: entry.userId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      changedData: entry.changedData,
      legalBasis: entry.legalBasis,
      severity: entry.severity,
    });
  } catch (error) {
    console.error("Failed to log compliance audit:", error);
    // Don't throw - logging failure shouldn't break the application
  }
}

/**
 * Log data access event
 */
export async function logDataAccess(
  userId: string,
  tenantId: string,
  entityType: string,
  entityId: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logComplianceAudit({
    tenantId,
    userId,
    actorId: userId,
    actorType: "user",
    action: "data_access",
    entityType,
    entityId,
    ipAddress,
    userAgent,
    legalBasis: "legitimate_interest",
    severity: "info",
  });
}

/**
 * Log data modification event
 */
export async function logDataModification(
  userId: string,
  tenantId: string,
  entityType: string,
  entityId: string,
  changedFields: Record<string, { old: any; new: any }>,
  ipAddress?: string,
  userAgent?: string
) {
  // Redige/mascara dados pessoais nos campos alterados antes de persistir no log.
  // - Segredos puros (sem valor útil em log) => [REDACTED].
  // - PII com sufixo útil para diagnóstico (CPF/CNPJ, e-mail, telefone, conta
  //   bancária, Pix) => mascaramento parcial via pii-mask (mostra só o final).
  const anonymizedChanges: Record<string, { old: string; new: string }> = {};
  const fullyRedactedFields = ["password", "rg", "passwordHash", "secret", "token"];
  const maskableFields = ["cpfCnpj", "cpf", "cnpj", "email", "phone", "bankAccount", "bankAgency", "pixKey"];

  for (const [field, values] of Object.entries(changedFields)) {
    if (fullyRedactedFields.includes(field)) {
      anonymizedChanges[field] = {
        old: values.old ? "[REDACTED]" : "",
        new: values.new ? "[REDACTED]" : "",
      };
    } else if (maskableFields.includes(field)) {
      anonymizedChanges[field] = {
        old: values.old ? maskByFieldName(field, values.old) : "",
        new: values.new ? maskByFieldName(field, values.new) : "",
      };
    } else {
      anonymizedChanges[field] = {
        old: String(values.old),
        new: String(values.new),
      };
    }
  }

  await logComplianceAudit({
    tenantId,
    userId,
    actorId: userId,
    actorType: "user",
    action: "data_modification",
    entityType,
    entityId,
    changedData: JSON.stringify(anonymizedChanges),
    ipAddress,
    userAgent,
    legalBasis: "contract",
    severity: "info",
  });
}

/**
 * Log consent event
 */
export async function logConsentEvent(
  userId: string | undefined,
  tenantId: string | undefined,
  consentType: string,
  action: "given" | "withdrawn",
  ipAddress?: string,
  userAgent?: string
) {
  await logComplianceAudit({
    tenantId,
    userId,
    actorId: userId || "anonymous",
    actorType: userId ? "user" : "system",
    action: `consent_${action}`,
    entityType: "consent",
    entityId: consentType,
    details: JSON.stringify({ consentType, action }),
    ipAddress,
    userAgent,
    legalBasis: "consent",
    severity: action === "withdrawn" ? "warning" : "info",
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100) {
  return await db.select()
    .from(schema.complianceAuditLog)
    .where(eq(schema.complianceAuditLog.userId, userId))
    .orderBy(desc((schema.complianceAuditLog as any).createdAt))
    .limit(limit);
}

/**
 * Get audit logs for a tenant
 */
export async function getTenantAuditLogs(tenantId: string, limit: number = 100) {
  return await db.select()
    .from(schema.complianceAuditLog)
    .where(eq(schema.complianceAuditLog.tenantId, tenantId))
    .orderBy(desc((schema.complianceAuditLog as any).createdAt))
    .limit(limit);
}

/**
 * Search audit logs by action
 */
export async function searchAuditLogsByAction(action: string, tenantId?: string, limit: number = 100) {
  const conditions = [eq(schema.complianceAuditLog.action, action)];
  if (tenantId) {
    conditions.push(eq(schema.complianceAuditLog.tenantId, tenantId));
  }
  return await db.select()
    .from(schema.complianceAuditLog)
    .where(and(...conditions))
    .orderBy(desc((schema.complianceAuditLog as any).createdAt))
    .limit(limit);
}

/**
 * Generate audit report for compliance
 */
export async function generateAuditReport(tenantId: string, startDate: string, endDate: string) {
  const logs = await db.select()
    .from(schema.complianceAuditLog)
    .where(
      and(
        eq(schema.complianceAuditLog.tenantId, tenantId),
        gte((schema.complianceAuditLog as any).createdAt, startDate),
        lte((schema.complianceAuditLog as any).createdAt, endDate)
      )
    )
    .orderBy(desc((schema.complianceAuditLog as any).createdAt));

  // Aggregate statistics
  const stats = {
    total: logs.length,
    byAction: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
  };

  for (const log of logs) {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

    // Count by entity type
    const entityType = log.entityType || "unknown";
    stats.byEntityType[entityType] = (stats.byEntityType[entityType] || 0) + 1;
  }

  return {
    period: { startDate, endDate },
    statistics: stats,
    logs: logs.slice(0, 1000), // Limit to 1000 most recent
  };
}
