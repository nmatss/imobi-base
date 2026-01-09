/**
 * ClickSign Template Manager
 * Manages document templates with signature fields and fillable content
 */

import { getClickSignClient } from './clicksign-client';

export interface TemplateField {
  name: string;
  type: 'text' | 'signature' | 'date' | 'checkbox';
  required: boolean;
  x: number;
  y: number;
  page: number;
  width?: number;
  height?: number;
  defaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'rental' | 'sale' | 'service' | 'custom';
  templateUrl: string; // Base PDF template URL
  fields: TemplateField[];
  variables: Record<string, string>; // Placeholders to replace
  signaturePositions: Record<string, { x: number; y: number; page: number }>;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateManager {
  private client = getClickSignClient();
  private templates: Map<string, DocumentTemplate> = new Map();

  /**
   * Register a new template
   */
  registerTemplate(template: Omit<DocumentTemplate, 'createdAt' | 'updatedAt'>): void {
    const fullTemplate: DocumentTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, fullTemplate);
    console.log('Registered template:', template.id);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): DocumentTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Create standard rental contract template
   */
  createRentalContractTemplate(): DocumentTemplate {
    const template: Omit<DocumentTemplate, 'createdAt' | 'updatedAt'> = {
      id: 'rental-contract-standard',
      name: 'Contrato de Locação Padrão',
      description: 'Modelo padrão de contrato de locação residencial',
      category: 'rental',
      templateUrl: '/templates/rental-contract-template.pdf',
      fields: [
        // Landlord fields
        {
          name: 'landlord_name',
          type: 'text',
          required: true,
          x: 100,
          y: 200,
          page: 1,
          width: 300,
        },
        {
          name: 'landlord_cpf',
          type: 'text',
          required: true,
          x: 100,
          y: 230,
          page: 1,
          width: 200,
        },
        {
          name: 'landlord_address',
          type: 'text',
          required: true,
          x: 100,
          y: 260,
          page: 1,
          width: 400,
        },
        // Tenant fields
        {
          name: 'tenant_name',
          type: 'text',
          required: true,
          x: 100,
          y: 320,
          page: 1,
          width: 300,
        },
        {
          name: 'tenant_cpf',
          type: 'text',
          required: true,
          x: 100,
          y: 350,
          page: 1,
          width: 200,
        },
        {
          name: 'tenant_address',
          type: 'text',
          required: true,
          x: 100,
          y: 380,
          page: 1,
          width: 400,
        },
        // Property fields
        {
          name: 'property_address',
          type: 'text',
          required: true,
          x: 100,
          y: 440,
          page: 1,
          width: 400,
        },
        {
          name: 'rental_value',
          type: 'text',
          required: true,
          x: 100,
          y: 470,
          page: 1,
          width: 150,
        },
        {
          name: 'contract_duration',
          type: 'text',
          required: true,
          x: 100,
          y: 500,
          page: 1,
          width: 100,
        },
        {
          name: 'start_date',
          type: 'date',
          required: true,
          x: 100,
          y: 530,
          page: 1,
          width: 150,
        },
        {
          name: 'end_date',
          type: 'date',
          required: true,
          x: 280,
          y: 530,
          page: 1,
          width: 150,
        },
      ],
      variables: {
        '{{LANDLORD_NAME}}': 'landlord_name',
        '{{LANDLORD_CPF}}': 'landlord_cpf',
        '{{LANDLORD_ADDRESS}}': 'landlord_address',
        '{{TENANT_NAME}}': 'tenant_name',
        '{{TENANT_CPF}}': 'tenant_cpf',
        '{{TENANT_ADDRESS}}': 'tenant_address',
        '{{PROPERTY_ADDRESS}}': 'property_address',
        '{{RENTAL_VALUE}}': 'rental_value',
        '{{CONTRACT_DURATION}}': 'contract_duration',
        '{{START_DATE}}': 'start_date',
        '{{END_DATE}}': 'end_date',
        '{{TODAY}}': new Date().toLocaleDateString('pt-BR'),
      },
      signaturePositions: {
        landlord: { x: 100, y: 700, page: 3 },
        tenant: { x: 350, y: 700, page: 3 },
        witness1: { x: 100, y: 750, page: 3 },
        witness2: { x: 350, y: 750, page: 3 },
      },
    };

    this.registerTemplate(template);
    return this.getTemplate(template.id)!;
  }

