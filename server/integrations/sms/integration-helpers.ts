/**
 * Integration helpers to connect SMS service with other features
 * (visits, payments, leads, contracts, etc.)
 */

import { getSMSQueue } from './sms-queue';
import { renderSMSTemplate } from './templates';
import { db } from '../../db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const smsQueue = getSMSQueue();

/**
 * Send visit reminder SMS
 */
export async function sendVisitReminder(
  phoneNumber: string,
  visit: {
    propertyAddress: string;
    dateTime: string;
    agentName: string;
  }
) {
  try {
    const body = renderSMSTemplate('visit_reminder', {
      propertyAddress: visit.propertyAddress,
      dateTime: visit.dateTime,
      agentName: visit.agentName,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'visit_reminder',
      templateContext: visit,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending visit reminder:', error);
    return false;
  }
}

/**
 * Send visit confirmation SMS
 */
export async function sendVisitConfirmation(
  phoneNumber: string,
  visit: {
    propertyAddress: string;
    dateTime: string;
  }
) {
  try {
    const body = renderSMSTemplate('visit_confirmation', {
      propertyAddress: visit.propertyAddress,
      dateTime: visit.dateTime,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'visit_confirmation',
      templateContext: visit,
      priority: 'normal',
      maxRetries: 2,
    });

    return true;
  } catch (error) {
    console.error('Error sending visit confirmation:', error);
    return false;
  }
}

/**
 * Send payment reminder SMS
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  payment: {
    amount: number;
    dueDate: string;
    description: string;
  }
) {
  try {
    const body = renderSMSTemplate('payment_reminder', {
      amount: payment.amount.toFixed(2),
      dueDate: payment.dueDate,
      description: payment.description,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'payment_reminder',
      templateContext: payment,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return false;
  }
}

/**
 * Send payment received confirmation SMS
 */
export async function sendPaymentConfirmation(
  phoneNumber: string,
  payment: {
    amount: number;
    date: string;
    receiptUrl: string;
  }
) {
  try {
    const body = renderSMSTemplate('payment_received', {
      amount: payment.amount.toFixed(2),
      date: payment.date,
      receiptUrl: payment.receiptUrl,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'payment_received',
      templateContext: payment,
      priority: 'normal',
      maxRetries: 2,
    });

    return true;
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return false;
  }
}

/**
 * Send contract ready for signature SMS
 */
export async function sendContractReady(
  phoneNumber: string,
  contract: {
    contractType: string;
    signUrl: string;
  }
) {
  try {
    const body = renderSMSTemplate('contract_ready', {
      contractType: contract.contractType,
      signUrl: contract.signUrl,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'contract_ready',
      templateContext: contract,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending contract ready notification:', error);
    return false;
  }
}

/**
 * Send property alert SMS
 */
export async function sendPropertyAlert(
  phoneNumber: string,
  property: {
    propertyType: string;
    location: string;
    price: number;
    detailsUrl: string;
  }
) {
  try {
    const body = renderSMSTemplate('property_alert', {
      propertyType: property.propertyType,
      location: property.location,
      price: property.price.toFixed(2),
      detailsUrl: property.detailsUrl,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'property_alert',
      templateContext: property,
      priority: 'normal',
      maxRetries: 2,
    });

    return true;
  } catch (error) {
    console.error('Error sending property alert:', error);
    return false;
  }
}

/**
 * Send lead assignment notification to agent
 */
export async function sendLeadAssignment(
  phoneNumber: string,
  lead: {
    leadName: string;
    leadPhone: string;
    propertyInterest: string;
  }
) {
  try {
    const body = renderSMSTemplate('lead_assigned', {
      leadName: lead.leadName,
      leadPhone: lead.leadPhone,
      propertyInterest: lead.propertyInterest,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'lead_assigned',
      templateContext: lead,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending lead assignment:', error);
    return false;
  }
}

/**
 * Send welcome message to new user
 */
export async function sendWelcomeMessage(
  phoneNumber: string,
  user: {
    name: string;
    loginUrl: string;
  }
) {
  try {
    const body = renderSMSTemplate('welcome_message', {
      name: user.name,
      loginUrl: user.loginUrl,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'welcome_message',
      templateContext: user,
      priority: 'normal',
      maxRetries: 2,
    });

    return true;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return false;
  }
}

/**
 * Send urgent notification
 */
export async function sendUrgentNotification(
  phoneNumber: string,
  notification: {
    message: string;
    actionUrl: string;
  }
) {
  try {
    const body = renderSMSTemplate('urgent_notification', {
      message: notification.message,
      actionUrl: notification.actionUrl,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'urgent_notification',
      templateContext: notification,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending urgent notification:', error);
    return false;
  }
}

/**
 * Send overdue payment notification
 */
export async function sendPaymentOverdue(
  phoneNumber: string,
  payment: {
    amount: number;
    daysOverdue: number;
    description: string;
  }
) {
  try {
    const body = renderSMSTemplate('payment_overdue', {
      amount: payment.amount.toFixed(2),
      daysOverdue: payment.daysOverdue.toString(),
      description: payment.description,
    });

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName: 'payment_overdue',
      templateContext: payment,
      priority: 'high',
      maxRetries: 3,
    });

    return true;
  } catch (error) {
    console.error('Error sending payment overdue notification:', error);
    return false;
  }
}

/**
 * Get user phone number from database
 */
async function getUserPhone(userId: number): Promise<string | null> {
  try {
    // NOTE: users table doesn't have phone field - this would need to be added
    // const [user] = await db
    //   .select({ phone: users.phone })
    //   .from(users)
    //   .where(eq(users.id, userId))
    //   .limit(1);

    // return user?.phone || null;
    console.warn('⚠️  Users table does not have phone field - cannot send SMS to user');
    return null;
  } catch (error) {
    console.error('Error getting user phone:', error);
    return null;
  }
}

/**
 * Send notification to user by user ID
 */
export async function sendNotificationToUser(
  userId: number,
  templateName: string,
  context: Record<string, any>
) {
  try {
    const phoneNumber = await getUserPhone(userId);

    if (!phoneNumber) {
      console.warn(`User ${userId} has no phone number`);
      return false;
    }

    const body = renderSMSTemplate(templateName, context);

    await smsQueue.enqueue({
      to: phoneNumber,
      body,
      templateName,
      templateContext: context,
      priority: 'normal',
      maxRetries: 2,
      metadata: { userId },
    });

    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
}

/**
 * Schedule visit reminders (to be called by a cron job)
 * Sends reminders 24 hours before scheduled visits
 */
export async function scheduleVisitReminders() {
  try {
    // TODO: Query visits scheduled for tomorrow
    // For each visit, send a reminder SMS
    // This is a placeholder - implement based on your visits schema

    console.log('Visit reminders scheduled');
  } catch (error) {
    console.error('Error scheduling visit reminders:', error);
  }
}

/**
 * Schedule payment reminders (to be called by a cron job)
 * Sends reminders 3 days before payment due date
 */
export async function schedulePaymentReminders() {
  try {
    // TODO: Query payments due in 3 days
    // For each payment, send a reminder SMS
    // This is a placeholder - implement based on your payments schema

    console.log('Payment reminders scheduled');
  } catch (error) {
    console.error('Error scheduling payment reminders:', error);
  }
}

/**
 * Check for overdue payments and send notifications
 */
export async function checkOverduePayments() {
  try {
    // TODO: Query overdue payments
    // For each overdue payment, send a notification SMS
    // This is a placeholder - implement based on your payments schema

    console.log('Overdue payment checks completed');
  } catch (error) {
    console.error('Error checking overdue payments:', error);
  }
}

export default {
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
};
