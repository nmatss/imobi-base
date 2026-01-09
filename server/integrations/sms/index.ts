/**
 * SMS Service - Main Entry Point
 *
 * Complete SMS service with Twilio integration for ImobiBase
 *
 * Features:
 * - SMS/MMS sending
 * - 2FA authentication
 * - Queue with rate limiting
 * - Phone number validation
 * - Opt-out management (TCPA/GDPR compliant)
 * - Analytics and reporting
 * - 20+ pre-built templates
 * - Automated reminders
 *
 * @see docs/SMS_SETUP.md for setup instructions
 */

// Core Services
export { TwilioService, getTwilioService } from './twilio-service';
export { SMSQueue, getSMSQueue } from './sms-queue';
export { PhoneValidator, getPhoneValidator } from './phone-validator';
export { TwoFactorSMS, getTwoFactorSMS } from './twofa';
export { SMSOptOutManager, getSMSOptOutManager } from './optout';
export { SMSAnalytics, getSMSAnalytics } from './analytics';

// Templates
export {
  SMS_TEMPLATES,
  renderSMSTemplate,
  getAvailableTemplates,
  getTemplateInfo,
  calculateSMSSegments,
  estimateSMSCost,
  type SMSTemplate,
  type SMSTemplateContext,
} from './templates';

// Integration Helpers
export {
  sendVisitReminder,
  sendVisitConfirmation,
  sendPaymentReminder,
  sendPaymentConfirmation,
  sendContractReady,
  sendPropertyAlert,
  sendLeadAssignment,
  sendWelcomeMessage,
  sendUrgentNotification,
  sendPaymentOverdue,
  sendNotificationToUser,
  scheduleVisitReminders,
  schedulePaymentReminders,
  checkOverduePayments,
} from './integration-helpers';

// Scheduler
export {
  startQueueProcessor,
  stopQueueProcessor,
  startDailyTasks,
  stopDailyTasks,
  startCleanupTasks,
  stopCleanupTasks,
  startAllSchedulers,
  stopAllSchedulers,
  getSchedulerStatus,
} from './scheduler';

// Types
export type {
  PhoneValidationResult,
} from './phone-validator';

export type {
  OptOutReason,
  OptOutRecord,
  OptInRecord,
} from './optout';

export type {
  SMSAnalyticsDateRange,
  SMSDeliveryStats,
  SMSCostStats,
  SMSTemplateStats,
  SMSHourlyStats,
  SMSFailureAnalysis,
  SMSMonthlyReport,
} from './analytics';

/**
 * Quick start example:
 *
 * ```typescript
 * import { getSMSQueue, renderSMSTemplate } from './integrations/sms';
 *
 * const smsQueue = getSMSQueue();
 *
 * const body = renderSMSTemplate('visit_reminder', {
 *   propertyAddress: 'Av. Paulista, 1000',
 *   dateTime: '15/12/2024 às 14:00',
 *   agentName: 'João Silva',
 * });
 *
 * await smsQueue.enqueue({
 *   to: '+5511999999999',
 *   body,
 *   priority: 'high',
 * });
 * ```
 */

// Import everything again for the default export
import { getTwilioService } from './twilio-service';
import { getSMSQueue } from './sms-queue';
import { getPhoneValidator } from './phone-validator';
import { getTwoFactorSMS } from './twofa';
import { getSMSOptOutManager } from './optout';
import { getSMSAnalytics } from './analytics';
import { renderSMSTemplate, getAvailableTemplates } from './templates';
import {
  sendVisitReminder,
  sendPaymentReminder,
  sendContractReady,
  sendWelcomeMessage,
} from './integration-helpers';
import {
  startAllSchedulers,
  stopAllSchedulers,
} from './scheduler';

export default {
  // Services
  getTwilioService,
  getSMSQueue,
  getPhoneValidator,
  getTwoFactorSMS,
  getSMSOptOutManager,
  getSMSAnalytics,

  // Templates
  renderSMSTemplate,
  getAvailableTemplates,

  // Helpers
  sendVisitReminder,
  sendPaymentReminder,
  sendContractReady,
  sendWelcomeMessage,

  // Scheduler
  startAllSchedulers,
  stopAllSchedulers,
};
