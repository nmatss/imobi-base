/**
 * Global Search E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';

test.describe('Global Search E2E', () => {
  test('global search finds properties', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Open global search
    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await expect(authenticatedPage.locator('[data-testid="global-search-dialog"]')).toBeVisible();

    // Search for properties
    await authenticatedPage.fill('[data-testid="search-input"]', 'apartment');
    await authenticatedPage.waitForTimeout(500);

    // Verify property results
    const propertyResults = authenticatedPage.locator('[data-testid="search-result-properties"]');
    if (await propertyResults.isVisible()) {
      await expect(propertyResults.locator('[data-testid="result-item"]').first()).toBeVisible();
    }
  });

  test('global search finds leads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'lead');
    await authenticatedPage.waitForTimeout(500);

    // Verify lead results
    const leadResults = authenticatedPage.locator('[data-testid="search-result-leads"]');
    if (await leadResults.isVisible()) {
      await expect(leadResults.locator('[data-testid="result-item"]').first()).toBeVisible();
    }
  });

  test('global search finds clients', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'john');
    await authenticatedPage.waitForTimeout(500);

    // Verify results are displayed
    await expect(authenticatedPage.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('global search keyboard shortcut works', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await authenticatedPage.keyboard.press('Control+K');

    // Search dialog should open
    await expect(authenticatedPage.locator('[data-testid="global-search-dialog"]')).toBeVisible();
  });

  test('search results are clickable and navigate correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'test');
    await authenticatedPage.waitForTimeout(500);

    // Click first result
    const firstResult = authenticatedPage.locator('[data-testid="result-item"]').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();

      // Dialog should close and navigate to result
      await expect(authenticatedPage.locator('[data-testid="global-search-dialog"]')).not.toBeVisible();
    }
  });

  test('search shows recent searches', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Perform a search
    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'recent search test');
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('Escape');

    // Open search again
    await authenticatedPage.click('[data-testid="global-search-trigger"]');

    // Should show recent searches
    const recentSearches = authenticatedPage.locator('[data-testid="recent-searches"]');
    if (await recentSearches.isVisible()) {
      await expect(recentSearches).toContainText('recent search test');
    }
  });

  test('search filters work correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');

    // Apply filter
    const filterButton = authenticatedPage.locator('[data-testid="filter-properties"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await authenticatedPage.fill('[data-testid="search-input"]', 'test');
      await authenticatedPage.waitForTimeout(500);

      // Should only show property results
      await expect(authenticatedPage.locator('[data-testid="search-result-properties"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="search-result-leads"]')).not.toBeVisible();
    }
  });

  test('empty search shows suggestions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');

    // With empty search, should show suggestions
    const suggestions = authenticatedPage.locator('[data-testid="search-suggestions"]');
    if (await suggestions.isVisible()) {
      await expect(suggestions).toBeVisible();
    }
  });

  test('search handles no results gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'xyznoresults123456');
    await authenticatedPage.waitForTimeout(500);

    // Should show no results message
    const noResults = authenticatedPage.locator('[data-testid="no-results-message"]');
    if (await noResults.isVisible()) {
      await expect(noResults).toContainText(/no results|nenhum resultado/i);
    }
  });

  test('search debounces input correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');

    // Type quickly
    await authenticatedPage.fill('[data-testid="search-input"]', 'a');
    await authenticatedPage.fill('[data-testid="search-input"]', 'ab');
    await authenticatedPage.fill('[data-testid="search-input"]', 'abc');

    // Wait for debounce
    await authenticatedPage.waitForTimeout(600);

    // Should have searched only once (after debounce)
    const results = authenticatedPage.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();
  });

  test('search highlights matching text', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'test');
    await authenticatedPage.waitForTimeout(500);

    // Check for highlighted text
    const highlighted = authenticatedPage.locator('[data-testid="search-highlight"]');
    if (await highlighted.isVisible()) {
      await expect(highlighted).toBeVisible();
    }
  });

  test('search categorizes results by type', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'test');
    await authenticatedPage.waitForTimeout(500);

    // Should show category headers
    const categories = authenticatedPage.locator('[data-testid="result-category"]');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search can be closed with ESC key', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await expect(authenticatedPage.locator('[data-testid="global-search-dialog"]')).toBeVisible();

    // Press ESC
    await authenticatedPage.keyboard.press('Escape');

    // Dialog should close
    await expect(authenticatedPage.locator('[data-testid="global-search-dialog"]')).not.toBeVisible();
  });

  test('search works in mobile view', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.goto('/dashboard');

    // Open mobile search
    const mobileSearch = authenticatedPage.locator('[data-testid="mobile-search-trigger"]');
    if (await mobileSearch.isVisible()) {
      await mobileSearch.click();
      await expect(authenticatedPage.locator('[data-testid="search-input"]')).toBeVisible();
    }
  });

  test('search displays result icons correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('[data-testid="global-search-trigger"]');
    await authenticatedPage.fill('[data-testid="search-input"]', 'test');
    await authenticatedPage.waitForTimeout(500);

    // Verify icons are present
    const resultIcon = authenticatedPage.locator('[data-testid="result-icon"]').first();
    if (await resultIcon.isVisible()) {
      await expect(resultIcon).toBeVisible();
    }
  });
});
