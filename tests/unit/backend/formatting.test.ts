import { describe, it, expect } from 'vitest';

// Currency formatting function
function formatCurrency(value: number, currency: string = 'BRL'): string {
  // Use appropriate locale for each currency
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

// Date formatting function
function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return d.toISOString();
  }

  if (format === 'long') {
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return d.toLocaleDateString('pt-BR');
}

// Phone formatting function
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Mobile: (11) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Landline: (11) 9999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

// CPF formatting function
function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  return cpf;
}

// Number abbreviation function
function abbreviateNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format BRL currency correctly', () => {
      const result1 = formatCurrency(1000);
      const result2 = formatCurrency(1234.56);
      // Use regex to handle non-breaking spaces
      expect(result1).toMatch(/R\$\s*1\.000,00/);
      expect(result2).toMatch(/R\$\s*1\.234,56/);
    });

    it('should format USD currency correctly', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('1,000.00');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      // Use regex to handle non-breaking spaces
      expect(result).toMatch(/R\$\s*0,00/);
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('-');
      expect(result).toContain('1.000,00');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');

    it('should format date in short format', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should format date in long format', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toContain('2024');
    });

    it('should format date in ISO format', () => {
      const result = formatDate(testDate, 'iso');
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15', 'short');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatPhone', () => {
    it('should format mobile phone', () => {
      expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
    });

    it('should format landline phone', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('should handle already formatted phone', () => {
      expect(formatPhone('(11) 99999-9999')).toBe('(11) 99999-9999');
    });

    it('should return unformatted for invalid length', () => {
      expect(formatPhone('123')).toBe('123');
    });
  });

  describe('formatCPF', () => {
    it('should format valid CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should handle already formatted CPF', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
    });

    it('should return unformatted for invalid length', () => {
      expect(formatCPF('123')).toBe('123');
    });
  });

  describe('abbreviateNumber', () => {
    it('should abbreviate millions', () => {
      expect(abbreviateNumber(1000000)).toBe('1.0M');
      expect(abbreviateNumber(2500000)).toBe('2.5M');
    });

    it('should abbreviate thousands', () => {
      expect(abbreviateNumber(1000)).toBe('1.0K');
      expect(abbreviateNumber(5500)).toBe('5.5K');
    });

    it('should not abbreviate small numbers', () => {
      expect(abbreviateNumber(999)).toBe('999');
      expect(abbreviateNumber(100)).toBe('100');
    });

    it('should handle zero', () => {
      expect(abbreviateNumber(0)).toBe('0');
    });
  });
});
