/**
 * CSRF Protection Integration Tests
 * Tests CSRF token generation, validation, and rotation
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import { randomBytes } from 'crypto';

// Mock session store
const mockSessions = new Map<string, any>();

// CSRF excluded paths
const csrfExcludedPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/webhooks/stripe',
  '/api/webhooks/whatsapp',
  '/api/health',
];

function generateCSRFToken(): string {
  return randomBytes(32).toString('base64url');
}

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // Session middleware
  app.use(session({
    secret: 'test-secret-csrf',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'strict',
    },
    store: {
      get: (sid, callback) => callback(null, mockSessions.get(sid) || null),
      set: (sid, session, callback) => {
        mockSessions.set(sid, session);
        callback(null);
      },
      destroy: (sid, callback) => {
        mockSessions.delete(sid);
        callback(null);
      },
      touch: (sid, session, callback) => {
        mockSessions.set(sid, session);
        callback(null);
      },
    } as any,
  }));

  // CSRF Token Generation Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    next();
  });

  // CSRF Validation Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for excluded paths
    if (csrfExcludedPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const csrfTokenFromHeader = req.headers['x-csrf-token'] as string;
    const csrfTokenFromSession = req.session.csrfToken;

    if (!csrfTokenFromHeader) {
      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    if (csrfTokenFromHeader !== csrfTokenFromSession) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    next();
  });

  // Test routes
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    res.json({
      csrfToken: req.session.csrfToken,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (email === 'test@example.com' && password === 'password123') {
      // Regenerate CSRF token after login
      const oldToken = req.session.csrfToken;
      req.session.csrfToken = generateCSRFToken();

      return res.json({
        success: true,
        user: { id: '1', email },
        csrfToken: req.session.csrfToken,
        oldToken, // For testing
      });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  });

  app.post('/api/protected-resource', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Protected resource accessed',
      data: req.body,
    });
  });

  app.put('/api/protected-update', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Resource updated',
    });
  });

  app.delete('/api/protected-delete', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Resource deleted',
    });
  });

  app.post('/api/webhooks/stripe', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Webhook received',
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return app;
}

describe('CSRF Protection Integration Tests', () => {
  let app: Express;
  let agent: request.SuperAgentTest;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    agent = request.agent(app);
    mockSessions.clear();
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token on first request', async () => {
      const res = await agent
        .get('/api/csrf-token')
        .expect(200);

      expect(res.body.csrfToken).toBeDefined();
      expect(res.body.csrfToken).toHaveLength(43); // base64url(32 bytes)
    });

    it('should maintain same CSRF token across requests in same session', async () => {
      const res1 = await agent.get('/api/csrf-token').expect(200);
      const token1 = res1.body.csrfToken;

      const res2 = await agent.get('/api/csrf-token').expect(200);
      const token2 = res2.body.csrfToken;

      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different sessions', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const res1 = await agent1.get('/api/csrf-token').expect(200);
      const res2 = await agent2.get('/api/csrf-token').expect(200);

      expect(res1.body.csrfToken).toBeDefined();
      expect(res2.body.csrfToken).toBeDefined();
      expect(res1.body.csrfToken).not.toBe(res2.body.csrfToken);
    });
  });

  describe('CSRF Token Validation', () => {
    it('should accept request with valid CSRF token', async () => {
      // Get CSRF token
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      // Make protected request with valid token
      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject POST request without CSRF token', async () => {
      await agent.get('/api/csrf-token').expect(200);

      const res = await agent
        .post('/api/protected-resource')
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('CSRF token missing');
      expect(res.body.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject request with invalid CSRF token', async () => {
      await agent.get('/api/csrf-token').expect(200);

      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', 'invalid-token-12345')
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('Invalid CSRF token');
      expect(res.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should reject request with CSRF token from different session', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Get token from agent1
      const tokenRes = await agent1.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      // Try to use token from agent1 in agent2's session
      const res = await agent2
        .post('/api/protected-resource')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('Invalid CSRF token');
    });
  });

  describe('CSRF Protection for Different HTTP Methods', () => {
    it('should protect POST requests', async () => {
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);
    });

    it('should protect PUT requests', async () => {
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      await agent
        .put('/api/protected-update')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'update' })
        .expect(200);
    });

    it('should protect DELETE requests', async () => {
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      await agent
        .delete('/api/protected-delete')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);
    });

    it('should NOT protect GET requests', async () => {
      // GET requests should not require CSRF token
      await agent
        .get('/api/csrf-token')
        .expect(200);
    });
  });

  describe('CSRF Token Rotation After Login', () => {
    it('should rotate CSRF token after successful login', async () => {
      // Get initial CSRF token
      const initialRes = await agent.get('/api/csrf-token').expect(200);
      const initialToken = initialRes.body.csrfToken;

      // Login (login endpoint is CSRF-exempt)
      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const newToken = loginRes.body.csrfToken;
      const oldToken = loginRes.body.oldToken;

      // Verify token was rotated
      expect(newToken).toBeDefined();
      expect(oldToken).toBe(initialToken);
      expect(newToken).not.toBe(oldToken);

      // Old token should not work anymore
      const failRes = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', oldToken)
        .send({ data: 'test' })
        .expect(403);

      expect(failRes.body.error).toContain('Invalid CSRF token');

      // New token should work
      await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', newToken)
        .send({ data: 'test' })
        .expect(200);
    });
  });

  describe('CSRF Excluded Paths', () => {
    it('should allow webhook endpoints without CSRF token', async () => {
      await agent
        .post('/api/webhooks/stripe')
        .send({
          event: 'payment.succeeded',
          data: { amount: 1000 },
        })
        .expect(200);
    });

    it('should allow login endpoint without CSRF token', async () => {
      await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);
    });

    it('should allow health check without CSRF token', async () => {
      await agent
        .get('/api/health')
        .expect(200);
    });
  });

  describe('CSRF Token Tampering Detection', () => {
    it('should reject modified CSRF token', async () => {
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      // Tamper with token
      const tamperedToken = csrfToken.slice(0, -5) + 'XXXXX';

      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', tamperedToken)
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('Invalid CSRF token');
    });

    it('should reject empty CSRF token', async () => {
      await agent.get('/api/csrf-token').expect(200);

      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', '')
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('CSRF token missing');
    });

    it('should reject CSRF token with SQL injection attempt', async () => {
      await agent.get('/api/csrf-token').expect(200);

      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', "' OR '1'='1")
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('Invalid CSRF token');
    });

    it('should reject CSRF token with XSS attempt', async () => {
      await agent.get('/api/csrf-token').expect(200);

      const res = await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', '<script>alert(1)</script>')
        .send({ data: 'test' })
        .expect(403);

      expect(res.body.error).toContain('Invalid CSRF token');
    });
  });

  describe('CSRF Double Submit Cookie Pattern', () => {
    it('should validate CSRF token matches session value', async () => {
      const tokenRes = await agent.get('/api/csrf-token').expect(200);
      const csrfToken = tokenRes.body.csrfToken;

      // Valid token should work
      await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);

      // Different token should fail
      await agent
        .post('/api/protected-resource')
        .set('X-CSRF-Token', generateCSRFToken())
        .send({ data: 'test' })
        .expect(403);
    });
  });
});
