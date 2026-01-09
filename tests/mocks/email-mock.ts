import { vi } from 'vitest';

interface EmailMessage {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

// Email mock storage
const sentEmails: EmailMessage[] = [];

// Mock SendGrid
export const createMockSendGrid = () => ({
  send: vi.fn(async (message: EmailMessage) => {
    sentEmails.push(message);
    return [
      {
        statusCode: 202,
        body: '',
        headers: {},
      },
    ];
  }),
  sendMultiple: vi.fn(async (messages: EmailMessage[]) => {
    sentEmails.push(...messages);
    return messages.map(() => ({
      statusCode: 202,
      body: '',
      headers: {},
    }));
  }),
});

// Mock Resend
export const createMockResend = () => ({
  emails: {
    send: vi.fn(async (message: EmailMessage) => {
      sentEmails.push(message);
      return {
        id: `email_${Date.now()}`,
        from: message.from,
        to: message.to,
        created_at: new Date().toISOString(),
      };
    }),
  },
});

// Helper functions
export const getSentEmails = () => sentEmails;

export const getLastEmail = () => sentEmails[sentEmails.length - 1];

export const clearSentEmails = () => {
  sentEmails.length = 0;
};

export const findEmailByRecipient = (email: string) => {
  return sentEmails.find(msg => {
    if (Array.isArray(msg.to)) {
      return msg.to.includes(email);
    }
    return msg.to === email;
  });
};

export const findEmailBySubject = (subject: string) => {
  return sentEmails.find(msg => msg.subject.includes(subject));
};

// Email template mock
export const mockEmailTemplate = (templateName: string, data: Record<string, any>) => {
  const templates: Record<string, (data: any) => string> = {
    'welcome': (data) => `Welcome ${data.name}! Your account has been created.`,
    'password-reset': (data) => `Reset your password using this link: ${data.resetLink}`,
    'invoice': (data) => `Invoice #${data.invoiceNumber} for $${data.amount}`,
    'property-notification': (data) => `New property: ${data.propertyTitle}`,
    'lead-assignment': (data) => `You have been assigned lead: ${data.leadName}`,
  };

  const template = templates[templateName];
  return template ? template(data) : `Template ${templateName} with data ${JSON.stringify(data)}`;
};
