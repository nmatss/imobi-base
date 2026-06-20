/**
 * E-Signature Audit Trail System
 * Comprehensive logging and compliance for all signature events
 * Complies with LGPD (Brazilian GDPR) and ICP-Brasil requirements
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db';

/**
 * Resolve the HMAC signing key used for tamper-evidence of audit events.
 *
 * Priority:
 *   1. AUDIT_SIGNING_SECRET (dedicated secret — recommended for production)
 *   2. SESSION_SECRET derived (so a single configured secret still yields a
 *      stable, non-trivial key without forcing ops to provision a new env var)
 *
 * The derived key uses a fixed namespace label so it never collides with the
 * raw session secret usage elsewhere.
 *
 * IMPORTANT: the resolved key MUST be stable across the lifetime of the data;
 * rotating it invalidates verification of previously-signed events. Document
 * rotation as an ops procedure (re-sign + re-verify) before changing it.
 */
function getAuditSigningKey(): Buffer {
  const explicit = process.env.AUDIT_SIGNING_SECRET;
  if (explicit && explicit.length >= 16) {
    return Buffer.from(explicit, 'utf8');
  }

  const session = process.env.SESSION_SECRET;
  if (session && session.length >= 16) {
    // Derive a distinct key namespaced to audit signing so we never reuse the
    // raw session secret bytes directly.
    return createHmac('sha256', session)
      .update('clicksign-audit-trail-v1')
      .digest();
  }

  // Last-resort development fallback. NEVER acceptable in production: callers in
  // prod paths should ensure AUDIT_SIGNING_SECRET/SESSION_SECRET are set. We log
  // loudly so this is never silently relied upon.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUDIT_SIGNING_SECRET or SESSION_SECRET must be configured to sign audit events in production',
    );
  }
  console.warn(
    '[AUDIT] No AUDIT_SIGNING_SECRET/SESSION_SECRET configured — using insecure dev fallback key',
  );
  return Buffer.from('insecure-dev-audit-key-do-not-use-in-production', 'utf8');
}

/**
 * Compute the canonical HMAC-SHA256 signature for an audit event.
 *
 * The signed payload is a deterministic, field-ordered serialization of the
 * tamper-relevant fields. Any change to these fields after persistence will
 * produce a different HMAC, allowing verifyAuditTrailIntegrity() to detect it.
 */
function computeEventHmac(fields: {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  description?: string;
  complianceLevel?: string;
  metadata?: Record<string, unknown>;
}): string {
  // Deterministic serialization: sort metadata keys so JSON.stringify ordering
  // never changes the signature for semantically identical events.
  const canonicalMetadata = canonicalize(fields.metadata ?? {});
  const payload = JSON.stringify({
    eventType: fields.eventType ?? null,
    entityType: fields.entityType ?? null,
    entityId: fields.entityId ?? null,
    action: fields.action ?? null,
    description: fields.description ?? null,
    complianceLevel: fields.complianceLevel ?? null,
    metadata: canonicalMetadata,
  });
  return createHmac('sha256', getAuditSigningKey()).update(payload).digest('hex');
}

/**
 * Recursively produce a value with object keys sorted, so JSON serialization is
 * deterministic regardless of insertion order.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Constant-time comparison of two hex-encoded HMACs.
 * Returns false (instead of throwing) on length mismatch.
 */
function timingSafeHexEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  eventType: AuditEventType;
  entityType: 'document' | 'signer' | 'contract' | 'certificate';
  entityId: string;
  userId?: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  complianceLevel: 'standard' | 'enhanced' | 'legal';
  digitalSignature?: string; // Hash of the event for tamper detection
}

