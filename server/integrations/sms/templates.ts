/**
 * SMS Templates for ImobiBase
 * All templates are designed to be concise and fit within 160 characters when possible
 */

export interface SMSTemplateContext {
  [key: string]: string | number | boolean;
}

export interface SMSTemplate {
  name: string;
  description: string;
  template: (context: SMSTemplateContext) => string;
  requiredFields: string[];
}

/**
 * Generate a short URL placeholder (to be replaced with actual short URL service)
 */
function shortUrl(url: string): string {
  // In production, integrate with bit.ly, TinyURL, or custom URL shortener
  return url.length > 30 ? 'imb.li/' + url.slice(-8) : url;
}

export const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  // 2FA and Security
  verification_code: {
    name: 'Verification Code',
    description: '2FA/Email verification code',
    requiredFields: ['code', 'expiryMinutes'],
    template: (ctx) =>
      `ImobiBase: Seu codigo de verificacao e ${ctx.code}. Valido por ${ctx.expiryMinutes} minutos. Nao compartilhe este codigo.`,
  },

  password_reset: {
    name: 'Password Reset',
    description: 'Password reset verification code',
    requiredFields: ['code', 'expiryMinutes'],
    template: (ctx) =>
      `ImobiBase: Codigo para redefinir sua senha: ${ctx.code}. Valido por ${ctx.expiryMinutes} minutos. Se voce nao solicitou, ignore esta mensagem.`,
  },

  // Welcome and Onboarding
  welcome_message: {
    name: 'Welcome Message',
    description: 'Welcome new user to platform',
    requiredFields: ['name', 'loginUrl'],
    template: (ctx) =>
      `Bem-vindo ao ImobiBase, ${ctx.name}! Gerencie seus imoveis com facilidade. Acesse: ${shortUrl(String(ctx.loginUrl))}`,
  },

  // Appointments and Visits
  visit_reminder: {
    name: 'Visit Reminder',
    description: 'Reminder for scheduled property visit',
    requiredFields: ['propertyAddress', 'dateTime', 'agentName'],
    template: (ctx) =>
      `Lembrete: Visita ao imovel ${ctx.propertyAddress} amanha as ${ctx.dateTime} com ${ctx.agentName}. Em caso de imprevisto, entre em contato.`,
  },

  visit_confirmation: {
    name: 'Visit Confirmation',
    description: 'Confirmation of scheduled visit',
    requiredFields: ['propertyAddress', 'dateTime'],
    template: (ctx) =>
      `Visita confirmada! ${ctx.propertyAddress} em ${ctx.dateTime}. Ate la!`,
  },

  visit_cancelled: {
    name: 'Visit Cancelled',
    description: 'Notification of cancelled visit',
    requiredFields: ['propertyAddress', 'dateTime'],
    template: (ctx) =>
      `Sua visita ao imovel ${ctx.propertyAddress} agendada para ${ctx.dateTime} foi cancelada. Entre em contato para reagendar.`,
  },

  // Payments and Financial
  payment_reminder: {
    name: 'Payment Reminder',
    description: 'Reminder for upcoming payment',
    requiredFields: ['amount', 'dueDate', 'description'],
    template: (ctx) =>
      `ImobiBase: Lembrete de pagamento de R$ ${ctx.amount} vence em ${ctx.dueDate}. Ref: ${ctx.description}. Evite multas!`,
  },

  payment_overdue: {
    name: 'Payment Overdue',
    description: 'Notification of overdue payment',
    requiredFields: ['amount', 'daysOverdue', 'description'],
    template: (ctx) =>
      `ATENCAO: Pagamento de R$ ${ctx.amount} esta ${ctx.daysOverdue} dias em atraso. Ref: ${ctx.description}. Regularize para evitar juros.`,
  },

  payment_received: {
    name: 'Payment Received',
    description: 'Confirmation of payment received',
    requiredFields: ['amount', 'date', 'receiptUrl'],
    template: (ctx) =>
      `Pagamento de R$ ${ctx.amount} recebido em ${ctx.date}. Obrigado! Recibo: ${shortUrl(String(ctx.receiptUrl))}`,
  },

  payment_failed: {
    name: 'Payment Failed',
    description: 'Notification of failed payment attempt',
    requiredFields: ['amount', 'reason'],
    template: (ctx) =>
      `Falha no processamento do pagamento de R$ ${ctx.amount}. Motivo: ${ctx.reason}. Por favor, verifique seus dados de pagamento.`,
  },

  // Contracts and Documents
  contract_ready: {
    name: 'Contract Ready',
    description: 'Contract ready for signature',
    requiredFields: ['contractType', 'signUrl'],
    template: (ctx) =>
      `Seu ${ctx.contractType} esta pronto para assinatura digital. Acesse: ${shortUrl(String(ctx.signUrl))}`,
  },

  contract_signed: {
    name: 'Contract Signed',
    description: 'Contract successfully signed',
    requiredFields: ['contractType', 'parties'],
    template: (ctx) =>
      `${ctx.contractType} assinado por todas as partes (${ctx.parties}). Uma copia foi enviada ao seu email.`,
  },

  document_uploaded: {
    name: 'Document Uploaded',
    description: 'Notification of new document upload',
    requiredFields: ['documentName', 'uploaderName'],
    template: (ctx) =>
      `Novo documento "${ctx.documentName}" enviado por ${ctx.uploaderName}. Acesse seu painel para visualizar.`,
  },

  // Property Alerts
  property_alert: {
    name: 'Property Alert',
    description: 'New property matching user preferences',
    requiredFields: ['propertyType', 'location', 'price', 'detailsUrl'],
    template: (ctx) =>
      `Novo imovel! ${ctx.propertyType} em ${ctx.location} por R$ ${ctx.price}. Veja: ${shortUrl(String(ctx.detailsUrl))}`,
  },

  property_price_change: {
    name: 'Property Price Change',
    description: 'Notification of property price change',
    requiredFields: ['propertyAddress', 'oldPrice', 'newPrice'],
    template: (ctx) =>
      `Mudanca de preco: ${ctx.propertyAddress} de R$ ${ctx.oldPrice} para R$ ${ctx.newPrice}. Aproveite!`,
  },

  property_status_change: {
    name: 'Property Status Change',
    description: 'Notification of property status change',
    requiredFields: ['propertyAddress', 'newStatus'],
    template: (ctx) =>
      `Atualizacao: ${ctx.propertyAddress} agora esta ${ctx.newStatus}.`,
  },

  // Leads and Sales
  lead_assigned: {
    name: 'Lead Assigned',
    description: 'Notification of new lead assignment',
    requiredFields: ['leadName', 'leadPhone', 'propertyInterest'],
    template: (ctx) =>
      `Novo lead atribuido: ${ctx.leadName} (${ctx.leadPhone}) interessado em ${ctx.propertyInterest}.`,
  },

  lead_followup: {
    name: 'Lead Follow-up',
    description: 'Follow-up reminder for lead',
    requiredFields: ['leadName', 'lastContact'],
    template: (ctx) =>
      `Lembrete: Fazer follow-up com ${ctx.leadName}. Ultimo contato: ${ctx.lastContact}.`,
  },

  // Account and System
  low_balance: {
    name: 'Low Balance',
    description: 'Low account balance warning',
    requiredFields: ['balance', 'rechargeUrl'],
    template: (ctx) =>
      `Saldo baixo: R$ ${ctx.balance}. Recarregue sua conta para continuar usando todos os recursos: ${shortUrl(String(ctx.rechargeUrl))}`,
  },

  subscription_expiring: {
    name: 'Subscription Expiring',
    description: 'Subscription expiring soon',
    requiredFields: ['daysRemaining', 'renewUrl'],
    template: (ctx) =>
      `Sua assinatura expira em ${ctx.daysRemaining} dias. Renove agora: ${shortUrl(String(ctx.renewUrl))}`,
  },

  subscription_expired: {
    name: 'Subscription Expired',
    description: 'Subscription has expired',
    requiredFields: ['renewUrl'],
    template: (ctx) =>
      `Sua assinatura expirou. Renove para continuar acessando: ${shortUrl(String(ctx.renewUrl))}`,
  },

  // Urgent Notifications
  urgent_notification: {
    name: 'Urgent Notification',
    description: 'Generic urgent notification',
    requiredFields: ['message', 'actionUrl'],
    template: (ctx) =>
      `URGENTE: ${ctx.message} Acesse: ${shortUrl(String(ctx.actionUrl))}`,
  },

  system_maintenance: {
    name: 'System Maintenance',
    description: 'Scheduled maintenance notification',
    requiredFields: ['startTime', 'duration'],
    template: (ctx) =>
      `Manutencao programada: Sistema indisponivel ${ctx.startTime} por ${ctx.duration}. Pedimos desculpas pelo inconveniente.`,
  },

  // Commission and Finance
  commission_paid: {
    name: 'Commission Paid',
    description: 'Commission payment notification',
    requiredFields: ['amount', 'propertyAddress', 'date'],
    template: (ctx) =>
      `Comissao de R$ ${ctx.amount} pela venda/locacao de ${ctx.propertyAddress} foi paga em ${ctx.date}.`,
  },

  // Multi-channel
  whatsapp_alternative: {
    name: 'WhatsApp Alternative',
    description: 'SMS when WhatsApp is unavailable',
    requiredFields: ['message'],
    template: (ctx) =>
      `ImobiBase: ${ctx.message}`,
  },
};

