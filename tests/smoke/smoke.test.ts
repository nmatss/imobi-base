import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, apiRequest } from '../helpers/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Smoke Suite', () => {
  let cookies: string;

  beforeAll(async () => {
    const auth = await loginAsAdmin(BASE_URL);
    cookies = auth.cookies || '';
  });

  it('S01: Login with valid credentials returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sol.com', password: 'password' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it('S02: Login with invalid credentials returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sol.com', password: 'wrongpassword' }),
    });
    expect(res.status).toBe(401);
  });

  it('S03: Unauthenticated access returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/properties`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('S04: Dashboard stats loads', async () => {
    const { status, body } = await apiRequest('GET', '/api/dashboard/stats', cookies, undefined, BASE_URL);
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });

  it('S05: List properties returns array', async () => {
    const { status, body } = await apiRequest('GET', '/api/properties', cookies, undefined, BASE_URL);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('S06: Create property returns 201', async () => {
    const newProperty = {
      title: 'Smoke Test Property',
      type: 'apartment',
      purpose: 'rent',
      status: 'available',
      address: 'Rua Teste 123',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01000-000',
      rentValue: 2500,
      area: 80,
      bedrooms: 2,
      bathrooms: 1,
      parkingSpaces: 1,
    };
    const { status } = await apiRequest('POST', '/api/properties', cookies, newProperty, BASE_URL);
    expect(status).toBe(201);
  });

  it('S07: List leads returns array', async () => {
    const { status, body } = await apiRequest('GET', '/api/leads', cookies, undefined, BASE_URL);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('S08: Create lead returns 201', async () => {
    const newLead = {
      name: 'Smoke Test Lead',
      email: `smoketest-${Date.now()}@test.com`,
      phone: '11999999999',
      source: 'website',
      status: 'new',
      interest: 'rent',
    };
    const { status } = await apiRequest('POST', '/api/leads', cookies, newLead, BASE_URL);
    expect(status).toBe(201);
  });

  it('S09: Registration endpoint works', async () => {
    const uniqueEmail = `smoketest-${Date.now()}@test.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test User',
        email: uniqueEmail,
        password: 'TestPassword123!',
        companyName: 'Smoke Test Company',
      }),
    });
    // 201 for success or 200 depending on implementation
    expect([200, 201]).toContain(res.status);
  });

  it('S10: Logout works', async () => {
    const { status } = await apiRequest('POST', '/api/auth/logout', cookies, undefined, BASE_URL);
    expect(status).toBe(200);
  });
});
