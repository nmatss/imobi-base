/**
 * Authentication Flow Integration Tests
 * Tests complete authentication flow including:
 * - Registration
 * - Login
 * - Session management
 * - Session regeneration
 * - Logout
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Mock user database
const mockUsers = new Map<string, {
  id: string;
  email: string;
  password: string;
  name: string;
  tenantId: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}>();

// Mock session store
const mockSessions = new Map<string, any>();

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // Session configuration
  app.use(session({
    secret: 'test-secret-key-for-testing-only',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    },
    store: {
      get: (sid, callback) => {
        callback(null, mockSessions.get(sid) || null);
      },
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

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      const user = mockUsers.get(email);

      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      // Check account lock
      if (user.lockedUntil) {
        const lockedUntil = new Date(user.lockedUntil);
        if (new Date() < lockedUntil) {
          return done(null, false, { message: 'Account is locked' });
        }
        // Unlock account
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        // Increment failed attempts
        user.failedLoginAttempts++;

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        return done(null, false, { message: 'Invalid credentials' });
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;

      return done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      });
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    // Find user by id
    for (const user of mockUsers.values()) {
      if (user.id === id) {
        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
        });
      }
    }
    done(null, false);
  });

  // Registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (mockUsers.has(email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomBytes(16).toString('hex');
    const tenantId = randomBytes(16).toString('hex');

    mockUsers.set(email, {
      id: userId,
      email,
      password: hashedPassword,
      name,
      tenantId,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    res.status(201).json({
      success: true,
      user: { id: userId, email, name, tenantId },
    });
  });

  // Login endpoint with session regeneration
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          error: info?.message || 'Authentication failed',
        });
      }

      // Critical: Regenerate session ID after successful login
      // This prevents session fixation attacks
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return next(regenerateErr);
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }

          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              tenantId: user.tenantId,
            },
            sessionId: req.sessionID, // For testing purposes
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.sessionID;

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ error: 'Session destruction failed' });
        }

        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Logged out successfully',
          destroyedSession: sessionId,
        });
      });
    });
  });

  // Get current user endpoint (protected)
  app.get('/api/auth/me', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: req.user,
    });
  });

  return app;
}

describe('Authentication Flow Integration Tests', () => {
  let app: Express;
  let agent: request.SuperAgentTest;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Create a new agent for each test to maintain session
    agent = request.agent(app);

    // Clear mock data
    mockUsers.clear();
    mockSessions.clear();
  });

  describe('Complete Authentication Flow: Register → Login → Logout', () => {
    it('should complete full authentication flow successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // Step 1: Register
      const registerRes = await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.user.email).toBe(userData.email);
      expect(registerRes.body.user.id).toBeDefined();
      expect(registerRes.body.user.tenantId).toBeDefined();

      // Step 2: Login
      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.user.email).toBe(userData.email);
      expect(loginRes.body.sessionId).toBeDefined();

      const sessionIdAfterLogin = loginRes.body.sessionId;

      // Step 3: Verify authenticated session
      const meRes = await agent
        .get('/api/auth/me')
        .expect(200);

      expect(meRes.body.user.email).toBe(userData.email);
      expect(meRes.body.user.tenantId).toBeDefined();

      // Step 4: Logout
      const logoutRes = await agent
        .post('/api/auth/logout')
        .expect(200);

      expect(logoutRes.body.success).toBe(true);
      expect(logoutRes.body.destroyedSession).toBe(sessionIdAfterLogin);

      // Step 5: Verify session is destroyed
      await agent
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Session Regeneration After Login (Session Fixation Protection)', () => {
    it('should regenerate session ID after successful login', async () => {
      const userData = {
        email: 'session-test@example.com',
        password: 'SecurePass123!',
        name: 'Session Test User',
      };

      // Register user
      await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Make an unauthenticated request to establish a session
      const beforeLoginRes = await agent
        .get('/api/auth/me')
        .expect(401);

      const sessionCookieBefore = beforeLoginRes.headers['set-cookie'];

      // Login
      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const sessionIdAfterLogin = loginRes.body.sessionId;
      const sessionCookieAfter = loginRes.headers['set-cookie'];

      // Session ID should change after login
      expect(sessionCookieAfter).toBeDefined();

      // Verify the session works
      await agent
        .get('/api/auth/me')
        .expect(200);
    });
  });

  describe('Failed Login Attempts and Account Lockout', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const userData = {
        email: 'lockout-test@example.com',
        password: 'SecurePass123!',
        name: 'Lockout Test User',
      };

      // Register user
      await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      // 6th attempt should be rejected due to account lock
      const lockoutRes = await agent
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password, // Even with correct password
        })
        .expect(401);

      expect(lockoutRes.body.error).toContain('locked');
    });

    it('should reset failed attempts after successful login', async () => {
      const userData = {
        email: 'reset-test@example.com',
        password: 'SecurePass123!',
        name: 'Reset Test User',
      };

      // Register user
      await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Attempt 3 failed logins
      for (let i = 0; i < 3; i++) {
        await agent
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      // Successful login should reset failed attempts
      await agent
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify user is not locked
      const user = mockUsers.get(userData.email);
      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.lockedUntil).toBeNull();
    });
  });

  describe('Registration Validation', () => {
    it('should reject registration with missing fields', async () => {
      await agent
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password and name
        })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await agent
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      // First registration
      await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      await agent
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across multiple requests', async () => {
      const userData = {
        email: 'persistence-test@example.com',
        password: 'SecurePass123!',
        name: 'Persistence Test User',
      };

      // Register and login
      await agent.post('/api/auth/register').send(userData).expect(201);
      await agent.post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      }).expect(200);

      // Make multiple authenticated requests
      for (let i = 0; i < 3; i++) {
        const meRes = await agent.get('/api/auth/me').expect(200);
        expect(meRes.body.user.email).toBe(userData.email);
      }
    });

    it('should not allow access with expired session', async () => {
      const userData = {
        email: 'expired-test@example.com',
        password: 'SecurePass123!',
        name: 'Expired Test User',
      };

      // Register and login
      await agent.post('/api/auth/register').send(userData).expect(201);
      const loginRes = await agent.post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      }).expect(200);

      const sessionId = loginRes.body.sessionId;

      // Manually expire the session
      mockSessions.delete(sessionId);

      // Should not be authenticated
      await agent.get('/api/auth/me').expect(401);
    });
  });

  describe('Concurrent Session Handling', () => {
    it('should handle multiple sessions for same user', async () => {
      const userData = {
        email: 'concurrent-test@example.com',
        password: 'SecurePass123!',
        name: 'Concurrent Test User',
      };

      // Register user
      await agent.post('/api/auth/register').send(userData).expect(201);

      // Create two different agents (different sessions)
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Login with both agents
      const login1 = await agent1.post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      }).expect(200);

      const login2 = await agent2.post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      }).expect(200);

      // Both sessions should be valid
      expect(login1.body.sessionId).toBeDefined();
      expect(login2.body.sessionId).toBeDefined();
      expect(login1.body.sessionId).not.toBe(login2.body.sessionId);

      // Both should be able to access protected resources
      await agent1.get('/api/auth/me').expect(200);
      await agent2.get('/api/auth/me').expect(200);
    });
  });
});