/**
 * Render an SMS template with context
 */
export function renderSMSTemplate(
  templateName: string,
  context: SMSTemplateContext
): string {
  const template = SMS_TEMPLATES[templateName];

  if (!template) {
    throw new Error(`SMS template '${templateName}' not found`);
  }

  // Validate required fields
  const missingFields = template.requiredFields.filter(
    field => !(field in context)
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields for SMS template '${templateName}': ${missingFields.join(', ')}`
    );
  }

  const message = template.template(context);

  // Log warning if message is too long (over 160 chars is 2+ SMS segments)
  if (message.length > 160) {
    console.warn(
      `SMS template '${templateName}' rendered to ${message.length} characters (${Math.ceil(message.length / 160)} segments). Consider shortening.`
    );
  }

  return message;
}

/**
 * Get all available template names
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(SMS_TEMPLATES);
}

/**
 * Get template metadata
 */
export function getTemplateInfo(templateName: string) {
  const template = SMS_TEMPLATES[templateName];

  if (!template) {
    throw new Error(`SMS template '${templateName}' not found`);
  }

  return {
    name: template.name,
    description: template.description,
    requiredFields: template.requiredFields,
  };
}

/**
 * Calculate SMS cost based on message length
 * Standard rates: 1 segment = 160 chars, 2+ segments = 153 chars each
 */
export function calculateSMSSegments(message: string): number {
  const length = message.length;

  if (length === 0) return 0;
  if (length <= 160) return 1;

  // Concatenated messages use 7 chars for UDH header, leaving 153 per segment
  return Math.ceil(length / 153);
}

/**
 * Estimate SMS cost (customize based on your Twilio pricing)
 */
export function estimateSMSCost(
  message: string,
  costPerSegment: number = 0.0075 // Default US rate
): number {
  const segments = calculateSMSSegments(message);
  return segments * costPerSegment;
}
