/**
 * ClickSign Document Service
 * Manages document upload, signature requests, and document lifecycle
 */

import { getClickSignClient } from './clicksign-client';
import type { ClickSignError } from './clicksign-client';
import { validateUrlWithWhitelist } from '../../security/url-validator';

// ClickSign API Response Types
interface ClickSignDocument {
  key: string;
  path: string;
  filename: string;
  uploaded_at: string;
  updated_at: string;
  finished_at?: string;
  deadline_at?: string;
  auto_close: boolean;
  locale: string;
  status: 'draft' | 'running' | 'closed' | 'cancelled';
  sequence_enabled: boolean;
  downloads: {
    original_file_url: string;
    signed_file_url?: string;
  };
}

interface ClickSignSigner {
  key: string;
  email: string;
  name: string;
  documentation?: string;
  birthday?: string;
  phone_number?: string;
  message?: string;
  delivery: 'email' | 'sms' | 'api';
  auths: Array<'email' | 'sms' | 'whatsapp' | 'pix' | 'selfie' | 'certificate'>;
  group?: number;
  refusable: boolean;
  signed_at?: string;
  viewed_at?: string;
  refused_at?: string;
}

interface ClickSignList {
  key: string;
  name: string;
  document_key: string;
  signers: ClickSignSigner[];
}

interface CreateDocumentOptions {
  path: string; // PDF file path or URL
  filename?: string;
  deadline_at?: string; // ISO 8601 format
  auto_close?: boolean;
  locale?: 'pt-BR' | 'en-US' | 'es';
  sequence_enabled?: boolean; // Enable sequential signing
  content_base64?: string; // PDF content in base64
}

interface AddSignerOptions {
  email: string;
  name: string;
  cpf?: string; // Brazilian CPF
  birthday?: string; // YYYY-MM-DD
  phone?: string; // +55 format
  message?: string;
  delivery?: 'email' | 'sms';
  auths?: Array<'email' | 'sms' | 'whatsapp' | 'pix' | 'selfie' | 'certificate'>;
  group?: number; // For sequential signing (1, 2, 3...)
  refusable?: boolean; // Allow signer to refuse
}

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
  width?: number;
  height?: number;
}

export class DocumentService {
  private client = getClickSignClient();

  /**
   * Upload a document to ClickSign
   */
  async uploadDocument(options: CreateDocumentOptions): Promise<ClickSignDocument> {
    try {
      const payload: Record<string, unknown> = {
        path: options.path,
        filename: options.filename,
        deadline_at: options.deadline_at,
        auto_close: options.auto_close ?? true,
        locale: options.locale || 'pt-BR',
        sequence_enabled: options.sequence_enabled ?? false,
      };

      // Add base64 content if provided
      if (options.content_base64) {
        payload.content_base64 = options.content_base64;
      }

      const response = await this.client.post<{ document: ClickSignDocument }>(
        '/documents',
        { document: payload }
      );

      return response.document;
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to upload document to ClickSign:', csError);
      throw new Error(`Failed to upload document: ${csError.message}`);
    }
  }

  /**
   * Get document details
   */
  async getDocument(documentKey: string): Promise<ClickSignDocument> {
    try {
      const response = await this.client.get<{ document: ClickSignDocument }>(
        `/documents/${documentKey}`
      );
      return response.document;
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to get document:', csError);
      throw new Error(`Failed to get document: ${csError.message}`);
    }
  }

  /**
   * Create a signature list (batch of signers)
   */
  async createSignatureList(
    documentKey: string,
    listName: string
  ): Promise<ClickSignList> {
    try {
      const response = await this.client.post<{ list: ClickSignList }>(
        '/lists',
        {
          list: {
            document_key: documentKey,
            name: listName,
          },
        }
      );
      return response.list;
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to create signature list:', csError);
      throw new Error(`Failed to create signature list: ${csError.message}`);
    }
  }

  /**
   * Add a signer to a document
   */
  async addSigner(
    documentKey: string,
    listKey: string,
    signer: AddSignerOptions
  ): Promise<ClickSignSigner> {
    try {
      const signerPayload: Record<string, unknown> = {
        email: signer.email,
        name: signer.name,
        documentation: signer.cpf,
        birthday: signer.birthday,
        phone_number: signer.phone,
        message: signer.message,
        delivery: signer.delivery || 'email',
        auths: signer.auths || ['email'],
        refusable: signer.refusable ?? true,
      };

      // Add group for sequential signing
      if (signer.group !== undefined) {
        signerPayload.group = signer.group;
      }

      const response = await this.client.post<{ signer: ClickSignSigner }>(
        `/lists/${listKey}/signers`,
        { signer: signerPayload }
      );

      return response.signer;
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to add signer:', csError);
      throw new Error(`Failed to add signer: ${csError.message}`);
    }
  }

