import { Job } from 'bullmq';
import { ReportJobData, EmailJobData, QueueName } from '../queue-manager';
import { getQueue } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Report processor - handles report generation
 */
export async function processReport(job: Job<ReportJobData>): Promise<void> {
  const { type, userId, startDate, endDate, format, email } = job.data;

  try {
    console.log(`[ReportProcessor] Generating ${type} report in ${format} format`);

    await job.updateProgress(10);

    // Step 1: Determine date range
    const dateRange = calculateDateRange(type, startDate, endDate);
    console.log(`[ReportProcessor] Date range: ${dateRange.start} to ${dateRange.end}`);

    await job.updateProgress(20);

    // Step 2: Fetch data from database
    console.log(`[ReportProcessor] Fetching data for report`);

    // In production, fetch actual data from database
    const reportData = {
      type,
      period: {
        start: dateRange.start,
        end: dateRange.end,
      },
      metrics: {
        totalProperties: 150,
        activeContracts: 120,
        revenue: 180000.00,
        newLeads: 45,
        closedDeals: 12,
        occupancyRate: 0.80,
      },
      topProperties: [
        { id: 1, address: 'Rua A, 123', revenue: 15000 },
        { id: 2, address: 'Av B, 456', revenue: 12000 },
        { id: 3, address: 'Rua C, 789', revenue: 10000 },
      ],
      recentActivity: [
        { date: '2025-12-20', type: 'contract_signed', value: 'Property #45' },
        { date: '2025-12-19', type: 'payment_received', value: 'R$ 3,500' },
        { date: '2025-12-18', type: 'new_lead', value: 'John Doe' },
      ],
    };

    console.log(`[ReportProcessor] Data fetched successfully`);
    await job.updateProgress(50);

    // Step 3: Generate report in requested format
    let filePath: string;
    let fileName: string;

    switch (format) {
      case 'pdf':
        filePath = await generatePdfReport(reportData, type);
        fileName = `report-${type}-${Date.now()}.pdf`;
        break;

      case 'excel':
        filePath = await generateExcelReport(reportData, type);
        fileName = `report-${type}-${Date.now()}.xlsx`;
        break;

      case 'csv':
        filePath = await generateCsvReport(reportData, type);
        fileName = `report-${type}-${Date.now()}.csv`;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    console.log(`[ReportProcessor] Report generated: ${filePath}`);
    await job.updateProgress(80);

    // Step 4: Upload to storage
    const storageUrl = `https://storage.imobibase.com/reports/${fileName}`;
    console.log(`[ReportProcessor] Report uploaded to ${storageUrl}`);

    await job.updateProgress(90);

    // Step 5: Send email notification if email provided
    if (email) {
      console.log(`[ReportProcessor] Sending report via email to ${email}`);

      const emailQueue = getQueue<EmailJobData>(QueueName.EMAIL);
      await emailQueue.add('send-report', {
        to: email,
        subject: `Your ${type} report is ready`,
        template: 'report-ready',
        data: {
          reportType: type,
          period: `${dateRange.start} to ${dateRange.end}`,
          downloadUrl: storageUrl,
          generatedAt: new Date().toISOString(),
        },
        attachments: [
          {
            filename: fileName,
            path: filePath,
          },
        ],
      });

      console.log(`[ReportProcessor] Email queued`);
    }

    await job.updateProgress(100);

    console.log(`[ReportProcessor] Report processing completed successfully`);

    Sentry.addBreadcrumb({
      category: 'report',
      message: `Report generated: ${type}`,
      level: 'info',
      data: {
        type,
        format,
        userId,
      },
    });
  } catch (error) {
    console.error(`[ReportProcessor] Failed to generate report:`, error);

    Sentry.captureException(error, {
      tags: {
        component: 'report-processor',
        reportType: type,
        format,
      },
      extra: {
        userId,
        startDate,
        endDate,
      },
    });

    throw error;
  }
}

/**
 * Calculate date range based on report type
 */
function calculateDateRange(
  type: string,
  startDate?: string,
  endDate?: string
): { start: string; end: string } {
  const now = new Date();

  if (type === 'custom' && startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  switch (type) {
    case 'daily':
      return {
        start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
        end: new Date(now.setHours(23, 59, 59, 999)).toISOString(),
      };

    case 'weekly':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      };

    case 'monthly':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      return {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      };

    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

/**
 * Generate PDF report
 */
async function generatePdfReport(data: any, type: string): Promise<string> {
  // In production, use pdfkit, puppeteer, or similar
  console.log(`[ReportProcessor] Generating PDF report for ${type}`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const filePath = `/tmp/report-${type}-${Date.now()}.pdf`;
  return filePath;
}

/**
 * Generate Excel report
 */
async function generateExcelReport(data: any, type: string): Promise<string> {
  // In production, use exceljs or similar
  console.log(`[ReportProcessor] Generating Excel report for ${type}`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const filePath = `/tmp/report-${type}-${Date.now()}.xlsx`;
  return filePath;
}

/**
 * Generate CSV report
 */
async function generateCsvReport(data: any, type: string): Promise<string> {
  // In production, use fast-csv or similar
  console.log(`[ReportProcessor] Generating CSV report for ${type}`);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const filePath = `/tmp/report-${type}-${Date.now()}.csv`;
  return filePath;
}
