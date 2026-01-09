import { format, formatDistance, formatRelative } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import type { LanguageCode } from '@/i18n/config';

// Locale mapping for date-fns
const DATE_LOCALES = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': es,
};

// Currency configurations
export const CURRENCIES = {
  BRL: { symbol: 'R$', code: 'BRL', decimals: 2 },
  USD: { symbol: '$', code: 'USD', decimals: 2 },
  EUR: { symbol: '€', code: 'EUR', decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// Date format patterns
export const DATE_FORMATS = {
  'pt-BR': {
    short: 'dd/MM/yyyy',
    medium: 'dd/MM/yyyy HH:mm',
    long: "dd 'de' MMMM 'de' yyyy",
    full: "EEEE, dd 'de' MMMM 'de' yyyy",
    time: 'HH:mm',
    datetime: 'dd/MM/yyyy HH:mm:ss',
  },
  'en-US': {
    short: 'MM/dd/yyyy',
    medium: 'MM/dd/yyyy h:mm a',
    long: 'MMMM dd, yyyy',
    full: 'EEEE, MMMM dd, yyyy',
    time: 'h:mm a',
    datetime: 'MM/dd/yyyy h:mm:ss a',
  },
  'es-ES': {
    short: 'dd/MM/yyyy',
    medium: 'dd/MM/yyyy HH:mm',
    long: "dd 'de' MMMM 'de' yyyy",
    full: "EEEE, dd 'de' MMMM 'de' yyyy",
    time: 'HH:mm',
    datetime: 'dd/MM/yyyy HH:mm:ss',
  },
} as const;

// Number format configurations
export const NUMBER_FORMATS = {
  'pt-BR': {
    decimal: ',',
    thousands: '.',
    locale: 'pt-BR',
  },
  'en-US': {
    decimal: '.',
    thousands: ',',
    locale: 'en-US',
  },
  'es-ES': {
    decimal: ',',
    thousands: '.',
    locale: 'es-ES',
  },
} as const;

/**
 * Format a date according to the user's locale
 */
export function formatDate(
  date: Date | string | number,
  formatStr: keyof typeof DATE_FORMATS['pt-BR'] = 'short',
  language: LanguageCode = 'pt-BR'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = DATE_LOCALES[language];
  const pattern = DATE_FORMATS[language][formatStr];

  return format(dateObj, pattern, { locale });
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(
  date: Date | string | number,
  baseDate: Date = new Date(),
  language: LanguageCode = 'pt-BR'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = DATE_LOCALES[language];

  return formatDistance(dateObj, baseDate, { addSuffix: true, locale });
}

/**
 * Format a date relative to now (e.g., "today at 3:00 PM", "yesterday at 2:00 PM")
 */
export function formatRelativeToNow(
  date: Date | string | number,
  language: LanguageCode = 'pt-BR'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = DATE_LOCALES[language];

  return formatRelative(dateObj, new Date(), { locale });
}

/**
 * Format a currency value
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'BRL',
  language: LanguageCode = 'pt-BR'
): string {
  const currency = CURRENCIES[currencyCode];
  const numberFormat = NUMBER_FORMATS[language];

  try {
    return new Intl.NumberFormat(numberFormat.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const formatted = amount.toFixed(currency.decimals);
    return `${currency.symbol} ${formatted}`;
  }
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  decimals: number = 0,
  language: LanguageCode = 'pt-BR'
): string {
  const numberFormat = NUMBER_FORMATS[language];

  try {
    return new Intl.NumberFormat(numberFormat.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch (error) {
    return value.toFixed(decimals);
  }
}

/**
 * Format a percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  language: LanguageCode = 'pt-BR'
): string {
  const numberFormat = NUMBER_FORMATS[language];

  try {
    return new Intl.NumberFormat(numberFormat.locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch (error) {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Format a phone number (Brazil format)
 */
export function formatPhoneBR(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Mobile: (XX) XXXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return phone;
}

/**
 * Format a phone number (US format)
 */
export function formatPhoneUS(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    // (XXX) XXX-XXXX
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11) {
    // +X (XXX) XXX-XXXX
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
  }

  return phone;
}

/**
 * Format a phone number according to language
 */
export function formatPhone(phone: string, language: LanguageCode = 'pt-BR'): string {
  if (!phone) return '';

  switch (language) {
    case 'pt-BR':
      return formatPhoneBR(phone);
    case 'en-US':
      return formatPhoneUS(phone);
    case 'es-ES':
      return formatPhoneBR(phone); // Similar to Brazil
    default:
      return phone;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number, language: LanguageCode = 'pt-BR'): string {
  const sizes = {
    'pt-BR': ['Bytes', 'KB', 'MB', 'GB', 'TB'],
    'en-US': ['Bytes', 'KB', 'MB', 'GB', 'TB'],
    'es-ES': ['Bytes', 'KB', 'MB', 'GB', 'TB'],
  };

  if (bytes === 0) return `0 ${sizes[language][0]}`;

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${formatNumber(size, 2, language)} ${sizes[language][i]}`;
}

/**
 * Parse a date string according to locale format
 */
export function parseLocalDate(dateStr: string, language: LanguageCode = 'pt-BR'): Date | null {
  if (!dateStr) return null;

  try {
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Parse locale-specific format
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;

    let year: number, month: number, day: number;

    if (language === 'en-US') {
      // MM/DD/YYYY
      month = parseInt(parts[0], 10) - 1;
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY (pt-BR, es-ES)
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

/**
 * Get user's preferred language from localStorage or browser
 */
export function getUserLanguage(): LanguageCode {
  const stored = localStorage.getItem('i18nextLng');
  if (stored && (stored === 'pt-BR' || stored === 'en-US' || stored === 'es-ES')) {
    return stored as LanguageCode;
  }

  const browserLang = navigator.language;
  if (browserLang.startsWith('pt')) return 'pt-BR';
  if (browserLang.startsWith('es')) return 'es-ES';
  return 'en-US';
}

/**
 * Set user's preferred language
 */
export function setUserLanguage(language: LanguageCode): void {
  localStorage.setItem('i18nextLng', language);
}
