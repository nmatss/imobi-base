/**
 * Notification Processor Tests
 * Tests for background notification job processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processNotification } from '../processors/notification-processor';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node');

describe('Notification Processor', () => {
  let mockJob: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJob = {
      data: {},
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('processNotification', () => {
    it('should process single user notification successfully', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'New Message',
        message: 'You have a new message',
        type: 'message',
        actionUrl: '/messages/123',
        data: { messageId: '123' },
      };

      await processNotification(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(70);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(90);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should process multiple users notification', async () => {
      mockJob.data = {
        userId: ['user_1', 'user_2', 'user_3'],
        title: 'System Update',
        message: 'System will be updated',
        type: 'system',
      };

      await processNotification(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending notification to 3 user(s)')
      );
    });

    it('should handle notification with action URL', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Payment Due',
        message: 'Your payment is due tomorrow',
        type: 'payment',
        actionUrl: '/payments/123',
        data: { paymentId: '123', amount: 1000 },
      };

      await processNotification(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should handle notification without action URL', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Info',
        message: 'General information',
        type: 'info',
      };

      await expect(processNotification(mockJob)).resolves.not.toThrow();
    });

    it('should log all processing steps', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      await processNotification(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending notification to')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('User preferences loaded')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Push notifications sent')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Storing notifications in database')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Broadcasting via WebSocket')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notification processing completed')
      );
    });

    it('should handle different notification types', async () => {
      const types = ['message', 'payment', 'contract', 'property', 'system'];

      for (const type of types) {
        mockJob.data = {
          userId: 'user_123',
          title: `Test ${type}`,
          message: `Test ${type} message`,
          type,
        };

        await processNotification(mockJob);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type,
            }),
          })
        );
      }
    });

    it('should handle notification processing errors', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      const error = new Error('Push service unavailable');
      mockJob.updateProgress.mockRejectedValueOnce(error);

      await expect(processNotification(mockJob)).rejects.toThrow(
        'Push service unavailable'
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            component: 'notification-processor',
            notificationType: 'test',
          },
        })
      );
    });

    it('should track progress through all stages', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      await processNotification(mockJob);

      const progressCalls = mockJob.updateProgress.mock.calls;
      expect(progressCalls).toEqual([
        [10],  // User preferences loading
        [30],  // Preferences loaded
        [70],  // Push sent
        [90],  // Database stored
        [100], // WebSocket broadcast
      ]);
    });

    it('should log breadcrumb with correct data', async () => {
      mockJob.data = {
        userId: ['user_1', 'user_2'],
        title: 'Bulk Notification',
        message: 'Message to multiple users',
        type: 'bulk',
      };

      await processNotification(mockJob);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'notification',
        message: 'Notification sent: Bulk Notification',
        level: 'info',
        data: {
          userCount: 2,
          type: 'bulk',
        },
      });
    });

    it('should handle notification with additional data payload', async () => {
      const customData = {
        propertyId: 'prop_123',
        contractId: 'cont_456',
        amount: 5000,
        dueDate: '2025-12-31',
      };

      mockJob.data = {
        userId: 'user_123',
        title: 'Contract Reminder',
        message: 'Your contract expires soon',
        type: 'contract',
        actionUrl: '/contracts/cont_456',
        data: customData,
      };

      await expect(processNotification(mockJob)).resolves.not.toThrow();
    });

    it('should convert single userId to array internally', async () => {
      mockJob.data = {
        userId: 'single_user',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      await processNotification(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending notification to 1 user(s)')
      );
    });

    it('should handle empty data object', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
        data: {},
      };

      await expect(processNotification(mockJob)).resolves.not.toThrow();
    });

    it('should handle undefined data field', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
        // data is undefined
      };

      await expect(processNotification(mockJob)).resolves.not.toThrow();
    });

    it('should preserve error context for debugging', async () => {
      const error = new Error('Database connection failed');
      mockJob.data = {
        userId: ['user_1', 'user_2'],
        title: 'Important Alert',
        message: 'Critical system alert',
        type: 'alert',
      };
      mockJob.updateProgress.mockRejectedValueOnce(error);

      try {
        await processNotification(mockJob);
      } catch (e) {
        expect(e).toBe(error);
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            userId: ['user_1', 'user_2'],
            title: 'Important Alert',
          }),
        })
      );
    });
  });

  describe('Notification Retry Logic', () => {
    it('should allow job to be retried on failure', async () => {
      const error = new Error('Temporary failure');
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      mockJob.updateProgress.mockRejectedValueOnce(error);

      await expect(processNotification(mockJob)).rejects.toThrow();

      // Verify error is thrown for retry mechanism
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should log error details for monitoring', async () => {
      const error = new Error('Service timeout');
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      mockJob.updateProgress.mockRejectedValueOnce(error);

      try {
        await processNotification(mockJob);
      } catch (e) {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification'),
        error
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large user arrays efficiently', async () => {
      const userCount = 100;
      const userIds = Array.from({ length: userCount }, (_, i) => `user_${i}`);

      mockJob.data = {
        userId: userIds,
        title: 'Bulk Announcement',
        message: 'System announcement to all users',
        type: 'announcement',
      };

      await processNotification(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Sending notification to ${userCount} user(s)`)
      );
    });

    it('should complete within reasonable time', async () => {
      mockJob.data = {
        userId: 'user_123',
        title: 'Test',
        message: 'Test message',
        type: 'test',
      };

      const startTime = Date.now();
      await processNotification(mockJob);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly in test environment (no simulated delays)
      expect(duration).toBeLessThan(100);
    });
  });
});
