import { describe, it, expect } from 'vitest';
import { loginAsAdmin, apiRequest } from '../helpers/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Auth Integration Tests (HTTP)', () => {
  it('Login success with valid credentials', async () => {
    const { status, body } = await loginAsAdmin(BASE_URL);
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });

  it('Login failure with wrong password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sol.com', password: 'wrongpassword' }),
    });
    expect(res.status).toBe(401);
  });

  it('Register new tenant', async () => {
    const uniqueEmail = `integration-test-${Date.now()}@test.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test User',
        email: uniqueEmail,
        password: 'TestPassword123!',
        companyName: 'Integration Test Company',
      }),
    });
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it('Access protected route without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('Register with duplicate email returns 409', async () => {
    // First registration
    const email = `duplicate-test-${Date.now()}@test.com`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'First User',
        email,
        password: 'TestPassword123!',
        companyName: 'First Company',
      }),
    });

    // Second registration with same email
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second User',
        email,
        password: 'TestPassword123!',
        companyName: 'Second Company',
      }),
    });
    // Expect conflict or bad request for duplicate email
    expect([400, 409, 422]).toContain(res.status);
  });
});
