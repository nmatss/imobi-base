// @ts-nocheck
/**
 * E-Signature Routes
 * RESTful API for managing electronic signatures via ClickSign
 */

import type { Express, Request, Response } from 'express';
import { DocumentService } from './integrations/clicksign/document-service';
import { SignerService } from './integrations/clicksign/signer-service';
import { contractGenerator } from './integrations/clicksign/contract-generator';
import { webhookHandler } from './integrations/clicksign/webhook-handler';
import { auditTrailService } from './integrations/clicksign/audit';
import { certificateStorage } from './integrations/clicksign/certificate-storage';
import { templateManager } from './integrations/clicksign/template-manager';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import { validateBody } from './middleware/validate';
import { asyncHandler, BadRequestError } from './middleware/error-handler';
import { requireAuth } from './middleware/auth';
import {
  uploadDocumentSchema,
  createSignatureRequestSchema,
  addSignerSchema,
  sendSignatureSchema,
  cancelDocumentSchema,
  generateContractSchema,
} from './schemas';

const documentService = new DocumentService();
const signerService = new SignerService();

export function registerESignatureRoutes(app: Express) {
  // Apply authentication middleware to ALL e-signature routes
  app.use('/api/esignature', requireAuth);

  /**
   * Upload document for signature
   * POST /api/esignature/upload
   */
  app.post('/api/esignature/upload', validateBody(uploadDocumentSchema), asyncHandler(async (req: Request, res: Response) => {
    // Get tenantId from authenticated user (not from request body)
    const tenantId = req.user!.tenantId;
    const { filename, contentBase64, deadline, autoClose, locale } = req.body;

      const document = await documentService.uploadDocument({
        path: `/documents/${tenantId}/${filename}`,
        filename,
        content_base64: contentBase64,
        deadline_at: deadline,
        auto_close: autoClose ?? true,
        locale: locale || 'pt-BR',
      });

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'document_uploaded',
        entityType: 'document',
        entityId: document.key,
        userId: req.user?.id,
        action: 'UPLOAD',
        description: `Document uploaded: ${filename}`,
        metadata: { filename, documentKey: document.key },
        complianceLevel: 'standard',
      });

    res.json({
      success: true,
      document: {
        key: document.key,
        filename: document.filename,
        status: document.status,
        uploadedAt: document.uploaded_at,
      },
    });
  }));

  /**
   * Create signature request
   * POST /api/esignature/create-request
   */
  app.post('/api/esignature/create-request', async (req: Request, res: Response) => {
    try {
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const { documentKey, listName, signers, signingConfig } = req.body;

      if (!documentKey || !signers || !Array.isArray(signers)) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Create signature list
      const list = await documentService.createSignatureList(documentKey, listName || 'Signature Request');

      // Add signers
      const addedSigners = await signerService.addSigners(
        documentKey,
        list.key,
        signers,
        signingConfig || { order: 'parallel', refusable: true }
      );

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'document_created',
        entityType: 'document',
        entityId: documentKey,
        userId: req.user?.id,
        action: 'CREATE_REQUEST',
        description: `Signature request created with ${signers.length} signers`,
        metadata: { documentKey, listKey: list.key, signerCount: signers.length },
        complianceLevel: 'standard',
      });

      res.json({
        success: true,
        list: {
          key: list.key,
          name: list.name,
          documentKey: list.document_key,
        },
        signers: addedSigners,
      });
    } catch (error: any) {
      console.error('Create request error:', error);
      res.status(500).json({ error: error.message || 'Failed to create signature request' });
    }
  });

  /**
   * Add signer to existing request
   * POST /api/esignature/add-signer
   */
  app.post('/api/esignature/add-signer', async (req: Request, res: Response) => {
    try {
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const { documentKey, listKey, signer } = req.body;

      if (!documentKey || !listKey || !signer) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate signer info
      const validation = signerService.validateSignerInfo(signer);
      if (!validation.valid) {
        res.status(400).json({ error: 'Invalid signer data', errors: validation.errors });
        return;
      }

      const addedSigner = await documentService.addSigner(documentKey, listKey, signer);

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'signer_added',
        entityType: 'signer',
        entityId: addedSigner.key,
        userId: req.user?.id,
        action: 'ADD_SIGNER',
        description: `Signer added: ${signer.name} (${signer.email})`,
        metadata: { signerKey: addedSigner.key, signerEmail: signer.email },
        complianceLevel: 'standard',
      });

      res.json({ success: true, signer: addedSigner });
    } catch (error: any) {
      console.error('Add signer error:', error);
      res.status(500).json({ error: error.message || 'Failed to add signer' });
    }
  });

  /**
   * Send signature request
   * POST /api/esignature/send
   */
  app.post('/api/esignature/send', async (req: Request, res: Response) => {
    try {
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const { listKey, message } = req.body;

      if (!listKey) {
        res.status(400).json({ error: 'Missing listKey' });
        return;
      }

      await signerService.sendInvitations(listKey, message);

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'signer_invited',
        entityType: 'document',
        entityId: listKey,
        userId: req.user?.id,
        action: 'SEND_INVITATIONS',
        description: 'Signature invitations sent',
        metadata: { listKey },
        complianceLevel: 'standard',
      });

      res.json({ success: true, message: 'Invitations sent successfully' });
    } catch (error: any) {
      console.error('Send error:', error);
      res.status(500).json({ error: error.message || 'Failed to send invitations' });
    }
  });

  /**
   * Get signature status
   * GET /api/esignature/status/:documentKey
   * Protected by global requireAuth middleware
   */
  app.get('/api/esignature/status/:documentKey', async (req: Request, res: Response) => {
    try {
      const { documentKey } = req.params;
      // User authentication enforced by global middleware
      // tenantId available via req.user!.tenantId if needed for validation

      const document = await documentService.getDocument(documentKey);
      const isComplete = await documentService.isDocumentComplete(documentKey);

      res.json({
        success: true,
        document: {
          key: document.key,
          filename: document.filename,
          status: document.status,
          isComplete,
          uploadedAt: document.uploaded_at,
          finishedAt: document.finished_at,
        },
      });
    } catch (error: any) {
      console.error('Status error:', error);
      res.status(500).json({ error: error.message || 'Failed to get status' });
    }
  });

  /**
   * Get signer status for a list
   * GET /api/esignature/signers/:listKey
   * Protected by global requireAuth middleware
   */
  app.get('/api/esignature/signers/:listKey', async (req: Request, res: Response) => {
    try {
      const { listKey } = req.params;
      // User authentication enforced by global middleware
      // tenantId available via req.user!.tenantId if needed for validation

      const status = await signerService.getSignerStatus(listKey);

      res.json({
        success: true,
        ...status,
      });
    } catch (error: any) {
      console.error('Signer status error:', error);
      res.status(500).json({ error: error.message || 'Failed to get signer status' });
    }
  });

  /**
   * Download signed document
   * GET /api/esignature/download/:documentKey
   */
  app.get('/api/esignature/download/:documentKey', async (req: Request, res: Response) => {
    try {
      const { documentKey } = req.params;
      const tenantId = req.user!.tenantId;

      const document = await documentService.getDocument(documentKey);

      // Validate document ownership (tenant isolation)
      // Note: This requires documentService to support tenant validation
      // For now, we trust the documentKey is unique and user is authenticated

      if (document.status !== 'closed') {
        res.status(400).json({ error: 'Document is not fully signed yet' });
        return;
      }

      const fileBuffer = await documentService.downloadSignedDocument(documentKey);

      await auditTrailService.logDocumentAccess({
        tenantId,
        documentId: documentKey,
        userId: req.user!.id,
        userName: req.user!.username || 'Unknown',
        action: 'download',
        ipAddress: req.ip,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
      res.send(fileBuffer);
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message || 'Failed to download document' });
    }
  });

  /**
   * Cancel signature request
   * POST /api/esignature/cancel/:documentKey
   */
  app.post('/api/esignature/cancel/:documentKey', async (req: Request, res: Response) => {
    try {
      const { documentKey } = req.params;
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const { reason } = req.body;

      await documentService.cancelDocument(documentKey);

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'document_cancelled',
        entityType: 'document',
        entityId: documentKey,
        userId: req.user?.id,
        action: 'CANCEL',
        description: `Document cancelled: ${reason || 'No reason provided'}`,
        metadata: { documentKey, reason },
        complianceLevel: 'standard',
      });

      res.json({ success: true, message: 'Document cancelled successfully' });
    } catch (error: any) {
      console.error('Cancel error:', error);
      res.status(500).json({ error: error.message || 'Failed to cancel document' });
    }
  });

  /**
   * Resend invitation to signer
   * POST /api/esignature/resend/:listKey/:signerKey
   */
  app.post('/api/esignature/resend/:listKey/:signerKey', async (req: Request, res: Response) => {
    try {
      const { listKey, signerKey } = req.params;
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;

      await signerService.resendInvitation(listKey, signerKey);

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'signer_reminded',
        entityType: 'signer',
        entityId: signerKey,
        userId: req.user?.id,
        action: 'RESEND_INVITATION',
        description: 'Invitation resent to signer',
        metadata: { listKey, signerKey },
        complianceLevel: 'standard',
      });

      res.json({ success: true, message: 'Invitation resent successfully' });
    } catch (error: any) {
      console.error('Resend error:', error);
      res.status(500).json({ error: error.message || 'Failed to resend invitation' });
    }
  });

  /**
   * Generate contract from template
   * POST /api/esignature/generate-contract
   */
  app.post('/api/esignature/generate-contract', async (req: Request, res: Response) => {
    try {
      // Get tenantId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const { contractType, contractData, contractId } = req.body;

      if (!contractType || !contractData) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      let result;

      if (contractType === 'rental') {
        result = await contractGenerator.sendRentalContractForSignature(contractData, contractId);
      } else if (contractType === 'sale') {
        const pdfBuffer = await contractGenerator.generateSaleContract(contractData);
        // For sale contracts, you'd implement similar sendForSignature method
        res.status(501).json({ error: 'Sale contract signing not yet implemented' });
        return;
      } else {
        res.status(400).json({ error: 'Invalid contract type' });
        return;
      }

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'contract_created',
        entityType: 'contract',
        entityId: contractId,
        userId: req.user?.id,
        action: 'GENERATE',
        description: `${contractType} contract generated and sent for signature`,
        metadata: { contractType, documentKey: result.documentKey },
        complianceLevel: 'legal',
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Generate contract error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate contract' });
    }
  });

  /**
   * Get available templates
   * GET /api/esignature/templates
   * Protected by global requireAuth middleware
   */
  app.get('/api/esignature/templates', async (req: Request, res: Response) => {
    try {
      // User authentication enforced by global middleware
      const { category } = req.query;

      let templates;
      if (category) {
        templates = templateManager.getTemplatesByCategory(category as any);
      } else {
        templates = templateManager.getAllTemplates();
      }

      res.json({
        success: true,
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
        })),
      });
    } catch (error: any) {
      console.error('Templates error:', error);
      res.status(500).json({ error: error.message || 'Failed to get templates' });
    }
  });

  /**
   * ClickSign webhook endpoint
   * POST /api/webhooks/clicksign
   * NOTE: This endpoint is NOT protected by requireAuth middleware
   * because it receives calls from external ClickSign service.
   * Security is handled by webhook signature validation in webhookHandler.
   */
  app.post('/api/webhooks/clicksign', async (req: Request, res: Response) => {
    await webhookHandler.handleWebhook(req, res);
  });

  /**
   * Get audit trail for document
   * GET /api/esignature/audit/:documentId
   * Protected by global requireAuth middleware
   */
  app.get('/api/esignature/audit/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      // User authentication enforced by global middleware
      // tenantId available via req.user!.tenantId if needed for validation

      const report = await auditTrailService.generateDocumentAuditReport(documentId);

      res.json({
        success: true,
        report,
      });
    } catch (error: any) {
      console.error('Audit error:', error);
      res.status(500).json({ error: error.message || 'Failed to get audit trail' });
    }
  });

  /**
   * Upload certificate
   * POST /api/esignature/certificates
   */
  app.post('/api/esignature/certificates', async (req: Request, res: Response) => {
    try {
      // Get tenantId and userId from authenticated user (not from request body)
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { certificateData, certificateType } = req.body;

      if (!certificateData) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const certInfo = certificateStorage.parseCertificate(certificateData);

      const certificate = await certificateStorage.storeCertificate({
        tenantId,
        userId,
        certificateType: certificateType || 'ICP-Brasil',
        holderName: certInfo.holderName || 'Unknown',
        issuer: certInfo.issuer || 'Unknown',
        serialNumber: 'MOCK_SERIAL',
        validFrom: certInfo.validFrom || new Date(),
        validUntil: certInfo.validUntil || new Date(),
        status: certInfo.status || 'active',
        certificateData,
      });

      await auditTrailService.logEvent({
        tenantId,
        eventType: 'certificate_uploaded',
        entityType: 'certificate',
        entityId: certificate.id,
        userId,
        action: 'UPLOAD',
        description: 'Digital certificate uploaded',
        metadata: { certificateId: certificate.id, certificateType },
        complianceLevel: 'enhanced',
      });

      res.json({
        success: true,
        certificate: {
          id: certificate.id,
          type: certificate.certificateType,
          validUntil: certificate.validUntil,
        },
      });
    } catch (error: any) {
      console.error('Certificate error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload certificate' });
    }
  });

  console.log('E-Signature routes registered');
}
