/**
 * Security Event Webhooks
 * Sends security events to external webhook endpoints
 * P3 Security Improvement
 */

import crypto from 'crypto';
import type { SecurityEvent, SecurityEventType, SecurityEventSeverity } from './security-monitor';

export interface WebhookConfig {
  /**
   * Webhook URL
   */
  url: string;

  /**
   * Webhook secret for signature verification
   */
  secret: string;

  /**
   * Events to send to this webhook
   * Empty array means all events
   */
  events?: SecurityEventType[];

  /**
   * Minimum severity level
   */
  minSeverity?: SecurityEventSeverity;

  /**
   * Enabled flag
   */
  enabled?: boolean;

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };

  /**
   * Timeout in milliseconds
   */
  timeoutMs?: number;
}

export interface WebhookPayload {
  /**
   * Event type
   */
  type: 'security.event';

  /**
   * Event data
   */
  data: SecurityEvent;

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Webhook ID
   */
  webhookId: string;

  /**
   * Environment
   */
  environment: string;
}

/**
 * Webhook Manager
 */
export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private queue: Array<{ webhookId: string; payload: WebhookPayload }> = [];
  private processing = false;

  constructor() {
    // Load webhooks from environment
    this.loadWebhooksFromEnv();
  }

  /**
   * Load webhooks from environment variables
   */
  private loadWebhooksFromEnv(): void {
    // Example: WEBHOOK_SECURITY_URL, WEBHOOK_SECURITY_SECRET, WEBHOOK_SECURITY_EVENTS
    const webhookPrefix = 'WEBHOOK_';
    const envVars = process.env;

    const webhookNames = new Set<string>();

    // Find all webhook configurations
    Object.keys(envVars).forEach(key => {
      if (key.startsWith(webhookPrefix)) {
        const parts = key.substring(webhookPrefix.length).split('_');
        if (parts.length >= 2) {
          webhookNames.add(parts[0]);
        }
      }
    });

    // Load each webhook
    webhookNames.forEach(name => {
      const url = envVars[`WEBHOOK_${name}_URL`];
      const secret = envVars[`WEBHOOK_${name}_SECRET`];

      if (url && secret) {
        const eventsStr = envVars[`WEBHOOK_${name}_EVENTS`];
        const events = eventsStr ? eventsStr.split(',') as SecurityEventType[] : undefined;

        const minSeverityStr = envVars[`WEBHOOK_${name}_MIN_SEVERITY`];
        const minSeverity = minSeverityStr as SecurityEventSeverity | undefined;

        this.addWebhook(name.toLowerCase(), {
          url,
          secret,
          events,
          minSeverity,
          enabled: true,
          retry: {
            maxAttempts: 3,
            backoffMs: 1000,
          },
          timeoutMs: 5000,
        });
      }
    });
  }

  /**
   * Add a webhook
   */
  addWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
    console.log(`[Webhooks] Registered webhook: ${id} -> ${config.url}`);
  }

  /**
   * Remove a webhook
   */
  removeWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  /**
   * Get all webhooks
   */
  getWebhooks(): Map<string, WebhookConfig> {
    return new Map(this.webhooks);
  }

  /**
   * Check if event should be sent to webhook
   */
  private shouldSendEvent(config: WebhookConfig, event: SecurityEvent): boolean {
    if (!config.enabled) {
      return false;
    }

    // Check minimum severity
    if (config.minSeverity) {
      const severityLevels: Record<SecurityEventSeverity, number> = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };

      if (severityLevels[event.severity] < severityLevels[config.minSeverity]) {
        return false;
      }
    }

    // Check event type filter
    if (config.events && config.events.length > 0) {
      if (!config.events.includes(event.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Send event to webhook
   */
  private async sendToWebhook(
    webhookId: string,
    config: WebhookConfig,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    const payloadStr = JSON.stringify(payload);
    const signature = this.generateSignature(payloadStr, config.secret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 5000);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhookId,
          'X-Webhook-Attempt': attempt.toString(),
          'User-Agent': 'ImobiBase-Security-Webhook/1.0',
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      console.log(`[Webhooks] Successfully sent event to ${webhookId}`);
    } catch (error) {
      console.error(`[Webhooks] Failed to send to ${webhookId}:`, error);

      // Retry logic
      const maxAttempts = config.retry?.maxAttempts || 3;
      if (attempt < maxAttempts) {
        const backoffMs = (config.retry?.backoffMs || 1000) * attempt;
        console.log(`[Webhooks] Retrying ${webhookId} in ${backoffMs}ms (attempt ${attempt + 1}/${maxAttempts})`);

        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.sendToWebhook(webhookId, config, payload, attempt + 1);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Send security event to all matching webhooks
   */
  async sendEvent(event: SecurityEvent): Promise<void> {
    const payload: WebhookPayload = {
      type: 'security.event',
      data: event,
      timestamp: new Date().toISOString(),
      webhookId: '', // Will be set per webhook
      environment: process.env.NODE_ENV || 'development',
    };

    const promises: Promise<void>[] = [];

    for (const [id, config] of this.webhooks.entries()) {
      if (this.shouldSendEvent(config, event)) {
        const webhookPayload = { ...payload, webhookId: id };
        promises.push(
          this.sendToWebhook(id, config, webhookPayload).catch(error => {
            console.error(`[Webhooks] Failed to send event to ${id}:`, error);
          })
        );
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Process webhook queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      const config = this.webhooks.get(item.webhookId);
      if (!config) continue;

      try {
        await this.sendToWebhook(item.webhookId, config, item.payload);
      } catch (error) {
        console.error(`[Webhooks] Failed to process queued event:`, error);
      }
    }

    this.processing = false;
  }

  /**
   * Test webhook
   */
  async testWebhook(id: string): Promise<boolean> {
    const config = this.webhooks.get(id);
    if (!config) {
      throw new Error(`Webhook ${id} not found`);
    }

    const testPayload: WebhookPayload = {
      type: 'security.event',
      data: {
        id: 'test-' + Date.now(),
        type: 'test_webhook',
        severity: 'low',
        timestamp: new Date(),
        message: 'Webhook test event',
        metadata: {},
      } as SecurityEvent,
      timestamp: new Date().toISOString(),
      webhookId: id,
      environment: process.env.NODE_ENV || 'development',
    };

    try {
      await this.sendToWebhook(id, config, testPayload);
      return true;
    } catch (error) {
      console.error(`[Webhooks] Test failed for ${id}:`, error);
      return false;
    }
  }

  /**
   * Get webhook stats
   */
  getStats(): {
    totalWebhooks: number;
    enabledWebhooks: number;
    queuedEvents: number;
  } {
    return {
      totalWebhooks: this.webhooks.size,
      enabledWebhooks: Array.from(this.webhooks.values()).filter(w => w.enabled).length,
      queuedEvents: this.queue.length,
    };
  }
}

// Singleton instance
export const webhookManager = new WebhookManager();

/**
 * Verify webhook signature
 * Use this in webhook receiver endpoints
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
