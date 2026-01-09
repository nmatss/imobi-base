/**
 * Rate Limiting Integration Tests
 * Tests rate limiting enforcement and 429 responses
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // Global rate limiter (100 requests per 15 minutes)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  // Strict rate limiter for auth endpoints (5 requests per 15 minutes)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: false,
    message: { error: 'Too many authentication attempts' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  // API rate limiter (30 requests per minute)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'API rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'API rate limit exceeded',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  // Expensive operation limiter (3 requests per hour)
  const expensiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Operation limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many expensive operations',
        code: 'EXPENSIVE_OPERATION_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  // Routes
  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    if (email === 'test@example.com' && password === 'password123') {
      res.json({ success: true, token: 'fake-jwt-token' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/register', authLimiter, (req, res) => {
    res.status(201).json({ success: true, user: req.body });
  });

  app.get('/api/data', apiLimiter, (_req, res) => {
    res.json({ data: 'some data' });
  });

  app.post('/api/data', apiLimiter, (req, res) => {
    res.json({ success: true, created: req.body });
  });

  app.post('/api/expensive/report', expensiveLimiter, (_req, res) => {
    res.json({ success: true, report: 'generated' });
  });

  app.post('/api/expensive/export', expensiveLimiter, (_req, res) => {
    res.json({ success: true, export: 'completed' });
  });

  app.get('/api/public', (_req, res) => {
    res.json({ message: 'public endpoint' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

describe('Rate Limiting Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Authentication Rate Limiting', () => {
    it('should allow up to 5 login attempts within window', async () => {
      const agent = request.agent(app);

      for (let i = 0; i < 5; i++) {
        const res = await agent
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' });

        expect([200, 401]).toContain(res.status);
      }
    });

    it('should return 429 after exceeding login rate limit', async () => {
      const agent = request.agent(app);

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'password123' });
      }

      // 6th request should be rate limited
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(429);

      expect(res.body.error).toContain('Too many authentication attempts');
      expect(res.body.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(res.body.retryAfter).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    it('should apply rate limit to both login and register', async () => {
      const agent = request.agent(app);

      // Use up limit with login attempts
      for (let i = 0; i < 3; i++) {
        await agent
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'password123' });
      }

      // Use remaining with register
      for (let i = 0; i < 2; i++) {
        await agent
          .post('/api/auth/register')
          .send({ email: 'new@example.com', password: 'password123' });
      }

      // Next request should be rate limited
      await agent
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(429);
    });
  });

  describe('API Rate Limiting', () => {
    it('should allow up to 30 API requests per minute', async () => {
      const agent = request.agent(app);

      for (let i = 0; i < 30; i++) {
        await agent.get('/api/data').expect(200);
      }
    });

    it('should return 429 after exceeding API rate limit', async () => {
      const agent = request.agent(app);

      // Make 30 requests (at limit)
      for (let i = 0; i < 30; i++) {
        await agent.get('/api/data');
      }

      // 31st request should be rate limited
      const res = await agent
        .get('/api/data')
        .expect(429);

      expect(res.body.error).toContain('API rate limit exceeded');
      expect(res.body.code).toBe('API_RATE_LIMIT_EXCEEDED');
    });

    it('should apply rate limit to different HTTP methods', async () => {
      const agent = request.agent(app);

      // Mix GET and POST requests
      for (let i = 0; i < 15; i++) {
        await agent.get('/api/data');
      }

      for (let i = 0; i < 15; i++) {
        await agent.post('/api/data').send({ test: 'data' });
      }

      // Next request should be rate limited
      await agent.get('/api/data').expect(429);
    });
  });

  describe('Expensive Operation Rate Limiting', () => {
    it('should allow up to 3 expensive operations per hour', async () => {
      const agent = request.agent(app);

      for (let i = 0; i < 3; i++) {
        await agent.post('/api/expensive/report').expect(200);
      }
    });

    it('should return 429 after exceeding expensive operation limit', async () => {
      const agent = request.agent(app);

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        await agent.post('/api/expensive/report');
      }

      // 4th request should be rate limited
      const res = await agent
        .post('/api/expensive/report')
        .expect(429);

      expect(res.body.error).toContain('Too many expensive operations');
      expect(res.body.code).toBe('EXPENSIVE_OPERATION_LIMIT_EXCEEDED');
    });

    it('should apply limit across different expensive endpoints', async () => {
      const agent = request.agent(app);

      // Use limit with report endpoint
      await agent.post('/api/expensive/report').expect(200);

      // Use remaining with export endpoint
      await agent.post('/api/expensive/export').expect(200);
      await agent.post('/api/expensive/export').expect(200);

      // Next request should be rate limited
      await agent.post('/api/expensive/report').expect(429);
    });
  });

  describe('Rate Limit Bypass Attempts', () => {
    it('should not bypass rate limit with different user agents', async () => {
      const agent = request.agent(app);

      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/auth/login')
          .set('User-Agent', 'Browser/1.0')
          .send({ email: 'test@example.com', password: 'password123' });
      }

      // Try with different user agent
      const res = await agent
        .post('/api/auth/login')
        .set('User-Agent', 'Different-Browser/2.0')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(429);

      expect(res.body.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
    });

    it('should track rate limit per IP address', async () => {
      // Note: In test environment, all requests come from same IP
      // In production, this would be different for different clients

      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Both agents share the same IP in tests
      for (let i = 0; i < 3; i++) {
        await agent1.post('/api/auth/login').send({ email: 'user1@example.com', password: 'pass' });
      }

      for (let i = 0; i < 2; i++) {
        await agent2.post('/api/auth/login').send({ email: 'user2@example.com', password: 'pass' });
      }

      // Should be rate limited because they share IP
      await agent2.post('/api/auth/login').send({ email: 'user2@example.com', password: 'pass' }).expect(429);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include standard rate limit headers', async () => {
      const res = await request(app)
        .get('/api/data')
        .expect(200);

      expect(res.headers['ratelimit-limit']).toBe('30');
      expect(parseInt(res.headers['ratelimit-remaining'])).toBeLessThanOrEqual(30);
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    it('should update remaining count after each request', async () => {
      const agent = request.agent(app);

      const res1 = await agent.get('/api/data');
      const remaining1 = parseInt(res1.headers['ratelimit-remaining']);

      const res2 = await agent.get('/api/data');
      const remaining2 = parseInt(res2.headers['ratelimit-remaining']);

      expect(remaining2).toBe(remaining1 - 1);
    });

    it('should include retry-after header when rate limited', async () => {
      const agent = request.agent(app);

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await agent.post('/api/auth/login').send({ email: 'test@example.com', password: 'pass' });
      }

      // Get rate limited response
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'pass' })
        .expect(429);

      expect(res.body.retryAfter).toBeDefined();
      expect(typeof res.body.retryAfter).toBe('string');
    });
  });

  describe('Public Endpoint Exemption', () => {
    it('should not rate limit public health check endpoint', async () => {
      const agent = request.agent(app);

      // Make many requests to health endpoint
      for (let i = 0; i < 50; i++) {
        await agent.get('/api/health').expect(200);
      }

      // Should still work
      await agent.get('/api/health').expect(200);
    });

    it('should not rate limit public endpoints', async () => {
      const agent = request.agent(app);

      for (let i = 0; i < 100; i++) {
        await agent.get('/api/public').expect(200);
      }
    });
  });

  describe('Distributed Denial of Service (DDoS) Protection', () => {
    it('should prevent rapid-fire requests', async () => {
      const agent = request.agent(app);

      // Rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          agent.post('/api/auth/login').send({ email: 'test@example.com', password: 'pass' })
        );
      }

      const results = await Promise.all(promises);

      // Some should succeed, some should be rate limited
      const rateLimited = results.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce stricter limits on authentication endpoints', async () => {
      const agent = request.agent(app);

      // Auth endpoint has limit of 5
      for (let i = 0; i < 5; i++) {
        await agent.post('/api/auth/login').send({ email: 'test@example.com', password: 'pass' });
      }

      await agent.post('/api/auth/login').send({ email: 'test@example.com', password: 'pass' }).expect(429);

      // But API endpoints have limit of 30 (different limit)
      for (let i = 0; i < 25; i++) {
        await agent.get('/api/data').expect(200);
      }
    });
  });
});
