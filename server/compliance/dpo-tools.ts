/**
 * DATA PROTECTION OFFICER (DPO) TOOLS
 * Tools for managing LGPD/GDPR compliance activities
 *
 * LGPD Art. 41: The Data Protection Officer (Encarregado) is responsible for:
 * - Receiving communications from data subjects and ANPD
 * - Taking measures and providing guidance
 * - Advising the controller on data protection
 */

import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { generateAuditReport } from "./audit-logger";

/**
 * Data Inventory Report
 * GDPR Art. 30 - Record of Processing Activities (ROPA)
 */
export async function generateDataInventory(tenantId: string) {
  // Get all data processing activities
  const activities = await db.select().from(schema.dataProcessingActivities).where(eq(schema.dataProcessingActivities.tenantId, tenantId));

  // Get statistics
  const users = await db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));
  const leads = await db.select().from(schema.leads).where(eq(schema.leads.tenantId, tenantId));
  const owners = await db.select().from(schema.owners).where(eq(schema.owners.tenantId, tenantId));
  const renters = await db.select().from(schema.renters).where(eq(schema.renters.tenantId, tenantId));
  const contracts = await db.select().from(schema.rentalContracts).where(eq(schema.rentalContracts.tenantId, tenantId));

  const inventory = {
    tenantId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      totalLeads: leads.length,
      totalOwners: owners.length,
      totalRenters: renters.length,
      totalContracts: contracts.length,
      totalProcessingActivities: activities.length,
    },
    processingActivities: activities.map((activity: any) => ({
      id: activity.id,
      name: activity.activityName,
      purpose: activity.purpose,
      legalBasis: activity.legalBasis,
      dataCategories: activity.dataCategories ? JSON.parse(activity.dataCategories) : [],
      dataSubjects: activity.dataSubjects ? JSON.parse(activity.dataSubjects) : [],
      recipients: activity.recipients ? JSON.parse(activity.recipients) : [],
      dataTransfers: activity.dataTransfers ? JSON.parse(activity.dataTransfers) : [],
      retentionPeriod: activity.retentionPeriod,
      securityMeasures: activity.securityMeasures ? JSON.parse(activity.securityMeasures) : [],
      dpoReviewed: activity.dpoReviewed,
      isActive: activity.isActive,
    })),
    dataCategories: {
      personalData: {
        description: "Nome, email, telefone, endereço",
        count: users.length + leads.length + owners.length + renters.length,
        tables: ["users", "leads", "owners", "renters"],
      },
      identificationData: {
        description: "CPF/CNPJ, RG",
        count: owners.length + renters.length,
        tables: ["owners", "renters"],
      },
      financialData: {
        description: "Dados bancários, pagamentos, comissões",
        count: contracts.length,
        tables: ["rental_payments", "property_sales", "commissions"],
      },
      contractualData: {
        description: "Contratos de locação e venda",
        count: contracts.length,
        tables: ["rental_contracts", "contracts"],
      },
    },
  };

  return inventory;
}

/**
 * Consent Audit Report
 * Track consent compliance
 */
export async function generateConsentReport(tenantId: string, startDate?: string, endDate?: string) {
  const consents = await db.select().from(schema.userConsents).where(eq(schema.userConsents.tenantId, tenantId));

  // Filter by date range if provided
  let filteredConsents = consents;
  if (startDate && endDate) {
    filteredConsents = consents.filter((c: any) => {
      const acceptedDate = new Date(c.acceptedAt);
      return acceptedDate >= new Date(startDate) && acceptedDate <= new Date(endDate);
    });
  }

  const report = {
    tenantId,
    period: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    summary: {
      totalConsents: filteredConsents.length,
      activeConsents: filteredConsents.filter((c: any) => c.status === "active").length,
      withdrawnConsents: filteredConsents.filter((c: any) => c.status === "withdrawn").length,
      expiredConsents: filteredConsents.filter((c: any) => c.status === "expired").length,
    },
    byType: {} as Record<string, any>,
    withdrawalRate: {} as Record<string, number>,
    recentWithdrawals: [] as any[],
  };

  // Group by consent type
  const typeGroups: Record<string, any[]> = {};
  for (const consent of filteredConsents) {
    if (!typeGroups[consent.consentType]) {
      typeGroups[consent.consentType] = [];
    }
    typeGroups[consent.consentType].push(consent);
  }

  // Calculate stats per type
  for (const [type, typeConsents] of Object.entries(typeGroups)) {
    const active = typeConsents.filter(c => c.status === "active").length;
    const withdrawn = typeConsents.filter(c => c.status === "withdrawn").length;
    const total = typeConsents.length;

    report.byType[type] = {
      total,
      active,
      withdrawn,
      withdrawalRate: total > 0 ? ((withdrawn / total) * 100).toFixed(2) + "%" : "0%",
    };

    report.withdrawalRate[type] = total > 0 ? (withdrawn / total) * 100 : 0;
  }

  // Recent withdrawals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  report.recentWithdrawals = filteredConsents
    .filter((c: any) => c.status === "withdrawn" && c.withdrawnAt && new Date(c.withdrawnAt) >= thirtyDaysAgo)
    .map((c: any) => ({
      consentType: c.consentType,
      withdrawnAt: c.withdrawnAt,
      userId: c.userId,
    }));

  return report;
}

