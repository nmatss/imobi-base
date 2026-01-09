import { describe, it, expect } from 'vitest';

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation function (Brazilian format)
function isValidPhone(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  // Brazilian phone: 10-11 digits (with area code)
  // If it starts with 55 (country code), remove it
  const withoutCountryCode = cleaned.startsWith('55') && cleaned.length > 11
    ? cleaned.substring(2)
    : cleaned;
  return withoutCountryCode.length >= 10 && withoutCountryCode.length <= 11;
}

// CPF validation (Brazilian tax ID)
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // All same digits

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

// Date validation
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Pagination sanitization
function sanitizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const sanitizedPage = Math.max(1, Math.floor(page || 1));
  // Handle limit: if not provided or invalid, use default 20, otherwise clamp between 1 and 100
  const defaultLimit = 20;
  const sanitizedLimit = limit !== undefined && limit > 0
    ? Math.min(100, Math.max(1, Math.floor(limit)))
    : limit !== undefined && limit <= 0
      ? 1  // If provided but 0 or negative, use 1
      : defaultLimit;  // If not provided, use default 20
  return { page: sanitizedPage, limit: sanitizedLimit };
}

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate Brazilian phone numbers', () => {
      expect(isValidPhone('11999999999')).toBe(true); // Mobile with 9
      expect(isValidPhone('1199999999')).toBe(true);  // Landline
      expect(isValidPhone('(11) 99999-9999')).toBe(true); // Formatted mobile
      expect(isValidPhone('(11) 9999-9999')).toBe(true);  // Formatted landline
      expect(isValidPhone('+55 11 99999-9999')).toBe(true); // With country code
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false); // Too short
      expect(isValidPhone('123456789012')).toBe(false); // Too long
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('CPF Validation', () => {
    it('should validate correct CPF numbers', () => {
      expect(isValidCPF('11144477735')).toBe(true);
      expect(isValidCPF('111.444.777-35')).toBe(true); // Formatted
    });

    it('should reject invalid CPF numbers', () => {
      expect(isValidCPF('11111111111')).toBe(false); // All same digits
      expect(isValidCPF('12345678901')).toBe(false); // Invalid check digits
      expect(isValidCPF('123')).toBe(false); // Too short
      expect(isValidCPF('')).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should validate correct date strings', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-12-31T23:59:59Z')).toBe(true);
      expect(isValidDate(new Date().toISOString())).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
      expect(isValidDate('2024-01-32')).toBe(false); // Invalid day
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('Pagination Sanitization', () => {
    it('should sanitize valid pagination values', () => {
      expect(sanitizePagination(1, 20)).toEqual({ page: 1, limit: 20 });
      expect(sanitizePagination(5, 50)).toEqual({ page: 5, limit: 50 });
    });

    it('should use default values when not provided', () => {
      expect(sanitizePagination()).toEqual({ page: 1, limit: 20 });
      expect(sanitizePagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
    });

    it('should enforce minimum page value of 1', () => {
      expect(sanitizePagination(0, 20)).toEqual({ page: 1, limit: 20 });
      expect(sanitizePagination(-5, 20)).toEqual({ page: 1, limit: 20 });
    });

    it('should enforce maximum limit of 100', () => {
      expect(sanitizePagination(1, 200)).toEqual({ page: 1, limit: 100 });
      expect(sanitizePagination(1, 999)).toEqual({ page: 1, limit: 100 });
    });

    it('should enforce minimum limit of 1', () => {
      expect(sanitizePagination(1, 0)).toEqual({ page: 1, limit: 1 });
      expect(sanitizePagination(1, -10)).toEqual({ page: 1, limit: 1 });
    });

    it('should handle decimal values by flooring', () => {
      expect(sanitizePagination(2.7, 25.9)).toEqual({ page: 2, limit: 25 });
    });
  });
});
