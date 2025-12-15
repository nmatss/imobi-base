export type TemplateCategory =
  | "leads"
  | "properties"
  | "visits"
  | "contracts"
  | "payments";

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "nome", label: "{{nome}}", description: "Nome do cliente" },
  { key: "email", label: "{{email}}", description: "E-mail do cliente" },
  { key: "telefone", label: "{{telefone}}", description: "Telefone do cliente" },
  { key: "imovel", label: "{{imovel}}", description: "Nome/Título do imóvel" },
  { key: "valor", label: "{{valor}}", description: "Valor do imóvel" },
  { key: "endereco", label: "{{endereco}}", description: "Endereço do imóvel" },
  { key: "data", label: "{{data}}", description: "Data" },
  { key: "hora", label: "{{hora}}", description: "Horário" },
  { key: "corretor", label: "{{corretor}}", description: "Nome do corretor" },
  { key: "empresa", label: "{{empresa}}", description: "Nome da empresa" },
  { key: "link", label: "{{link}}", description: "Link para página" },
];

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  leads: "Leads",
  properties: "Imóveis",
  visits: "Visitas",
  contracts: "Contratos",
  payments: "Pagamentos",
};

export const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  leads: "Templates para primeiro contato, follow-up e agendamento",
  properties: "Templates para divulgação de novos imóveis e matches",
  visits: "Templates para confirmação, lembrete e feedback de visitas",
  contracts: "Templates para documentação, assinatura e vencimento",
  payments: "Templates para lembretes, confirmações e avisos de atraso",
};

export const DEFAULT_TEMPLATES: Omit<WhatsAppTemplate, "id" | "createdAt">[] = [
  // LEADS
  {
    name: "Primeiro Contato",
    category: "leads",
    content: "Olá {{nome}}! 👋 Sou {{corretor}} da {{empresa}}. Vi que você demonstrou interesse em nossos imóveis. Posso ajudá-lo a encontrar o imóvel ideal?",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Follow-up Lead",
    category: "leads",
    content: "Oi {{nome}}! Tudo bem? Estou passando para saber se você ainda está procurando imóvel. Temos várias novidades que podem te interessar! 🏡",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Agendamento de Reunião",
    category: "leads",
    content: "Olá {{nome}}! Gostaria de agendar uma conversa para entender melhor suas necessidades. Você teria disponibilidade no dia {{data}} às {{hora}}?",
    isDefault: true,
    usageCount: 0,
  },

  // PROPERTIES
  {
    name: "Novo Imóvel",
    category: "properties",
    content: "Oi {{nome}}! 🏠 Temos um imóvel novo que acabou de entrar no nosso portfólio: {{imovel}} - {{endereco}}. Valor: {{valor}}. Gostaria de mais informações?",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Match de Preferência",
    category: "properties",
    content: "Oi {{nome}}! Temos um imóvel que combina com suas preferências: {{imovel}} - {{endereco}}. Valor: {{valor}}. Gostaria de agendar uma visita? 🔑",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Compartilhar Imóvel",
    category: "properties",
    content: "Olá {{nome}}! Segue o link do imóvel {{imovel}} que conversamos: {{link}}. Qualquer dúvida, estou à disposição!",
    isDefault: true,
    usageCount: 0,
  },

  // VISITS
  {
    name: "Confirmação de Visita",
    category: "visits",
    content: "Olá {{nome}}! ✅ Confirmando sua visita ao imóvel {{imovel}} no dia {{data}} às {{hora}}. Endereço: {{endereco}}. Nos vemos lá!",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Lembrete de Visita",
    category: "visits",
    content: "Oi {{nome}}! 🔔 Lembrando que amanhã às {{hora}} temos visita agendada no imóvel {{imovel}}. Confirma sua presença?",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Feedback Pós-Visita",
    category: "visits",
    content: "Oi {{nome}}! Espero que tenha gostado da visita ao {{imovel}} hoje. O que achou? Gostaria de fazer uma proposta? 😊",
    isDefault: true,
    usageCount: 0,
  },

  // CONTRACTS
  {
    name: "Solicitação de Documentos",
    category: "contracts",
    content: "Olá {{nome}}! Para dar continuidade ao processo do {{imovel}}, precisamos dos seguintes documentos: RG, CPF, Comprovante de Renda e Residência. Pode nos enviar por aqui? 📄",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Contrato Pronto",
    category: "contracts",
    content: "Oi {{nome}}! Seu contrato do imóvel {{imovel}} está pronto para assinatura. Você pode vir até nossa imobiliária no dia {{data}} às {{hora}}?",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Lembrete Vencimento Contrato",
    category: "contracts",
    content: "Olá {{nome}}! O contrato do imóvel {{imovel}} vence no dia {{data}}. Vamos precisar conversar sobre renovação. Podemos agendar?",
    isDefault: true,
    usageCount: 0,
  },

  // PAYMENTS
  {
    name: "Lembrete de Pagamento",
    category: "payments",
    content: "Oi {{nome}}, tudo bem? 💰 Passando para lembrar do vencimento do aluguel dia {{data}}. Valor: {{valor}}. Qualquer dúvida, me chama!",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Confirmação de Pagamento",
    category: "payments",
    content: "Olá {{nome}}! ✅ Confirmamos o recebimento do pagamento de {{valor}} referente ao imóvel {{imovel}}. Obrigado!",
    isDefault: true,
    usageCount: 0,
  },
  {
    name: "Aviso de Atraso",
    category: "payments",
    content: "Olá {{nome}}, notamos que o pagamento do aluguel com vencimento em {{data}} ainda não foi identificado. Valor: {{valor}}. Houve algum problema? Podemos ajudar? 🤝",
    isDefault: true,
    usageCount: 0,
  },
];

