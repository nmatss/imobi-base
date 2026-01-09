import { db } from '../../db';
// NOTE: smsLogs and smsQueue tables not yet implemented in schema
// import { smsLogs, smsQueue } from '../../../shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

// Placeholder types until schema is updated
const smsLogs: any = null;
const smsQueue: any = null;

export interface SMSAnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface SMSDeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number; // Percentage
}

export interface SMSCostStats {
  totalCost: number;
  averageCostPerMessage: number;
  totalSegments: number;
  averageSegmentsPerMessage: number;
}

export interface SMSTemplateStats {
  templateName: string;
  count: number;
  deliveryRate: number;
  totalCost: number;
}

export interface SMSHourlyStats {
  hour: number;
  count: number;
  deliveryRate: number;
}

export interface SMSFailureAnalysis {
  errorCode: string;
  errorMessage: string;
  count: number;
  affectedNumbers: string[];
}

export interface SMSMonthlyReport {
  month: string;
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  totalCost: number;
  deliveryRate: number;
  averageCostPerMessage: number;
}

export class SMSAnalytics {
  /**
   * Get delivery statistics for a date range
   */
  async getDeliveryStats(dateRange: SMSAnalyticsDateRange): Promise<SMSDeliveryStats> {
    try {
      const stats = await db
        .select({
          status: smsLogs.status,
          count: sql<number>`count(*)`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate)
          )
        )
        .groupBy(smsLogs.status);

      const statusCounts: Record<string, number> = {};
      let total = 0;

      for (const stat of stats) {
        statusCounts[stat.status] = stat.count;
        total += stat.count;
      }

      const sent = statusCounts['sent'] || 0;
      const delivered = statusCounts['delivered'] || 0;
      const failed = statusCounts['failed'] || 0;
      const pending = statusCounts['pending'] || statusCounts['queued'] || 0;

      const deliveryRate = total > 0 ? ((delivered / total) * 100) : 0;

      return {
        total,
        sent,
        delivered,
        failed,
        pending,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 0,
      };
    }
  }

  /**
   * Get cost statistics for a date range
   */
  async getCostStats(dateRange: SMSAnalyticsDateRange): Promise<SMSCostStats> {
    try {
      const result = await db
        .select({
          totalCost: sql<number>`sum(${smsLogs.cost})`,
          totalSegments: sql<number>`sum(${smsLogs.segments})`,
          count: sql<number>`count(*)`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate)
          )
        );

      const totalCost = result[0]?.totalCost || 0;
      const totalSegments = result[0]?.totalSegments || 0;
      const count = result[0]?.count || 0;

      return {
        totalCost: Math.round(totalCost * 100) / 100,
        averageCostPerMessage: count > 0 ? Math.round((totalCost / count) * 10000) / 10000 : 0,
        totalSegments,
        averageSegmentsPerMessage: count > 0 ? Math.round((totalSegments / count) * 100) / 100 : 0,
      };
    } catch (error) {
      console.error('Error getting cost stats:', error);
      return {
        totalCost: 0,
        averageCostPerMessage: 0,
        totalSegments: 0,
        averageSegmentsPerMessage: 0,
      };
    }
  }

  /**
   * Get statistics by template
   */
  async getTemplateStats(dateRange: SMSAnalyticsDateRange): Promise<SMSTemplateStats[]> {
    try {
      const stats = await db
        .select({
          templateName: smsLogs.templateName,
          count: sql<number>`count(*)`,
          delivered: sql<number>`sum(case when ${smsLogs.status} = 'delivered' then 1 else 0 end)`,
          totalCost: sql<number>`sum(${smsLogs.cost})`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate),
            sql`${smsLogs.templateName} is not null`
          )
        )
        .groupBy(smsLogs.templateName)
        .orderBy(desc(sql`count(*)`));

      return stats.map((stat: any) => ({
        templateName: stat.templateName || 'unknown',
        count: stat.count,
        deliveryRate: stat.count > 0 ? Math.round((stat.delivered / stat.count) * 10000) / 100 : 0,
        totalCost: Math.round((stat.totalCost || 0) * 100) / 100,
      }));
    } catch (error) {
      console.error('Error getting template stats:', error);
      return [];
    }
  }

  /**
   * Get hourly sending pattern (for optimizing send times)
   */
  async getHourlyStats(dateRange: SMSAnalyticsDateRange): Promise<SMSHourlyStats[]> {
    try {
      const stats = await db
        .select({
          hour: sql<number>`extract(hour from ${smsLogs.sentAt})`,
          count: sql<number>`count(*)`,
          delivered: sql<number>`sum(case when ${smsLogs.status} = 'delivered' then 1 else 0 end)`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate)
          )
        )
        .groupBy(sql`extract(hour from ${smsLogs.sentAt})`)
        .orderBy(sql`extract(hour from ${smsLogs.sentAt})`);

      return stats.map((stat: any) => ({
        hour: stat.hour,
        count: stat.count,
        deliveryRate: stat.count > 0 ? Math.round((stat.delivered / stat.count) * 10000) / 100 : 0,
      }));
    } catch (error) {
      console.error('Error getting hourly stats:', error);
      return [];
    }
  }

  /**
   * Analyze failed messages
   */
  async getFailureAnalysis(dateRange: SMSAnalyticsDateRange): Promise<SMSFailureAnalysis[]> {
    try {
      const failures = await db
        .select({
          errorCode: smsLogs.errorCode,
          errorMessage: smsLogs.errorMessage,
          to: smsLogs.to,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate),
            eq(smsLogs.status, 'failed')
          )
        );

      // Group by error code/message
      const grouped = new Map<string, { message: string; numbers: Set<string> }>();

      for (const failure of failures) {
        const key = failure.errorCode || 'unknown';
        if (!grouped.has(key)) {
          grouped.set(key, {
            message: failure.errorMessage || 'Unknown error',
            numbers: new Set(),
          });
        }
        grouped.get(key)!.numbers.add(failure.to);
      }

      return Array.from(grouped.entries()).map(([errorCode, data]) => ({
        errorCode,
        errorMessage: data.message,
        count: data.numbers.size,
        affectedNumbers: Array.from(data.numbers).slice(0, 10), // Limit to 10 examples
      }));
    } catch (error) {
      console.error('Error getting failure analysis:', error);
      return [];
    }
  }

  /**
   * Get monthly report
   */
  async getMonthlyReport(year: number, month: number): Promise<SMSMonthlyReport> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const deliveryStats = await this.getDeliveryStats({ startDate, endDate });
      const costStats = await this.getCostStats({ startDate, endDate });

      return {
        month: `${year}-${month.toString().padStart(2, '0')}`,
        totalMessages: deliveryStats.total,
        deliveredMessages: deliveryStats.delivered,
        failedMessages: deliveryStats.failed,
        totalCost: costStats.totalCost,
        deliveryRate: deliveryStats.deliveryRate,
        averageCostPerMessage: costStats.averageCostPerMessage,
      };
    } catch (error) {
      console.error('Error getting monthly report:', error);
      return {
        month: `${year}-${month.toString().padStart(2, '0')}`,
        totalMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0,
        totalCost: 0,
        deliveryRate: 0,
        averageCostPerMessage: 0,
      };
    }
  }

  /**
   * Get usage for current month (for billing)
   */
  async getCurrentMonthUsage(): Promise<SMSMonthlyReport> {
    const now = new Date();
    return this.getMonthlyReport(now.getFullYear(), now.getMonth() + 1);
  }

  /**
   * Get top recipients (most messages sent to)
   */
  async getTopRecipients(dateRange: SMSAnalyticsDateRange, limit: number = 10) {
    try {
      const recipients = await db
        .select({
          to: smsLogs.to,
          count: sql<number>`count(*)`,
          totalCost: sql<number>`sum(${smsLogs.cost})`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate)
          )
        )
        .groupBy(smsLogs.to)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return recipients.map((r: any) => ({
        phoneNumber: r.to,
        messageCount: r.count,
        totalCost: Math.round((r.totalCost || 0) * 100) / 100,
      }));
    } catch (error) {
      console.error('Error getting top recipients:', error);
      return [];
    }
  }

  /**
   * Get delivery time statistics (how long it takes for messages to be delivered)
   */
  async getDeliveryTimeStats(dateRange: SMSAnalyticsDateRange) {
    try {
      const stats = await db
        .select({
          avgDeliveryTime: sql<number>`avg(extract(epoch from (${smsLogs.deliveredAt} - ${smsLogs.sentAt})))`,
          minDeliveryTime: sql<number>`min(extract(epoch from (${smsLogs.deliveredAt} - ${smsLogs.sentAt})))`,
          maxDeliveryTime: sql<number>`max(extract(epoch from (${smsLogs.deliveredAt} - ${smsLogs.sentAt})))`,
        })
        .from(smsLogs)
        .where(
          and(
            gte(smsLogs.sentAt, dateRange.startDate),
            lte(smsLogs.sentAt, dateRange.endDate),
            eq(smsLogs.status, 'delivered'),
            sql`${smsLogs.deliveredAt} is not null`
          )
        );

      return {
        averageSeconds: Math.round(stats[0]?.avgDeliveryTime || 0),
        minimumSeconds: Math.round(stats[0]?.minDeliveryTime || 0),
        maximumSeconds: Math.round(stats[0]?.maxDeliveryTime || 0),
      };
    } catch (error) {
      console.error('Error getting delivery time stats:', error);
      return {
        averageSeconds: 0,
        minimumSeconds: 0,
        maximumSeconds: 0,
      };
    }
  }

  /**
   * Generate comprehensive dashboard data
   */
  async getDashboardData(dateRange?: SMSAnalyticsDateRange) {
    const range = dateRange || {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
    };

    const [
      deliveryStats,
      costStats,
      templateStats,
      failureAnalysis,
      currentMonthUsage,
    ] = await Promise.all([
      this.getDeliveryStats(range),
      this.getCostStats(range),
      this.getTemplateStats(range),
      this.getFailureAnalysis(range),
      this.getCurrentMonthUsage(),
    ]);

    return {
      dateRange: range,
      delivery: deliveryStats,
      cost: costStats,
      templates: templateStats,
      failures: failureAnalysis,
      currentMonth: currentMonthUsage,
    };
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await db
        .delete(smsLogs)
        .where(lte(smsLogs.sentAt, cutoffDate));

      console.log(`Cleaned up SMS logs older than ${daysToKeep} days: ${deleted} records`);
      return deleted as any;
    } catch (error) {
      console.error('Error cleaning up old SMS logs:', error);
      return 0;
    }
  }
}

// Export singleton instance
let smsAnalyticsInstance: SMSAnalytics | null = null;

export function getSMSAnalytics(): SMSAnalytics {
  if (!smsAnalyticsInstance) {
    smsAnalyticsInstance = new SMSAnalytics();
  }
  return smsAnalyticsInstance;
}

export default SMSAnalytics;
