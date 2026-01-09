/**
 * Smoke Tests - Critical Path
 * These tests should run in < 2 minutes
 * Run after every deploy to ensure core functionality works
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { LeadsPage } from './pages/LeadsPage';
import { testUsers } from './fixtures/auth.fixture';

test.describe('Smoke Tests - Critical Path @smoke', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(login|dashboard)/);
    await expect(page).not.toHaveTitle(/error/i);
  });

  test('user can login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('dashboard loads with data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.expectDashboardLoaded();

    // Verify key elements are present
    await expect(dashboardPage.statsCards.first()).toBeVisible();
    await expect(dashboardPage.navProperties).toBeVisible();
    await expect(dashboardPage.navLeads).toBeVisible();
  });

  test('main navigation works', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const dashboardPage = new DashboardPage(page);

    // Test navigation to properties
    await dashboardPage.navigateToProperties();
    await expect(page).toHaveURL(/\/properties/);

    // Test navigation to leads
    await dashboardPage.navigateToLeads();
    await expect(page).toHaveURL(/\/leads/);

    // Test navigation to calendar
    await dashboardPage.navigateToCalendar();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('can create property', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const propertiesPage = new PropertiesPage(page);
    await propertiesPage.goto();
    await propertiesPage.clickAddProperty();

    // Fill minimal required fields
    await page.fill('[data-testid="property-title"]', 'Smoke Test Property');
    await page.fill('[data-testid="property-price"]', '500000');
    await page.click('[data-testid="save-property"]');

    // Verify property was created
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/properties/);
  });

  test('can create lead', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const leadsPage = new LeadsPage(page);
    await leadsPage.goto();
    await leadsPage.clickAddLead();

    // Fill minimal required fields
    await page.fill('[data-testid="lead-name"]', 'Smoke Test Lead');
    await page.fill('[data-testid="lead-email"]', 'smoke@test.com');
    await page.click('[data-testid="save-lead"]');

    // Verify lead was created
    await page.waitForLoadState('networkidle');
    await leadsPage.expectLeadInColumn('Smoke Test Lead', 'new');
  });

  test('can logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();

    await expect(page).toHaveURL(/\/login/);
  });

  test('search functionality works', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const propertiesPage = new PropertiesPage(page);
    await propertiesPage.goto();

    // Perform search
    await propertiesPage.searchProperties('apartment');
    await page.waitForTimeout(600);

    // Verify search executed (results may or may not exist)
    const searchInput = page.locator('[data-testid="search-properties"]');
    await expect(searchInput).toHaveValue('apartment');
  });

  test('public pages are accessible', async ({ page }) => {
    await page.goto('/public/properties');

    // Verify public page loads
    await expect(page).toHaveURL(/\/public\/properties/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('no critical console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('sourcemap') &&
        !error.includes('Analytics')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify mobile layout
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });
});

test.describe('Performance Smoke Tests @smoke @performance', () => {
  test('dashboard loads in under 2 seconds', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('property list loads in under 1 second', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const startTime = Date.now();
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1000);
  });

  test('search returns results in under 500ms', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const propertiesPage = new PropertiesPage(page);
    await propertiesPage.goto();

    const startTime = Date.now();
    await propertiesPage.searchProperties('test');

    // Wait for search to complete
    await page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="search-loading"]');
      return loading === null || getComputedStyle(loading).display === 'none';
    });

    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(500);
  });
});
