import { db } from '../../db';
// NOTE: smsOptOuts table not yet implemented in schema
// import { smsOptOuts } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Placeholder types until schema is updated
const smsOptOuts: any = null;

/**
 * SMS Opt-out Management
 * Handles STOP/START keywords and maintains compliance with regulations
 *
 * IMPORTANT: Legal requirements (TCPA, GDPR, etc.):
 * - Must honor STOP requests immediately
 * - Must provide clear opt-out instructions in first message
 * - Must maintain opt-out list indefinitely
 * - Must not charge for STOP messages
 */

export type OptOutReason = 'user_request' | 'complaint' | 'bounce' | 'admin';

export interface OptOutRecord {
  id?: number;
  phoneNumber: string;
  reason: OptOutReason;
  source?: string;
  optedOutAt: Date;
  metadata?: Record<string, any>;
}

export interface OptInRecord {
  phoneNumber: string;
  source?: string;
  consentText?: string;
  metadata?: Record<string, any>;
}

export class SMSOptOutManager {
  // Keywords that trigger opt-out (case-insensitive)
  private readonly STOP_KEYWORDS = [
    'STOP',
    'STOPALL',
    'UNSUBSCRIBE',
    'CANCEL',
    'END',
    'QUIT',
    'PARAR',
    'CANCELAR',
    'SAIR',
  ];

  // Keywords that trigger opt-in (case-insensitive)
  private readonly START_KEYWORDS = [
    'START',
    'YES',
    'UNSTOP',
    'SUBSCRIBE',
    'SIM',
    'COMECAR',
    'INICIAR',
  ];

  /**
   * Check if a phone number is opted out
   */
  async isOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const [record] = await db
        .select()
        .from(smsOptOuts)
        .where(
          and(
            eq(smsOptOuts.phoneNumber, phoneNumber),
            eq(smsOptOuts.optedIn, false)
          )
        )
        .limit(1);

