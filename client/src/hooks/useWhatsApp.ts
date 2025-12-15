import { useCallback } from 'react';

interface UseWhatsAppOptions {
  phone: string;
  template?: string;
  variables?: Record<string, string>;
}

/**
 * Hook for WhatsApp integration
 * Handles phone formatting and message sending via wa.me
 */
export const useWhatsApp = () => {
  /**
   * Format phone number for WhatsApp
   * Handles Brazilian phone numbers in various formats
   * @param phone - Phone number in any format
   * @returns Formatted phone number (5511999999999)
   */
  const formatPhone = useCallback((phone: string): string => {
    if (!phone) return '';

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If already has country code, return as is
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      return cleaned;
    }

    // If starts with 0, remove it (old format)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Add country code if not present
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }, []);

  /**
   * Replace template variables in message
   * @param template - Message template with {variable} placeholders
   * @param variables - Object with variable values
   * @returns Message with replaced variables
   */
  const replaceVariables = useCallback((template: string, variables: Record<string, string>): string => {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }, []);

  /**
   * Send WhatsApp message
   * Opens wa.me link in new tab
   */
  const sendMessage = useCallback((options: UseWhatsAppOptions) => {
    const { phone, template = '', variables = {} } = options;

    if (!phone) {
      console.error('WhatsApp: Phone number is required');
      return;
    }

    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      console.error('WhatsApp: Invalid phone number');
      return;
    }

    const message = template ? replaceVariables(template, variables) : '';
    const encodedMessage = encodeURIComponent(message);

    const url = message
      ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
      : `https://wa.me/${formattedPhone}`;

    window.open(url, '_blank');
  }, [formatPhone, replaceVariables]);

  /**
   * Generate wa.me URL without opening
   * Useful for copying or sharing
   */
  const generateUrl = useCallback((options: UseWhatsAppOptions): string => {
    const { phone, template = '', variables = {} } = options;

    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) return '';

    const message = template ? replaceVariables(template, variables) : '';
    const encodedMessage = encodeURIComponent(message);

    return message
      ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
      : `https://wa.me/${formattedPhone}`;
  }, [formatPhone, replaceVariables]);

  return {
    sendMessage,
    formatPhone,
    generateUrl,
  };
};
