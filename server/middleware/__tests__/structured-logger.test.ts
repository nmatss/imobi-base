/**
 * Tests for Structured Logger (P2 Security Fix)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredLogger, LogLevel, logger } from '../structured-logger';
import type { Request, Response } from 'express';

describe('Structured Logger - P2 Security Fix', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Logger Initialization', () => {
    it('should create logger with default settings', () => {
      const testLogger = new StructuredLogger();
      expect(testLogger).toBeDefined();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'warn';

      const testLogger = new StructuredLogger();

      // Debug messages should not be logged
      testLogger.debug('test debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      // Warn messages should be logged
      testLogger.warn('test warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();

      process.env.LOG_LEVEL = originalLogLevel;
    });
  });

  describe('Log Level Filtering', () => {
    it('should log info messages at info level', () => {
      logger.info('test info message');
      expect(consoleLogSpy).toHaveBeenCalled();

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.level).toBe('info');
      expect(loggedMessage.message).toBe('test info message');
    });

    it('should log warn messages at warn level', () => {
      logger.warn('test warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();

      const loggedMessage = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(loggedMessage.level).toBe('warn');
    });

    it('should log error messages at error level', () => {
      logger.error('test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();

      const loggedMessage = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedMessage.level).toBe('error');
    });

    it('should always log security events', () => {
      logger.security('security incident detected');
      expect(consoleErrorSpy).toHaveBeenCalled();

      const loggedMessage = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedMessage.level).toBe('security');
      expect(loggedMessage.security).toBe(true);
    });
  });

  describe('JSON Log Format', () => {
    it('should output valid JSON', () => {
      logger.info('test message', { requestId: '123' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should include timestamp in ISO format', () => {
      logger.info('test message');

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include service name', () => {
      logger.info('test message');

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.service).toBe('imobibase-api');
    });

    it('should include environment', () => {
      logger.info('test message');

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.environment).toBeDefined();
    });
  });

  describe('Request Logging', () => {
    it('should log HTTP requests with all context', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/properties',
        headers: {
          'x-request-id': 'req-123',
          'user-agent': 'Mozilla/5.0',
        },
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
        },
        ip: '192.168.1.1',
      } as any as Request;

      const mockRes = {
        statusCode: 200,
      } as Response;

      logger.logRequest(mockReq, mockRes, 150);

      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(loggedMessage.requestId).toBe('req-123');
      expect(loggedMessage.method).toBe('GET');
      expect(loggedMessage.path).toBe('/api/properties');
      expect(loggedMessage.statusCode).toBe(200);
      expect(loggedMessage.duration).toBe(150);
      expect(loggedMessage.userId).toBe('user-1');
      expect(loggedMessage.tenantId).toBe('tenant-1');
      expect(loggedMessage.ip).toBe('192.168.1.1');
    });

    it('should use appropriate log level based on status code', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {},
        ip: '127.0.0.1',
      } as any as Request;

      // 2xx - info
      logger.logRequest(mockReq, { statusCode: 200 } as Response, 100);
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();

      // 4xx - warn
      logger.logRequest(mockReq, { statusCode: 404 } as Response, 100);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleLogSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();

      // 5xx - error
      logger.logRequest(mockReq, { statusCode: 500 } as Response, 100);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with full context', () => {
      const mockReq = {
        method: 'POST',
        path: '/api/auth/login',
        headers: {
          'x-request-id': 'req-456',
          'user-agent': 'AttackBot/1.0',
        },
        user: null,
        ip: '10.0.0.1',
      } as any as Request;

      logger.logSecurityEvent(mockReq, 'brute_force_attempt', {
        attempts: 5,
        username: 'admin',
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedMessage.level).toBe('security');
      expect(loggedMessage.message).toContain('brute_force_attempt');
      expect(loggedMessage.metadata.eventType).toBe('brute_force_attempt');
      expect(loggedMessage.metadata.attempts).toBe(5);
    });
  });

  describe('Client IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
        ip: '127.0.0.1',
      } as any as Request;

      logger.logRequest(mockReq, { statusCode: 200 } as Response, 100);

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.ip).toBe('203.0.113.1'); // First IP in chain
    });

    it('should fallback to req.ip if no x-forwarded-for', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {},
        ip: '192.168.1.100',
      } as any as Request;

      logger.logRequest(mockReq, { statusCode: 200 } as Response, 100);

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.ip).toBe('192.168.1.100');
    });
  });

  describe('Context Enrichment', () => {
    it('should include custom metadata', () => {
      logger.info('test message', {
        requestId: 'req-789',
        metadata: {
          custom: 'value',
          feature: 'test',
        },
      });

      const loggedMessage = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedMessage.metadata.custom).toBe('value');
      expect(loggedMessage.metadata.feature).toBe('test');
    });

    it('should handle error objects in context', () => {
      logger.error('operation failed', {
        requestId: 'req-999',
        error: {
          message: 'Database connection failed',
          code: 'ECONNREFUSED',
          stack: 'Error: Database connection failed\n  at ...',
        },
      });

      const loggedMessage = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedMessage.error.message).toBe('Database connection failed');
      expect(loggedMessage.error.code).toBe('ECONNREFUSED');
    });
  });

  describe('SIEM Integration Readiness', () => {
    it('should produce logs compatible with SIEM systems', () => {
      logger.security('unauthorized_access_attempt', {
        requestId: 'req-sec-001',
        method: 'POST',
        path: '/api/admin/users',
        ip: '192.0.2.1',
        userId: 'user-123',
        metadata: {
          severity: 'high',
          threatType: 'privilege_escalation',
        },
      });

      const loggedMessage = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      // SIEM systems typically look for these fields
      expect(loggedMessage).toHaveProperty('timestamp');
      expect(loggedMessage).toHaveProperty('level');
      expect(loggedMessage).toHaveProperty('message');
      expect(loggedMessage).toHaveProperty('service');
      expect(loggedMessage).toHaveProperty('environment');
      expect(loggedMessage).toHaveProperty('requestId');

      // Verify JSON is parseable (critical for log aggregation)
      expect(() => JSON.stringify(loggedMessage)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalLogLevel = process.env.LOG_LEVEL;

      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'info';

      const prodLogger = new StructuredLogger();
      prodLogger.debug('should not appear in logs');

      expect(consoleLogSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      process.env.LOG_LEVEL = originalLogLevel;
    });
  });
});
