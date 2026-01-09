/**
 * Sentry Client Tests
 *
 * Unit tests for Sentry integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  startSpan: vi.fn((config, callback) => callback()),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
  reactRouterV6BrowserTracingIntegration: vi.fn(),
  httpClientIntegration: vi.fn(),
  breadcrumbsIntegration: vi.fn(),
  ErrorBoundary: vi.fn(),
  Profiler: vi.fn(),
  withProfiler: vi.fn(),
}));

import {
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setContext,
} from '../sentry-client';

describe('Sentry Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureException', () => {
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'save' };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
    });

    it('should capture exception without context', () => {
      const error = new Error('Test error');

      captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: undefined,
      });
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', () => {
      const message = 'Test message';

      captureMessage(message);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, {
        level: 'info',
        extra: undefined,
      });
    });

    it('should capture message with custom level and context', () => {
      const message = 'Warning message';
      const context = { endpoint: '/api/test' };

      captureMessage(message, 'warning', context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, {
        level: 'warning',
        extra: context,
      });
    });
  });

  describe('setUser', () => {
    it('should set user context', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        tenantId: 'tenant-1',
        role: 'admin',
      };

      setUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: '123',
        email: 'test@example.com',
        tenant_id: 'tenant-1',
        role: 'admin',
      });
    });
  });

  describe('clearUser', () => {
    it('should clear user context', () => {
      clearUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with data', () => {
      const message = 'User clicked button';
      const category = 'user_action';
      const data = { button: 'save' };

      addBreadcrumb(message, category, data);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message,
        category,
        data,
        level: 'info',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('setTag', () => {
    it('should set custom tag', () => {
      setTag('environment', 'production');

      expect(Sentry.setTag).toHaveBeenCalledWith('environment', 'production');
    });
  });

  describe('setContext', () => {
    it('should set custom context', () => {
      const context = { propertyId: '123', action: 'create' };

      setContext('operation', context);

      expect(Sentry.setContext).toHaveBeenCalledWith('operation', context);
    });
  });
});
