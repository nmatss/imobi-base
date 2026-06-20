import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeWhatsAppIntegrationConfig,
  normalizeWhatsAppPhoneNumberId,
} from '../../server/integrations/whatsapp/phone-number-id';

const source = readFileSync(
  join(process.cwd(), 'server/routes-whatsapp.ts'),
  'utf8'
);
const webhookHandlerSource = readFileSync(
  join(process.cwd(), 'server/integrations/whatsapp/webhook-handler.ts'),
  'utf8'
);
const storageSource = readFileSync(join(process.cwd(), 'server/storage.ts'), 'utf8');

describe('WhatsApp webhook persistent ledger source guards', () => {
  it('imports and uses the persistent webhook ledger for official WhatsApp webhooks', () => {
    expect(source).toContain('reserveWebhookEvent');
    expect(source).toContain('markWebhookEventProcessed');
    expect(source).toContain('markWebhookEventFailed');
    expect(source).toContain('provider: "whatsapp"');
  });

  it('builds a stable per-change event id from message/status identifiers', () => {
    expect(source).toContain('function getWhatsAppWebhookEventId');
    expect(source).toContain('message:${message?.id');
    expect(source).toContain('status?.id');
    expect(source).toContain('return `whatsapp:${createWebhookPayloadDigest(basis)}`;');
  });

  it('does not process duplicate reserved WhatsApp changes', () => {
    expect(source).toContain('if (!reservation.reserved)');
    expect(source).toContain('Duplicate webhook change ignored');
    expect(source).toContain('duplicates++');
    expect(source).toContain('res.json({ success: true, routed, duplicates });');
  });

  it('marks webhook changes failed before returning retryable errors', () => {
    expect(source).toContain('await markWebhookEventFailed({ provider: "whatsapp", eventId, tenantId, error });');
    expect(source).toContain('throw error;');
  });

  it('fails closed when phone_number_id maps to multiple tenants', () => {
    expect(webhookHandlerSource).toContain('const matches: string[] = []');
    expect(webhookHandlerSource).toContain('matches.push(row.tenantId)');
    expect(webhookHandlerSource).toContain('normalizeWhatsAppPhoneNumberId(config.phoneNumberId)');
    expect(webhookHandlerSource).toContain('if (matches.length === 1)');
    expect(webhookHandlerSource).toContain('if (matches.length > 1)');
    expect(webhookHandlerSource).toContain('failing closed');
    expect(webhookHandlerSource).toContain('return null;');
  });

  it('normalizes configured and incoming phone_number_id values consistently', () => {
    expect(normalizeWhatsAppPhoneNumberId(' 1234567890 ')).toBe('1234567890');
    expect(normalizeWhatsAppPhoneNumberId('   ')).toBeNull();
    expect(normalizeWhatsAppIntegrationConfig({ phoneNumberId: ' 123 ', keep: true })).toEqual({
      phoneNumberId: '123',
      keep: true,
    });
    expect(storageSource).toContain('normalizeWhatsAppIntegrationConfig(safeData.config)');
  });
});
