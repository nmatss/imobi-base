/**
 * Signature Integrity & Certificate Verification Routes
 *
 * Exposes the legal-blocker hardening implemented in:
 *   - server/integrations/clicksign/audit.ts (HMAC-SHA256 tamper evidence)
 *   - server/integrations/clicksign/certificate-storage.ts (X.509 parsing)
 *
 * These endpoints let the app (and auditors) verify that a document's audit
 * trail has not been tampered with, and parse/validate an uploaded ICP-Brasil
 * certificate WITHOUT establishing full chain validity (see notes / follow-up).
 *
 * Register with: registerSignatureIntegrityRoutes(app)
 */

import type { Express, Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db, schema } from './db';
import { requireAuth } from './middleware/auth';
import { auditTrailService } from './integrations/clicksign/audit';
import { certificateStorage } from './integrations/clicksign/certificate-storage';

/**
 * Resolve the owning tenant of a document key/id via the contracts table or an
 * authoritative UPLOAD audit log. NEVER trusts a tenantId from the request.
 */
async function resolveDocumentTenantId(documentId: string): Promise<string | null> {
  if (!documentId) return null;

  const contractRows = await db
    .select({ tenantId: schema.contracts.tenantId })
    .from(schema.contracts)
    .where(eq(schema.contracts.clicksignDocumentKey, documentId))
    .limit(1);
  if (contractRows.length > 0) return contractRows[0].tenantId;

  const auditRows = await db
    .select({ tenantId: schema.auditLogs.tenantId })
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.entityType, 'document'),
        eq(schema.auditLogs.entityId, documentId),
      ),
    )
    .limit(1);
  return auditRows.length > 0 ? auditRows[0].tenantId : null;
}

export function registerSignatureIntegrityRoutes(app: Express): void {
  /**
   * Verify audit-trail integrity for a document (tamper detection).
   * GET /api/signature-integrity/documents/:documentId/verify
   */
  app.get(
    '/api/signature-integrity/documents/:documentId/verify',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const { documentId } = req.params;

        const ownerTenant = await resolveDocumentTenantId(documentId);
        // If we can resolve the owner, enforce tenant isolation. If we cannot
        // resolve it (no contract / no audit rows), there is nothing to verify.
        if (ownerTenant && ownerTenant !== tenantId) {
          res.status(404).json({ error: 'Document not found' });
          return;
        }

        const result = await auditTrailService.verifyAuditTrailIntegrity(documentId);
        res.json({
          documentId,
          valid: result.valid,
          checkedEvents: result.checkedEvents,
          tamperedEvents: result.tamperedEvents,
          unsignedEvents: result.unsignedEvents,
          missingEvents: result.missingEvents,
        });
      } catch (error: any) {
        console.error('Audit integrity verification error:', error);
        res.status(500).json({ error: error?.message || 'Failed to verify audit trail integrity' });
      }
    },
  );

  /**
   * Parse + basic-validate an X.509 certificate (PEM) without storing it.
   * POST /api/signature-integrity/certificates/inspect
   * body: { certificateData: string (PEM) }
   */
  app.post(
    '/api/signature-integrity/certificates/inspect',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { certificateData } = req.body ?? {};
        if (!certificateData || typeof certificateData !== 'string') {
          res.status(400).json({ error: 'certificateData (PEM) é obrigatório' });
          return;
        }

        const parsed = certificateStorage.parseCertificate(certificateData);
        if (parsed.parseError) {
          res.status(400).json({ error: parsed.parseError });
          return;
        }

        const validation = certificateStorage.validateParsedCertificate(certificateData);

        res.json({
          certificate: {
            holderName: parsed.holderName,
            issuer: parsed.issuer,
            serialNumber: parsed.serialNumber,
            validFrom: parsed.validFrom,
            validUntil: parsed.validUntil,
            fingerprint: parsed.fingerprint,
            status: parsed.status,
            expired: parsed.expired,
          },
          validation,
        });
      } catch (error: any) {
        console.error('Certificate inspect error:', error);
        res.status(500).json({ error: error?.message || 'Failed to inspect certificate' });
      }
    },
  );

  console.log('Signature integrity routes registered');
}
