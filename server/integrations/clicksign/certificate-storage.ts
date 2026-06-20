/**
 * Certificate Storage Service
 * Manages ICP-Brasil digital certificates for enhanced signature security
 */

import { X509Certificate } from 'node:crypto';
import { storage } from '../../storage';
import type { SignatureCertificate } from '../../../shared/schema';

export interface DigitalCertificate {
  id: string;
  tenantId: string;
  userId: string;
  certificateType: 'A1' | 'A3' | 'ICP-Brasil' | 'e-CPF' | 'e-CNPJ';
  holderName: string;
  holderCPF?: string;
  holderCNPJ?: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validUntil: Date;
  status: 'active' | 'expired' | 'revoked';
  certificateData?: string; // Encrypted certificate data
  publicKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map a persisted signature_certificates row to the richer in-memory
 * DigitalCertificate shape used by the service layer. The DB schema is leaner
 * (it stores subject/issuer/serial/validFrom/validTo/fingerprint/certificatePem)
 * so derived fields (status, type) are computed here.
 */
// The dual schema (pg uses Date, sqlite uses string for timestamps) makes the
// inferred row type vary by build target; accept a structural superset and
// normalize dates defensively via `new Date(... as any)`.
type StoredCertRow = Omit<SignatureCertificate, 'validFrom' | 'validTo' | 'createdAt'> & {
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdAt: Date | string;
};

function toDigitalCertificate(row: StoredCertRow): DigitalCertificate {
  const validFrom = row.validFrom ? new Date(row.validFrom as any) : new Date(0);
  const validUntil = row.validTo ? new Date(row.validTo as any) : new Date(0);
  const now = new Date();
  const status: DigitalCertificate['status'] = validUntil < now ? 'expired' : 'active';

  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId ?? '',
    certificateType: 'ICP-Brasil',
    // The DB stores the X.509 subject DN; expose it as holderName for callers.
    holderName: row.subject ?? 'Unknown',
    issuer: row.issuer ?? 'Unknown',
    serialNumber: row.serialNumber ?? '',
    validFrom,
    validUntil,
    status,
    certificateData: row.certificatePem,
    publicKey: undefined,
    createdAt: row.createdAt ? new Date(row.createdAt as any) : new Date(),
    updatedAt: row.createdAt ? new Date(row.createdAt as any) : new Date(),
  };
}

