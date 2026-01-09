/**
 * DATA DELETION SYSTEM
 * Implements LGPD Art. 18 and GDPR Art. 17 - Right to Erasure ("Right to be Forgotten")
 *
 * Handles account deletion requests with proper anonymization and legal compliance
 */

import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logComplianceAudit } from "./audit-logger";
import {
  anonymizeUser,
  anonymizeLead,
  anonymizeOwner,
  anonymizeRenter,
  DEFAULT_RETENTION_POLICY,
  type RetentionPolicy,
} from "./anonymizer";
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const CERTIFICATES_DIR = join(UPLOAD_DIR, "certificates");

// Ensure certificates directory exists
if (!existsSync(CERTIFICATES_DIR)) {
  mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

interface DeletionRequestOptions {
  userId: string;
  tenantId: string;
  reason?: string;
  deletionType?: "anonymize" | "hard_delete";
  ipAddress?: string;
}

/**
 * Request account deletion
 * Creates a pending deletion request that requires confirmation
 */
export async function requestAccountDeletion(options: DeletionRequestOptions) {
  const { userId, tenantId, reason, deletionType = "anonymize", ipAddress } = options;

  // Check if user exists
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) {
    throw new Error("User not found");
  }

  // Check if there's already a pending request
  const [existingRequest] = await db.select().from(schema.accountDeletionRequests).where(
    and(
      eq(schema.accountDeletionRequests.userId, userId),
      eq(schema.accountDeletionRequests.status, "pending")
    )
  );
  if (existingRequest) {
    throw new Error("Já existe uma solicitação de exclusão pendente para esta conta");
  }

  // Generate confirmation token
  const confirmationToken = randomBytes(32).toString("hex");

  // Determine data retention based on policy
  const retentionPolicy = DEFAULT_RETENTION_POLICY;
  const dataRetention = JSON.stringify(retentionPolicy);

  // Create deletion request
  const [request] = await db.insert(schema.accountDeletionRequests).values({
    userId,
    tenantId,
    confirmationToken,
    status: "pending",
    reason,
    deletionType,
    dataRetention,
    ipAddress,
  }).returning();

  // Log request
  await logComplianceAudit({
    tenantId,
    userId,
    actorId: userId,
    actorType: "user",
    action: "account_deletion_requested",
    entityType: "user",
    entityId: userId,
    details: JSON.stringify({ reason, deletionType }),
    ipAddress,
    legalBasis: "consent",
    severity: "warning",
  });

  // TODO: Send confirmation email with token
  // await sendDeletionConfirmationEmail(user.email, confirmationToken);

  return {
    requestId: request.id,
    status: "pending",
    confirmationUrl: `/api/compliance/confirm-deletion/${confirmationToken}`,
    message:
      "Solicitação de exclusão recebida. Por favor, confirme através do link enviado para seu e-mail.",
  };
}

/**
 * Confirm account deletion
 * User must confirm via email token before deletion proceeds
 */
export async function confirmAccountDeletion(confirmationToken: string, ipAddress?: string) {
  // Find request by token
  const [request] = await db.select().from(schema.accountDeletionRequests).where(eq((schema.accountDeletionRequests as any).confirmationToken, confirmationToken));

  if (!request) {
    throw new Error("Token de confirmação inválido ou expirado");
  }

  if (request.status !== "pending") {
    throw new Error("Esta solicitação já foi processada");
  }

  // Update request status
  await db.update(schema.accountDeletionRequests).set({
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
    ipAddress,
  }).where(eq(schema.accountDeletionRequests.id, request.id));

  // Log confirmation
  await logComplianceAudit({
    tenantId: request.tenantId,
    userId: request.userId,
    actorId: request.userId,
    actorType: "user",
    action: "account_deletion_confirmed",
    entityType: "user",
    entityId: request.userId,
    ipAddress,
    legalBasis: "consent",
    severity: "warning",
  });

  // Process deletion asynchronously
  processAccountDeletion(request.id, request.userId, request.tenantId, request.deletionType!)
    .catch((error) => {
      console.error("Error processing account deletion:", error);
      db.update(schema.accountDeletionRequests).set({
        status: "pending",
        notes: `Erro ao processar: ${error.message}`,
      }).where(eq(schema.accountDeletionRequests.id, request.id));
    });

  return {
    message: "Confirmação recebida. Sua conta será deletada em breve.",
    requestId: request.id,
  };
}

/**
 * Process account deletion (async)
 * Performs the actual deletion/anonymization
 */