/**
 * Data Deletion Requests Log
 */
export async function getDeletionRequestsLog(tenantId: string, status?: string) {
  let requests = await db.select().from(schema.accountDeletionRequests).where(eq(schema.accountDeletionRequests.tenantId, tenantId));

  if (status) {
    requests = requests.filter((r: any) => r.status === status);
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    summary: {
      total: requests.length,
      pending: requests.filter((r: any) => r.status === "pending").length,
      confirmed: requests.filter((r: any) => r.status === "confirmed").length,
      processing: requests.filter((r: any) => r.status === "processing").length,
      completed: requests.filter((r: any) => r.status === "completed").length,
      cancelled: requests.filter((r: any) => r.status === "cancelled").length,
    },
    requests: requests.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      deletionType: r.deletionType,
      reason: r.reason,
      certificateNumber: r.certificateNumber,
      createdAt: r.createdAt,
      confirmedAt: r.confirmedAt,
      completedAt: r.completedAt,
    })),
  };
}

/**
 * Data Breach Notification System
 */
export async function reportDataBreach(options: {
  tenantId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedDataTypes: string[];
  affectedRecordsCount: number;
  affectedUserIds?: string[];
  discoveredAt: string;
  reportedBy: string;
  assignedTo?: string;
}) {
  // Generate incident number
  const year = new Date().getFullYear();
  const existingIncidents = await db.select().from(schema.dataBreachIncidents).where(eq(schema.dataBreachIncidents.tenantId, options.tenantId));
  const count = existingIncidents.length + 1;
  const incidentNumber = `BR-${year}-${String(count).padStart(3, "0")}`;

  const [incident] = await db.insert(schema.dataBreachIncidents).values({
    tenantId: options.tenantId,
    incidentNumber,
    severity: options.severity,
    status: "reported",
    title: options.title,
    description: options.description,
    affectedDataTypes: JSON.stringify(options.affectedDataTypes),
    affectedRecordsCount: options.affectedRecordsCount,
    affectedUserIds: options.affectedUserIds ? JSON.stringify(options.affectedUserIds) : undefined,
    discoveredAt: options.discoveredAt,
    reportedBy: options.reportedBy,
    assignedTo: options.assignedTo,
  }).returning();

  // LGPD Art. 48: Must notify ANPD within reasonable timeframe
  // GDPR Art. 33: Must notify authority within 72 hours
  // TODO: Send notification to ANPD if severity is high/critical

  // TODO: Notify affected users if severity is high/critical
  // LGPD Art. 48, §1: Must notify affected data subjects when risk of damage

  return {
    incidentNumber,
    id: incident.id,
    message: "Incidente de segurança registrado. Notificações serão enviadas conforme necessário.",
    nextSteps: [
      "Investigar a causa raiz",
      options.severity === "high" || options.severity === "critical" ? "Notificar ANPD em até 72 horas" : null,
      options.affectedRecordsCount > 100 ? "Notificar usuários afetados" : null,
      "Implementar ações de contenção",
      "Documentar ações preventivas",
    ].filter(Boolean),
  };
}

/**
 * Update data breach incident
 */
export async function updateDataBreach(
  incidentId: string,
  updates: {
    status?: string;
    rootCause?: string;
    mitigationActions?: string[];
    preventiveActions?: string[];
    containedAt?: string;
    resolvedAt?: string;
    reportedToAuthorityAt?: string;
    reportedToUsersAt?: string;
    authorityReference?: string;
    notes?: string;
  }
) {
  const [incident] = await db.select().from(schema.dataBreachIncidents).where(eq(schema.dataBreachIncidents.id, incidentId));
  if (!incident) {
    throw new Error("Incident not found");
  }

  await db.update(schema.dataBreachIncidents).set({
    ...updates,
    mitigationActions: updates.mitigationActions ? JSON.stringify(updates.mitigationActions) : undefined,
    preventiveActions: updates.preventiveActions ? JSON.stringify(updates.preventiveActions) : undefined,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.dataBreachIncidents.id, incidentId));

  return {
    message: "Incidente atualizado com sucesso",
  };
}

/**
 * Risk Assessment Report
 */
