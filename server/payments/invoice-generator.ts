// @ts-nocheck
/**
 * Invoice Generator
 * Generates PDF invoices and sends them via email
 */

import { jsPDF } from 'jspdf';
import * as Sentry from '@sentry/node';
import { storage } from '../storage';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantAddress?: string;
  tenantCnpj?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
}

export class InvoiceGenerator {
  /**
   * Generate PDF invoice
   */
  static generatePDF(data: InvoiceData): Buffer {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Invoice info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice #: ${data.invoiceNumber}`, 20, yPosition);
      doc.text(`Date: ${data.invoiceDate.toLocaleDateString('pt-BR')}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 6;

      if (data.dueDate) {
        doc.text(`Due Date: ${data.dueDate.toLocaleDateString('pt-BR')}`, pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 6;
      }

      yPosition += 10;

      // Company info (From)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FROM:', 20, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      doc.text('ImobiBase Platform', 20, yPosition);
      yPosition += 5;
      doc.text('Av. Example, 123', 20, yPosition);
      yPosition += 5;
      doc.text('São Paulo, SP - Brazil', 20, yPosition);
      yPosition += 5;
      doc.text('contact@imobibase.com', 20, yPosition);
      yPosition += 15;

      // Customer info (Bill To)
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      doc.text(data.tenantName, 20, yPosition);
      yPosition += 5;
      doc.text(data.tenantEmail, 20, yPosition);
      yPosition += 5;

      if (data.tenantAddress) {
        doc.text(data.tenantAddress, 20, yPosition);
        yPosition += 5;
      }

      if (data.tenantCnpj) {
        doc.text(`CNPJ: ${data.tenantCnpj}`, 20, yPosition);
        yPosition += 5;
      }

      yPosition += 10;

      // Items table header
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPosition, pageWidth - 40, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Description', 22, yPosition + 5);
      doc.text('Qty', pageWidth - 90, yPosition + 5);
      doc.text('Unit Price', pageWidth - 70, yPosition + 5);
      doc.text('Total', pageWidth - 35, yPosition + 5);
      yPosition += 10;

      // Items
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      data.items.forEach((item) => {
        doc.text(item.description, 22, yPosition);
        doc.text(item.quantity.toString(), pageWidth - 90, yPosition);
        doc.text(this.formatCurrency(item.unitPrice, data.currency), pageWidth - 70, yPosition);
        doc.text(this.formatCurrency(item.total, data.currency), pageWidth - 35, yPosition);
        yPosition += 6;
      });

      yPosition += 5;
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      // Totals
      const totalsX = pageWidth - 70;
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, yPosition);
      doc.text(this.formatCurrency(data.subtotal, data.currency), pageWidth - 35, yPosition);
      yPosition += 6;

      if (data.tax && data.tax > 0) {
        doc.text('Tax:', totalsX, yPosition);
        doc.text(this.formatCurrency(data.tax, data.currency), pageWidth - 35, yPosition);
        yPosition += 6;
      }

      if (data.discount && data.discount > 0) {
        doc.text('Discount:', totalsX, yPosition);
        doc.text(`-${this.formatCurrency(data.discount, data.currency)}`, pageWidth - 35, yPosition);
        yPosition += 6;
      }

      yPosition += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL:', totalsX, yPosition);
      doc.text(this.formatCurrency(data.total, data.currency), pageWidth - 35, yPosition);
      yPosition += 10;

      // Payment status
      doc.setFontSize(10);
      const statusColor = data.paymentStatus === 'paid' ? [46, 204, 113] :
                         data.paymentStatus === 'overdue' ? [231, 76, 60] :
                         [241, 196, 15];

      doc.setFillColor(...statusColor);
      doc.rect(20, yPosition, 40, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(data.paymentStatus.toUpperCase(), 40, yPosition + 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      // Payment method
      if (data.paymentMethod) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Payment Method: ${data.paymentMethod}`, 20, yPosition);
        yPosition += 10;
      }

