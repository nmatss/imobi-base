/**
 * WhatsApp Business API Client
 *
 * Handles all communication with WhatsApp Business API
 * Includes rate limiting, retry logic, and error handling
 */

import { log } from "../../index";
import { validateExternalUrl } from "../../security/url-validator";

interface WhatsAppConfig {
  apiToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion?: string;
}

interface SendTextMessageParams {
  to: string;
  message: string;
  previewUrl?: boolean;
}

interface SendTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: TemplateParameter[];
}

interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

interface SendMediaMessageParams {
  to: string;
  type: "image" | "document" | "video" | "audio";
  mediaUrl: string;
  caption?: string;
  filename?: string;
}

interface SendLocationMessageParams {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

interface SendContactMessageParams {
  to: string;
  contacts: ContactCard[];
}

interface ContactCard {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
}

interface MessageStatusResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

interface MarkAsReadParams {
  messageId: string;
}

export class WhatsAppBusinessAPI {
  private config: WhatsAppConfig;
  private baseUrl: string;
  private rateLimitQueue: Array<() => Promise<any>> = [];
  private requestCount = 0;
  private requestWindow = Date.now();
  private readonly MAX_REQUESTS_PER_SECOND = 80;

  constructor(config: Partial<WhatsAppConfig>) {
    this.config = {
      apiToken: config.apiToken || process.env.WHATSAPP_API_TOKEN || "",
      phoneNumberId: config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      businessAccountId: config.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      apiVersion: config.apiVersion || "v18.0",
    };

    if (!this.config.apiToken || !this.config.phoneNumberId) {
      log("WhatsApp API credentials not configured", "whatsapp");
    }

    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  /**
   * Rate limiting wrapper for API requests
   */
  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Reset counter every second
    if (now - this.requestWindow >= 1000) {
      this.requestCount = 0;
      this.requestWindow = now;
    }

    // If we've hit the rate limit, wait
    if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - (now - this.requestWindow);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.withRateLimit(fn);
    }

    this.requestCount++;
    return fn();
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "POST",
    body?: any,
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await this.withRateLimit(async () => {
        const res = await fetch(url, {
          method,
          headers: {
            "Authorization": `Bearer ${this.config.apiToken}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(JSON.stringify(error));
        }

        return res.json();
      });

      return response as T;
    } catch (error: any) {
      log(`WhatsApp API error: ${error.message}`, "whatsapp");

      // Retry on transient errors
      if (retries > 0 && this.isRetriableError(error)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        return this.makeRequest(endpoint, method, body, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retriable
   */
  private isRetriableError(error: any): boolean {
    const retriableCodes = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ENOTFOUND",
      "ECONNREFUSED",
    ];

    return retriableCodes.some(code => error.message?.includes(code)) ||
           error.message?.includes("rate limit") ||
           error.message?.includes("temporarily unavailable");
  }

  /**
   * Send a text message
   */
  async sendTextMessage(params: SendTextMessageParams): Promise<MessageStatusResponse> {
    log(`Sending WhatsApp text to ${params.to}`, "whatsapp");

    return this.makeRequest<MessageStatusResponse>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: {
          preview_url: params.previewUrl || false,
          body: params.message,
        },
      }
    );
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<MessageStatusResponse> {
    log(`Sending WhatsApp template "${params.templateName}" to ${params.to}`, "whatsapp");

    return this.makeRequest<MessageStatusResponse>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode || "pt_BR",
          },
          components: params.components || [],
        },
      }
    );
  }

  /**
   * Send media message (image, document, video, audio)
   */
  async sendMediaMessage(params: SendMediaMessageParams): Promise<MessageStatusResponse> {
    log(`Sending WhatsApp ${params.type} to ${params.to}`, "whatsapp");

    const mediaBody: any = {
      link: params.mediaUrl,
    };

    if (params.caption && (params.type === "image" || params.type === "video" || params.type === "document")) {
      mediaBody.caption = params.caption;
    }

    if (params.filename && params.type === "document") {
      mediaBody.filename = params.filename;
    }

    return this.makeRequest<MessageStatusResponse>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: params.type,
        [params.type]: mediaBody,
      }
    );
  }

  /**
   * Send location message
   */
  async sendLocationMessage(params: SendLocationMessageParams): Promise<MessageStatusResponse> {
    log(`Sending WhatsApp location to ${params.to}`, "whatsapp");

    return this.makeRequest<MessageStatusResponse>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "location",
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
          name: params.name,
          address: params.address,
        },
      }
    );
  }

  /**
   * Send contact card
   */
  async sendContactMessage(params: SendContactMessageParams): Promise<MessageStatusResponse> {
    log(`Sending WhatsApp contact to ${params.to}`, "whatsapp");

    return this.makeRequest<MessageStatusResponse>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "contacts",
        contacts: params.contacts,
      }
    );
  }

  /**
   * Mark message as read
   */
  async markAsRead(params: MarkAsReadParams): Promise<{ success: boolean }> {
    log(`Marking WhatsApp message ${params.messageId} as read`, "whatsapp");

    return this.makeRequest<{ success: boolean }>(
      `/${this.config.phoneNumberId}/messages`,
      "POST",
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: params.messageId,
      }
    );
  }

  /**
   * Get message status (for debugging)
   */
  async getMessageStatus(messageId: string): Promise<any> {
    return this.makeRequest(
      `/${messageId}`,
      "GET"
    );
  }

  /**
   * Upload media to WhatsApp
   */
  async uploadMedia(file: Buffer, mimeType: string): Promise<{ id: string }> {
    log(`Uploading media to WhatsApp`, "whatsapp");

    const formData = new FormData();
    formData.append("file", new Blob([file], { type: mimeType }));
    formData.append("messaging_product", "whatsapp");

    const response = await fetch(
      `${this.baseUrl}/${this.config.phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }

    return response.json();
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string }> {
    return this.makeRequest(
      `/${mediaId}`,
      "GET"
    );
  }

  /**
   * Download media
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    // Validar URL antes de fazer download para prevenir SSRF
    const validation = validateExternalUrl(mediaUrl);
    if (!validation.valid) {
      throw new Error(`Invalid media URL: ${validation.error}`);
    }

    const response = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Bearer ${this.config.apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", this.config.apiToken)
      .update(body)
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiToken && this.config.phoneNumberId);
  }

  /**
   * Get current configuration status
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      hasToken: !!this.config.apiToken,
      hasPhoneNumberId: !!this.config.phoneNumberId,
      hasBusinessAccountId: !!this.config.businessAccountId,
    };
  }
}

// Export singleton instance
export const whatsappAPI = new WhatsAppBusinessAPI({});