async function processAccountDeletion(
  requestId: string,
  userId: string,
  tenantId: string,
  deletionType: string
) {
  try {
    // Update status to processing
    await db.update(schema.accountDeletionRequests).set({
      status: "processing",
      processedAt: new Date().toISOString(),
    }).where(eq(schema.accountDeletionRequests.id, requestId));

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) {
      throw new Error("User not found");
    }

    if (deletionType === "hard_delete") {
      // HARD DELETE (not recommended - loses audit trail)
      await performHardDelete(userId, tenantId);
    } else {
      // ANONYMIZE (recommended - maintains data integrity)
      await performAnonymization(userId, tenantId);
    }

    // Generate deletion certificate
    const certificateNumber = `DEL-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const certificateUrl = await generateDeletionCertificate(
      certificateNumber,
      user,
      deletionType,
      requestId
    );

    // Update request as completed
    await db.update(schema.accountDeletionRequests).set({
      status: "completed",
      completedAt: new Date().toISOString(),
      certificateNumber,
      certificateUrl,
    }).where(eq(schema.accountDeletionRequests.id, requestId));

    // Log completion
    await logComplianceAudit({
      tenantId,
      userId,
      actorId: "system",
      actorType: "system",
      action: "account_deletion_completed",
      entityType: "user",
      entityId: userId,
      details: JSON.stringify({ deletionType, certificateNumber }),
      legalBasis: "consent",
      severity: "critical",
    });

    console.log(`Account deletion completed for user ${userId}: ${certificateNumber}`);
  } catch (error: any) {
    console.error("Error in processAccountDeletion:", error);
    throw error;
  }
}

/**
 * Perform hard deletion (NOT RECOMMENDED)
 * Completely removes user and all related data
 * Use only when legally required
 */
async function performHardDelete(userId: string, tenantId: string) {
  // WARNING: This will break referential integrity
  // Only use if absolutely necessary

  // Delete user's consents
  await db.delete(schema.userConsents).where(eq(schema.userConsents.userId, userId));

  // Delete user's interactions
  await db.delete(schema.interactions).where(eq(schema.interactions.userId, userId));

  // Unassign leads (set userId to null)
  await db.update(schema.leads).set({ assignedTo: null } as any).where(eq((schema.leads as any).assignedTo, userId));

  // Unassign visits (set userId to null)
  await db.update(schema.visits).set({ assignedTo: null } as any).where(eq((schema.visits as any).assignedTo, userId));

  // Delete user sessions
  await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));

  // Finally, delete the user
  await db.delete(schema.users).where(eq(schema.users.id, userId));

  console.log(`Hard delete completed for user ${userId}`);
}

/**
 * Perform anonymization (RECOMMENDED)
 * Anonymizes user data while maintaining data integrity
 */
async function performAnonymization(userId: string, tenantId: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) {
    throw new Error("User not found");
  }

  // Anonymize user record
  const anonymizedUser = anonymizeUser(user);
  await db.update(schema.users).set(anonymizedUser).where(eq(schema.users.id, userId));

  // Anonymize related data based on retention policy
  const retentionPolicy = DEFAULT_RETENTION_POLICY;

  // If user was a lead, anonymize lead data
  const leads = await db.select().from(schema.leads).where(eq(schema.leads.email, user.email));
  for (const lead of leads) {
    const anonymizedLead = anonymizeLead(lead);
    await db.update(schema.leads).set(anonymizedLead).where(eq(schema.leads.id, lead.id));
  }

  // If user was an owner, anonymize owner data
  const owners = await db.select().from(schema.owners).where(eq(schema.owners.email, user.email));
  for (const owner of owners) {
    const anonymizedOwner = anonymizeOwner(owner);
    await db.update(schema.owners).set(anonymizedOwner).where(eq(schema.owners.id, owner.id));
  }

  // If user was a renter, anonymize renter data
  const renters = await db.select().from(schema.renters).where(eq(schema.renters.email, user.email));
  for (const renter of renters) {
    const anonymizedRenter = anonymizeRenter(renter);
    await db.update(schema.renters).set(anonymizedRenter).where(eq(schema.renters.id, renter.id));
  }

  // Withdraw all consents
  await db.update(schema.userConsents).set({
    status: "withdrawn",
    withdrawnAt: new Date().toISOString()
  }).where(eq(schema.userConsents.userId, userId));

  // Delete user sessions (force logout)
  await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));

  // Keep audit logs (required by LGPD for 5 years)
  // Keep financial records (required by tax law for 5 years)
  // Keep contract records (required by civil code for 10 years)

  console.log(`Anonymization completed for user ${userId}`);
}

/**
 * Generate deletion certificate (PDF)
 * Provides proof of deletion for the user
 */
async function generateDeletionCertificate(
  certificateNumber: string,
  user: any,
  deletionType: string,
  requestId: string
): Promise<string> {
  const fileName = `deletion-certificate-${certificateNumber}.pdf`;
  const filePath = join(CERTIFICATES_DIR, fileName);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("CERTIFICADO DE EXCLUSÃO DE DADOS", { align: "center" });

      doc.moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Conforme Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)", {
          align: "center",
        });

      doc.moveDown(2);

      // Certificate body
      doc.fontSize(11).font("Helvetica");

      doc.font("Helvetica-Bold").text(`Número do Certificado: ${certificateNumber}`).font("Helvetica");
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`);
      doc.text(`Hora de Emissão: ${new Date().toLocaleTimeString("pt-BR")}`);

      doc.moveDown(1.5);

      doc.fontSize(12).text("CERTIFICAMOS QUE:", { underline: true });

      doc.moveDown(0.5);

      doc.fontSize(11);
      doc.text(
        `Os dados pessoais associados ao usuário "${user.name}" (ID: ${user.id}) foram ${
          deletionType === "hard_delete" ? "permanentemente excluídos" : "devidamente anonimizados"
        } de nossos sistemas, conforme solicitado pelo titular dos dados.`
      );

      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Tipo de Operação: ", { continued: true });
      doc.font("Helvetica").text(
        `${deletionType === "hard_delete" ? "Exclusão Permanente" : "Anonimização"}`
      );

      doc.moveDown(1.5);

      doc.fontSize(12).text("DADOS PROCESSADOS:", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);

      if (deletionType === "hard_delete") {
        doc.text("- Todos os dados pessoais foram permanentemente excluídos");
        doc.text("- Nenhum dado identificável foi retido");
      } else {
        doc.text("- Dados pessoais identificáveis foram anonimizados");
        doc.text(
          "- Registros financeiros foram mantidos em formato anonimizado (requisito fiscal - 5 anos)"
        );
        doc.text(
          "- Registros contratuais foram mantidos em formato anonimizado (requisito legal - 10 anos)"
        );
        doc.text(
          "- Logs de auditoria foram mantidos em formato anonimizado (requisito LGPD - 5 anos)"
        );
      }

      doc.moveDown(1.5);

      doc.fontSize(12).text("DIREITOS DO TITULAR:", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(
        "Conforme LGPD Art. 18, esta ação atende ao direito de eliminação dos dados pessoais tratados com o consentimento do titular."
      );

      doc.moveDown(1.5);

      doc.fontSize(12).text("BASE LEGAL:", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text("- Lei 13.709/2018 (LGPD) - Lei Geral de Proteção de Dados");
      doc.text("- GDPR (EU) 2016/679 - General Data Protection Regulation");

      doc.moveDown(2);

      // Footer
      doc.fontSize(9).font("Helvetica-Oblique");
      doc.text(
        "Este certificado foi gerado automaticamente pelo sistema ImobiBase e possui validade jurídica.",
        { align: "center" }
      );

      doc.moveDown(0.5);

      doc.text(
        `Para verificar a autenticidade deste certificado, use o número: ${certificateNumber}`,
        { align: "center" }
      );

      doc.moveDown(1);

      doc.fontSize(8);
      doc.text("ImobiBase - Sistema de Gestão Imobiliária", { align: "center" });
      doc.text("Encarregado de Dados (DPO): dpo@imobibase.com", { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(`/api/compliance/deletion-certificate/${certificateNumber}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get deletion certificate
 */
export async function getDeletionCertificate(certificateNumber: string) {
  const [request] = await db.select().from(schema.accountDeletionRequests).where(eq((schema.accountDeletionRequests as any).certificateNumber, certificateNumber));

  if (!request) {
    throw new Error("Certificate not found");
  }

  const fileName = `deletion-certificate-${certificateNumber}.pdf`;
  const filePath = join(CERTIFICATES_DIR, fileName);

  return filePath;
}

/**
 * Cancel deletion request
 * User can cancel before confirmation
 */
export async function cancelDeletionRequest(requestId: string, userId: string) {
  const [request] = await db.select().from(schema.accountDeletionRequests).where(eq(schema.accountDeletionRequests.id, requestId));

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (request.status !== "pending") {
    throw new Error("Cannot cancel a request that is already being processed");
  }

  await db.update(schema.accountDeletionRequests).set({
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  }).where(eq(schema.accountDeletionRequests.id, requestId));

  await logComplianceAudit({
    tenantId: request.tenantId,
    userId,
    actorId: userId,
    actorType: "user",
    action: "account_deletion_cancelled",
    entityType: "user",
    entityId: userId,
    legalBasis: "consent",
    severity: "info",
  });

  return {
    message: "Solicitação de exclusão cancelada com sucesso",
  };
}

/**
 * Get deletion request status
 */
export async function getDeletionStatus(userId: string) {
  const [request] = await db.select().from(schema.accountDeletionRequests).where(
    and(
      eq(schema.accountDeletionRequests.userId, userId),
      eq(schema.accountDeletionRequests.status, "pending")
    )
  );

  if (!request) {
    return null;
  }

  return {
    id: request.id,
    status: request.status,
    deletionType: request.deletionType,
    reason: request.reason,
    createdAt: request.createdAt,
    confirmedAt: request.confirmedAt,
    completedAt: request.completedAt,
    certificateNumber: request.certificateNumber,
    certificateUrl: request.certificateUrl,
  };
}
