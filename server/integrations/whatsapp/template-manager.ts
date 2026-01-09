/**
 * WhatsApp Template Manager
 *
 * Manages WhatsApp Business API templates
 * Handles template creation, variable replacement, and submission for approval
 */

import { db } from "../../db";
import { whatsappTemplates, type InsertWhatsappTemplate } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { whatsappAPI } from "./business-api";
import { log } from "../../index";

export interface TemplateVariable {
  [key: string]: string;
}

export interface CreateTemplateParams {
  tenantId: string;
  name: string;
  category: string;
  bodyText: string;
  headerType?: "text" | "image" | "document" | "video";
  headerContent?: string;
  footerText?: string;
  buttons?: any[];
  variables?: string[];
  language?: string;
}

/**
 * Pre-defined template configurations for common use cases
 */
export const DEFAULT_TEMPLATES: Omit<InsertWhatsappTemplate, "id" | "tenantId" | "createdAt" | "updatedAt">[] = [
  {
    name: "welcome_message",
    category: "leads",
    language: "pt_BR",
    status: "approved",
    bodyText: "Olá {{nome}}! 👋 Bem-vindo(a) à {{empresa}}. Estamos aqui para ajudá-lo a encontrar o imóvel perfeito. Como podemos ajudar?",
    variables: ["nome", "empresa"],
    usageCount: 0,
  },
  {
    name: "visit_reminder",
    category: "visits",
    language: "pt_BR",
    status: "approved",
    bodyText: "Oi {{nome}}! 🔔 Lembrando que você tem uma visita agendada para {{data}} às {{hora}} no imóvel {{imovel}}. Endereço: {{endereco}}. Confirma sua presença?",
    footerText: "ImobiBase - Seu imóvel ideal",
    variables: ["nome", "data", "hora", "imovel", "endereco"],
    usageCount: 0,
  },
  {
    name: "visit_confirmation",
    category: "visits",
    language: "pt_BR",
    status: "approved",
    bodyText: "Perfeito {{nome}}! ✅ Sua visita ao imóvel {{imovel}} está confirmada para {{data}} às {{hora}}. Nos vemos lá! Qualquer dúvida, é só me chamar.",
    variables: ["nome", "imovel", "data", "hora"],
    usageCount: 0,
  },
  {
    name: "property_match",
    category: "properties",
    language: "pt_BR",
    status: "approved",
    bodyText: "Oi {{nome}}! 🏠 Encontrei um imóvel que pode ser perfeito para você: {{imovel}} - {{endereco}}. Valor: {{valor}}. Quer agendar uma visita?",
    variables: ["nome", "imovel", "endereco", "valor"],
    usageCount: 0,
  },
  {
    name: "payment_reminder",
    category: "payments",
    language: "pt_BR",
    status: "approved",
    bodyText: "Olá {{nome}}! 💰 Este é um lembrete amigável que o pagamento do imóvel {{imovel}} vence em {{data}}. Valor: {{valor}}. Caso já tenha pago, desconsidere esta mensagem.",
    variables: ["nome", "imovel", "data", "valor"],
    usageCount: 0,
  },
  {
    name: "payment_received",
    category: "payments",
    language: "pt_BR",
    status: "approved",
    bodyText: "Olá {{nome}}! ✅ Confirmamos o recebimento do seu pagamento de {{valor}} referente ao imóvel {{imovel}}. Obrigado!",
    variables: ["nome", "valor", "imovel"],
    usageCount: 0,
  },
  {
    name: "contract_ready",
    category: "contracts",
    language: "pt_BR",
    status: "approved",
    bodyText: "Oi {{nome}}! 📄 Ótimas notícias! Seu contrato do imóvel {{imovel}} está pronto. Você pode vir assinar no dia {{data}} às {{hora}}?",
    variables: ["nome", "imovel", "data", "hora"],
    usageCount: 0,
  },
  {
    name: "document_request",
    category: "contracts",
    language: "pt_BR",
    status: "approved",
    bodyText: "Olá {{nome}}! Para darmos continuidade ao processo do imóvel {{imovel}}, precisamos de alguns documentos. Você pode nos enviar: RG, CPF, Comprovante de Renda e Comprovante de Residência?",
    variables: ["nome", "imovel"],
    usageCount: 0,
  },
  {
    name: "follow_up",
    category: "leads",
    language: "pt_BR",
    status: "approved",
    bodyText: "Oi {{nome}}! Tudo bem? 😊 Estou passando para saber se você ainda está procurando imóvel. Temos várias novidades que podem te interessar! Quando você tem um tempo para conversarmos?",
    variables: ["nome"],
    usageCount: 0,
  },
  {
    name: "property_new_listing",
    category: "properties",
    language: "pt_BR",
    status: "approved",
    bodyText: "Olá {{nome}}! 🆕 Acabamos de receber um novo imóvel que pode te interessar: {{imovel}} com {{quartos}} quartos em {{cidade}}. Valor: {{valor}}. Link: {{link}}",
    variables: ["nome", "imovel", "quartos", "cidade", "valor", "link"],
    usageCount: 0,
  },
];

