import { Job } from 'bullmq';
import { ReportJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';

export interface ReportContext {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  tenantId: string;
  recipientEmail: string;
  recipientName: string;
  agencyName: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Calculate the date range covered by a report.
 */
export function calculateDateRange(
  type: ReportContext['type'],
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();

  if (type === 'custom' && startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  switch (type) {
    case 'daily': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'weekly': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

/**
 * Core report logic, callable directly (inline on serverless) or from the
 * BullMQ worker. Pulls REAL metrics from storage for the tenant and e-mails a
 * rendered summary to the recipient.
 */
export async function runReport(ctx: ReportContext): Promise<void> {
  const { type, tenantId, recipientEmail, recipientName, agencyName } = ctx;

  if (!recipientEmail) {
    console.warn(
      `[ReportProcessor] Skipping ${type} report for tenant ${tenantId}: no recipient e-mail`,
    );
    return;
  }

  const range = calculateDateRange(type, ctx.startDate, ctx.endDate);
  console.log(
    `[ReportProcessor] Generating ${type} report for tenant ${tenantId} (${range.start.toISOString()} -> ${range.end.toISOString()})`,
  );

  const { storage } = await import('../../storage');

  // Real metrics from the database.
  const stats = await storage.getDashboardStats(tenantId);
  const financial = await storage.getFinancialSummaryReport(tenantId, {
    startDate: range.start,
    endDate: range.end,
  });

  const periodLabel = `${range.start.toLocaleDateString('pt-BR')} - ${range.end.toLocaleDateString('pt-BR')}`;
  const revenue = financial.salesRevenue + financial.rentalRevenue;

  const { getEmailService } = await import('../../email/email-service');
  const emailService = getEmailService();

  const result = await emailService.sendTemplate(
    'monthly-report',
    recipientEmail,
    `Seu relatorio ${type} esta pronto`,
    {
      userName: recipientName,
      period: periodLabel,
      activeProperties: stats.totalProperties,
      contractsCount: stats.totalContracts,
      leadsCount: stats.totalLeads,
      visitsCount: stats.totalVisits,
      revenue: `R$ ${revenue.toFixed(2)}`,
      newClients: stats.totalLeads,
      conversionRate:
        stats.totalLeads > 0
          ? `${((stats.totalContracts / stats.totalLeads) * 100).toFixed(1)}%`
          : '0%',
      avgResponseTime: 'N/A',
      currentYear: new Date().getFullYear(),
    },
    { companyName: agencyName, email: recipientEmail },
    { queue: false },
  );

  if (!result.success) {
    throw new Error(
      `Failed to send ${type} report to ${recipientEmail}: ${result.error}`,
    );
  }

  console.log(
    `[ReportProcessor] ${type} report e-mailed to ${recipientEmail} (tenant ${tenantId})`,
  );

  Sentry.addBreadcrumb({
    category: 'report',
    message: `Report generated: ${type}`,
    level: 'info',
    data: { type, tenantId },
  });
}

/**
 * Report processor - BullMQ worker entrypoint.
 */
export async function processReport(
  job: Job<ReportJobData & { context?: ReportContext }>,
): Promise<void> {
  const ctx = job.data.context;

  if (!ctx) {
    throw new Error(
      '[ReportProcessor] Missing resolved context in job payload',
    );
  }

  try {
    await job.updateProgress(10);
    await runReport(ctx);
    await job.updateProgress(100);
  } catch (error) {
    console.error(`[ReportProcessor] Failed to generate report:`, error);
    Sentry.captureException(error, {
      tags: { component: 'report-processor', reportType: ctx.type },
      extra: { tenantId: ctx.tenantId },
    });
    throw error;
  }
}