// Helper functions
export function highlightVariables(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, '<span class="text-primary font-medium">{{$1}}</span>');
}

export function insertVariable(text: string, cursorPosition: number, variable: string): { newText: string; newCursorPosition: number } {
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);
  const newText = before + variable + after;
  const newCursorPosition = cursorPosition + variable.length;

  return { newText, newCursorPosition };
}

export function getPreviewText(text: string, maxLength: number = 100): string {
  const plainText = text.replace(/\{\{(\w+)\}\}/g, '$1');
  if (plainText.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
}

export function getCharacterCount(text: string): number {
  return text.length;
}

export function isWhatsAppLimitExceeded(text: string): boolean {
  // WhatsApp has a practical limit of around 4096 characters per message
  return text.length > 4096;
}

// Storage functions (using localStorage for now)
const STORAGE_KEY = "whatsapp_templates";

export function loadTemplates(): WhatsAppTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Initialize with default templates
    const defaultTemplates = DEFAULT_TEMPLATES.map((template, index) => ({
      ...template,
      id: `template-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
    }));

    saveTemplates(defaultTemplates);
    return defaultTemplates;
  } catch (error) {
    console.error("Error loading templates:", error);
    return [];
  }
}

export function saveTemplates(templates: WhatsAppTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Error saving templates:", error);
  }
}

export function addTemplate(template: Omit<WhatsAppTemplate, "id" | "createdAt">): WhatsAppTemplate {
  const templates = loadTemplates();
  const newTemplate: WhatsAppTemplate = {
    ...template,
    id: `template-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveTemplates([...templates, newTemplate]);
  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<WhatsAppTemplate>): void {
  const templates = loadTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...updates };
    saveTemplates(templates);
  }
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates();
  saveTemplates(templates.filter(t => t.id !== id));
}

export function duplicateTemplate(id: string): WhatsAppTemplate | null {
  const templates = loadTemplates();
  const original = templates.find(t => t.id === id);
  if (!original) return null;

  const duplicate = addTemplate({
    name: `${original.name} (Cópia)`,
    category: original.category,
    content: original.content,
    isDefault: false,
    usageCount: 0,
  });

  return duplicate;
}

export function incrementUsageCount(id: string): void {
  const templates = loadTemplates();
  const template = templates.find(t => t.id === id);
  if (template) {
    updateTemplate(id, { usageCount: template.usageCount + 1 });
  }
}
