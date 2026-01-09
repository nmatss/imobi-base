/**
 * ClickSign Signer Management Service
 * Handles signer operations, authentication methods, and signing order
 */

import { DocumentService } from './document-service';
import type { AddSignerOptions, ClickSignSigner } from './document-service';

export interface SignerInfo {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  birthday?: string;
  role: string; // e.g., "Locador", "Locatário", "Testemunha"
}

export interface SignerAuthConfig {
  method: 'email' | 'sms' | 'whatsapp' | 'pix' | 'selfie' | 'certificate';
  required: boolean;
}

export type SigningOrder = 'parallel' | 'sequential';

export interface SigningConfig {
  order: SigningOrder;
  refusable?: boolean;
  deadline?: Date;
  customMessage?: string;
  authMethods?: SignerAuthConfig[];
}

export class SignerService {
  private documentService = new DocumentService();

  /**
   * Add multiple signers to a document with proper configuration
   */
  async addSigners(
    documentKey: string,
    listKey: string,
    signers: SignerInfo[],
    config: SigningConfig
  ): Promise<ClickSignSigner[]> {
    const addedSigners: ClickSignSigner[] = [];

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];

      // Determine authentication methods
      const auths = config.authMethods?.map(a => a.method) || ['email'];

      // Configure signer options
      const signerOptions: AddSignerOptions = {
        email: signer.email,
        name: signer.name,
        cpf: signer.cpf,
        birthday: signer.birthday,
        phone: signer.phone,
        message: config.customMessage,
        delivery: auths.includes('sms') ? 'sms' : 'email',
        auths: auths,
        refusable: config.refusable ?? true,
      };

      // Set group for sequential signing (groups start at 1)
      if (config.order === 'sequential') {
        signerOptions.group = i + 1;
      }

      try {
        const addedSigner = await this.documentService.addSigner(
          documentKey,
          listKey,
          signerOptions
        );
        addedSigners.push(addedSigner);
      } catch (error) {
        console.error(`Failed to add signer ${signer.email}:`, error);
        throw error;
      }
    }

    return addedSigners;
  }

  /**
   * Configure standard rental contract signers (Landlord → Tenant → Witnesses)
   */
  async addRentalContractSigners(
    documentKey: string,
    listKey: string,
    landlord: SignerInfo,
    tenant: SignerInfo,
    witnesses?: SignerInfo[],
    config?: Partial<SigningConfig>
  ): Promise<ClickSignSigner[]> {
    const signers: SignerInfo[] = [
      { ...landlord, role: 'Locador' },
      { ...tenant, role: 'Locatário' },
    ];

    // Add witnesses if provided
    if (witnesses && witnesses.length > 0) {
      witnesses.forEach((witness, index) => {
        signers.push({
          ...witness,
          role: `Testemunha ${index + 1}`,
        });
      });
    }

    // Default to sequential signing for rental contracts (landlord first)
    const signingConfig: SigningConfig = {
      order: 'sequential',
      refusable: true,
      authMethods: [{ method: 'email', required: true }],
      ...config,
    };

    return this.addSigners(documentKey, listKey, signers, signingConfig);
  }

  /**
   * Configure sale contract signers (Seller → Buyer → Realtor)
   */
  async addSaleContractSigners(
    documentKey: string,
    listKey: string,
    seller: SignerInfo,
    buyer: SignerInfo,
    realtor?: SignerInfo,
    config?: Partial<SigningConfig>
  ): Promise<ClickSignSigner[]> {
    const signers: SignerInfo[] = [
      { ...seller, role: 'Vendedor' },
      { ...buyer, role: 'Comprador' },
    ];

    if (realtor) {
      signers.push({ ...realtor, role: 'Corretor' });
    }

    const signingConfig: SigningConfig = {
      order: 'sequential',
      refusable: true,
      authMethods: [{ method: 'email', required: true }],
      ...config,
    };

    return this.addSigners(documentKey, listKey, signers, signingConfig);
  }

  /**
   * Send signing invitations to all pending signers
   */
  async sendInvitations(
    listKey: string,
    customMessage?: string
  ): Promise<void> {
    const message = customMessage ||
      'Você tem um documento para assinar. Por favor, acesse o link enviado por email.';

    await this.documentService.sendSignatureRequest(listKey, message);
  }

  /**
   * Resend invitation to a specific signer
   */
  async resendInvitation(listKey: string, signerKey: string): Promise<void> {
    await this.documentService.resendSignerInvitation(listKey, signerKey);
  }

  /**
   * Get signer status summary
   */
  async getSignerStatus(listKey: string): Promise<{
    signers: Array<{
      name: string;
      email: string;
      status: 'pending' | 'sent' | 'viewed' | 'signed' | 'refused';
      signedAt?: string;
      viewedAt?: string;
      refusedAt?: string;
    }>;
    summary: {
      total: number;
      signed: number;
      pending: number;
      refused: number;
    };
  }> {
    const signers = await this.documentService.getSigners(listKey);

    const mappedSigners = signers.map(signer => {
      let status: 'pending' | 'sent' | 'viewed' | 'signed' | 'refused';

      if (signer.signed_at) {
        status = 'signed';
      } else if (signer.refused_at) {
        status = 'refused';
      } else if (signer.viewed_at) {
        status = 'viewed';
      } else {
        status = 'sent';
      }

      return {
        name: signer.name,
        email: signer.email,
        status,
        signedAt: signer.signed_at,
        viewedAt: signer.viewed_at,
        refusedAt: signer.refused_at,
      };
    });

    const summary = {
      total: signers.length,
      signed: signers.filter(s => s.signed_at).length,
      refused: signers.filter(s => s.refused_at).length,
      pending: signers.filter(s => !s.signed_at && !s.refused_at).length,
    };

    return { signers: mappedSigners, summary };
  }

  /**
   * Check if all required signers have signed
   */
  async areAllSignatureComplete(listKey: string): Promise<boolean> {
    const status = await this.getSignerStatus(listKey);
    return status.summary.signed === status.summary.total && status.summary.refused === 0;
  }

  /**
   * Validate CPF format (Brazilian tax ID)
   */
  validateCPF(cpf: string): boolean {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');

    // Check length
    if (cleanCPF.length !== 11) return false;

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCPF.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cleanCPF.charAt(10))) return false;

    return true;
  }

  /**
   * Format phone number to Brazilian format (+55)
   */
  formatBrazilianPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');

    // Add country code if not present
    if (!cleanPhone.startsWith('55')) {
      return `+55${cleanPhone}`;
    }

    return `+${cleanPhone}`;
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate signer information before adding
   */
  validateSignerInfo(signer: SignerInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!signer.name || signer.name.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres');
    }

    if (!this.validateEmail(signer.email)) {
      errors.push('Email inválido');
    }

    if (signer.cpf && !this.validateCPF(signer.cpf)) {
      errors.push('CPF inválido');
    }

    if (signer.birthday) {
      const birthDate = new Date(signer.birthday);
      const age = (new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (age < 18) {
        errors.push('Signatário deve ser maior de 18 anos');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
