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
 * Test users for different roles
 */
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123!',
    name: 'Admin User',
    role: 'admin' as const,
  },
  user: {
    email: 'user@test.com',
    password: 'user123!',
    name: 'Regular User',
    role: 'user' as const,
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'viewer123!',
    name: 'Viewer User',
    role: 'viewer' as const,
  },
};

/**
 * Login helper function
 */
export async function login(page: Page, user: AuthenticatedUser) {
  await page.goto('/');

  // Check if already logged in
  const logoutButton = await page.locator('[data-testid="user-menu"]').count();
  if (logoutButton > 0) {
    return;
  }

  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });

  // Verify login success
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
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
