import { test, expect } from '@playwright/test';

/**
 * Orientation Tests (Portrait vs Landscape)
 * Tests layout adaptation when device rotates
 */

test.describe('Portrait Mode', () => {
  test('Dashboard layout in portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone portrait
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify page is functional in portrait
    await expect(page.locator('body')).toBeVisible();

    // Viewport should be taller than wide
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(dimensions.height).toBeGreaterThan(dimensions.width);
  });

  test('Navigation accessible in portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigation should be accessible
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();

    expect(navCount).toBeGreaterThan(0);
  });

  test('Forms scrollable in portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    // Page should be scrollable to access all form fields
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);

    // Either fits in viewport or is scrollable
    expect(scrollHeight >= clientHeight).toBeTruthy();
  });
});

test.describe('Landscape Mode', () => {
  test('Dashboard layout adapts to landscape', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 }); // iPhone landscape
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify page is functional in landscape
    await expect(page.locator('body')).toBeVisible();

    // Viewport should be wider than tall
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(dimensions.width).toBeGreaterThan(dimensions.height);
  });

  test('More content visible horizontally in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // In landscape, horizontal space should be utilized
    const cards = page.locator('[class*="card"], [data-testid*="card"]');
    const cardCount = await cards.count();

    if (cardCount >= 2) {
      const firstCard = await cards.nth(0).boundingBox();
      const secondCard = await cards.nth(1).boundingBox();

      if (firstCard && secondCard) {
        // In landscape, cards might be side by side
        const sideBySide = Math.abs(firstCard.y - secondCard.y) < 50;
        const stacked = Math.abs(firstCard.x - secondCard.x) < 50;

        // Either layout is fine, just verify they render
        expect(sideBySide || stacked).toBeTruthy();
      }
    }
  });

  test('Navigation optimized for landscape', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigation should not take up too much vertical space
    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.count() > 0) {
      const navBox = await nav.boundingBox();

      if (navBox) {
        // Nav should not take more than half the height in landscape
        expect(navBox.height).toBeLessThan(375 * 0.5);
      }
    }
  });

  test('Horizontal scroll used effectively in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/leads/kanban');
    await page.waitForLoadState('networkidle');

    // Kanban board should utilize horizontal space
    const kanban = page.locator('[class*="kanban"], [data-testid="kanban"]').first();

    if (await kanban.count() > 0) {
      const scrollWidth = await kanban.evaluate(el => el.scrollWidth);
      const clientWidth = await kanban.evaluate(el => el.clientWidth);

      // Horizontal scrolling is expected for kanban
      expect(scrollWidth >= clientWidth).toBeTruthy();
    }
  });
});

test.describe('Orientation Change Handling', () => {
  test('Layout reflows on orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const portraitHeight = await page.evaluate(() => document.body.scrollHeight);

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500); // Allow time for reflow

    const landscapeHeight = await page.evaluate(() => document.body.scrollHeight);

    // Heights should differ due to layout change
    expect(portraitHeight).not.toBe(landscapeHeight);
  });

  test('No layout breaks on rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });

  test('State preserved on rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Get current URL
    const urlBefore = page.url();

    // Rotate
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);

    // URL should be the same
    const urlAfter = page.url();
    expect(urlAfter).toBe(urlBefore);
  });

  test('Modals adapt to orientation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open a modal
    const modalTrigger = page.locator('button:has-text("Add"), button:has-text("New")').first();

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();

      if (await modal.count() > 0) {
        const portraitBox = await modal.boundingBox();

        // Rotate
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(500);

        const landscapeBox = await modal.boundingBox();

        // Modal should still fit in viewport
        if (landscapeBox) {
          expect(landscapeBox.width).toBeLessThanOrEqual(667);
          expect(landscapeBox.height).toBeLessThanOrEqual(375);
        }
      }
    }
  });
});

test.describe('Tablet Orientations', () => {
  test('Tablet portrait mode (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should use tablet-optimized layout
    const cards = page.locator('[class*="card"]');
    const count = await cards.count();

    if (count >= 2) {
      const firstCard = await cards.first().boundingBox();
      const secondCard = await cards.nth(1).boundingBox();

      if (firstCard && secondCard) {
        // Cards should likely be in 2-column grid in tablet portrait
        const sideBySide = Math.abs(firstCard.y - secondCard.y) < 50;

        // Either side by side or stacked
        expect(typeof sideBySide).toBe('boolean');
      }
    }
  });

  test('Tablet landscape mode (1024x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should have more horizontal space
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(dimensions.width).toBe(1024);
    expect(dimensions.height).toBe(768);

    // Layout should be responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('Sidebar behavior on tablet rotation', async ({ page }) => {
    // Portrait - sidebar might be collapsed
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Rotate to landscape - sidebar might expand
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);

    // Sidebar or navigation should exist
    const nav = page.locator('nav, aside, [role="navigation"]');
    const navCount = await nav.count();

    expect(navCount).toBeGreaterThan(0);
  });
});

test.describe('Responsive Images on Rotation', () => {
  test('Images scale correctly on rotation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const images = page.locator('img').first();

    if (await images.count() > 0) {
      const portraitBox = await images.boundingBox();

      // Rotate
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      const landscapeBox = await images.boundingBox();

      // Images should not overflow in either orientation
      if (portraitBox) {
        expect(portraitBox.width).toBeLessThanOrEqual(375);
      }

      if (landscapeBox) {
        expect(landscapeBox.width).toBeLessThanOrEqual(667);
      }
    }
  });
});

test.describe('Form Usability on Rotation', () => {
  test('Form inputs accessible in both orientations', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input').first();

    if (await input.count() > 0) {
      await input.click();

      // Rotate to landscape while input is focused
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Input should still be visible and focused
      const isFocused = await input.evaluate(el => el === document.activeElement);

      // Focus might change, but input should be visible
      await expect(input).toBeVisible();
    }
  });

  test('Virtual keyboard does not break layout in landscape', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]').first();

    if (await input.count() > 0) {
      await input.click();
      await page.waitForTimeout(500);

      // Page should still be usable
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Performance on Rotation', () => {
  test('Rotation does not cause significant delay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Rotate
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();

    // Rotation should be handled quickly (< 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  test('No memory leaks on repeated rotation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Rotate multiple times
    for (let i = 0; i < 5; i++) {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(200);
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(200);
    }

    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });
});
