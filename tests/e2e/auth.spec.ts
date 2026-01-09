import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { testUsers } from './fixtures/auth.fixture';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.userMenu).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should not login with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@test.com', 'wrongpassword');

    await loginPage.expectErrorMessage('Invalid credentials');
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('should not login with empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('', '');

    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();

    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.clickForgotPassword();

    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should request password reset', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.click('[data-testid="reset-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Password reset email sent'
    );
  });

  test('should reset password with valid token', async ({ page }) => {
    // Simulate having a valid reset token
    const token = 'valid-reset-token-123';
    await page.goto(`/reset-password?token=${token}`);

    await page.fill('[data-testid="new-password"]', 'NewPassword123!');
    await page.fill('[data-testid="confirm-password"]', 'NewPassword123!');
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Password reset successful'
    );
  });

  test('should verify email with valid token', async ({ page }) => {
    const token = 'valid-email-token-123';
    await page.goto(`/verify-email?token=${token}`);

    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Email verified successfully'
    );
  });

  test('should persist session after page reload', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    // Reload the page
    await page.reload();

    // Should still be logged in
    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.userMenu).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to dashboard when already logged in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    // Try to go to login page again
    await page.goto('/login');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('admin should have access to admin features', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.admin.email, testUsers.admin.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigateToSettings();

    // Admin should see users tab
    await expect(page.locator('[data-testid="settings-tab-users"]')).toBeVisible();
  });

  test('viewer should have limited access', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.viewer.email, testUsers.viewer.password);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigateToProperties();

    // Viewer should not see add property button
    await expect(page.locator('[data-testid="add-property-button"]')).not.toBeVisible();
  });

  test('should handle concurrent sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Login on both pages
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.loginAndWait(testUsers.user.email, testUsers.user.password);

    const loginPage2 = new LoginPage(page2);
    await loginPage2.goto();
    await loginPage2.loginAndWait(testUsers.user.email, testUsers.user.password);

    // Both should be logged in
    await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should handle session timeout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWait(testUsers.user.email, testUsers.user.password);

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('OAuth Authentication', () => {
  test('should display Google login button', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.googleLoginButton).toBeVisible();
  });

  test('should display Microsoft login button', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.microsoftLoginButton).toBeVisible();
  });

  test('should redirect to Google OAuth on click', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      loginPage.googleLoginButton.click(),
    ]);

    await expect(popup).toHaveURL(/accounts\.google\.com/);
  });

  test('should redirect to Microsoft OAuth on click', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      loginPage.microsoftLoginButton.click(),
    ]);

    await expect(popup).toHaveURL(/login\.microsoftonline\.com/);
  });
});
