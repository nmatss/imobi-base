import { Page, Locator, expect } from '@playwright/test';

export class PropertyDetailsPage {
  readonly page: Page;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly statusBadge: Locator;
  readonly priceDisplay: Locator;
  readonly imageGallery: Locator;
  readonly uploadImageButton: Locator;
  readonly featuredToggle: Locator;
  readonly shareButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Form fields
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly typeSelect: Locator;
  readonly statusSelect: Locator;
  readonly areaInput: Locator;
  readonly bedroomsInput: Locator;
  readonly bathroomsInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editButton = page.locator('[data-testid="edit-property"]');
    this.deleteButton = page.locator('[data-testid="delete-property"]');
    this.statusBadge = page.locator('[data-testid="status-badge"]');
    this.priceDisplay = page.locator('[data-testid="price-display"]');
    this.imageGallery = page.locator('[data-testid="image-gallery"]');
    this.uploadImageButton = page.locator('[data-testid="upload-image"]');
    this.featuredToggle = page.locator('[data-testid="featured-toggle"]');
    this.shareButton = page.locator('[data-testid="share-property"]');
    this.saveButton = page.locator('[data-testid="save-property"]');
    this.cancelButton = page.locator('[data-testid="cancel-edit"]');

    // Form fields
    this.titleInput = page.locator('[data-testid="property-title"]');
    this.descriptionInput = page.locator('[data-testid="property-description"]');
    this.priceInput = page.locator('[data-testid="property-price"]');
    this.typeSelect = page.locator('[data-testid="property-type"]');
    this.statusSelect = page.locator('[data-testid="property-status"]');
    this.areaInput = page.locator('[data-testid="property-area"]');
    this.bedroomsInput = page.locator('[data-testid="property-bedrooms"]');
    this.bathroomsInput = page.locator('[data-testid="property-bathrooms"]');
  }

  async goto(id: string) {
    await this.page.goto(`/properties/${id}`);
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.page.locator('[data-testid="confirm-delete"]').click();
  }

  async updateProperty(data: Partial<PropertyUpdateData>) {
    if (data.title) {
      await this.titleInput.fill(data.title);
    }
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.price) {
      await this.priceInput.fill(data.price.toString());
    }
    if (data.status) {
      await this.statusSelect.click();
      await this.page.locator(`[data-value="${data.status}"]`).click();
    }
  }

  async saveChanges() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async uploadImage(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  async toggleFeatured() {
    await this.featuredToggle.click();
  }

  async changeStatus(status: string) {
    await this.statusSelect.click();
    await this.page.locator(`[data-value="${status}"]`).click();
    await this.saveChanges();
  }

  async expectPropertyDetails(data: Partial<PropertyUpdateData>) {
    if (data.title) {
      await expect(this.titleInput).toHaveValue(data.title);
    }
    if (data.price) {
      await expect(this.priceDisplay).toContainText(data.price.toString());
    }
    if (data.status) {
      await expect(this.statusBadge).toContainText(data.status);
    }
  }

  async expectImageCount(count: number) {
    const images = this.page.locator('[data-testid="property-image"]');
    await expect(images).toHaveCount(count);
  }
}

interface PropertyUpdateData {
  title: string;
  description: string;
  price: number;
  status: string;
  type: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
}
