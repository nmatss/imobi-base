/**
 * DATA EXPORT SYSTEM
 * Implements LGPD Art. 18 and GDPR Art. 20 - Right to Data Portability
 *
 * Allows users to request and download all their personal data
 */

import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { User } from "@shared/schema-sqlite";
import archiver from "archiver";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { logComplianceAudit } from "./audit-logger";

const EXPORT_EXPIRY_DAYS = 7; // Export links expire after 7 days
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const EXPORTS_DIR = join(UPLOAD_DIR, "exports");

// Ensure exports directory exists
if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

interface DataExportOptions {
  userId: string;
  tenantId: string;
  format?: "json" | "csv";
  includeRelated?: boolean;
  ipAddress?: string;
}

interface ExportedData {
  user: any;
  properties?: any[];
  leads?: any[];
  contracts?: any[];
  visits?: any[];
  interactions?: any[];
  consents?: any[];
  auditLogs?: any[];
  metadata: {
    exportDate: string;
    dataVersion: string;
    format: string;
    tenant: string;
  };
}

/**
 * Request a data export
 * Creates a pending export request and returns the request ID
 */
export async function requestDataExport(options: DataExportOptions) {
  const { userId, tenantId, format = "json", ipAddress } = options;

  // Generate unique token
  const requestToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPORT_EXPIRY_DAYS);

  // Create export request
  const [request] = await db.insert(schema.dataExportRequests).values({
    userId,
    tenantId,
    requestToken,
    status: "pending",
    format,
    dataScope: JSON.stringify({ includeRelated: options.includeRelated ?? true }),
    expiresAt: expiresAt.toISOString(),
    ipAddress,
  }).returning();

  // Log compliance audit
  await logComplianceAudit({
    tenantId,
    userId,
    actorId: userId,
    actorType: "user",
    action: "data_export_requested",
    entityType: "user",
    entityId: userId,
    details: JSON.stringify({ format, requestToken }),
    ipAddress,
    legalBasis: "consent",
    severity: "info",
  });

  // Process export asynchronously
  processDataExport(request.id, userId, tenantId, format, options.includeRelated ?? true)
    .catch(error => {
      console.error("Error processing data export:", error);
      db.update(schema.dataExportRequests).set({
        status: "failed",
        errorMessage: error.message,
      }).where(eq(schema.dataExportRequests.id, request.id));
    });

  return {
    requestId: request.id,
    requestToken,
    status: "pending",
    expiresAt: expiresAt.toISOString(),
    message: "Sua solicitação de exportação foi recebida. Você receberá um e-mail quando estiver pronta.",
  };
}

/**
 * Process data export (async)
 * Collects all user data and generates export file
 */
async function processDataExport(
  requestId: string,
  userId: string,
  tenantId: string,
  format: string,
  includeRelated: boolean
) {
  try {
    // Update status to processing
    await db.update(schema.dataExportRequests).set({
      status: "processing",
    }).where(eq(schema.dataExportRequests.id, requestId));

    // Collect all user data
    const exportData = await collectUserData(userId, tenantId, includeRelated);

    // Generate export file
    const fileName = `data-export-${userId}-${Date.now()}.${format === "json" ? "zip" : "zip"}`;
    const filePath = join(EXPORTS_DIR, fileName);

    if (format === "json") {
      await generateJsonExport(exportData, filePath);
    } else {
      await generateCsvExport(exportData, filePath);
    }

    // Get file size
    const fs = await import("fs");
    const stats = fs.statSync(filePath);
    const fileSize = stats.size.toString();

    // For production, upload to S3 or cloud storage
    const fileUrl = `/api/compliance/export-data/download/${requestId}`;

    // Update request with file info
    await db.update(schema.dataExportRequests).set({
      status: "completed",
      fileName,
      fileSize,
      fileUrl,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.dataExportRequests.id, requestId));

    // Log completion
    await logComplianceAudit({
      tenantId,
      userId,
      actorId: "system",
      actorType: "system",
      action: "data_export_completed",
      entityType: "user",
      entityId: userId,
      details: JSON.stringify({ requestId, fileName, fileSize }),
      legalBasis: "consent",
      severity: "info",
    });

    console.log(`Data export completed for user ${userId}: ${fileName}`);
  } catch (error: any) {
    console.error("Error in processDataExport:", error);
    throw error;
  }
}

/**
 * Collect all user data from database
 */
