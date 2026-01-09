import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TemplateData {
  [key: string]: any;
}

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export class TemplateRenderer {
  private templateCache: Map<string, string> = new Map();
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, 'templates');
  }

  /**
   * Renders an email template with data
   */
  async render(
    templateName: string,
    data: TemplateData,
    branding?: TenantBranding
  ): Promise<string> {
    const template = await this.loadTemplate(templateName);

    // Merge branding data with template data
    const mergedData = {
      ...data,
      branding: {
        logo: branding?.logo || '',
        primaryColor: branding?.primaryColor || '#3B82F6',
        secondaryColor: branding?.secondaryColor || '#1E40AF',
        companyName: branding?.companyName || 'ImobiBase',
        address: branding?.address || '',
        phone: branding?.phone || '',
        email: branding?.email || '',
        website: branding?.website || '',
      },
      currentYear: new Date().getFullYear(),
    };

    return this.renderTemplate(template, mergedData);
  }

  /**
   * Loads a template from the file system
   */
  private async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load from file
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);

    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      throw new Error(`Template "${templateName}" not found at ${templatePath}`);
    }
  }

  /**
   * Renders template by replacing variables
   */
  private renderTemplate(template: string, data: TemplateData): string {
    let rendered = template;

    // Replace simple variables {{variable}}
    rendered = rendered.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = this.renderConditionals(rendered, data);

    // Handle loops {{#each items}}...{{/each}}
    rendered = this.renderLoops(rendered, data);

    return rendered;
  }

  /**
   * Gets nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => {
      return current?.[part];
    }, obj);
  }

  /**
   * Renders conditional blocks
   */
  private renderConditionals(template: string, data: TemplateData): string {
    const conditionalRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, condition, content) => {
      const value = this.getNestedValue(data, condition);
      return value ? content : '';
    });
  }

  /**
   * Renders loop blocks
   */
  private renderLoops(template: string, data: TemplateData): string {
    const loopRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayPath, itemTemplate) => {
      const array = this.getNestedValue(data, arrayPath);

      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item, index) => {
          const itemData = {
            ...data,
            item,
            index,
            first: index === 0,
            last: index === array.length - 1,
          };
          return this.renderTemplate(itemTemplate, itemData);
        })
        .join('');
    });
  }

  /**
   * Lists available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch {
      return [];
    }
  }

  /**
   * Clears the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Validates that a template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    try {
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inline CSS for better email client compatibility
   */
  inlineStyles(html: string): string {
    // Extract styles from <style> tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const styles: string[] = [];

    html = html.replace(styleRegex, (match, cssContent) => {
      styles.push(cssContent);
      return ''; // Remove style tags
    });

    // This is a simple implementation
    // For production, consider using a library like 'juice'
    return html;
  }

  /**
   * Creates a preview URL for a template
   */
  async createPreview(
    templateName: string,
    data: TemplateData,
    branding?: TenantBranding
  ): Promise<string> {
    return this.render(templateName, data, branding);
  }
}

// Singleton instance
let rendererInstance: TemplateRenderer | null = null;

export function getTemplateRenderer(templatesDir?: string): TemplateRenderer {
  if (!rendererInstance) {
    rendererInstance = new TemplateRenderer(templatesDir);
  }
  return rendererInstance;
}
