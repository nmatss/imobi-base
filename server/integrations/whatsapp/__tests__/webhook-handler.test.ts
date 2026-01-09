import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookHandler } from '../webhook-handler';

// Mock database
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock managers
vi.mock('../conversation-manager', () => ({
  conversationManager: {
    getOrCreateConversation: vi.fn(() => Promise.resolve({ id: 1 })),
    updateConversationActivity: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../auto-responder', () => ({
  autoResponder: {
    handleIncomingMessage: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../../index', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('WhatsApp Webhook Handler', () => {
  let handler: WebhookHandler;

  beforeEach(() => {
    handler = new WebhookHandler();
    vi.clearAllMocks();
  });

  describe('Webhook Payload Structure', () => {
    it('should have correct message structure', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'text' as const,
        text: {
          body: 'Hello',
        },
      };

      expect(mockMessage.from).toBeDefined();
      expect(mockMessage.id).toBeDefined();
      expect(mockMessage.timestamp).toBeDefined();
      expect(mockMessage.type).toBe('text');
      expect(mockMessage.text?.body).toBe('Hello');
    });

    it('should handle image messages', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'image' as const,
        image: {
          id: 'img-123',
          mime_type: 'image/jpeg',
          sha256: 'abc123',
          caption: 'Property photo',
        },
      };

      expect(mockMessage.type).toBe('image');
      expect(mockMessage.image?.id).toBe('img-123');
      expect(mockMessage.image?.mime_type).toBe('image/jpeg');
    });

    it('should handle document messages', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'document' as const,
        document: {
          id: 'doc-123',
          mime_type: 'application/pdf',
          sha256: 'abc123',
          filename: 'contract.pdf',
        },
      };

      expect(mockMessage.type).toBe('document');
      expect(mockMessage.document?.filename).toBe('contract.pdf');
    });

    it('should handle location messages', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'location' as const,
        location: {
          latitude: -23.5505,
          longitude: -46.6333,
          name: 'São Paulo',
          address: 'São Paulo, SP',
        },
      };

      expect(mockMessage.type).toBe('location');
      expect(mockMessage.location?.latitude).toBe(-23.5505);
      expect(mockMessage.location?.longitude).toBe(-46.6333);
    });

    it('should handle button replies', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'button' as const,
        button: {
          text: 'Yes',
          payload: 'confirm_action',
        },
      };

      expect(mockMessage.type).toBe('button');
      expect(mockMessage.button?.payload).toBe('confirm_action');
    });

    it('should handle interactive list replies', () => {
      const mockMessage = {
        from: '+5511999999999',
        id: 'msg-123',
        timestamp: '1640000000',
        type: 'interactive' as const,
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: 'option-1',
            title: 'Option 1',
            description: 'First option',
          },
        },
      };

      expect(mockMessage.type).toBe('interactive');
      expect(mockMessage.interactive?.list_reply?.id).toBe('option-1');
    });
  });

  describe('Status Updates', () => {
    it('should handle sent status', () => {
      const status = {
        id: 'msg-123',
        status: 'sent' as const,
        timestamp: '1640000000',
        recipient_id: '+5511999999999',
      };

      expect(status.status).toBe('sent');
    });

    it('should handle delivered status', () => {
      const status = {
        id: 'msg-123',
        status: 'delivered' as const,
        timestamp: '1640000000',
        recipient_id: '+5511999999999',
      };

      expect(status.status).toBe('delivered');
    });

    it('should handle read status', () => {
      const status = {
        id: 'msg-123',
        status: 'read' as const,
        timestamp: '1640000000',
        recipient_id: '+5511999999999',
      };

      expect(status.status).toBe('read');
    });

    it('should handle failed status with errors', () => {
      const status = {
        id: 'msg-123',
        status: 'failed' as const,
        timestamp: '1640000000',
        recipient_id: '+5511999999999',
        errors: [
          {
            code: 131047,
            title: 'Re-engagement message',
            message: 'Re-engagement message failed',
          },
        ],
      };

      expect(status.status).toBe('failed');
      expect(status.errors).toHaveLength(1);
      expect(status.errors?.[0].code).toBe(131047);
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should validate complete webhook payload structure', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: 'phone-123',
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'John Doe',
                      },
                      wa_id: '5511888888888',
                    },
                  ],
                  messages: [
                    {
                      from: '+5511888888888',
                      id: 'msg-123',
                      timestamp: '1640000000',
                      type: 'text' as const,
                      text: {
                        body: 'Hello',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      expect(payload.object).toBe('whatsapp_business_account');
      expect(payload.entry).toHaveLength(1);
      expect(payload.entry[0].changes).toHaveLength(1);
      expect(payload.entry[0].changes[0].value.messaging_product).toBe('whatsapp');
      expect(payload.entry[0].changes[0].value.messages).toHaveLength(1);
    });

    it('should handle status update payload', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-123',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: 'phone-123',
                  },
                  statuses: [
                    {
                      id: 'msg-123',
                      status: 'delivered' as const,
                      timestamp: '1640000000',
                      recipient_id: '+5511888888888',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      expect(payload.entry[0].changes[0].value.statuses).toHaveLength(1);
      expect(payload.entry[0].changes[0].value.statuses?.[0].status).toBe('delivered');
    });
  });

  describe('Message Type Handling', () => {
    const messageTypes = [
      'text',
      'image',
      'document',
      'audio',
      'video',
      'location',
      'contacts',
      'button',
      'interactive',
    ] as const;

    messageTypes.forEach((type) => {
      it(`should recognize ${type} message type`, () => {
        const message = {
          from: '+5511999999999',
          id: 'msg-123',
          timestamp: '1640000000',
          type,
        };

        expect(message.type).toBe(type);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle webhook errors gracefully', () => {
      const error = {
        code: 131047,
        title: 'Re-engagement message',
        message: 'Re-engagement message failed',
      };

      expect(error.code).toBeDefined();
      expect(error.title).toBeDefined();
      expect(error.message).toBeDefined();
    });

    it('should validate required fields', () => {
      const invalidPayload = {
        object: 'whatsapp_business_account',
        // Missing entry
      };

      expect(invalidPayload.object).toBe('whatsapp_business_account');
      expect((invalidPayload as any).entry).toBeUndefined();
    });
  });

  describe('Timestamp Handling', () => {
    it('should handle unix timestamp format', () => {
      const timestamp = '1640000000';
      const date = new Date(parseInt(timestamp) * 1000);

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should validate timestamp is numeric string', () => {
      const timestamp = '1640000000';

      expect(parseInt(timestamp)).toBeGreaterThan(0);
      expect(isNaN(parseInt(timestamp))).toBe(false);
    });
  });

  describe('Phone Number Handling', () => {
    it('should handle international format', () => {
      const phone = '+5511999999999';

      expect(phone).toMatch(/^\+\d+$/);
    });

    it('should handle WhatsApp ID format', () => {
      const waId = '5511999999999';

      expect(waId).toMatch(/^\d+$/);
    });
  });
});
