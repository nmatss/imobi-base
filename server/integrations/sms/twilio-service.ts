import twilio from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

interface SendSMSParams {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[];
  statusCallback?: string;
}

interface MessageStatus {
  sid: string;
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
}

interface AccountBalance {
  balance: string;
  currency: string;
}

interface PhoneNumberValidation {
  valid: boolean;
  phoneNumber: string;
  countryCode: string;
  carrier?: string;
  type?: string;
}

export class TwilioService {
  private client: ReturnType<typeof twilio>;
  private config: TwilioConfig;

  constructor(config?: Partial<TwilioConfig>) {
    this.config = {
      accountSid: config?.accountSid || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: config?.authToken || process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '',
    };

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }

    this.client = twilio(this.config.accountSid, this.config.authToken);
  }

  /**
   * Send SMS message
   */
  async sendSMS(params: SendSMSParams): Promise<MessageInstance> {
    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: params.from || this.config.phoneNumber,
        body: params.body,
        statusCallback: params.statusCallback,
      });

      console.log(`SMS sent successfully to ${params.to}. SID: ${message.sid}`);
      return message;
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send MMS message (with media attachments)
   */
  async sendMMS(params: SendSMSParams): Promise<MessageInstance> {
    try {
      if (!params.mediaUrls || params.mediaUrls.length === 0) {
        throw new Error('Media URLs are required for MMS');
      }

      const message = await this.client.messages.create({
        to: params.to,
        from: params.from || this.config.phoneNumber,
        body: params.body,
        mediaUrl: params.mediaUrls,
        statusCallback: params.statusCallback,
      });

      console.log(`MMS sent successfully to ${params.to}. SID: ${message.sid}`);
      return message;
    } catch (error: any) {
      console.error('Error sending MMS:', error);
      throw new Error(`Failed to send MMS: ${error.message}`);
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string): Promise<MessageStatus> {
    try {
      const message = await this.client.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent || undefined,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error: any) {
      console.error('Error fetching message status:', error);
      throw new Error(`Failed to get message status: ${error.message}`);
    }
  }

  /**
   * Validate phone number using Twilio Lookup API
   */
  async validatePhoneNumber(phoneNumber: string): Promise<PhoneNumberValidation> {
    try {
      const result = await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch({
        fields: 'line_type_intelligence',
      });

      return {
        valid: result.valid || false,
        phoneNumber: result.phoneNumber,
        countryCode: result.countryCode || '',
        carrier: result.lineTypeIntelligence?.carrierName || undefined,
        type: result.lineTypeIntelligence?.type || undefined,
      };
    } catch (error: any) {
      console.error('Error validating phone number:', error);

      // If lookup fails, the number is likely invalid
      return {
        valid: false,
        phoneNumber: phoneNumber,
        countryCode: '',
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<AccountBalance> {
    try {
      const balance = await this.client.balance.fetch();

      return {
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get message usage statistics for a date range
   */
  async getUsageStatistics(startDate: Date, endDate: Date) {
    try {
      const records = await this.client.usage.records.list({
        category: 'sms',
        startDate: startDate,
        endDate: endDate,
      });

      return records.map(record => ({
        category: record.category,
        count: record.count,
        usage: record.usage,
        usageUnit: record.usageUnit,
        price: record.price,
        priceUnit: record.priceUnit,
        startDate: record.startDate,
        endDate: record.endDate,
      }));
    } catch (error: any) {
      console.error('Error fetching usage statistics:', error);
      throw new Error(`Failed to get usage statistics: ${error.message}`);
    }
  }

  /**
   * List recent messages
   */
  async listMessages(limit: number = 20) {
    try {
      const messages = await this.client.messages.list({ limit });

      return messages.map(msg => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
        price: msg.price,
        priceUnit: msg.priceUnit,
      }));
    } catch (error: any) {
      console.error('Error listing messages:', error);
      throw new Error(`Failed to list messages: ${error.message}`);
    }
  }

  /**
   * Cancel/delete a scheduled message
   */
  async cancelMessage(messageSid: string): Promise<boolean> {
    try {
      await this.client.messages(messageSid).update({ status: 'canceled' });
      return true;
    } catch (error: any) {
      console.error('Error canceling message:', error);
      return false;
    }
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+55'): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If doesn't start with country code, add it
    if (!phoneNumber.startsWith('+')) {
      // Remove leading zeros
      cleaned = cleaned.replace(/^0+/, '');

      // Add country code
      if (!cleaned.startsWith(defaultCountryCode.replace('+', ''))) {
        cleaned = defaultCountryCode.replace('+', '') + cleaned;
      }
    }

    return '+' + cleaned;
  }

  /**
   * Check if a number can receive SMS
   */
  async canReceiveSMS(phoneNumber: string): Promise<boolean> {
    try {
      const validation = await this.validatePhoneNumber(phoneNumber);

      // Landlines typically cannot receive SMS
      if (validation.type === 'landline') {
        return false;
      }

      return validation.valid;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
let twilioServiceInstance: TwilioService | null = null;

export function getTwilioService(): TwilioService {
  if (!twilioServiceInstance) {
    twilioServiceInstance = new TwilioService();
  }
  return twilioServiceInstance;
}

export default TwilioService;