  /**
   * Create standard sale contract template
   */
  createSaleContractTemplate(): DocumentTemplate {
    const template: Omit<DocumentTemplate, 'createdAt' | 'updatedAt'> = {
      id: 'sale-contract-standard',
      name: 'Contrato de Compra e Venda Padrão',
      description: 'Modelo padrão de contrato de compra e venda de imóvel',
      category: 'sale',
      templateUrl: '/templates/sale-contract-template.pdf',
      fields: [
        {
          name: 'seller_name',
          type: 'text',
          required: true,
          x: 100,
          y: 200,
          page: 1,
          width: 300,
        },
        {
          name: 'buyer_name',
          type: 'text',
          required: true,
          x: 100,
          y: 320,
          page: 1,
          width: 300,
        },
        {
          name: 'property_address',
          type: 'text',
          required: true,
          x: 100,
          y: 440,
          page: 1,
          width: 400,
        },
        {
          name: 'sale_price',
          type: 'text',
          required: true,
          x: 100,
          y: 470,
          page: 1,
          width: 200,
        },
        {
          name: 'payment_method',
          type: 'text',
          required: true,
          x: 100,
          y: 500,
          page: 1,
          width: 300,
        },
      ],
      variables: {
        '{{SELLER_NAME}}': 'seller_name',
        '{{BUYER_NAME}}': 'buyer_name',
        '{{PROPERTY_ADDRESS}}': 'property_address',
        '{{SALE_PRICE}}': 'sale_price',
        '{{PAYMENT_METHOD}}': 'payment_method',
        '{{TODAY}}': new Date().toLocaleDateString('pt-BR'),
      },
      signaturePositions: {
        seller: { x: 100, y: 700, page: 2 },
        buyer: { x: 350, y: 700, page: 2 },
        realtor: { x: 225, y: 750, page: 2 },
      },
    };

    this.registerTemplate(template);
    return this.getTemplate(template.id)!;
  }

  /**
   * Create service contract template
   */
  createServiceContractTemplate(): DocumentTemplate {
    const template: Omit<DocumentTemplate, 'createdAt' | 'updatedAt'> = {
      id: 'service-contract-standard',
      name: 'Contrato de Prestação de Serviços',
      description: 'Modelo de contrato para serviços imobiliários',
      category: 'service',
      templateUrl: '/templates/service-contract-template.pdf',
      fields: [
        {
          name: 'contractor_name',
          type: 'text',
          required: true,
          x: 100,
          y: 200,
          page: 1,
          width: 300,
        },
        {
          name: 'client_name',
          type: 'text',
          required: true,
          x: 100,
          y: 280,
          page: 1,
          width: 300,
        },
        {
          name: 'service_description',
          type: 'text',
          required: true,
          x: 100,
          y: 360,
          page: 1,
          width: 400,
          height: 100,
        },
        {
          name: 'service_value',
          type: 'text',
          required: true,
          x: 100,
          y: 480,
          page: 1,
          width: 150,
        },
      ],
      variables: {
        '{{CONTRACTOR_NAME}}': 'contractor_name',
        '{{CLIENT_NAME}}': 'client_name',
        '{{SERVICE_DESCRIPTION}}': 'service_description',
        '{{SERVICE_VALUE}}': 'service_value',
        '{{TODAY}}': new Date().toLocaleDateString('pt-BR'),
      },
      signaturePositions: {
        contractor: { x: 100, y: 650, page: 1 },
        client: { x: 350, y: 650, page: 1 },
      },
    };

    this.registerTemplate(template);
    return this.getTemplate(template.id)!;
  }

  /**
   * Initialize default templates
   */
  initializeDefaultTemplates(): void {
    this.createRentalContractTemplate();
    this.createSaleContractTemplate();
    this.createServiceContractTemplate();
    console.log('Default templates initialized');
  }

  /**
   * Replace variables in template content
   */
  fillTemplate(templateContent: string, values: Record<string, string>): string {
    let filledContent = templateContent;

    for (const [placeholder, value] of Object.entries(values)) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      filledContent = filledContent.replace(regex, value);
    }

    return filledContent;
  }

  /**
   * Validate template data
   */
  validateTemplateData(
    templateId: string,
    data: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];
    const requiredFields = template.fields.filter(f => f.required);

    for (const field of requiredFields) {
      if (!data[field.name] || data[field.name] === '') {
        errors.push(`Campo obrigatório não preenchido: ${field.name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const templateManager = new TemplateManager();

// Initialize default templates on module load
templateManager.initializeDefaultTemplates();
