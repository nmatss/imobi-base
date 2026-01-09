import { Job } from 'bullmq';
import { InvoiceJobData, EmailJobData, QueueName } from '../queue-manager';
import { getQueue } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Invoice processor - handles invoice generation and sending
 */
export async function processInvoice(job: Job<InvoiceJobData>): Promise<void> {
  const { invoiceId, userId, sendEmail = true } = job.data;

  try {
    console.log(`[InvoiceProcessor] Processing invoice ${invoiceId} for user ${userId}`);

    await job.updateProgress(10);

    // Step 1: Fetch invoice data
    // In production, fetch from database
    const invoiceData = {
      id: invoiceId,
      userId,
      number: `INV-${invoiceId.toString().padStart(6, '0')}`,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { description: 'Rent Payment', amount: 1500.00 },
        { description: 'Service Fee', amount: 50.00 },
      ],
      total: 1550.00,
      currency: 'BRL',
    };

    console.log(`[InvoiceProcessor] Invoice data retrieved:`, invoiceData.number);
    await job.updateProgress(30);

    // Step 2: Generate PDF
    console.log(`[InvoiceProcessor] Generating PDF for invoice ${invoiceData.number}`);

    // In production, use a PDF library like pdfkit or puppeteer
    /*
    import PDFDocument from 'pdfkit';
    import fs from 'fs';

    const doc = new PDFDocument();
    const pdfPath = `/tmp/invoice-${invoiceId}.pdf`;
    doc.pipe(fs.createWriteStream(pdfPath));

    doc.fontSize(25).text('Invoice', 100, 80);
    doc.fontSize(12).text(`Invoice Number: ${invoiceData.number}`, 100, 120);
    // ... add more content

    doc.end();
    */

    await new Promise((resolve) => setTimeout(resolve, 500));
    const pdfPath = `/tmp/invoice-${invoiceId}.pdf`;

    console.log(`[InvoiceProcessor] PDF generated at ${pdfPath}`);
    await job.updateProgress(60);

    // Step 3: Save to storage
    // In production, upload to S3, Google Cloud Storage, etc.
    console.log(`[InvoiceProcessor] Saving PDF to storage`);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storageUrl = `https://storage.imobibase.com/invoices/${invoiceId}.pdf`;
    console.log(`[InvoiceProcessor] PDF saved to ${storageUrl}`);
    await job.updateProgress(80);

    // Step 4: Send email if requested
    if (sendEmail) {
      console.log(`[InvoiceProcessor] Queueing email for invoice ${invoiceData.number}`);

      const emailQueue = getQueue<EmailJobData>(QueueName.EMAIL);
      await emailQueue.add('send-invoice', {
        to: `user${userId}@example.com`, // In production, fetch from user record
        subject: `Your Invoice ${invoiceData.number}`,
        template: 'invoice',
        data: {
          invoiceNumber: invoiceData.number,
          amount: invoiceData.total,
          dueDate: invoiceData.dueDate,
          downloadUrl: storageUrl,
        },
        attachments: [
          {
            filename: `invoice-${invoiceData.number}.pdf`,
            path: pdfPath,
          },
        ],
      });

      console.log(`[InvoiceProcessor] Email queued for invoice ${invoiceData.number}`);
    }

    await job.updateProgress(100);

    console.log(`[InvoiceProcessor] Invoice ${invoiceData.number} processed successfully`);

    Sentry.addBreadcrumb({
      category: 'invoice',
      message: `Invoice generated: ${invoiceData.number}`,
      level: 'info',
      data: {
        invoiceId,
        userId,
        amount: invoiceData.total,
      },
    });
  } catch (error) {
    console.error(`[InvoiceProcessor] Failed to process invoice ${invoiceId}:`, error);

    Sentry.captureException(error, {
      tags: {
        component: 'invoice-processor',
        invoiceId: invoiceId.toString(),
      },
      extra: {
        userId,
        sendEmail,
      },
    });

    throw error;
  }
}
