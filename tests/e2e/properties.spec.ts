import { test as base, expect } from '@playwright/test';
import { test } from './fixtures/auth.fixture';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';
import { testData } from './fixtures/test-data';

test.describe('Property Management E2E', () => {
  test('user can create new property', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();
    await propertiesPage.clickAddProperty();

    const propertyData = testData.property();

    await authenticatedPage.fill('[data-testid="property-title"]', propertyData.title);
    await authenticatedPage.fill(
      '[data-testid="property-description"]',
      propertyData.description
    );
    await authenticatedPage.fill(
      '[data-testid="property-price"]',
      propertyData.price.toString()
    );
    await authenticatedPage.selectOption('[data-testid="property-type"]', propertyData.type);
    await authenticatedPage.fill(
      '[data-testid="property-area"]',
      propertyData.area.toString()
    );
    await authenticatedPage.fill(
      '[data-testid="property-bedrooms"]',
      propertyData.bedrooms.toString()
    );
    await authenticatedPage.fill(
      '[data-testid="property-bathrooms"]',
      propertyData.bathrooms.toString()
    );

    await authenticatedPage.click('[data-testid="save-property"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify property was created
    await propertiesPage.expectPropertyExists(propertyData.title);
  });

  test('user can upload property images', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    // Create a property first
    const propertyData = testData.property();
    await propertiesPage.clickAddProperty();
    await authenticatedPage.fill('[data-testid="property-title"]', propertyData.title);
    await authenticatedPage.fill(
      '[data-testid="property-price"]',
      propertyData.price.toString()
    );
    await authenticatedPage.click('[data-testid="save-property"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Click on the property
    await propertiesPage.clickProperty(propertyData.title);

    const detailsPage = new PropertyDetailsPage(authenticatedPage);

    // Upload an image (using a mock file)
    const testImagePath = 'tests/e2e/fixtures/test-image.jpg';
    await detailsPage.uploadImage(testImagePath);

    await detailsPage.expectImageCount(1);
  });

  test('user can edit property details', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    // Assume there's already a property
    await propertiesPage.clickProperty('Test Property');

    const detailsPage = new PropertyDetailsPage(authenticatedPage);
    await detailsPage.clickEdit();

    const updatedData = {
      title: 'Updated Property Title',
      price: 600000,
    };

    await detailsPage.updateProperty(updatedData);
    await detailsPage.saveChanges();

    // Verify changes
    await detailsPage.expectPropertyDetails(updatedData);
  });

  test('user can change property status', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.clickProperty('Test Property');

    const detailsPage = new PropertyDetailsPage(authenticatedPage);
    await detailsPage.clickEdit();
    await detailsPage.changeStatus('sold');

    await expect(detailsPage.statusBadge).toContainText('sold');
  });

  test('user can delete property', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    // Create a property to delete
    const propertyData = testData.property();
    await propertiesPage.clickAddProperty();
    await authenticatedPage.fill('[data-testid="property-title"]', propertyData.title);
    await authenticatedPage.fill(
      '[data-testid="property-price"]',
      propertyData.price.toString()
    );
    await authenticatedPage.click('[data-testid="save-property"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Delete the property
    await propertiesPage.clickProperty(propertyData.title);

    const detailsPage = new PropertyDetailsPage(authenticatedPage);
    await detailsPage.clickDelete();
    await detailsPage.confirmDelete();

    // Should redirect to properties list
    await expect(authenticatedPage).toHaveURL(/\/properties$/);
  });

  test('user can search properties', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.searchProperties('Apartment');
    await authenticatedPage.waitForTimeout(600); // Wait for debounce

    // Verify search results
    const propertyCards = authenticatedPage.locator('[data-testid="property-card"]');
    const count = await propertyCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('user can filter properties by type', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.filterByType('apartment');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all visible properties are apartments
    const propertyTypes = await authenticatedPage
      .locator('[data-testid="property-type"]')
      .allTextContents();
    propertyTypes.forEach((type) => {
      expect(type.toLowerCase()).toContain('apartment');
    });
  });

  test('user can filter properties by status', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.filterByStatus('available');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all visible properties are available
    const statusBadges = await authenticatedPage
      .locator('[data-testid="status-badge"]')
      .allTextContents();
    statusBadges.forEach((status) => {
      expect(status.toLowerCase()).toContain('available');
    });
  });

  test('user can view property details', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.clickProperty('Test Property');

    const detailsPage = new PropertyDetailsPage(authenticatedPage);
    await expect(detailsPage.priceDisplay).toBeVisible();
    await expect(detailsPage.statusBadge).toBeVisible();
    await expect(detailsPage.imageGallery).toBeVisible();
  });

  test('user can mark property as featured', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.clickProperty('Test Property');

    const detailsPage = new PropertyDetailsPage(authenticatedPage);
    await detailsPage.clickEdit();
    await detailsPage.toggleFeatured();
    await detailsPage.saveChanges();

    // Verify featured badge is shown
    await expect(
      authenticatedPage.locator('[data-testid="featured-badge"]')
    ).toBeVisible();
  });

  test('user can switch between grid and list view', async ({ authenticatedPage }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    await propertiesPage.switchToListView();
    await expect(propertiesPage.propertyList).toBeVisible();

    await propertiesPage.switchToGridView();
    await expect(propertiesPage.propertyCards.first()).toBeVisible();
  });

  test('property appears on public site', async ({ authenticatedPage, page }) => {
    const propertiesPage = new PropertiesPage(authenticatedPage);
    await propertiesPage.goto();

    // Create a property and mark as published
    const propertyData = testData.property();
    await propertiesPage.clickAddProperty();
    await authenticatedPage.fill('[data-testid="property-title"]', propertyData.title);
    await authenticatedPage.fill(
      '[data-testid="property-price"]',
      propertyData.price.toString()
    );
    await authenticatedPage.check('[data-testid="publish-property"]');
    await authenticatedPage.click('[data-testid="save-property"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Open public site in a new page
    await page.goto('/public/properties');

    // Verify property is visible
    await expect(page.locator('[data-testid="property-card"]', {
      hasText: propertyData.title,
    })).toBeVisible();
  });

  test('admin can bulk delete properties', async ({ adminPage }) => {
    const propertiesPage = new PropertiesPage(adminPage);
    await propertiesPage.goto();

    // Select multiple properties
    await adminPage.check('[data-testid="select-all"]');

    // Click bulk delete
    await adminPage.click('[data-testid="bulk-delete"]');
    await adminPage.click('[data-testid="confirm-bulk-delete"]');

    await adminPage.waitForLoadState('networkidle');

    // Verify properties were deleted
    await propertiesPage.expectPropertyCount(0);
  });

  test('viewer cannot delete properties', async ({ viewerPage }) => {
    const propertiesPage = new PropertiesPage(viewerPage);
    await propertiesPage.goto();

    await propertiesPage.clickProperty('Test Property');

    // Delete button should not be visible for viewers
    const detailsPage = new PropertyDetailsPage(viewerPage);
    await expect(detailsPage.deleteButton).not.toBeVisible();
  });
});
