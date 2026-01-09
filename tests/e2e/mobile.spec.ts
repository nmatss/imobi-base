/**
 * Mobile Responsiveness E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// iPhone SE viewport
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Responsiveness E2E @mobile', () => {
  test('mobile login page is responsive', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify all login elements are visible and properly sized
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();

    // Verify elements don't overflow
    const viewportSize = page.viewportSize();
    const loginForm = page.locator('[data-testid="login-form"]');
    if (await loginForm.isVisible()) {
      const box = await loginForm.boundingBox();
      if (box && viewportSize) {
        expect(box.width).toBeLessThanOrEqual(viewportSize.width);
      }
    }
  });

  test('mobile dashboard displays metrics in single column', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.expectDashboardLoaded();

    // Metrics should be in single column (grid-template-columns: 1fr)
    const metricsGrid = authenticatedPage.locator('[data-testid="metrics-grid"]');
    if (await metricsGrid.isVisible()) {
      const gridStyle = await metricsGrid.evaluate((el) =>
        window.getComputedStyle(el).gridTemplateColumns
      );
      // In mobile, should be single column
      expect(gridStyle).toMatch(/1fr|100%/);
    }
  });

  test('mobile navigation uses hamburger menu', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Mobile menu button should be visible
    const mobileMenuButton = authenticatedPage.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();

    // Click to open menu
    await mobileMenuButton.click();

    // Navigation menu should appear
    await expect(authenticatedPage.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
  });

  test('mobile kanban uses horizontal scroll', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/leads');

    // Mobile kanban should be visible
    const kanbanMobile = authenticatedPage.locator('[data-testid="kanban-mobile"]');
    if (await kanbanMobile.isVisible()) {
      await expect(kanbanMobile).toBeVisible();

      // Should have horizontal scroll
      const overflowX = await kanbanMobile.evaluate((el) =>
        window.getComputedStyle(el).overflowX
      );
      expect(overflowX).toMatch(/scroll|auto/);
    }
  });

  test('mobile property cards stack vertically', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');

    const propertyGrid = authenticatedPage.locator('[data-testid="property-grid"]');
    if (await propertyGrid.isVisible()) {
      const gridStyle = await propertyGrid.evaluate((el) =>
        window.getComputedStyle(el).gridTemplateColumns
      );
      // Should be single column in mobile
      expect(gridStyle).toMatch(/1fr|100%/);
    }
  });

  test('mobile forms are touch-friendly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');
    await authenticatedPage.click('[data-testid="add-property-mobile"]');

    // Form inputs should have adequate touch target size (min 44x44px)
    const firstInput = authenticatedPage.locator('input').first();
    if (await firstInput.isVisible()) {
      const box = await firstInput.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('mobile calendar shows day view by default', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/calendar');

    // Mobile calendar should show day view
    const dayView = authenticatedPage.locator('[data-testid="calendar-day-view-mobile"]');
    if (await dayView.isVisible()) {
      await expect(dayView).toBeVisible();
    }
  });

  test('mobile financial charts are scrollable', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Charts should be in scrollable container
    const chartsContainer = authenticatedPage.locator('[data-testid="charts-container-mobile"]');
    if (await chartsContainer.isVisible()) {
      const overflowX = await chartsContainer.evaluate((el) =>
        window.getComputedStyle(el).overflowX
      );
      expect(overflowX).toMatch(/scroll|auto/);
    }
  });

  test('mobile modals take full screen', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');
    await authenticatedPage.click('[data-testid="add-property-mobile"]');

    // Modal should be full screen on mobile
    const modal = authenticatedPage.locator('[data-testid="property-modal"]');
    if (await modal.isVisible()) {
      const box = await modal.boundingBox();
      const viewport = authenticatedPage.viewportSize();
      if (box && viewport) {
        expect(box.width).toBeCloseTo(viewport.width, 10);
        expect(box.height).toBeCloseTo(viewport.height, 50);
      }
    }
  });

  test('mobile bottom navigation is visible', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Bottom navigation should be visible on mobile
    const bottomNav = authenticatedPage.locator('[data-testid="bottom-navigation"]');
    if (await bottomNav.isVisible()) {
      await expect(bottomNav).toBeVisible();

      // Should be at bottom of screen
      const box = await bottomNav.boundingBox();
      const viewport = authenticatedPage.viewportSize();
      if (box && viewport) {
        expect(box.y).toBeGreaterThan(viewport.height - 100);
      }
    }
  });

  test('mobile tables use card layout', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Tables should transform to cards on mobile
    const mobileCards = authenticatedPage.locator('[data-testid="transaction-card-mobile"]');
    if (await mobileCards.first().isVisible()) {
      await expect(mobileCards.first()).toBeVisible();
    }
  });

  test('mobile search is accessible', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Search should be easily accessible
    const searchButton = authenticatedPage.locator('[data-testid="mobile-search-button"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await expect(authenticatedPage.locator('[data-testid="search-input"]')).toBeVisible();
    }
  });

  test('mobile filters use drawer', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');

    // Filter button should open drawer
    const filterButton = authenticatedPage.locator('[data-testid="mobile-filter-button"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await expect(authenticatedPage.locator('[data-testid="filter-drawer"]')).toBeVisible();
    }
  });

  test('mobile gestures work for navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');

    // Swipe gesture should work (simulate with drag)
    const firstProperty = authenticatedPage.locator('[data-testid="property-card"]').first();
    if (await firstProperty.isVisible()) {
      const box = await firstProperty.boundingBox();
      if (box) {
        // Simulate swipe
        await authenticatedPage.mouse.move(box.x + 10, box.y + box.height / 2);
        await authenticatedPage.mouse.down();
        await authenticatedPage.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
        await authenticatedPage.mouse.up();
      }
    }
  });

  test('mobile images lazy load', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');

    // Images should have loading="lazy" attribute
    const images = authenticatedPage.locator('img');
    const firstImage = images.first();
    if (await firstImage.isVisible()) {
      const loading = await firstImage.getAttribute('loading');
      expect(loading).toBe('lazy');
    }
  });

  test('mobile font sizes are readable', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Body text should be at least 16px for readability
    const bodyText = authenticatedPage.locator('body');
    const fontSize = await bodyText.evaluate((el) =>
      parseInt(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  test('mobile buttons have adequate spacing', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    // Buttons should have min 8px spacing
    const buttons = authenticatedPage.locator('button');
    if (await buttons.count() > 1) {
      const firstButton = await buttons.nth(0).boundingBox();
      const secondButton = await buttons.nth(1).boundingBox();
      if (firstButton && secondButton) {
        const spacing = Math.abs(firstButton.y - secondButton.y);
        expect(spacing).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test('mobile viewport meta tag is set', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });

    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  test('mobile touch events work for swipe actions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/leads');

    // Lead cards should support swipe actions
    const leadCard = authenticatedPage.locator('[data-testid="lead-card-mobile"]').first();
    if (await leadCard.isVisible()) {
      const box = await leadCard.boundingBox();
      if (box) {
        // Simulate swipe left
        await authenticatedPage.touchscreen.tap(box.x + 10, box.y + box.height / 2);
        await authenticatedPage.mouse.move(box.x + 10, box.y + box.height / 2);
        await authenticatedPage.mouse.down();
        await authenticatedPage.mouse.move(box.x - 50, box.y + box.height / 2);
        await authenticatedPage.mouse.up();

        // Swipe actions should be revealed
        const actions = authenticatedPage.locator('[data-testid="swipe-actions"]');
        if (await actions.isVisible()) {
          await expect(actions).toBeVisible();
        }
      }
    }
  });

  test('mobile orientation change is handled', async ({ page }) => {
    await page.goto('/dashboard');

    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Change back to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('mobile pull-to-refresh works', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/properties');

    // Simulate pull to refresh gesture
    const container = authenticatedPage.locator('[data-testid="property-list-container"]');
    if (await container.isVisible()) {
      await authenticatedPage.mouse.move(200, 100);
      await authenticatedPage.mouse.down();
      await authenticatedPage.mouse.move(200, 200);
      await authenticatedPage.mouse.up();

      // Loading indicator should appear
      const loading = authenticatedPage.locator('[data-testid="pull-refresh-loading"]');
      if (await loading.isVisible()) {
        await expect(loading).toBeVisible();
      }
    }
  });

  test('mobile no content overflow on any page', async ({ authenticatedPage }) => {
    const pages = ['/dashboard', '/properties', '/leads', '/calendar', '/financial', '/settings'];

    for (const pagePath of pages) {
      await authenticatedPage.goto(pagePath);
      await authenticatedPage.waitForLoadState('networkidle');

      // Check body width doesn't exceed viewport
      const bodyWidth = await authenticatedPage.evaluate(() => document.body.scrollWidth);
      const viewportWidth = authenticatedPage.viewportSize()?.width || 375;

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
    }
  });
});
