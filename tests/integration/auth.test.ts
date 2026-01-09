import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock authentication routes
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (email === 'test@example.com' && password === 'Password123!') {
      return res.json({
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    res.json({
      success: true,
      message: 'If the email exists, you will receive password reset instructions',
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      },
    });
  });

  return app;
};

describe('Authentication API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset instructions');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Email is required');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const validToken = 'a'.repeat(64);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'short',
          password: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should fail with missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          password: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.error).toBe('Token and password are required');
    });

    it('should fail with missing password', async () => {
      const validToken = 'a'.repeat(64);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
        })
        .expect(400);

      expect(response.body.error).toBe('Token and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('admin');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should fail with invalid authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });
});
