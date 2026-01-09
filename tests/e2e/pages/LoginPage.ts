import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly googleLoginButton: Locator;
  readonly microsoftLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.googleLoginButton = page.locator('[data-testid="google-login-button"]');
    this.microsoftLoginButton = page.locator('[data-testid="microsoft-login-button"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginAndWait(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
