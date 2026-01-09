import { getTwilioService } from './twilio-service';
import { parsePhoneNumber, CountryCode, isValidPhoneNumber } from 'libphonenumber-js';

export interface PhoneValidationResult {
  valid: boolean;
  formatted: string; // E.164 format
  country?: string;
  countryCode?: string;
  nationalFormat?: string;
  type?: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier?: string;
  canReceiveSMS: boolean;
  error?: string;
}

export class PhoneValidator {
  private twilioService = getTwilioService();
  private defaultCountry: CountryCode = 'BR'; // Default to Brazil

  constructor(defaultCountry?: CountryCode) {
    if (defaultCountry) {
      this.defaultCountry = defaultCountry;
    }
  }

  /**
   * Validate and format a phone number
   */
  async validate(phoneNumber: string, country?: CountryCode): Promise<PhoneValidationResult> {
    const countryCode = country || this.defaultCountry;

    try {
      // First, basic validation with libphonenumber-js
      const basicValidation = this.basicValidation(phoneNumber, countryCode);

      if (!basicValidation.valid) {
        return basicValidation;
      }

      // Then, validate with Twilio Lookup API for detailed info
      try {
        const twilioValidation = await this.twilioService.validatePhoneNumber(
          basicValidation.formatted
        );

        return {
          valid: twilioValidation.valid,
          formatted: twilioValidation.phoneNumber,
          country: basicValidation.country,
          countryCode: twilioValidation.countryCode,
          nationalFormat: basicValidation.nationalFormat,
          type: this.mapTwilioType(twilioValidation.type),
          carrier: twilioValidation.carrier,
          canReceiveSMS: twilioValidation.type !== 'landline',
        };
      } catch (twilioError) {
        // If Twilio lookup fails, return basic validation
        console.warn('Twilio lookup failed, using basic validation:', twilioError);
        return basicValidation;
      }
    } catch (error: any) {
      return {
        valid: false,
        formatted: phoneNumber,
        canReceiveSMS: false,
        error: error.message,
      };
    }
  }

  /**
   * Basic validation using libphonenumber-js (offline, faster)
   */
  basicValidation(phoneNumber: string, country?: CountryCode): PhoneValidationResult {
    const countryCode = country || this.defaultCountry;

    try {
      // Check if valid
      const isValid = isValidPhoneNumber(phoneNumber, countryCode);

      if (!isValid) {
        return {
          valid: false,
          formatted: phoneNumber,
          canReceiveSMS: false,
          error: 'Invalid phone number format',
        };
      }

      // Parse the number
      const parsed = parsePhoneNumber(phoneNumber, countryCode);

      if (!parsed) {
        return {
          valid: false,
          formatted: phoneNumber,
          canReceiveSMS: false,
          error: 'Unable to parse phone number',
        };
      }

      // Determine if it can receive SMS (basic heuristic)
      const type = parsed.getType();
      const canReceiveSMS =
        type === 'MOBILE' ||
        type === 'FIXED_LINE_OR_MOBILE' ||
        type === 'PERSONAL_NUMBER';

      return {
        valid: true,
        formatted: parsed.format('E.164'),
        country: parsed.country,
        countryCode: `+${parsed.countryCallingCode}`,
        nationalFormat: parsed.formatNational(),
        type: this.mapLibPhoneType(type),
        canReceiveSMS,
      };
    } catch (error: any) {
      return {
        valid: false,
        formatted: phoneNumber,
        canReceiveSMS: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate multiple phone numbers at once
   */
  async validateBulk(
    phoneNumbers: string[],
    country?: CountryCode
  ): Promise<Map<string, PhoneValidationResult>> {
    const results = new Map<string, PhoneValidationResult>();

    // Process in parallel (but rate-limited)
    const batchSize = 5;
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(number => this.validate(number, country))
      );

      batch.forEach((number, index) => {
        results.set(number, batchResults[index]);
      });

      // Small delay to avoid rate limiting
      if (i + batchSize < phoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Format a phone number to E.164 format
   */
  formatToE164(phoneNumber: string, country?: CountryCode): string | null {
    const countryCode = country || this.defaultCountry;

    try {
      const parsed = parsePhoneNumber(phoneNumber, countryCode);
      return parsed ? parsed.format('E.164') : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Format a phone number to national format
   */
  formatToNational(phoneNumber: string, country?: CountryCode): string | null {
    const countryCode = country || this.defaultCountry;

    try {
      const parsed = parsePhoneNumber(phoneNumber, countryCode);
      return parsed ? parsed.formatNational() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Format a phone number to international format
   */
  formatToInternational(phoneNumber: string, country?: CountryCode): string | null {
    const countryCode = country || this.defaultCountry;

    try {
      const parsed = parsePhoneNumber(phoneNumber, countryCode);
      return parsed ? parsed.formatInternational() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract country from phone number
   */
  getCountry(phoneNumber: string): string | null {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      return parsed ? parsed.country || null : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a number is mobile
   */
  isMobile(phoneNumber: string, country?: CountryCode): boolean {
    const validation = this.basicValidation(phoneNumber, country);
    return validation.type === 'mobile';
  }

  /**
   * Sanitize phone number (remove all non-digit characters except +)
   */
  sanitize(phoneNumber: string): string {
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  /**
   * Map Twilio phone type to our type
   */
  private mapTwilioType(twilioType?: string): 'mobile' | 'landline' | 'voip' | 'unknown' {
    if (!twilioType) return 'unknown';

    const type = twilioType.toLowerCase();

    if (type.includes('mobile')) return 'mobile';
    if (type.includes('landline') || type.includes('fixed')) return 'landline';
    if (type.includes('voip')) return 'voip';

    return 'unknown';
  }

  /**
   * Map libphonenumber-js type to our type
   */
  private mapLibPhoneType(
    libType?: string
  ): 'mobile' | 'landline' | 'voip' | 'unknown' {
    if (!libType) return 'unknown';

    switch (libType) {
      case 'MOBILE':
        return 'mobile';
      case 'FIXED_LINE':
        return 'landline';
      case 'FIXED_LINE_OR_MOBILE':
        return 'mobile'; // Assume mobile for SMS capability
      case 'VOIP':
        return 'voip';
      default:
        return 'unknown';
    }
  }
}

// Export singleton instance
let phoneValidatorInstance: PhoneValidator | null = null;

export function getPhoneValidator(defaultCountry?: CountryCode): PhoneValidator {
  if (!phoneValidatorInstance) {
    phoneValidatorInstance = new PhoneValidator(defaultCountry);
  }
  return phoneValidatorInstance;
}

export default PhoneValidator;
