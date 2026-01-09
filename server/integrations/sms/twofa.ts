import { randomInt } from 'crypto';
import { getSMSQueue } from './sms-queue';
import { renderSMSTemplate } from './templates';
import { db } from '../../db';
// NOTE: verificationCodes table not yet implemented in schema
// import { verificationCodes } from '../../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';

// Placeholder types until schema is updated
const verificationCodes: any = null;

interface Generate2FACodeOptions {
  length?: number;
  expiryMinutes?: number;
  userId?: number;
  purpose?: string;
}

interface Verify2FACodeOptions {
  phoneNumber: string;
  code: string;
  purpose?: string;
  deleteOnSuccess?: boolean;
}

interface Send2FASMSOptions {
  phoneNumber: string;
  code: string;
  expiryMinutes?: number;
  userId?: number;
  purpose?: string;
}

export class TwoFactorSMS {
  private smsQueue = getSMSQueue();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms
  private readonly MAX_REQUESTS_PER_HOUR = 5;

  /**
   * Generate a random verification code
   */
  generateCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return randomInt(min, max).toString();
  }

  /**
   * Generate and store a 2FA code
   */
  async generate(
    phoneNumber: string,
    options: Generate2FACodeOptions = {}
  ): Promise<{ code: string; expiresAt: Date }> {
    const {
      length = 6,
      expiryMinutes = 10,
      userId,
      purpose = 'verification',
    } = options;

    // Check rate limiting
    await this.checkRateLimit(phoneNumber);

    // Generate code
    const code = this.generateCode(length);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

    // Store in database
    await db.insert(verificationCodes).values({
      phoneNumber,
      code,
      purpose,
      expiresAt,
      userId,
      attempts: 0,
      verified: false,
    });

    console.log(
      `2FA code generated for ${phoneNumber}: ${code} (expires at ${expiresAt})`
    );

    return { code, expiresAt };
  }

  /**
   * Send 2FA code via SMS
   */
  async send(options: Send2FASMSOptions): Promise<boolean> {
    const { phoneNumber, code, expiryMinutes = 10, userId, purpose = 'verification' } = options;

    try {
      // Render SMS template
      const body = renderSMSTemplate('verification_code', {
        code,
        expiryMinutes: expiryMinutes.toString(),
      });

      // Queue the SMS
      await this.smsQueue.enqueue({
        to: phoneNumber,
        body,
        templateName: 'verification_code',
        templateContext: { code, expiryMinutes },
        priority: 'high',
        maxRetries: 3,
        metadata: {
          purpose,
          userId,
        },
      });

      console.log(`2FA SMS queued for ${phoneNumber}`);
      return true;
    } catch (error: any) {
      console.error('Error sending 2FA SMS:', error);
      return false;
    }
  }

  /**
   * Generate and send 2FA code in one step
   */
  async generateAndSend(
    phoneNumber: string,
    options: Generate2FACodeOptions = {}
  ): Promise<{ success: boolean; expiresAt?: Date }> {
    try {
      const { code, expiresAt } = await this.generate(phoneNumber, options);

      const sent = await this.send({
        phoneNumber,
        code,
        expiryMinutes: options.expiryMinutes || 10,
        userId: options.userId,
        purpose: options.purpose,
      });

      if (!sent) {
        return { success: false };
      }

      return { success: true, expiresAt };
    } catch (error: any) {
      console.error('Error generating and sending 2FA code:', error);
      return { success: false };
    }
  }

  /**
   * Verify a 2FA code
   */
  async verify(options: Verify2FACodeOptions): Promise<boolean> {
    const { phoneNumber, code, purpose = 'verification', deleteOnSuccess = true } = options;

    try {
      // Find the code
      const [record] = await db
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.phoneNumber, phoneNumber),
            eq(verificationCodes.code, code),
            eq(verificationCodes.purpose, purpose),
            eq(verificationCodes.verified, false),
            gt(verificationCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!record) {
        console.log(`No valid 2FA code found for ${phoneNumber}`);
        return false;
      }

      // Check max attempts
      if (record.attempts >= this.MAX_ATTEMPTS) {
        console.log(`Max attempts exceeded for ${phoneNumber}`);
        return false;
      }

      // Verify the code
      if (record.code === code) {
        if (deleteOnSuccess) {
          // Delete the code
          await db
            .delete(verificationCodes)
            .where(eq(verificationCodes.id, record.id));
        } else {
          // Mark as verified
          await db
            .update(verificationCodes)
            .set({ verified: true, verifiedAt: new Date() })
            .where(eq(verificationCodes.id, record.id));
        }

        console.log(`2FA code verified for ${phoneNumber}`);
        return true;
      } else {
        // Increment attempts
        await db
          .update(verificationCodes)
          .set({ attempts: record.attempts + 1 })
          .where(eq(verificationCodes.id, record.id));

        console.log(`Invalid 2FA code for ${phoneNumber}`);
        return false;
      }
    } catch (error: any) {
      console.error('Error verifying 2FA code:', error);
      return false;
    }
  }

  /**
   * Check rate limiting for 2FA requests
   */
  private async checkRateLimit(phoneNumber: string): Promise<void> {
    const cutoff = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

    const count = await db
      .select({ count: db.$count() })
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phoneNumber, phoneNumber),
          gt(verificationCodes.createdAt, cutoff)
        )
      );

    const requestCount = count[0]?.count || 0;

    if (requestCount >= this.MAX_REQUESTS_PER_HOUR) {
      throw new Error(
        `Rate limit exceeded. Maximum ${this.MAX_REQUESTS_PER_HOUR} requests per hour.`
      );
    }
  }

  /**
   * Clean up expired verification codes
   */
  async cleanup(): Promise<number> {
    try {
      const deleted = await db
        .delete(verificationCodes)
        .where(
          and(
            eq(verificationCodes.verified, false),
            gt(verificationCodes.expiresAt, new Date())
          )
        );

      console.log(`Cleaned up ${deleted} expired verification codes`);
      return deleted as any;
    } catch (error) {
      console.error('Error cleaning up verification codes:', error);
      return 0;
    }
  }

  /**
   * Resend 2FA code (same code, new SMS)
   */
  async resend(
    phoneNumber: string,
    purpose: string = 'verification'
  ): Promise<boolean> {
    try {
      // Find the most recent valid code
      const [record] = await db
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.phoneNumber, phoneNumber),
            eq(verificationCodes.purpose, purpose),
            eq(verificationCodes.verified, false),
            gt(verificationCodes.expiresAt, new Date())
          )
        )
        .orderBy(verificationCodes.createdAt)
        .limit(1);

      if (!record) {
        console.log(`No valid code to resend for ${phoneNumber}`);
        return false;
      }

      // Calculate remaining expiry time
      const expiryMinutes = Math.ceil(
        (record.expiresAt.getTime() - Date.now()) / 60000
      );

      // Send the same code again
      return await this.send({
        phoneNumber,
        code: record.code,
        expiryMinutes,
        userId: record.userId || undefined,
        purpose,
      });
    } catch (error) {
      console.error('Error resending 2FA code:', error);
      return false;
    }
  }

  /**
   * Get remaining attempts for a phone number
   */
  async getRemainingAttempts(
    phoneNumber: string,
    purpose: string = 'verification'
  ): Promise<number> {
    try {
      const [record] = await db
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.phoneNumber, phoneNumber),
            eq(verificationCodes.purpose, purpose),
            eq(verificationCodes.verified, false),
            gt(verificationCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!record) {
        return this.MAX_ATTEMPTS;
      }

      return Math.max(0, this.MAX_ATTEMPTS - record.attempts);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Send password reset code via SMS
   */
  async sendPasswordResetCode(
    phoneNumber: string,
    userId?: number
  ): Promise<{ success: boolean; expiresAt?: Date }> {
    return this.generateAndSend(phoneNumber, {
      length: 6,
      expiryMinutes: 15,
      userId,
      purpose: 'password_reset',
    });
  }

  /**
   * Verify password reset code
   */
  async verifyPasswordResetCode(
    phoneNumber: string,
    code: string
  ): Promise<boolean> {
    return this.verify({
      phoneNumber,
      code,
      purpose: 'password_reset',
      deleteOnSuccess: true,
    });
  }

  /**
   * Send login verification code (for suspicious login attempts)
   */
  async sendLoginVerificationCode(
    phoneNumber: string,
    userId: number
  ): Promise<{ success: boolean; expiresAt?: Date }> {
    return this.generateAndSend(phoneNumber, {
      length: 6,
      expiryMinutes: 5,
      userId,
      purpose: 'login_verification',
    });
  }

  /**
   * Verify login code
   */
  async verifyLoginCode(phoneNumber: string, code: string): Promise<boolean> {
    return this.verify({
      phoneNumber,
      code,
      purpose: 'login_verification',
      deleteOnSuccess: true,
    });
  }
}

// Export singleton instance
let twoFactorSMSInstance: TwoFactorSMS | null = null;

export function getTwoFactorSMS(): TwoFactorSMS {
  if (!twoFactorSMSInstance) {
    twoFactorSMSInstance = new TwoFactorSMS();
  }
  return twoFactorSMSInstance;
}

export default TwoFactorSMS;