  /**
   * Add signature position/widget to document
   */
  async addSignatureWidget(
    documentKey: string,
    signerKey: string,
    position: SignaturePosition
  ): Promise<void> {
    try {
      await this.client.post(
        `/documents/${documentKey}/widgets`,
        {
          widget: {
            kind: 'signature',
            signer_key: signerKey,
            x: position.x,
            y: position.y,
            page: position.page,
            width: position.width || 100,
            height: position.height || 50,
          },
        }
      );
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to add signature widget:', csError);
      throw new Error(`Failed to add signature widget: ${csError.message}`);
    }
  }

  /**
   * Send signature request to all signers
   */
  async sendSignatureRequest(listKey: string, message?: string): Promise<void> {
    try {
      await this.client.post(`/lists/${listKey}/notify`, {
        message: message || 'Por favor, assine o documento.',
      });
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to send signature request:', csError);
      throw new Error(`Failed to send signature request: ${csError.message}`);
    }
  }

  /**
   * Resend signature request to a specific signer
   */
  async resendSignerInvitation(listKey: string, signerKey: string): Promise<void> {
    try {
      await this.client.post(`/lists/${listKey}/signers/${signerKey}/notify`, {});
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to resend invitation:', csError);
      throw new Error(`Failed to resend invitation: ${csError.message}`);
    }
  }

  /**
   * Cancel a signature request
   */
  async cancelDocument(documentKey: string): Promise<void> {
    try {
      await this.client.patch(`/documents/${documentKey}`, {
        document: {
          status: 'cancelled',
        },
      });
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to cancel document:', csError);
      throw new Error(`Failed to cancel document: ${csError.message}`);
    }
  }

  /**
   * Validate ClickSign download URL against whitelist
   * @private
   */
  private validateDownloadUrl(url: string, context: string): void {
    const CLICKSIGN_DOMAINS = [
      'api.clicksign.com',
      'clicksign.com',
      's3.amazonaws.com', // ClickSign uses AWS S3 for file storage
      'sandbox.clicksign.com', // Sandbox environment
    ];

    const validation = validateUrlWithWhitelist(url, CLICKSIGN_DOMAINS);

    if (!validation.valid) {
      // Log security event - potential SSRF attempt
      console.warn(`[SECURITY] SSRF attempt blocked in ClickSign ${context}`, {
        url,
        error: validation.error,
        context,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Invalid download URL: ${validation.error}`);
    }

    // Log legitimate download for audit trail
    console.log(`[CLICKSIGN] Validated URL for ${context}`, {
      urlPreview: url.substring(0, 50) + '...',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Download original document (before signing)
   */
  async downloadOriginalDocument(documentKey: string): Promise<Buffer> {
    try {
      const document = await this.getDocument(documentKey);

      if (!document.downloads.original_file_url) {
        throw new Error('Original file URL not available');
      }

      // SSRF Protection
      this.validateDownloadUrl(document.downloads.original_file_url, 'original document download');

      const response = await fetch(document.downloads.original_file_url);
      if (!response.ok) {
        throw new Error('Failed to download original document');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Failed to download original document:', error);
      throw error;
    }
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(documentKey: string): Promise<Buffer> {
    try {
      const document = await this.getDocument(documentKey);

      if (!document.downloads.signed_file_url) {
        throw new Error('Document is not fully signed yet');
      }

      // SSRF Protection
      this.validateDownloadUrl(document.downloads.signed_file_url, 'signed document download');

      const response = await fetch(document.downloads.signed_file_url);
      if (!response.ok) {
        throw new Error('Failed to download signed document');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Failed to download signed document:', error);
      throw error;
    }
  }

  /**
   * Get all signers for a list
   */
  async getSigners(listKey: string): Promise<ClickSignSigner[]> {
    try {
      const response = await this.client.get<{ list: ClickSignList }>(
        `/lists/${listKey}`
      );
      return response.list.signers;
    } catch (error) {
      const csError = error as ClickSignError;
      console.error('Failed to get signers:', csError);
      throw new Error(`Failed to get signers: ${csError.message}`);
    }
  }

  /**
   * Check if document is fully signed
   */
  async isDocumentComplete(documentKey: string): Promise<boolean> {
    try {
      const document = await this.getDocument(documentKey);
      return document.status === 'closed';
    } catch (error) {
      console.error('Failed to check document status:', error);
      return false;
    }
  }

  /**
   * Get signature status for all signers
   */
  async getSignatureStatus(listKey: string): Promise<{
    total: number;
    signed: number;
    pending: number;
    refused: number;
    percentage: number;
  }> {
    try {
      const signers = await this.getSigners(listKey);

      const total = signers.length;
      const signed = signers.filter(s => s.signed_at).length;
      const refused = signers.filter(s => s.refused_at).length;
      const pending = total - signed - refused;
      const percentage = total > 0 ? (signed / total) * 100 : 0;

      return { total, signed, pending, refused, percentage };
    } catch (error) {
      console.error('Failed to get signature status:', error);
      throw error;
    }
  }
}

export type {
  ClickSignDocument,
  ClickSignSigner,
  ClickSignList,
  CreateDocumentOptions,
  AddSignerOptions,
  SignaturePosition,
};
