import { Page, Locator, expect } from '@playwright/test';

export class PropertiesPage {
  readonly page: Page;
  readonly addPropertyButton: Locator;
  readonly searchInput: Locator;
  readonly filterType: Locator;
  readonly filterStatus: Locator;
  readonly propertyCards: Locator;
  readonly propertyList: Locator;
  readonly viewGridButton: Locator;
  readonly viewListButton: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addPropertyButton = page.locator('[data-testid="add-property-button"]');
    this.searchInput = page.locator('[data-testid="search-properties"]');
    this.filterType = page.locator('[data-testid="filter-type"]');
    this.filterStatus = page.locator('[data-testid="filter-status"]');
    this.propertyCards = page.locator('[data-testid="property-card"]');
    this.propertyList = page.locator('[data-testid="property-list"]');
    this.viewGridButton = page.locator('[data-testid="view-grid"]');
    this.viewListButton = page.locator('[data-testid="view-list"]');
    this.exportButton = page.locator('[data-testid="export-properties"]');
  }

  async goto() {
    await this.page.goto('/properties');
  }

  async clickAddProperty() {
    await this.addPropertyButton.click();
  }

  async searchProperties(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByType(type: string) {
    await this.filterType.click();
    await this.page.locator(`[data-value="${type}"]`).click();
  }

  async filterByStatus(status: string) {
    await this.filterStatus.click();
    await this.page.locator(`[data-value="${status}"]`).click();
  }

  async clickProperty(title: string) {
    await this.page.locator(`[data-testid="property-card"][data-title="${title}"]`).click();
  }

  async expectPropertyExists(title: string) {
    const property = this.page.locator(`[data-testid="property-card"]`, {
      hasText: title,
    });
    await expect(property).toBeVisible();
  }

  async expectPropertyCount(count: number) {
    await expect(this.propertyCards).toHaveCount(count);
  }

  async switchToGridView() {
    await this.viewGridButton.click();
  }

  async switchToListView() {
    await this.viewListButton.click();
  }
}