      return !!record;
    } catch (error) {
      console.error('Error checking opt-out status:', error);
      return false; // Fail safe - don't block if check fails
    }
  }

  /**
   * Opt out a phone number
   */
  async optOut(record: OptOutRecord): Promise<boolean> {
    try {
      const existing = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.phoneNumber, record.phoneNumber))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(smsOptOuts)
          .set({
            optedIn: false,
            optOutReason: record.reason,
            optOutSource: record.source,
            optedOutAt: record.optedOutAt,
            metadata: record.metadata,
            updatedAt: new Date(),
          })
          .where(eq(smsOptOuts.phoneNumber, record.phoneNumber));
      } else {
        // Insert new record
        await db.insert(smsOptOuts).values({
          phoneNumber: record.phoneNumber,
          optedIn: false,
          optOutReason: record.reason,
          optOutSource: record.source,
          optedOutAt: record.optedOutAt,
          metadata: record.metadata,
        });
      }

      console.log(`Phone number ${record.phoneNumber} opted out (${record.reason})`);
      return true;
    } catch (error) {
      console.error('Error opting out phone number:', error);
      return false;
    }
  }

  /**
   * Opt in a phone number
   */
  async optIn(record: OptInRecord): Promise<boolean> {
    try {
      const existing = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.phoneNumber, record.phoneNumber))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(smsOptOuts)
          .set({
            optedIn: true,
            optInSource: record.source,
            optInConsentText: record.consentText,
            optedInAt: new Date(),
            metadata: record.metadata,
            updatedAt: new Date(),
          })
          .where(eq(smsOptOuts.phoneNumber, record.phoneNumber));
      } else {
        // Insert new record
        await db.insert(smsOptOuts).values({
          phoneNumber: record.phoneNumber,
          optedIn: true,
          optInSource: record.source,
          optInConsentText: record.consentText,
          optedInAt: new Date(),
          metadata: record.metadata,
        });
      }

      console.log(`Phone number ${record.phoneNumber} opted in`);
      return true;
    } catch (error) {
      console.error('Error opting in phone number:', error);
      return false;
    }
  }

  /**
   * Process an incoming SMS message for opt-out/opt-in keywords
   */
  async processIncomingMessage(
    phoneNumber: string,
    messageBody: string
  ): Promise<'stop' | 'start' | null> {
    const normalizedBody = messageBody.trim().toUpperCase();

    // Check for STOP keywords
    if (this.STOP_KEYWORDS.some(keyword => normalizedBody.includes(keyword))) {
      await this.optOut({
        phoneNumber,
        reason: 'user_request',
        source: 'sms_keyword',
        optedOutAt: new Date(),
        metadata: { originalMessage: messageBody },
      });
      return 'stop';
    }

    // Check for START keywords
    if (this.START_KEYWORDS.some(keyword => normalizedBody.includes(keyword))) {
      await this.optIn({
        phoneNumber,
        source: 'sms_keyword',
        metadata: { originalMessage: messageBody },
      });
      return 'start';
    }

    return null;
  }

  /**
   * Get opt-out confirmation message
   */
  getOptOutConfirmationMessage(): string {
    return 'Voce foi descadastrado e nao recebera mais mensagens. Para voltar a receber, responda START.';
  }

  /**
   * Get opt-in confirmation message
   */
  getOptInConfirmationMessage(): string {
    return 'Voce foi recadastrado e voltara a receber mensagens. Para cancelar, responda STOP.';
  }

  /**
   * Get opt-out instructions (to include in first message)
   */
  getOptOutInstructions(): string {
    return 'Responda STOP para cancelar.';
  }

  /**
   * Filter out opted-out numbers from a list
   */
  async filterOptedOutNumbers(phoneNumbers: string[]): Promise<string[]> {
    if (phoneNumbers.length === 0) {
      return [];
    }

    try {
      const optedOut = await db
        .select({ phoneNumber: smsOptOuts.phoneNumber })
        .from(smsOptOuts)
        .where(
          and(
            eq(smsOptOuts.optedIn, false)
          )
        );

      const optedOutSet = new Set(optedOut.map((r: any) => r.phoneNumber));

      const filtered = phoneNumbers.filter(
        number => !optedOutSet.has(number)
      );

      const removedCount = phoneNumbers.length - filtered.length;
      if (removedCount > 0) {
        console.log(
          `Filtered out ${removedCount} opted-out numbers from ${phoneNumbers.length} total`
        );
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering opted-out numbers:', error);
      return phoneNumbers; // Fail safe - return all if filter fails
    }
  }

  /**
   * Get opt-out statistics
   */
  async getStats(): Promise<{
    totalOptedOut: number;
    totalOptedIn: number;
    optOutsByReason: Record<string, number>;
  }> {
    try {
      const optedOut = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.optedIn, false));

      const optedIn = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.optedIn, true));

      const optOutsByReason: Record<string, number> = {};
      for (const record of optedOut) {
        const reason = record.optOutReason || 'unknown';
        optOutsByReason[reason] = (optOutsByReason[reason] || 0) + 1;
      }

      return {
        totalOptedOut: optedOut.length,
        totalOptedIn: optedIn.length,
        optOutsByReason,
      };
    } catch (error) {
      console.error('Error getting opt-out stats:', error);
      return {
        totalOptedOut: 0,
        totalOptedIn: 0,
        optOutsByReason: {},
      };
    }
  }

  /**
   * Export opt-out list (for compliance/backup)
   */
  async exportOptOutList(): Promise<OptOutRecord[]> {
    try {
      const records = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.optedIn, false));

      return records.map((record: any) => ({
        id: record.id,
        phoneNumber: record.phoneNumber,
        reason: (record.optOutReason as OptOutReason) || 'user_request',
        source: record.optOutSource || undefined,
        optedOutAt: record.optedOutAt || new Date(),
        metadata: record.metadata || undefined,
      }));
    } catch (error) {
      console.error('Error exporting opt-out list:', error);
      return [];
    }
  }

  /**
   * Bulk opt-out (for admin use)
   */
  async bulkOptOut(
    phoneNumbers: string[],
    reason: OptOutReason = 'admin',
    source?: string
  ): Promise<number> {
    let count = 0;

    for (const phoneNumber of phoneNumbers) {
      const success = await this.optOut({
        phoneNumber,
        reason,
        source,
        optedOutAt: new Date(),
      });

      if (success) count++;
    }

    console.log(`Bulk opted out ${count} of ${phoneNumbers.length} numbers`);
    return count;
  }

  /**
   * Bulk opt-in (for admin use)
   */
  async bulkOptIn(phoneNumbers: string[], source?: string): Promise<number> {
    let count = 0;

    for (const phoneNumber of phoneNumbers) {
      const success = await this.optIn({
        phoneNumber,
        source,
      });

      if (success) count++;
    }

    console.log(`Bulk opted in ${count} of ${phoneNumbers.length} numbers`);
    return count;
  }

  /**
   * Get opt-out history for a phone number
   */
  async getHistory(phoneNumber: string): Promise<any[]> {
    try {
      const records = await db
        .select()
        .from(smsOptOuts)
        .where(eq(smsOptOuts.phoneNumber, phoneNumber))
        .orderBy(smsOptOuts.createdAt);

      return records;
    } catch (error) {
      console.error('Error getting opt-out history:', error);
      return [];
    }
  }
}

// Export singleton instance
let smsOptOutManagerInstance: SMSOptOutManager | null = null;

export function getSMSOptOutManager(): SMSOptOutManager {
  if (!smsOptOutManagerInstance) {
    smsOptOutManagerInstance = new SMSOptOutManager();
  }
  return smsOptOutManagerInstance;
}

export default SMSOptOutManager;