      // Notes
      if (data.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Notes:', 20, yPosition);
        yPosition += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 40);
        doc.text(splitNotes, 20, yPosition);
        yPosition += splitNotes.length * 5;
      }

      // Footer
      yPosition = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
      doc.text('ImobiBase - Real Estate Management Platform', pageWidth / 2, yPosition, { align: 'center' });

      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'invoice-generator', operation: 'generatePDF' },
      });
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format currency value
   */
  private static formatCurrency(value: number, currency: string): string {
    const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber(tenantId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const tenantPrefix = tenantId.slice(0, 4).toUpperCase();

    return `INV-${tenantPrefix}-${year}${month}-${timestamp}`;
  }

  /**
   * Create invoice from subscription payment
   */
  static async createInvoiceFromSubscription(
    tenantId: string,
    planName: string,
    amount: number,
    currency: string,
    paymentStatus: 'paid' | 'pending' | 'overdue' = 'paid'
  ): Promise<Buffer> {
    try {
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const tenantSettings = await storage.getTenantSettings(tenantId);
      const invoiceDate = new Date();
      const nextMonth = new Date(invoiceDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const invoiceData: InvoiceData = {
        invoiceNumber: this.generateInvoiceNumber(tenantId, invoiceDate),
        invoiceDate,
        dueDate: nextMonth,
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email || '',
        tenantAddress: tenant.address || undefined,
        tenantCnpj: tenantSettings?.cnpj || undefined,
        items: [
          {
            description: `${planName} - Monthly Subscription`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
        subtotal: amount,
        total: amount,
        currency,
        paymentStatus,
        notes: 'Thank you for choosing ImobiBase. Your subscription helps us continue to improve our platform.',
      };

      return this.generatePDF(invoiceData);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'invoice-generator', operation: 'createInvoiceFromSubscription' },
        extra: { tenantId, planName, amount },
      });
      throw error;
    }
  }

  /**
   * Send invoice via email
   * Note: This is a placeholder. You'll need to implement actual email sending
   * using services like SendGrid, AWS SES, or Nodemailer
   */
  static async sendInvoiceEmail(
    recipientEmail: string,
    recipientName: string,
    invoicePdf: Buffer,
    invoiceNumber: string
  ): Promise<void> {
    try {
      // Placeholder for email sending
      // Example with nodemailer:
      /*
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: '"ImobiBase" <billing@imobibase.com>',
        to: recipientEmail,
        subject: `Invoice ${invoiceNumber} - ImobiBase`,
        html: `
          <h2>Hello ${recipientName},</h2>
          <p>Thank you for your payment. Please find your invoice attached.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <br>
          <p>Best regards,<br>The ImobiBase Team</p>
        `,
        attachments: [
          {
            filename: `invoice-${invoiceNumber}.pdf`,
            content: invoicePdf,
            contentType: 'application/pdf',
          },
        ],
      });
      */

      console.log(`📧 Invoice ${invoiceNumber} would be sent to ${recipientEmail}`);
      console.log('Note: Email sending not yet implemented. Configure SMTP settings.');
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'invoice-generator', operation: 'sendInvoiceEmail' },
        extra: { recipientEmail, invoiceNumber },
      });
      throw new Error(`Failed to send invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save invoice to storage
   * Note: This would save the PDF to cloud storage (S3, etc.)
   */
  static async saveInvoiceToStorage(
    invoicePdf: Buffer,
    invoiceNumber: string,
    tenantId: string
  ): Promise<string> {
    try {
      // Placeholder for cloud storage upload
      // Example: Upload to S3, Google Cloud Storage, etc.

      const filename = `invoices/${tenantId}/${invoiceNumber}.pdf`;

      // For now, just return a placeholder URL
      const url = `/api/invoices/${tenantId}/${invoiceNumber}.pdf`;

      console.log(`💾 Invoice ${invoiceNumber} would be saved to: ${filename}`);
      console.log('Note: Cloud storage not yet implemented. Configure S3 or similar.');

      return url;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'invoice-generator', operation: 'saveInvoiceToStorage' },
        extra: { invoiceNumber, tenantId },
      });
      throw new Error(`Failed to save invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default InvoiceGenerator;