export async function generateRiskAssessment(tenantId: string) {
  const inventory = await generateDataInventory(tenantId);
  const consents = await db.select().from(schema.userConsents).where(eq(schema.userConsents.tenantId, tenantId));
  const deletionRequests = await db.select().from(schema.accountDeletionRequests).where(eq(schema.accountDeletionRequests.tenantId, tenantId));
  const breaches = await db.select().from(schema.dataBreachIncidents).where(eq(schema.dataBreachIncidents.tenantId, tenantId));

  const riskFactors = [];

  // Check for high volume of personal data
  if (inventory.summary.totalUsers > 10000) {
    riskFactors.push({
      factor: "High Volume of Personal Data",
      level: "Medium",
      description: `Sistema possui ${inventory.summary.totalUsers} usuários cadastrados`,
      recommendation: "Implementar controles de segurança adicionais",
    });
  }

  // Check for consent compliance
  const withdrawnRate =
    consents.length > 0 ? (consents.filter((c: any) => c.status === "withdrawn").length / consents.length) * 100 : 0;

  if (withdrawnRate > 20) {
    riskFactors.push({
      factor: "High Consent Withdrawal Rate",
      level: "High",
      description: `${withdrawnRate.toFixed(1)}% dos consentimentos foram retirados`,
      recommendation: "Revisar políticas de privacidade e práticas de coleta de dados",
    });
  }

  // Check for pending deletion requests
  const pendingDeletions = deletionRequests.filter((r: any) => r.status === "pending" || r.status === "confirmed");
  if (pendingDeletions.length > 10) {
    riskFactors.push({
      factor: "High Volume of Deletion Requests",
      level: "Medium",
      description: `${pendingDeletions.length} solicitações de exclusão pendentes`,
      recommendation: "Processar solicitações de exclusão dentro do prazo legal (15 dias)",
    });
  }

  // Check for data breaches
  const recentBreaches = breaches.filter((b: any) => {
    const discovered = new Date(b.discoveredAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return discovered >= thirtyDaysAgo;
  });

  if (recentBreaches.length > 0) {
    riskFactors.push({
      factor: "Recent Data Breaches",
      level: "Critical",
      description: `${recentBreaches.length} incidente(s) de segurança nos últimos 30 dias`,
      recommendation: "Implementar ações corretivas urgentemente",
    });
  }

  // Check for data processing without consent
  const activities = await db.select().from(schema.dataProcessingActivities).where(eq(schema.dataProcessingActivities.tenantId, tenantId));
  const activitiesWithoutReview = activities.filter((a: any) => !a.dpoReviewed && a.isActive);

  if (activitiesWithoutReview.length > 0) {
    riskFactors.push({
      factor: "Unreviewed Processing Activities",
      level: "Medium",
      description: `${activitiesWithoutReview.length} atividades de processamento sem revisão do DPO`,
      recommendation: "DPO deve revisar e aprovar todas as atividades de processamento",
    });
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    overallRiskLevel: calculateOverallRisk(riskFactors),
    riskFactors,
    recommendations: [
      "Realizar treinamento de LGPD para toda equipe",
      "Revisar políticas de segurança trimestralmente",
      "Implementar criptografia para dados sensíveis",
      "Manter logs de auditoria por pelo menos 5 anos",
      "Revisar e atualizar documentos legais anualmente",
    ],
  };
}

function calculateOverallRisk(factors: any[]): "Low" | "Medium" | "High" | "Critical" {
  if (factors.some(f => f.level === "Critical")) return "Critical";
  if (factors.filter(f => f.level === "High").length >= 2) return "High";
  if (factors.some(f => f.level === "High")) return "High";
  if (factors.filter(f => f.level === "Medium").length >= 3) return "High";
  if (factors.some(f => f.level === "Medium")) return "Medium";
  return "Low";
}

/**
 * Compliance Dashboard Summary
 */
export async function getComplianceDashboard(tenantId: string) {
  const inventory = await generateDataInventory(tenantId);
  const consentReport = await generateConsentReport(tenantId);
  const deletionLog = await getDeletionRequestsLog(tenantId);
  const riskAssessment = await generateRiskAssessment(tenantId);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalDataSubjects: inventory.summary.totalUsers + inventory.summary.totalLeads,
      activeConsents: consentReport.summary.activeConsents,
      pendingDeletions: deletionLog.summary.pending,
      overallRisk: riskAssessment.overallRiskLevel,
    },
    quickStats: {
      users: inventory.summary.totalUsers,
      leads: inventory.summary.totalLeads,
      contracts: inventory.summary.totalContracts,
      consents: consentReport.summary.totalConsents,
      deletionRequests: deletionLog.summary.total,
    },
    alerts: riskAssessment.riskFactors.filter(f => f.level === "High" || f.level === "Critical"),
  };
}
