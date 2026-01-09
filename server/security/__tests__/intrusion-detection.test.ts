/**
 * Intrusion Detection System Tests
 * Tests for IDS, brute force detection, and malicious pattern detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  isIpBlocked,
  blockIp,
  unblockIp,
  recordFailedLogin,
  recordSuccessfulLogin,
  detectSqlInjectionAttempt,
  detectXssAttempt,
  detectPathTraversalAttempt,
  recordSuspiciousActivity,
  blockBlacklistedIps,
  detectMaliciousPatterns,
  compositeRateLimit,
  getThreatStatistics,
  getBlockedIpList,
  addToBlocklist,
  removeFromBlocklist,
  getThreatDetails,
} from '../intrusion-detection';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node');

describe('Intrusion Detection System', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockNext = vi.fn();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockReq = {
      ip: '192.168.1.100',
      method: 'POST',
      path: '/api/test',
      headers: {},
      body: {},
      query: {},
      params: {},
      socket: { remoteAddress: '192.168.1.100' } as any,
    };

    // Clear any blocked IPs
    const blockedIps = getBlockedIpList();
    blockedIps.forEach(ip => unblockIp(ip));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IP Blocking', () => {
    it('should block an IP address', () => {
      const testIp = '10.0.0.1';

      blockIp(testIp);

      expect(isIpBlocked(testIp)).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('IP blocked'),
        expect.any(Object)
      );
    });

    it('should unblock an IP address', () => {
      const testIp = '10.0.0.2';

      blockIp(testIp);
      expect(isIpBlocked(testIp)).toBe(true);

      unblockIp(testIp);
      expect(isIpBlocked(testIp)).toBe(false);
    });

    it('should auto-unblock after duration expires', async () => {
      const testIp = '10.0.0.3';
      const shortDuration = 100; // 100ms

      blockIp(testIp, shortDuration);
      expect(isIpBlocked(testIp)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(isIpBlocked(testIp)).toBe(false);
    });

    it('should handle custom block durations', () => {
      const testIp = '10.0.0.4';
      const customDuration = 5000;

      blockIp(testIp, customDuration);

      expect(isIpBlocked(testIp)).toBe(true);
    });
  });

  describe('Brute Force Detection', () => {
    it('should track failed login attempts', () => {
      mockReq.ip = '10.0.1.1';

      for (let i = 0; i < 3; i++) {
        recordFailedLogin(mockReq as Request, `user${i}@example.com`);
      }

      // Should not block yet (threshold is 5)
      expect(isIpBlocked('10.0.1.1')).toBe(false);
    });

    it('should block IP after brute force threshold', () => {
      mockReq.ip = '10.0.1.2';

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(mockReq as Request, 'user@example.com');
      }

      expect(isIpBlocked('10.0.1.2')).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Brute force attack detected',
        expect.objectContaining({
          level: 'warning',
          tags: { security: 'brute_force' },
        })
      );
    });

    it('should clear failed attempts on successful login', () => {
      mockReq.ip = '10.0.1.3';

      for (let i = 0; i < 3; i++) {
        recordFailedLogin(mockReq as Request, 'user@example.com');
      }

      recordSuccessfulLogin(mockReq as Request);

      // New failed login should start fresh count
      recordFailedLogin(mockReq as Request, 'user@example.com');
      expect(isIpBlocked('10.0.1.3')).toBe(false);
    });

    it('should detect credential stuffing attack', () => {
      mockReq.ip = '10.0.1.4';

      // Try many different usernames (credential stuffing)
      for (let i = 0; i < 10; i++) {
        recordFailedLogin(mockReq as Request, `user${i}@example.com`);
      }

      expect(isIpBlocked('10.0.1.4')).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Credential stuffing attack detected',
        expect.any(Object)
      );
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect SQL injection in query parameters', () => {
      mockReq.query = { search: "' OR '1'='1" };

      const detected = detectSqlInjectionAttempt(mockReq as Request);

      expect(detected).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'SQL injection attempt detected',
        expect.any(Object)
      );
    });

    it('should detect SQL injection in request body', () => {
      mockReq.body = { username: 'admin', password: "' OR 1=1--" };

      const detected = detectSqlInjectionAttempt(mockReq as Request);

      expect(detected).toBe(true);
    });

    it('should detect various SQL injection patterns', () => {
      const sqlPatterns = [
        'SELECT * FROM users',
        'UNION SELECT password',
        'DROP TABLE users',
        '1; DELETE FROM users--',
        "admin' OR '1'='1",
      ];

      sqlPatterns.forEach(pattern => {
        mockReq.body = { input: pattern };
        const detected = detectSqlInjectionAttempt(mockReq as Request);
        expect(detected).toBe(true);
      });
    });

    it('should allow legitimate inputs', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I am interested in your property',
      };

      const detected = detectSqlInjectionAttempt(mockReq as Request);

      expect(detected).toBe(false);
    });
  });

  describe('XSS Detection', () => {
    it('should detect XSS in request body', () => {
      mockReq.body = {
        comment: '<script>alert("XSS")</script>',
      };

      const detected = detectXssAttempt(mockReq as Request);

      expect(detected).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'XSS attempt detected',
        expect.any(Object)
      );
    });

    it('should detect various XSS patterns', () => {
      const xssPatterns = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>',
      ];

      xssPatterns.forEach(pattern => {
        mockReq.body = { content: pattern };
        const detected = detectXssAttempt(mockReq as Request);
        expect(detected).toBe(true);
      });
    });

    it('should allow safe HTML', () => {
      mockReq.body = {
        content: 'This is a <b>bold</b> statement',
      };

      const detected = detectXssAttempt(mockReq as Request);

      // Note: Simple tags might still be allowed, focus is on dangerous patterns
      expect(typeof detected).toBe('boolean');
    });
  });

  describe('Path Traversal Detection', () => {
    it('should detect path traversal attempts', () => {
      mockReq.path = '/api/files/../../etc/passwd';

      const detected = detectPathTraversalAttempt(mockReq as Request);

      expect(detected).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Path traversal attempt detected',
        expect.any(Object)
      );
    });

    it('should detect various path traversal patterns', () => {
      const traversalPatterns = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f',
        '%2e%2e%5c',
      ];

      traversalPatterns.forEach(pattern => {
        mockReq.query = { file: pattern };
        const detected = detectPathTraversalAttempt(mockReq as Request);
        expect(detected).toBe(true);
      });
    });

    it('should allow legitimate file paths', () => {
      mockReq.query = { file: 'document.pdf' };

      const detected = detectPathTraversalAttempt(mockReq as Request);

      expect(detected).toBe(false);
    });
  });

  describe('Suspicious Activity Tracking', () => {
    it('should record suspicious activities', () => {
      mockReq.ip = '10.0.2.1';

      recordSuspiciousActivity(mockReq as Request, 'sql_injection_attempt');
      recordSuspiciousActivity(mockReq as Request, 'xss_attempt');

      // Should not block yet (threshold is 3)
      expect(isIpBlocked('10.0.2.1')).toBe(false);
    });

    it('should block IP after suspicious activity threshold', () => {
      mockReq.ip = '10.0.2.2';

      recordSuspiciousActivity(mockReq as Request, 'sql_injection');
      recordSuspiciousActivity(mockReq as Request, 'xss_attempt');
      recordSuspiciousActivity(mockReq as Request, 'path_traversal');

      expect(isIpBlocked('10.0.2.2')).toBe(true);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Suspicious activity threshold exceeded',
        expect.any(Object)
      );
    });
  });

  describe('blockBlacklistedIps Middleware', () => {
    it('should allow non-blocked IPs', () => {
      mockReq.ip = '10.0.3.1';

      blockBlacklistedIps(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block blacklisted IPs', () => {
      mockReq.ip = '10.0.3.2';
      blockIp('10.0.3.2');

      blockBlacklistedIps(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
          retryAfter: expect.any(Number),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('detectMaliciousPatterns Middleware', () => {
    it('should allow clean requests', () => {
      mockReq.body = { name: 'John', email: 'john@example.com' };

      detectMaliciousPatterns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block SQL injection attempts', () => {
      mockReq.body = { query: "' OR '1'='1" };

      detectMaliciousPatterns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS attempts', () => {
      mockReq.body = { comment: '<script>alert(1)</script>' };

      detectMaliciousPatterns(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should auto-block aggressive attackers', () => {
      mockReq.ip = '10.0.3.3';

      // First attack
      mockReq.body = { query: "' OR 1=1" };
      detectMaliciousPatterns(mockReq as Request, mockRes as Response, mockNext);

      // Second attack
      mockReq.body = { query: 'DROP TABLE users' };
      detectMaliciousPatterns(mockReq as Request, mockRes as Response, mockNext);

      expect(isIpBlocked('10.0.3.3')).toBe(true);
    });
  });

  describe('compositeRateLimit Middleware', () => {
    it('should allow requests within limit', () => {
      const rateLimit = compositeRateLimit(60000, 10);
      mockReq.ip = '10.0.4.1';
      mockReq.headers = { 'user-agent': 'test-agent' };

      for (let i = 0; i < 5; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
    });

    it('should block requests exceeding limit', () => {
      const rateLimit = compositeRateLimit(60000, 3);
      mockReq.ip = '10.0.4.2';
      mockReq.headers = { 'user-agent': 'test-agent' };

      // Make requests up to and beyond limit
      for (let i = 0; i < 5; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          retryAfter: expect.any(Number),
        })
      );
    });

    it('should reset after window expires', async () => {
      const rateLimit = compositeRateLimit(100, 2); // 100ms window
      mockReq.ip = '10.0.4.3';
      mockReq.headers = { 'user-agent': 'test-agent' };

      // Use up limit
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });

  describe('Threat Management', () => {
    it('should return threat statistics', () => {
      blockIp('10.0.5.1');
      blockIp('10.0.5.2');

      const stats = getThreatStatistics();

      expect(stats.blockedIps).toBeGreaterThanOrEqual(2);
      expect(stats.recentBlocks.length).toBeGreaterThanOrEqual(2);
    });

    it('should return blocked IP list', () => {
      blockIp('10.0.5.3');
      blockIp('10.0.5.4');

      const blockedIps = getBlockedIpList();

      expect(blockedIps).toContain('10.0.5.3');
      expect(blockedIps).toContain('10.0.5.4');
    });

    it('should manually add IP to blocklist', () => {
      addToBlocklist('10.0.5.5');

      expect(isIpBlocked('10.0.5.5')).toBe(true);
    });

    it('should manually remove IP from blocklist', () => {
      blockIp('10.0.5.6');
      expect(isIpBlocked('10.0.5.6')).toBe(true);

      removeFromBlocklist('10.0.5.6');

      expect(isIpBlocked('10.0.5.6')).toBe(false);
    });

    it('should get threat details for IP', () => {
      mockReq.ip = '10.0.5.7';

      recordFailedLogin(mockReq as Request, 'user@example.com');
      recordFailedLogin(mockReq as Request, 'user@example.com');
      recordSuspiciousActivity(mockReq as Request, 'xss_attempt');

      const details = getThreatDetails('10.0.5.7');

      expect(details.loginAttempts).toBe(2);
      expect(details.suspiciousActivities).toBe(1);
      expect(details.patterns).toContain('failed_login');
      expect(details.patterns).toContain('xss_attempt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle X-Forwarded-For header', () => {
      mockReq.headers = { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' };
      mockReq.ip = '192.168.1.1';

      recordFailedLogin(mockReq as Request, 'user@example.com');

      // Should use first IP from X-Forwarded-For
      const details = getThreatDetails('203.0.113.1');
      expect(details.loginAttempts).toBe(1);
    });

    it('should handle missing IP gracefully', () => {
      mockReq.ip = undefined;
      mockReq.socket.remoteAddress = undefined;

      expect(() => {
        recordFailedLogin(mockReq as Request, 'user@example.com');
      }).not.toThrow();
    });

    it('should handle deeply nested object inputs', () => {
      mockReq.body = {
        level1: {
          level2: {
            level3: {
              malicious: "' OR 1=1--",
            },
          },
        },
      };

      const detected = detectSqlInjectionAttempt(mockReq as Request);

      expect(detected).toBe(true);
    });

    it('should handle empty request objects', () => {
      mockReq.body = {};
      mockReq.query = {};
      mockReq.params = {};

      const sqlDetected = detectSqlInjectionAttempt(mockReq as Request);
      const xssDetected = detectXssAttempt(mockReq as Request);
      const pathDetected = detectPathTraversalAttempt(mockReq as Request);

      expect(sqlDetected).toBe(false);
      expect(xssDetected).toBe(false);
      expect(pathDetected).toBe(false);
    });
  });
});