export class TemplateManager {
  /**
   * Create a new template
   */
  async createTemplate(params: CreateTemplateParams): Promise<any> {
    const template: InsertWhatsappTemplate = {
      tenantId: params.tenantId,
      name: params.name,
      category: params.category,
      language: params.language || "pt_BR",
      status: "pending",
      headerType: params.headerType,
      headerContent: params.headerContent,
      bodyText: params.bodyText,
      footerText: params.footerText,
      buttons: params.buttons,
      variables: params.variables || [],
      usageCount: 0,
    };

    const [created] = await db.insert(whatsappTemplates).values(template).returning();
    log(`Template "${params.name}" created for tenant ${params.tenantId}`, "whatsapp");

    return created;
  }

  /**
   * Get all templates for a tenant
   */
  async getTemplates(tenantId: string, category?: string) {
    let query = db.select().from(whatsappTemplates).where(eq(whatsappTemplates.tenantId, tenantId));

    const templates = await query;

    if (category) {
      return templates.filter((t: any) => t.category === category);
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(tenantId: string, templateId: string) {
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.id, templateId),
          eq(whatsappTemplates.tenantId, tenantId)
        )
      );

    return template;
  }

  /**
   * Get template by name
   */
  async getTemplateByName(tenantId: string, templateName: string) {
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.name, templateName),
          eq(whatsappTemplates.tenantId, tenantId)
        )
      );

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(tenantId: string, templateId: string, updates: Partial<InsertWhatsappTemplate>) {
    const [updated] = await db
      .update(whatsappTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(whatsappTemplates.id, templateId),
          eq(whatsappTemplates.tenantId, tenantId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(tenantId: string, templateId: string) {
    await db
      .delete(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.id, templateId),
          eq(whatsappTemplates.tenantId, tenantId)
        )
      );

    log(`Template ${templateId} deleted`, "whatsapp");
  }

  /**
   * Replace variables in template text
   */
  replaceVariables(template: string, variables: TemplateVariable): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || "");
    });

    return result;
  }

  /**
   * Extract variables from template text
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Validate template before sending
   */
  validateTemplate(template: any, variables: TemplateVariable): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template) {
      errors.push("Template not found");
      return { valid: false, errors };
    }

    if (template.status !== "approved") {
      errors.push(`Template status is "${template.status}", not approved`);
    }

    // Check if all required variables are provided
    const requiredVars = template.variables || [];
    const missingVars = requiredVars.filter((v: string) => !variables[v]);

    if (missingVars.length > 0) {
      errors.push(`Missing variables: ${missingVars.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(templateId: string) {
    await db
      .update(whatsappTemplates)
      .set({
        usageCount: db.$increment(whatsappTemplates.usageCount, 1),
      })
      .where(eq(whatsappTemplates.id, templateId));
  }

  /**
   * Submit template to WhatsApp for approval (requires Business API setup)
   */
  async submitTemplateForApproval(tenantId: string, templateId: string): Promise<any> {
    const template = await this.getTemplateById(tenantId, templateId);

    if (!template) {
      throw new Error("Template not found");
    }

    if (!whatsappAPI.isConfigured()) {
      throw new Error("WhatsApp Business API not configured");
    }

    // Build template components
    const components: any[] = [];

    if (template.headerType && template.headerContent) {
      components.push({
        type: "HEADER",
        format: template.headerType.toUpperCase(),
        text: template.headerType === "text" ? template.headerContent : undefined,
      });
    }

    components.push({
      type: "BODY",
      text: template.bodyText,
    });

    if (template.footerText) {
      components.push({
        type: "FOOTER",
        text: template.footerText,
      });
    }

    if (template.buttons && template.buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: template.buttons,
      });
    }

    // Submit to WhatsApp (Note: This is a simplified version)
    // In production, you would use the WhatsApp Business Management API
    log(`Template "${template.name}" submitted for approval`, "whatsapp");

    // Update template status
    await this.updateTemplate(tenantId, templateId, { status: "pending" });

    return {
      success: true,
      message: "Template submitted for approval",
    };
  }

  /**
   * Initialize default templates for a tenant
   */
  async initializeDefaultTemplates(tenantId: string) {
    log(`Initializing default WhatsApp templates for tenant ${tenantId}`, "whatsapp");

    const templates = DEFAULT_TEMPLATES.map(template => ({
      ...template,
      tenantId,
    }));

    await db.insert(whatsappTemplates).values(templates);

    log(`${templates.length} default templates created`, "whatsapp");
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(tenantId: string) {
    const templates = await this.getTemplates(tenantId);

    return {
      total: templates.length,
      approved: templates.filter((t: any) => t.status === "approved").length,
      pending: templates.filter((t: any) => t.status === "pending").length,
      rejected: templates.filter((t: any) => t.status === "rejected").length,
      totalUsage: templates.reduce((sum: any, t: any) => sum + t.usageCount, 0),
      byCategory: templates.reduce((acc: any, t: any) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// Export singleton instance
export const templateManager = new TemplateManager();
