import { describe, it, expect } from 'vitest';

// Helper to get authenticated session cookie
export async function loginAsAdmin(baseUrl = 'http://localhost:5000') {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sol.com', password: 'password' }),
  });
  const cookies = res.headers.get('set-cookie');
  return { cookies, status: res.status, body: await res.json() };
}

export async function loginAsPortal(email: string, password: string, baseUrl = 'http://localhost:5000') {
  const res = await fetch(`${baseUrl}/api/portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { token: body.token, status: res.status, body };
}

export async function apiRequest(method: string, path: string, cookies: string, body?: any, baseUrl = 'http://localhost:5000') {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
