import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly navProperties: Locator;
  readonly navLeads: Locator;
  readonly navCalendar: Locator;
  readonly navContracts: Locator;
  readonly navFinancial: Locator;
  readonly navReports: Locator;
  readonly navSettings: Locator;
  readonly statsCards: Locator;
  readonly recentActivities: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.navProperties = page.locator('[data-testid="nav-properties"]');
    this.navLeads = page.locator('[data-testid="nav-leads"]');
    this.navCalendar = page.locator('[data-testid="nav-calendar"]');
    this.navContracts = page.locator('[data-testid="nav-contracts"]');
    this.navFinancial = page.locator('[data-testid="nav-financial"]');
    this.navReports = page.locator('[data-testid="nav-reports"]');
    this.navSettings = page.locator('[data-testid="nav-settings"]');
    this.statsCards = page.locator('[data-testid="stats-card"]');
    this.recentActivities = page.locator('[data-testid="recent-activities"]');
    this.quickActions = page.locator('[data-testid="quick-actions"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateToProperties() {
    await this.navProperties.click();
    await expect(this.page).toHaveURL(/\/properties/);
  }

  async navigateToLeads() {
    await this.navLeads.click();
    await expect(this.page).toHaveURL(/\/leads/);
  }

  async navigateToCalendar() {
    await this.navCalendar.click();
    await expect(this.page).toHaveURL(/\/calendar/);
  }

  async navigateToContracts() {
    await this.navContracts.click();
    await expect(this.page).toHaveURL(/\/contracts/);
  }

  async navigateToFinancial() {
    await this.navFinancial.click();
    await expect(this.page).toHaveURL(/\/financial/);
  }

  async navigateToReports() {
    await this.navReports.click();
    await expect(this.page).toHaveURL(/\/reports/);
  }

  async navigateToSettings() {
    await this.navSettings.click();
    await expect(this.page).toHaveURL(/\/settings/);
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  async expectDashboardLoaded() {
    await expect(this.statsCards.first()).toBeVisible();
  }

  async expectStatCard(label: string, value: string) {
    const card = this.page.locator(`[data-testid="stats-card"][data-label="${label}"]`);
    await expect(card).toContainText(value);
  }
}
