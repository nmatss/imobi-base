/**
 * DATA ANONYMIZATION ENGINE
 * Implements data anonymization and pseudonymization for LGPD/GDPR compliance
 *
 * LGPD Art. 12: Anonymized data is not considered personal data
 * Used for account deletion while maintaining data integrity
 */

import { createHash, randomBytes } from "crypto";

/**
 * Anonymize a string by replacing it with a hash
 */
export function anonymizeString(value: string, prefix: string = "ANON"): string {
  if (!value) return "";
  const hash = createHash("sha256").update(value).digest("hex").substring(0, 8);
  return `${prefix}_${hash}`;
}

/**
 * Anonymize email address
 */
export function anonymizeEmail(email: string): string {
  if (!email) return "";
  const hash = createHash("sha256").update(email).digest("hex").substring(0, 12);
  return `anonymized_${hash}@deleted.user`;
}

/**
 * Anonymize phone number
 */
export function anonymizePhone(phone: string): string {
  if (!phone) return "";
  return `+55 (XX) XXXXX-XXXX`;
}

/**
 * Anonymize CPF/CNPJ
 */
export function anonymizeCpfCnpj(cpfCnpj: string): string {
  if (!cpfCnpj) return "";
  return "XXX.XXX.XXX-XX";
}

/**
 * Anonymize name
 */
export function anonymizeName(name: string): string {
  if (!name) return "";
  const hash = createHash("sha256").update(name).digest("hex").substring(0, 8);
  return `Usuário Anônimo ${hash}`;
}

/**
 * Anonymize address
 */
export function anonymizeAddress(address: string): string {
  if (!address) return "";
  return "Endereço removido por solicitação do usuário";
}

/**
 * Generate random string for anonymization
 */
export function generateRandomString(length: number = 16): string {
  return randomBytes(length).toString("hex");
}

/**
 * Pseudonymize data (reversible with key)
 * Not currently implemented - would require encryption key management
 */
export function pseudonymize(value: string, key: string): string {
  // In production, implement proper encryption
  const hash = createHash("sha256").update(value + key).digest("hex");
  return hash;
}

/**
 * Check if value is already anonymized
 */
export function isAnonymized(value: string): boolean {
  if (!value) return true;
  return (
    value.startsWith("ANON_") ||
    value.startsWith("anonymized_") ||
    value.includes("Usuário Anônimo") ||
    value.includes("XXX.XXX.XXX") ||
    value.includes("removido por solicitação")
  );
}

/**
 * Anonymize user object
 */
export function anonymizeUser(user: any): any {
  return {
    ...user,
    name: anonymizeName(user.name),
    email: anonymizeEmail(user.email),
    phone: user.phone ? anonymizePhone(user.phone) : null,
    cpfCnpj: user.cpfCnpj ? anonymizeCpfCnpj(user.cpfCnpj) : null,
    rg: user.rg ? "XXXXXXXXX" : null,
    address: user.address ? anonymizeAddress(user.address) : null,
    avatar: null,
    // Remove sensitive authentication data
    password: "DELETED",
    passwordResetToken: null,
    passwordResetExpires: null,
    verificationToken: null,
    verificationTokenExpires: null,
    oauthAccessToken: null,
    oauthRefreshToken: null,
    oauthId: null,
    // Banking information
    bankName: null,
    bankAgency: null,
    bankAccount: null,
    pixKey: null,
    // Additional data
    notes: "Conta deletada a pedido do usuário",
  };
}

/**
 * Anonymize lead object
 */
export function anonymizeLead(lead: any): any {
  return {
    ...lead,
    name: anonymizeName(lead.name),
    email: anonymizeEmail(lead.email),
    phone: anonymizePhone(lead.phone),
    notes: "Dados removidos por solicitação do titular",
    assignedTo: null, // Remove assignment
  };
}

/**
 * Anonymize owner object
 */
export function anonymizeOwner(owner: any): any {
  return {
    ...owner,
    name: anonymizeName(owner.name),
    email: owner.email ? anonymizeEmail(owner.email) : null,
    phone: anonymizePhone(owner.phone),
    cpfCnpj: owner.cpfCnpj ? anonymizeCpfCnpj(owner.cpfCnpj) : null,
    address: owner.address ? anonymizeAddress(owner.address) : null,
    bankName: null,
    bankAgency: null,
    bankAccount: null,
    pixKey: null,
    notes: "Dados removidos por solicitação do titular",
  };
}

/**
 * Anonymize renter object
 */
export function anonymizeRenter(renter: any): any {
  return {
    ...renter,
    name: anonymizeName(renter.name),
    email: renter.email ? anonymizeEmail(renter.email) : null,
    phone: anonymizePhone(renter.phone),
    cpfCnpj: renter.cpfCnpj ? anonymizeCpfCnpj(renter.cpfCnpj) : null,
    rg: renter.rg ? "XXXXXXXXX" : null,
    address: renter.address ? anonymizeAddress(renter.address) : null,
    profession: null,
    income: null,
    emergencyContact: null,
    emergencyPhone: null,
    notes: "Dados removidos por solicitação do titular",
  };
}

/**
 * Anonymize contract/interaction text
 */
export function anonymizeText(text: string): string {
  if (!text) return "";
  return "Conteúdo removido por solicitação do titular dos dados";
}

/**
 * Data retention policy
 * Determines what data must be kept for legal/audit purposes
 */
export interface RetentionPolicy {
  keepFinancialRecords: boolean; // Required by tax law (5 years)
  keepContractRecords: boolean; // Required by civil code (10 years)
  keepAuditLogs: boolean; // Required by LGPD (5 years)
  anonymizeInsteadOfDelete: boolean; // Recommended approach
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  keepFinancialRecords: true, // Required: Fiscal records must be kept for 5 years
  keepContractRecords: true, // Required: Contracts must be kept for 10 years
  keepAuditLogs: true, // Required: Compliance audit trail for 5 years
  anonymizeInsteadOfDelete: true, // Recommended: Anonymize instead of hard delete
};

/**
 * Determine what data can be safely deleted vs. what must be anonymized
 */
export function getDataRetentionRules(entityType: string): {
  canHardDelete: boolean;
  mustAnonymize: boolean;
  retentionYears?: number;
  reason?: string;
} {
  const rules: Record<string, any> = {
    user: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 5,
      reason: "Compliance audit trail",
    },
    lead: {
      canHardDelete: true,
      mustAnonymize: false,
      retentionYears: 0,
      reason: "No legal retention requirement for leads",
    },
    contract: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 10,
      reason: "Civil Code Art. 205 - 10 year retention for contracts",
    },
    rentalContract: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 10,
      reason: "Civil Code - 10 year retention for contracts",
    },
    rentalPayment: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 5,
      reason: "Tax law - 5 year retention for financial records",
    },
    propertySale: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 5,
      reason: "Tax law - 5 year retention for financial records",
    },
    financeEntry: {
      canHardDelete: false,
      mustAnonymize: true,
      retentionYears: 5,
      reason: "Tax law - 5 year retention for financial records",
    },
    auditLog: {
      canHardDelete: false,
      mustAnonymize: false,
      retentionYears: 5,
      reason: "LGPD compliance - audit trail retention",
    },
  };

  return (
    rules[entityType] || {
      canHardDelete: true,
      mustAnonymize: false,
      retentionYears: 0,
      reason: "No specific retention requirement",
    }
  );
}

/**
 * Calculate retention expiry date
 */
export function calculateRetentionExpiry(years: number): Date {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + years);
  return expiry;
}