export type AuditEventType =
  | 'document_created'
  | 'document_uploaded'
  | 'document_updated'
  | 'document_signed'
  | 'document_completed'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_cancelled'
  | 'document_deleted'
  | 'signer_added'
  | 'signer_invited'
  | 'signer_reminded'
  | 'signer_viewed'
  | 'signer_signed'
  | 'signer_refused'
  | 'signer_removed'
  | 'certificate_uploaded'
  | 'certificate_validated'
  | 'certificate_expired'
  | 'certificate_revoked'
  | 'contract_created'
  | 'contract_activated'
  | 'contract_completed'
  | 'contract_terminated'
  | 'compliance_check'
  | 'data_access'
  | 'data_export';

export class AuditTrailService {
  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'digitalSignature'>): Promise<void> {
    const digitalSignature = this.generateEventSignature(event);
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      digitalSignature,
    };

    // Persist to the shared append-only audit_logs table
    try {
      await db.insert(schema.auditLogs).values({
        tenantId: event.tenantId,
        userId: event.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        // Persist eventType/description inside the existing free-form metadata
        // column so the audit report can reconstruct the event timeline without
        // any schema change. The HMAC signature is stored alongside so integrity
        // can be re-verified later (tamper detection).
        metadata: {
          ...event.metadata,
          eventType: event.eventType,
          description: event.description,
          complianceLevel: event.complianceLevel,
          digitalSignature,
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        occurredAt: fullEvent.timestamp,
      });
    } catch (error) {
      // Fall back to console logging if DB insert fails
      console.error('Failed to persist audit event:', error);
      console.log('[AUDIT] (fallback)', fullEvent.eventType, fullEvent.description);
    }

    // For critical events, also write to external audit system
    if (fullEvent.complianceLevel === 'legal') {
      await this.archiveToExternalStorage(fullEvent);
    }
  }

  /**
   * Log document signature event (highest compliance level)
   */
  async logDocumentSigned(params: {
    tenantId: string;
    documentId: string;
    signerId: string;
    signerName: string;
    signerEmail: string;
    ipAddress?: string;
    userAgent?: string;
    certificateId?: string;
  }): Promise<void> {
    await this.logEvent({
      tenantId: params.tenantId,
      eventType: 'document_signed',
      entityType: 'document',
      entityId: params.documentId,
      userId: params.signerId,
      action: 'SIGN',
      description: `Document signed by ${params.signerName} (${params.signerEmail})`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        signerId: params.signerId,
        signerName: params.signerName,
        signerEmail: params.signerEmail,
        certificateId: params.certificateId,
        signatureMethod: params.certificateId ? 'certificate' : 'electronic',
      },
      complianceLevel: 'legal',
    });
  }

  /**
   * Log document access for LGPD compliance
   */
  async logDocumentAccess(params: {
    tenantId: string;
    documentId: string;
    userId: string;
    userName: string;
    action: 'view' | 'download' | 'print';
    ipAddress?: string;
  }): Promise<void> {
    await this.logEvent({
      tenantId: params.tenantId,
      eventType: 'data_access',
      entityType: 'document',
      entityId: params.documentId,
      userId: params.userId,
      action: params.action.toUpperCase(),
      description: `Document ${params.action} by ${params.userName}`,
      ipAddress: params.ipAddress,
      metadata: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
      },
      complianceLevel: 'standard',
    });
  }

  /**
   * Generate audit report for a document
   */
  async generateDocumentAuditReport(documentId: string): Promise<{
    documentId: string;
    events: AuditEvent[];
    summary: {
      totalEvents: number;
      createdAt: Date;
      signedAt?: Date;
      completedAt?: Date;
      signers: Array<{
        name: string;
        email: string;
        signedAt?: Date;
        ipAddress?: string;
      }>;
    };
    complianceStatus: {
      lgpdCompliant: boolean;
      icpBrasilCompliant: boolean;
      issues: string[];
    };
  }> {
    // Query the persisted audit logs for this document, ordered chronologically.
    let rows: Array<Record<string, any>> = [];
    try {
      rows = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.entityId, documentId))
        .orderBy(schema.auditLogs.occurredAt);
    } catch (error) {
      console.error('Failed to load audit events:', error);
      rows = [];
    }

    const events: AuditEvent[] = rows.map(row => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        tenantId: row.tenantId,
        eventType: (metadata.eventType as AuditEventType) ?? (row.action as AuditEventType),
        entityType: row.entityType,
        entityId: row.entityId,
        userId: row.userId ?? undefined,
        action: row.action,
        description: (metadata.description as string) ?? row.action,
        timestamp: row.occurredAt instanceof Date ? row.occurredAt : new Date(row.occurredAt),
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
        metadata,
        complianceLevel: (metadata.complianceLevel as AuditEvent['complianceLevel']) ?? 'standard',
      };
    });

    const signers: Array<{
      name: string;
      email: string;
      signedAt?: Date;
      ipAddress?: string;
    }> = [];

    let createdAt = new Date();
    let signedAt: Date | undefined;
    let completedAt: Date | undefined;

    events.forEach(event => {
      if (event.eventType === 'document_created') {
        createdAt = event.timestamp;
      }
      if (event.eventType === 'document_signed') {
        signedAt = event.timestamp;
      }
      if (event.eventType === 'document_completed') {
        completedAt = event.timestamp;
      }
    });

    const complianceStatus = await this.checkDocumentCompliance(documentId);

    return {
      documentId,
      events,
      summary: {
        totalEvents: events.length,
        createdAt,
        signedAt,
        completedAt,
        signers,
      },
      complianceStatus,
    };
  }

  /**
   * Check document compliance with Brazilian laws
   */
  async checkDocumentCompliance(documentId: string): Promise<{
    lgpdCompliant: boolean;
    icpBrasilCompliant: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // TODO: Implement actual compliance checks
    // - LGPD: Data protection, consent, purpose limitation
    // - ICP-Brasil: Digital certificate validation, signature standards
    // - MP 2.200-2/2001: Legal validity of electronic signatures

    return {
      lgpdCompliant: true,
      icpBrasilCompliant: true,
      issues,
    };
  }

  /**
   * Export audit trail for legal purposes
   */
  async exportAuditTrail(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    entityType?: AuditEvent['entityType'];
    userId?: string;
  }): Promise<{
    format: 'json' | 'pdf' | 'xml';
    data: Buffer;
    signature: string; // Digital signature of the export
  }> {
    // TODO: Implement audit trail export
    // Should include:
    // - All events in date range
    // - Digital signature of the entire export
    // - Certification that export is complete and unaltered
    // - Compliance with legal requirements for evidence

    const data = Buffer.from(JSON.stringify({
      exportDate: new Date(),
      parameters: params,
      events: [],
    }));

    return {
      format: 'json',
      data,
      signature: this.signData(data),
    };
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditTrailIntegrity(documentId: string): Promise<{
    valid: boolean;
    tamperedEvents: string[];
    missingEvents: string[];
    unsignedEvents: string[];
    checkedEvents: number;
  }> {
    let rows: Array<Record<string, any>> = [];
    try {
      rows = await db
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.entityId, documentId))
        .orderBy(schema.auditLogs.occurredAt);
    } catch (error) {
      console.error('Failed to load audit events for integrity check:', error);
      // We cannot prove integrity if we cannot read the events.
      return {
        valid: false,
        tamperedEvents: [],
        missingEvents: [],
        unsignedEvents: [],
        checkedEvents: 0,
      };
    }

    const tamperedEvents: string[] = [];
    const unsignedEvents: string[] = [];

    for (const row of rows) {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const storedSignature = metadata.digitalSignature as string | undefined;

      // Events persisted before HMAC signing was introduced have no signature.
      // We report them separately rather than treating them as tampered, but
      // they still mean the trail is NOT fully verifiable.
      if (!storedSignature) {
        unsignedEvents.push(String(row.id));
        continue;
      }

      // Recompute the HMAC from the persisted, signature-relevant fields. We
      // strip the signature itself out of the metadata before recomputing,
      // exactly as it was excluded when originally signed.
      const { digitalSignature: _omit, eventType, description, complianceLevel, ...restMetadata } =
        metadata as Record<string, unknown> & {
          digitalSignature?: string;
          eventType?: string;
          description?: string;
          complianceLevel?: string;
        };

      const recomputed = computeEventHmac({
        eventType: (eventType as string) ?? (row.action as string),
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        description: (description as string) ?? row.action,
        complianceLevel: (complianceLevel as string) ?? 'standard',
        metadata: restMetadata,
      });

      if (!timingSafeHexEqual(storedSignature, recomputed)) {
        tamperedEvents.push(String(row.id));
      }
    }

    return {
      valid: tamperedEvents.length === 0 && unsignedEvents.length === 0,
      tamperedEvents,
      missingEvents: [],
      unsignedEvents,
      checkedEvents: rows.length,
    };
  }

  /**
   * Get signature proof for legal proceedings
   */
  async getSignatureProof(documentId: string, signerId: string): Promise<{
    document: {
      id: string;
      name: string;
      hash: string;
    };
    signer: {
      id: string;
      name: string;
      email: string;
      cpf?: string;
    };
    signature: {
      timestamp: Date;
      ipAddress: string;
      userAgent: string;
      method: string;
      certificateId?: string;
    };
    auditTrail: AuditEvent[];
    legalValidity: {
      compliant: boolean;
      framework: string; // 'MP 2.200-2/2001', 'ICP-Brasil'
      certificationLevel: 'basic' | 'advanced' | 'qualified';
    };
  }> {
    // TODO: Generate complete signature proof package
    // This is critical for legal validity in Brazilian courts
    throw new Error('Not implemented');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate digital signature for event (tamper detection)
   */
  private generateEventSignature(event: Partial<AuditEvent>): string {
    // Real HMAC-SHA256 over a deterministic serialization of the
    // tamper-relevant fields. The exact same field set is recomputed in
    // verifyAuditTrailIntegrity() from the persisted row.
    //
    // NOTE: event.metadata here is the ORIGINAL caller metadata, BEFORE the
    // eventType/description/complianceLevel/digitalSignature keys are merged in
    // for persistence. On verification we strip those merged keys back out so
    // the recomputed input matches.
    return computeEventHmac({
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      description: event.description,
      complianceLevel: event.complianceLevel,
      metadata: event.metadata,
    });
  }

  /**
   * Archive event to external storage for long-term compliance
   */
  private async archiveToExternalStorage(event: AuditEvent): Promise<void> {
    // TODO: Archive to S3, archive service, or compliance storage
    console.log('[ARCHIVE] Archiving critical event:', event.id);
  }

  /**
   * Sign data for export
   */
  private signData(data: Buffer): string {
    // Real HMAC-SHA256 over the exported payload bytes. Allows a consumer of the
    // export to verify it was produced by this system and has not been altered,
    // provided they hold the same signing key.
    return createHmac('sha256', getAuditSigningKey()).update(data).digest('hex');
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(tenantId: string, period: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    period: { startDate: Date; endDate: Date };
    statistics: {
      totalDocuments: number;
      totalSignatures: number;
      averageSigningTime: number;
      refusalRate: number;
    };
    compliance: {
      lgpdCompliant: boolean;
      icpBrasilCompliant: boolean;
      issues: string[];
      recommendations: string[];
    };
    topUsers: Array<{
      userId: string;
      userName: string;
      documentsCreated: number;
      documentsSigned: number;
    }>;
  }> {
    // TODO: Implement comprehensive compliance reporting
    return {
      period,
      statistics: {
        totalDocuments: 0,
        totalSignatures: 0,
        averageSigningTime: 0,
        refusalRate: 0,
      },
      compliance: {
        lgpdCompliant: true,
        icpBrasilCompliant: true,
        issues: [],
        recommendations: [],
      },
      topUsers: [],
    };
  }
}

export const auditTrailService = new AuditTrailService();
