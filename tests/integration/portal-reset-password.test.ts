import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Validates the portal self-service password-reset contract:
 * - token + email + password required
 * - password minimum length
 * - token must match (constant-time) and not be expired
 * - token is single-use (cleared after success)
 *
 * This mirrors the logic implemented in server/routes-portal.ts using an
 * in-memory store so it can run without a database.
 */

interface Access {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
  resetToken: string | null;
  resetTokenExpires: string | null;
}

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const createTestApp = (store: Map<string, Access>) => {
  const app = express();
  app.use(express.json());

  app.post('/api/portal/reset-password', async (req, res) => {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ error: 'Token, email e nova senha são obrigatórios' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres' });
    }

    const access = store.get(email);

    const invalid =
      !access ||
      !access.isActive ||
      !access.resetToken ||
      !access.resetTokenExpires ||
      !tokensMatch(access.resetToken, String(token)) ||
      new Date(access.resetTokenExpires).getTime() < Date.now();

    if (invalid || !access) {
      return res.status(400).json({ error: 'Token inválido ou expirado. Solicite uma nova redefinição.' });
    }

    access.passwordHash = await bcrypt.hash(password, 12);
    access.resetToken = null;
    access.resetTokenExpires = null;

    return res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  });

  return app;
};

describe('Portal reset-password', () => {
  let store: Map<string, Access>;
  let app: express.Express;
  const validToken = randomBytes(32).toString('hex');

  beforeEach(() => {
    store = new Map();
    store.set('owner@test.com', {
      id: 'a1',
      email: 'owner@test.com',
      passwordHash: 'old-hash',
      isActive: true,
      resetToken: validToken,
      resetTokenExpires: new Date(Date.now() + 3600000).toISOString(),
    });
    app = createTestApp(store);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/portal/reset-password').send({ email: 'owner@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: validToken, email: 'owner@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: 'deadbeef', email: 'owner@test.com', password: 'newPassword123' });
    expect(res.status).toBe(400);
  });

  it('rejects an expired token', async () => {
    store.get('owner@test.com')!.resetTokenExpires = new Date(Date.now() - 1000).toISOString();
    const res = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: validToken, email: 'owner@test.com', password: 'newPassword123' });
    expect(res.status).toBe(400);
  });

  it('resets the password and invalidates the token (single-use)', async () => {
    const res = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: validToken, email: 'owner@test.com', password: 'newPassword123' });
    expect(res.status).toBe(200);

    const access = store.get('owner@test.com')!;
    expect(access.resetToken).toBeNull();
    expect(access.resetTokenExpires).toBeNull();
    expect(await bcrypt.compare('newPassword123', access.passwordHash!)).toBe(true);

    // Reusing the now-cleared token must fail
    const reuse = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: validToken, email: 'owner@test.com', password: 'anotherPass123' });
    expect(reuse.status).toBe(400);
  });

  it('rejects reset for inactive access', async () => {
    store.get('owner@test.com')!.isActive = false;
    const res = await request(app)
      .post('/api/portal/reset-password')
      .send({ token: validToken, email: 'owner@test.com', password: 'newPassword123' });
    expect(res.status).toBe(400);
  });
});