export class CertificateStorage {
  /**
   * Store a digital certificate.
   *
   * Persists into the shared signature_certificates table via the storage
   * layer. The PEM is required for storage; subject/issuer/serial/validity/
   * fingerprint are taken from the parsed certificate where available.
   */
  async storeCertificate(cert: Omit<DigitalCertificate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DigitalCertificate> {
    const pem = cert.certificateData;
    if (!pem) {
      throw new Error('certificateData (PEM) is required to store a certificate');
    }

    const created = await storage.storeCertificate({
      tenantId: cert.tenantId,
      userId: cert.userId || null,
      serialNumber: cert.serialNumber || null,
      subject: cert.holderName || null,
      issuer: cert.issuer || null,
      validFrom: cert.validFrom ?? null,
      validTo: cert.validUntil ?? null,
      certificatePem: pem,
      fingerprint: (cert as { fingerprint?: string }).fingerprint ?? null,
    } as any);

    return toDigitalCertificate(created);
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certId: string): Promise<DigitalCertificate | null> {
    const row = await storage.getCertificate(certId);
    return row ? toDigitalCertificate(row) : null;
  }

  /**
   * Get all certificates for a user within a tenant.
   *
   * tenantId is required by the storage layer (RLS / tenant isolation). It is
   * accepted as a second argument for backward compatibility with the original
   * single-argument signature.
   */
  async getUserCertificates(userId: string, tenantId?: string): Promise<DigitalCertificate[]> {
    if (!tenantId) {
      // Without a tenant we cannot safely scope the query; return empty rather
      // than leaking cross-tenant data.
      console.warn('getUserCertificates called without tenantId — returning empty set');
      return [];
    }
    const rows = await storage.getUserCertificates(tenantId, userId);
    return rows.map(toDigitalCertificate);
  }

  /**
   * Get active certificates for a user
   */
  async getActiveCertificates(userId: string, tenantId?: string): Promise<DigitalCertificate[]> {
    const now = new Date();
    const allCerts = await this.getUserCertificates(userId, tenantId);

    return allCerts.filter(cert =>
      cert.status === 'active' &&
      cert.validFrom <= now &&
      cert.validUntil > now
    );
  }

  /**
   * Validate certificate
   */
  async validateCertificate(certId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const cert = await this.getCertificate(certId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cert) {
      errors.push('Certificado não encontrado');
      return { valid: false, errors, warnings };
    }

    const now = new Date();

    // Check expiration
    if (cert.validUntil < now) {
      errors.push('Certificado expirado');
    }

    // Check validity start
    if (cert.validFrom > now) {
      errors.push('Certificado ainda não é válido');
    }

    // Check status
    if (cert.status === 'revoked') {
      errors.push('Certificado revogado');
    }

    // Check for upcoming expiration (30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (cert.validUntil < thirtyDaysFromNow && cert.validUntil > now) {
      warnings.push(`Certificado expira em ${this.getDaysUntilExpiration(cert.validUntil)} dias`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Mark certificate as expired
   */
  async expireCertificate(certId: string): Promise<void> {
    // TODO: Update database
    console.log('Expiring certificate:', certId);
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certId: string, reason: string): Promise<void> {
    // TODO: Update database
    console.log('Revoking certificate:', certId, 'Reason:', reason);
  }

  /**
   * Get certificates expiring soon
   */
  async getExpiringCertificates(daysThreshold: number = 30): Promise<DigitalCertificate[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    // TODO: Query database for expiring certificates
    return [];
  }

  /**
   * Send expiration alerts
   */
  async sendExpirationAlerts(): Promise<void> {
    const expiringCerts = await this.getExpiringCertificates(30);

    for (const cert of expiringCerts) {
      const daysLeft = this.getDaysUntilExpiration(cert.validUntil);

      console.log(`Alert: Certificate ${cert.id} for ${cert.holderName} expires in ${daysLeft} days`);

      // TODO: Send email/notification to user
    }
  }

  /**
   * Verify ICP-Brasil certificate chain
   */
  async verifyICPBrasilChain(certData: string): Promise<boolean> {
    // TODO: Implement ICP-Brasil certificate chain validation
    // This should verify against the Brazilian Public Key Infrastructure
    console.log('Verifying ICP-Brasil certificate chain');
    return true;
  }

  /**
   * Extract certificate information
   */
  parseCertificate(certData: string): Partial<DigitalCertificate> & {
    fingerprint?: string;
    parseError?: string;
    expired?: boolean;
  } {
    // Real X.509 parsing via node:crypto. Accepts PEM (or DER base64 wrapped in
    // PEM headers). Extracts subject/issuer/validity/serial/fingerprint.
    //
    // SCOPE: This performs structural parsing + temporal validity only. It does
    // NOT validate the certificate chain against ICP-Brasil roots, nor CRL/OCSP
    // revocation — that requires the ICP root bundle (ops decision). See notes.
    let x509: X509Certificate;
    try {
      x509 = new X509Certificate(certData);
    } catch (error: any) {
      return {
        parseError: `Falha ao parsear certificado X.509: ${error?.message || String(error)}`,
      };
    }

    const validFrom = new Date(x509.validFrom);
    const validUntil = new Date(x509.validTo);
    const now = new Date();
    const expired = !(validUntil > now) || validFrom > now;

    // serialNumber from node is uppercase hex; normalize fingerprint to a
    // conventional colon-separated SHA-256 form.
    const fingerprint = x509.fingerprint256 || x509.fingerprint;

    return {
      certificateType: 'ICP-Brasil',
      holderName: x509.subject,
      issuer: x509.issuer,
      serialNumber: x509.serialNumber,
      validFrom,
      validUntil,
      status: expired ? 'expired' : 'active',
      publicKey: x509.publicKey ? x509.publicKey.export({ type: 'spki', format: 'pem' }).toString() : undefined,
      fingerprint,
      expired,
    };
  }

  /**
   * Basic (stdlib-only) certificate validation: parse OK + not temporally
   * expired. Does NOT establish full ICP-Brasil legal validity (chain/CRL/OCSP).
   */
  validateParsedCertificate(certData: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsed = this.parseCertificate(certData);

    if (parsed.parseError) {
      errors.push(parsed.parseError);
      return { valid: false, errors, warnings };
    }

    const now = new Date();
    if (parsed.validFrom && parsed.validFrom > now) {
      errors.push('Certificado ainda não é válido (data de início no futuro)');
    }
    if (parsed.validUntil && !(parsed.validUntil > now)) {
      errors.push('Certificado expirado');
    }

    // Chain/revocation cannot be verified with stdlib alone.
    warnings.push(
      'Validação de cadeia ICP-Brasil e revogação (CRL/OCSP) não realizada — requer bundle de raízes ICP-Brasil (ação de ops).',
    );

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check certificate compliance with LGPD (Brazilian data protection law)
   */
  async checkLGPDCompliance(certId: string): Promise<{
    compliant: boolean;
    issues: string[];
  }> {
    const cert = await this.getCertificate(certId);
    const issues: string[] = [];

    if (!cert) {
      return { compliant: false, issues: ['Certificate not found'] };
    }

    // Check data minimization
    if (cert.certificateData && !this.isEncrypted(cert.certificateData)) {
      issues.push('Certificate data should be encrypted (LGPD requirement)');
    }

    // Check retention period
    if (cert.status === 'expired') {
      const daysSinceExpiration = this.getDaysSinceDate(cert.validUntil);
      if (daysSinceExpiration > 90) {
        issues.push('Expired certificate data should be deleted after 90 days (LGPD Art. 16)');
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate certificate ID
   */
  private generateCertId(): string {
    return `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get days until expiration
   */
  private getDaysUntilExpiration(expirationDate: Date): number {
    const now = new Date();
    const diff = expirationDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days since a date
   */
  private getDaysSinceDate(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if data is encrypted
   */
  private isEncrypted(data: string): boolean {
    // Simple check - in production, use proper encryption detection
    return data.startsWith('ENC:') || data.length > 1000;
  }
}

export const certificateStorage = new CertificateStorage();
