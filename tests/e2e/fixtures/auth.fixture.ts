import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export interface AuthenticatedUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  viewerPage: Page;
}

/**
 * Usuários criados por `npm run db:seed` (server/seed.ts) — fonte única de
 * credenciais para os specs E2E; manter em sincronia com o seed.
 */
export const testUsers = {
  admin: {
    email: 'admin@sol.com',
    password: 'password',
    name: 'Admin Sol',
    role: 'admin' as const,
  },
  user: {
    email: 'admin@novacasa.com',
    password: 'password',
    name: 'Admin Nova Casa',
    role: 'user' as const,
  },
  viewer: {
    email: 'admin@novacasa.com',
    password: 'password',
    name: 'Admin Nova Casa',
    role: 'viewer' as const,
  },
};

/**
 * Login helper function ("/" é a landing pública — o form fica em /login)
 */
export async function login(page: Page, user: AuthenticatedUser) {
  await page.goto('/login');

  // Fill login form
  await page.fill('[data-testid="input-email"]', user.email);
  await page.fill('[data-testid="input-password"]', user.password);
  await page.click('[data-testid="button-login"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL(/\/login/, { timeout: 5000 });
}

/**
 * Extended test with authenticated fixtures
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, testUsers.user);
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, testUsers.admin);
    await use(page);
    await context.close();
  },

  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, testUsers.viewer);
    await use(page);
    await context.close();
  },
});

export { expect };
