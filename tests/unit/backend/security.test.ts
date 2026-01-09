import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePasswordStrength, PASSWORD_REQUIREMENTS } from '../../../server/auth/security';

describe('Password Security', () => {
  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = validatePasswordStrength('MyP@ssw0rd!');

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.message).toBeUndefined();
      expect(result.requirements).toEqual({
        minLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasNumber: true,
        hasSpecialChar: true,
      });
    });

    it('should reject password that is too short', () => {
      const result = validatePasswordStrength('Pass1!');

      expect(result.valid).toBe(false);
      expect(result.score).toBe(80); // 4 out of 5 requirements met
      expect(result.message).toContain('pelo menos 8 caracteres');
      expect(result.requirements.minLength).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('myp@ssw0rd!');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('letra maiúscula');
      expect(result.requirements.hasUppercase).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('MYP@SSW0RD!');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('letra minúscula');
      expect(result.requirements.hasLowercase).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('MyP@ssword!');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('número');
      expect(result.requirements.hasNumber).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('MyPassw0rd');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('caractere especial');
      expect(result.requirements.hasSpecialChar).toBe(false);
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should correctly calculate score for partially valid password', () => {
      // Password with 3 out of 5 requirements
      const result = validatePasswordStrength('password123');

      expect(result.valid).toBe(false);
      expect(result.score).toBe(60); // 3 out of 5
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasUppercase).toBe(false);
      expect(result.requirements.hasSpecialChar).toBe(false);
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>';

      for (const char of specialChars) {
        const password = `MyPassw0rd${char}`;
        const result = validatePasswordStrength(password);
        expect(result.requirements.hasSpecialChar).toBe(true);
      }
    });

    it('should verify PASSWORD_REQUIREMENTS constants', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(8);
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
      expect(PASSWORD_REQUIREMENTS.requireSpecialChar).toBe(true);
      expect(PASSWORD_REQUIREMENTS.maxPasswordAge).toBe(90);
    });
  });
});