async function collectUserData(
  userId: string,
  tenantId: string,
  includeRelated: boolean
): Promise<ExportedData> {
  // Get user data
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) {
    throw new Error("User not found");
  }

  // Remove sensitive fields
  const { password, passwordResetToken, verificationToken, oauthAccessToken, oauthRefreshToken, ...userData } = user;

  const exportData: ExportedData = {
    user: userData,
    metadata: {
      exportDate: new Date().toISOString(),
      dataVersion: "1.0.0",
      format: "json",
      tenant: tenantId,
    },
  };

  if (includeRelated) {
    // Get user's consents
    const consents = await db.select().from(schema.userConsents).where(eq(schema.userConsents.userId, userId));
    exportData.consents = consents;

    // Get user's interactions (if user is a lead)
    const interactions = await db.select().from(schema.interactions).where(eq(schema.interactions.userId, userId));
    exportData.interactions = interactions;

    // Get user's audit logs (last 1000 entries)
    const auditLogs = await db.select().from(schema.complianceAuditLog).where(eq(schema.complianceAuditLog.userId, userId)).limit(1000);
    exportData.auditLogs = auditLogs;

    // If user has role permissions, get related data
    if (user.role === "admin" || user.role === "broker") {
      // Get assigned leads
      const leads = await db.select().from(schema.leads).where(eq(schema.leads.assignedTo, userId));
      exportData.leads = leads;

      // Get visits
      const visits = await db.select().from(schema.visits).where(eq(schema.visits.assignedTo, userId));
      exportData.visits = visits;
    }
  }

  return exportData;
}

/**
 * Generate JSON export as ZIP file
 */
async function generateJsonExport(data: ExportedData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`Archive created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add main data file
    archive.append(JSON.stringify(data, null, 2), { name: "my-data.json" });

    // Add README
    const readme = `# Seus Dados Pessoais - Exportação LGPD

Data da exportação: ${data.metadata.exportDate}

Este arquivo contém todos os seus dados pessoais armazenados em nosso sistema, conforme previsto na Lei Geral de Proteção de Dados (LGPD).

## Conteúdo

- **my-data.json**: Todos os seus dados em formato JSON
- **README.txt**: Este arquivo

## Seus Direitos (LGPD Art. 18)

Você tem o direito de:
- Confirmação da existência de tratamento
- Acesso aos dados (✓ você está exercendo este direito)
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade
- Portabilidade dos dados a outro fornecedor
- Eliminação dos dados pessoais tratados com o seu consentimento
- Informação sobre o compartilhamento de dados
- Informação sobre a possibilidade de não fornecer consentimento
- Revogação do consentimento

Para exercer qualquer destes direitos, acesse as configurações de privacidade em sua conta.

## Questões?

Se você tiver alguma dúvida sobre seus dados ou direitos, entre em contato conosco através do e-mail: dpo@imobibase.com

---
Exportação gerada automaticamente pelo sistema ImobiBase
`;

    archive.append(readme, { name: "README.txt" });

    archive.finalize();
  });
}

/**
 * Generate CSV export as ZIP file
 */
async function generateCsvExport(data: ExportedData, outputPath: string): Promise<void> {
  // For simplicity, convert to JSON first
  // In production, implement proper CSV conversion
  return generateJsonExport(data, outputPath);
}

/**
 * Get export request status
 */
export async function getExportStatus(requestId: string, userId: string) {
  const [request] = await db.select().from(schema.dataExportRequests).where(eq(schema.dataExportRequests.id, requestId));

  if (!request) {
    throw new Error("Export request not found");
  }

  if (request.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return {
    id: request.id,
    status: request.status,
    format: request.format,
    fileName: request.fileName,
    fileSize: request.fileSize,
    fileUrl: request.fileUrl,
    expiresAt: request.expiresAt,
    completedAt: request.completedAt,
    errorMessage: request.errorMessage,
  };
}

/**
 * Download export file
 */
export async function downloadExport(requestId: string, userId: string) {
  const [request] = await db.select().from(schema.dataExportRequests).where(eq(schema.dataExportRequests.id, requestId));

  if (!request) {
    throw new Error("Export request not found");
  }

  if (request.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (request.status !== "completed") {
    throw new Error("Export not ready yet");
  }

  // Check expiration
  if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
    throw new Error("Export link has expired");
  }

  // Update download count
  await db.update(schema.dataExportRequests).set({
    downloadedAt: new Date().toISOString(),
    downloadCount: (request.downloadCount || 0) + 1,
  }).where(eq(schema.dataExportRequests.id, requestId));

  // Log download
  await logComplianceAudit({
    tenantId: request.tenantId,
    userId: request.userId,
    actorId: userId,
    actorType: "user",
    action: "data_export_downloaded",
    entityType: "user",
    entityId: userId,
    details: JSON.stringify({ requestId }),
    legalBasis: "consent",
    severity: "info",
  });

  // Return file path
  return join(EXPORTS_DIR, request.fileName!);
}

/**
 * Clean up expired exports
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupExpiredExports() {
  const now = new Date();
  const expiredRequests = await db.select().from(schema.dataExportRequests).where(
    eq(schema.dataExportRequests.status, "completed")
  ).then((requests: any[]) => requests.filter(r => r.expiresAt && new Date(r.expiresAt) < now));

  for (const request of expiredRequests) {
    if (request.fileName) {
      // Delete file
      const filePath = join(EXPORTS_DIR, request.fileName);
      try {
        const fs = await import("fs");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Error deleting export file: ${filePath}`, error);
      }
    }

    // Update request status
    await db.update(schema.dataExportRequests).set({
      status: "failed",
      errorMessage: "Export expired",
    }).where(eq(schema.dataExportRequests.id, request.id));
  }

  console.log(`Cleaned up ${expiredRequests.length} expired exports`);
}
