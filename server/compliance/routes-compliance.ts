/**
 * COMPLIANCE ROUTES
 * API endpoints for LGPD/GDPR compliance features
 */

import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requestDataExport, getExportStatus, downloadExport } from "./data-export";
import {
  requestAccountDeletion,
  confirmAccountDeletion,
  getDeletionStatus,
  getDeletionCertificate,
  cancelDeletionRequest,
} from "./data-deletion";
import {
  giveConsent,
  withdrawConsent,
  getUserConsents,
  getConsentHistory,
  setCookieConsent,
  getCookiePreferences,
} from "./consent-manager";
import {
  generateDataInventory,
  generateConsentReport,
  getDeletionRequestsLog,
  reportDataBreach,
  updateDataBreach,
  generateRiskAssessment,
  getComplianceDashboard,
} from "./dpo-tools";
import { createReadStream } from "fs";
import { generateRateLimitKey } from "../middleware/rate-limit-key-generator";

/**
 * Register compliance routes
 */
export function registerComplianceRoutes(app: Express) {
  // 🔒 Rate limiter para admin compliance endpoints
  const adminComplianceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requisições por minuto
    message: { error: 'Admin Compliance API rate limit exceeded. Please slow down.' },
    keyGenerator: generateRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Aplicar rate limiter globalmente em todas as rotas /api/admin/compliance
  app.use('/api/admin/compliance', adminComplianceLimiter);

  // ===== PUBLIC ROUTES (no authentication required) =====

  // Cookie consent
  app.post("/api/compliance/cookie-consent", async (req: Request, res: Response) => {
    try {
      const { preferences, sessionId, consentVersion } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();
      const userAgent = req.headers["user-agent"];

      const result = await setCookieConsent(
        sessionId || "anonymous",
        preferences,
        consentVersion || "1.0.0",
        userId,
        ipAddress,
        userAgent
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get cookie preferences
  app.get("/api/compliance/cookie-preferences", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const sessionId = req.query.sessionId as string;

      const preferences = await getCookiePreferences(userId, sessionId);
      res.json(preferences);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Confirm account deletion (via email token)
  app.post("/api/compliance/confirm-deletion/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();

      const result = await confirmAccountDeletion(token, ipAddress);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Download deletion certificate (public with certificate number)
  app.get("/api/compliance/deletion-certificate/:certificateNumber", async (req: Request, res: Response) => {
    try {
      const { certificateNumber } = req.params;

      const filePath = await getDeletionCertificate(certificateNumber);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="certificado-exclusao-${certificateNumber}.pdf"`
      );

      const stream = createReadStream(filePath);
      stream.pipe(res);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // ===== AUTHENTICATED USER ROUTES =====

  // Consent management
  app.post("/api/compliance/consents/:type", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { type } = req.params;
      const { purpose, metadata } = req.body;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();
      const userAgent = req.headers["user-agent"];

      const result = await giveConsent({
        userId,
        tenantId,
        consentType: type as any,
        consentVersion: "1.0.0", // TODO: Get from legal documents
        purpose,
        ipAddress,
        userAgent,
        metadata,
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/compliance/consents/:type", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { type } = req.params;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();
      const userAgent = req.headers["user-agent"];

      const result = await withdrawConsent(userId, tenantId, type as any, ipAddress, userAgent);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/compliance/consents", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const consents = await getUserConsents(userId);

      res.json(consents);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/compliance/consent-history", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const history = await getConsentHistory(userId);

      res.json(history);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Data export
  app.post("/api/compliance/export-data", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { format = "json", includeRelated = true } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();

      const result = await requestDataExport({
        userId,
        tenantId,
        format,
        includeRelated,
        ipAddress,
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/compliance/export-data/status/:requestId", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { requestId } = req.params;
      const userId = req.user.id;

      const status = await getExportStatus(requestId, userId);
      res.json(status);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/compliance/export-data/download/:requestId", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { requestId } = req.params;
      const userId = req.user.id;

      const filePath = await downloadExport(requestId, userId);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="my-data-export.zip"`);

      const stream = createReadStream(filePath);
      stream.pipe(res);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // Account deletion
  app.post("/api/compliance/delete-account", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { reason, deletionType = "anonymize" } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString();

      const result = await requestAccountDeletion({
        userId,
        tenantId,
        reason,
        deletionType,
        ipAddress,
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/compliance/deletion-status", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const status = await getDeletionStatus(userId);

      res.json(status);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/compliance/cancel-deletion/:requestId", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { requestId } = req.params;
      const userId = req.user.id;

      const result = await cancelDeletionRequest(requestId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== ADMIN/DPO ROUTES =====
  // 🔒 RATE LIMIT: All admin compliance endpoints are limited to 100 requests per minute

  // Data inventory (ROPA)
  app.get("/api/admin/compliance/data-inventory", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
      }

      const tenantId = req.user.tenantId;
      const inventory = await generateDataInventory(tenantId);

      res.json(inventory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Consent report
  app.get("/api/admin/compliance/consent-report", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const tenantId = req.user.tenantId;
      const { startDate, endDate } = req.query;

      const report = await generateConsentReport(
        tenantId,
        startDate as string,
        endDate as string
      );

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Deletion requests log
  app.get("/api/admin/compliance/deletion-requests", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const tenantId = req.user.tenantId;
      const { status } = req.query;

      const log = await getDeletionRequestsLog(tenantId, status as string);

      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Data breach reporting
  app.post("/api/admin/compliance/data-breach", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const tenantId = req.user.tenantId;
      const reportedBy = req.user.id;

      const result = await reportDataBreach({
        tenantId,
        reportedBy,
        ...req.body,
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/compliance/data-breach/:incidentId", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { incidentId } = req.params;

      const result = await updateDataBreach(incidentId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Risk assessment
  app.get("/api/admin/compliance/risk-assessment", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const tenantId = req.user.tenantId;
      const assessment = await generateRiskAssessment(tenantId);

      res.json(assessment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Compliance dashboard
  app.get("/api/admin/compliance/dashboard", async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const tenantId = req.user.tenantId;
      const dashboard = await getComplianceDashboard(tenantId);

      res.json(dashboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
