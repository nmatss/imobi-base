import { createQueue, QueueName, InvoiceJobData } from './queue-manager';
import { Queue } from 'bullmq';

let invoiceQueue: Queue<InvoiceJobData>;

/**
 * Initialize invoice queue
 */
export function initInvoiceQueue(): Queue<InvoiceJobData> {
  if (!invoiceQueue) {
    invoiceQueue = createQueue<InvoiceJobData>(QueueName.INVOICE);
  }
  return invoiceQueue;
}

/**
 * Queue an invoice generation job
 */
export async function queueInvoice(data: InvoiceJobData, options?: {
  priority?: number;
  delay?: number;
}): Promise<string> {
  const queue = initInvoiceQueue();

  const job = await queue.add('generate-invoice', data, {
    priority: options?.priority || 3,
    delay: options?.delay,
  });

  console.log(`[InvoiceQueue] Invoice queued with job ID: ${job.id}`);
  return job.id!;
}

/**
 * Queue invoice generation for a contract
 */
export async function queueContractInvoice(
  contractId: number,
  userId: number,
  sendEmail: boolean = true
): Promise<string> {
  return queueInvoice({
    invoiceId: Date.now(), // In production, get from database
    userId,
    sendEmail,
  }, {
    priority: 2, // Higher priority
  });
}

/**
 * Queue batch invoice generation (e.g., monthly invoices)
 */
export async function queueBatchInvoices(
  invoices: Array<{ invoiceId: number; userId: number }>
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const invoice of invoices) {
    const jobId = await queueInvoice({
      invoiceId: invoice.invoiceId,
      userId: invoice.userId,
      sendEmail: true,
    }, {
      priority: 5, // Lower priority for batch
      delay: Math.random() * 60000, // Spread over 1 minute to avoid spikes
    });

    jobIds.push(jobId);
  }

  console.log(`[InvoiceQueue] Queued ${jobIds.length} batch invoices`);
  return jobIds;
}
