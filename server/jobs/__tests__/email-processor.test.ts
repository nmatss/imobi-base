/**
 * Email Processor Tests
 * Tests for background email job processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processEmail, getEmailTemplates } from '../processors/email-processor';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node');

describe('Email Processor', () => {
  let mockJob: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJob = {
      data: {},
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    // Mock console.log and console.error
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('processEmail', () => {
    it('should process single recipient email successfully', async () => {
      mockJob.data = {
        to: 'user@example.com',
        subject: 'Test Email',
        template: 'welcome',
        data: { userName: 'John' },
        from: 'noreply@imobibase.com',
      };

      await processEmail(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully')
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'email',
          level: 'info',
        })
      );
    });

    it('should process multiple recipients email', async () => {
      mockJob.data = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Bulk Email',
        template: 'invoice',
        data: { invoiceNumber: 'INV-001' },
      };

      await processEmail(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('user1@example.com, user2@example.com')
      );
    });

    it('should handle email with attachments', async () => {
      mockJob.data = {
        to: 'client@example.com',
        subject: 'Invoice with Attachment',
        template: 'invoice',
        data: { amount: 1000 },
        attachments: [
          {
            filename: 'invoice.pdf',
            content: 'base64content',
          },
        ],
      };

      await processEmail(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should update job progress during processing', async () => {
      mockJob.data = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      await processEmail(mockJob);

      const progressCalls = mockJob.updateProgress.mock.calls;
      expect(progressCalls).toEqual([
        [10],
        [50],
        [100],
      ]);
    });

    it('should handle email processing errors', async () => {
      mockJob.data = {
        to: 'invalid@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      // Simulate error by making updateProgress throw
      mockJob.updateProgress.mockRejectedValueOnce(new Error('Network error'));

      await expect(processEmail(mockJob)).rejects.toThrow('Network error');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            component: 'email-processor',
            template: 'welcome',
          },
        })
      );
    });

    it('should log template data for debugging', async () => {
      const templateData = {
        userName: 'John Doe',
        propertyAddress: '123 Main St',
        contractId: 'CTR-001',
      };

      mockJob.data = {
        to: 'user@example.com',
        subject: 'Contract Ready',
        template: 'contract-expiring',
        data: templateData,
      };

      await processEmail(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Template data:'),
        templateData
      );
    });

    it('should handle different email templates', async () => {
      const templates = [
        'welcome',
        'invoice',
        'payment-reminder',
        'payment-overdue',
        'contract-expiring',
      ];

      for (const template of templates) {
        mockJob.data = {
          to: 'user@example.com',
          subject: `Test ${template}`,
          template,
          data: {},
        };

        await processEmail(mockJob);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`Template: ${template}`)
        );
      }
    });

    it('should preserve retry context on failure', async () => {
      const error = new Error('SMTP connection failed');
      mockJob.data = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };
      mockJob.updateProgress.mockRejectedValueOnce(error);

      try {
        await processEmail(mockJob);
      } catch (e) {
        expect(e).toBe(error);
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            to: 'user@example.com',
            subject: 'Test',
          }),
        })
      );
    });
  });

  describe('getEmailTemplates', () => {
    it('should return all available email templates', () => {
      const templates = getEmailTemplates();

      expect(templates).toHaveProperty('welcome');
      expect(templates).toHaveProperty('invoice');
      expect(templates).toHaveProperty('payment-reminder');
      expect(templates).toHaveProperty('payment-overdue');
      expect(templates).toHaveProperty('contract-expiring');
      expect(templates).toHaveProperty('property-inquiry');
      expect(templates).toHaveProperty('report-ready');
      expect(templates).toHaveProperty('export-ready');
      expect(templates).toHaveProperty('password-reset');
      expect(templates).toHaveProperty('verification');
    });

    it('should return template names as values', () => {
      const templates = getEmailTemplates();

      expect(templates['welcome']).toBe('Welcome to ImobiBase');
      expect(templates['invoice']).toBe('Invoice Generated');
      expect(templates['payment-reminder']).toBe('Payment Reminder');
    });

    it('should have at least 10 templates available', () => {
      const templates = getEmailTemplates();
      const templateCount = Object.keys(templates).length;

      expect(templateCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Email Processing Edge Cases', () => {
    it('should handle empty data object', async () => {
      mockJob.data = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      await expect(processEmail(mockJob)).resolves.not.toThrow();
    });

    it('should handle undefined optional fields', async () => {
      mockJob.data = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
        // from and attachments are undefined
      };

      await expect(processEmail(mockJob)).resolves.not.toThrow();
    });

    it('should log correct recipient format for single email', async () => {
      mockJob.data = {
        to: 'single@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      await processEmail(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully to: single@example.com')
      );
    });

    it('should log correct recipient format for multiple emails', async () => {
      mockJob.data = {
        to: ['first@example.com', 'second@example.com', 'third@example.com'],
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      await processEmail(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('first@example.com, second@example.com, third@example.com')
      );
    });
  });
});
