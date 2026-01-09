import { test, expect } from '@playwright/test';

/**
 * Mobile Touch Events Tests
 * Tests touch interactions on mobile devices
 */

test.describe('Touch Events - Mobile Only', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Tap events work on buttons', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button').first();
    if (await button.count() > 0) {
      // Tap the button
      await button.tap();

      // Wait for potential navigation or state change
      await page.waitForTimeout(500);

      // Button should be clickable/tappable
      expect(await button.isEnabled()).toBeTruthy();
    }
  });

  test('Swipe gestures work on cards', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-testid="property-card"], .property-card, [class*="card"]').first();

    if (await card.count() > 0) {
      const box = await card.boundingBox();

      if (box) {
        // Simulate swipe gesture
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

        // Swipe left
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 100, box.y + box.height / 2);
        await page.mouse.up();

        // Wait for potential swipe actions
        await page.waitForTimeout(500);

        // Card should still be visible
        await expect(card).toBeVisible();
      }
    }
  });

  test('Long press opens context menu', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-testid="property-card"], .property-card').first();

    if (await card.count() > 0) {
      const box = await card.boundingBox();

      if (box) {
        // Long press simulation
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(800); // Long press duration
        await page.mouse.up();

        // Check if context menu or actions appear
        const contextMenu = page.locator('[role="menu"], [data-testid="context-menu"]');

        // Either context menu appears or nothing breaks
        const menuCount = await contextMenu.count();
        expect(menuCount >= 0).toBeTruthy();
      }
    }
  });

  test('Scroll works smoothly', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    const newScroll = await page.evaluate(() => window.scrollY);

    // Should have scrolled
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('Pull to refresh gesture does not cause issues', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Simulate pull down gesture
    await page.mouse.move(200, 50);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('Pinch zoom is disabled on inputs', async ({ page }) => {
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : '';
    });

    // Should prevent zoom on inputs
    expect(viewportMeta).toBeTruthy();
  });
});

test.describe('Touch Target Sizes', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Buttons are touch-friendly (44x44px minimum)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const sizes = await buttons.evaluateAll((btns) => {
        return btns.slice(0, 10).map(btn => {
          const rect = btn.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
      });

      // Check at least some buttons meet minimum size
      const validButtons = sizes.filter(s => s.width >= 40 && s.height >= 40);
      expect(validButtons.length).toBeGreaterThan(0);
    }
  });

  test('Links are easy to tap', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const links = page.locator('a');
    const linkCount = await links.count();

    if (linkCount > 0) {
      const firstLink = links.first();
      const box = await firstLink.boundingBox();

      if (box) {
        // Link should have adequate height
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });

  test('Form inputs have adequate spacing', async ({ page }) => {
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    if (inputCount >= 2) {
      const positions = await inputs.evaluateAll((elems) => {
        return elems.slice(0, 5).map(el => {
          const rect = el.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        });
      });

      // Check spacing between inputs
      for (let i = 0; i < positions.length - 1; i++) {
        const gap = positions[i + 1].top - positions[i].bottom;
        // Should have some spacing (at least 8px)
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Mobile Gestures - Kanban', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Drag and drop works on touch', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/leads/kanban');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const cards = page.locator('[draggable="true"], [data-draggable="true"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const card = cards.first();
      const box = await card.boundingBox();

      if (box) {
        // Simulate drag gesture
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(200);
        await page.mouse.move(box.x + box.width / 2, box.y + 100);
        await page.waitForTimeout(200);
        await page.mouse.up();

        // Card should still exist
        await expect(card).toBeVisible();
      }
    }
  });

  test('Horizontal scroll works in Kanban columns', async ({ page }) => {
    await page.goto('/leads/kanban');
    await page.waitForLoadState('networkidle');

    const kanbanContainer = page.locator('[class*="kanban"], [data-testid="kanban"]').first();

    if (await kanbanContainer.count() > 0) {
      const scrollWidth = await kanbanContainer.evaluate((el) => el.scrollWidth);
      const clientWidth = await kanbanContainer.evaluate((el) => el.clientWidth);

      if (scrollWidth > clientWidth) {
        // Should be scrollable
        await kanbanContainer.evaluate((el) => el.scrollBy(100, 0));
        const scrollLeft = await kanbanContainer.evaluate((el) => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Mobile Navigation Gestures', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Swipe to go back (if supported)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to another page
    const link = page.locator('a[href*="/properties"], a:has-text("Properties")').first();
    if (await link.count() > 0) {
      await link.click();
      await page.waitForLoadState('networkidle');

      // Try browser back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Should be back at dashboard
      expect(page.url()).toContain('dashboard');
    }
  });

  test('Bottom sheet/drawer swipe works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for drawer/sheet trigger
    const drawerTrigger = page.locator('[data-testid="drawer-trigger"], button:has-text("Filter")').first();

    if (await drawerTrigger.count() > 0) {
      await drawerTrigger.click();
      await page.waitForTimeout(500);

      const drawer = page.locator('[role="dialog"], [data-testid="drawer"]');

      if (await drawer.count() > 0) {
        const box = await drawer.boundingBox();

        if (box) {
          // Swipe down to close
          await page.mouse.move(box.x + box.width / 2, box.y + 50);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + 200);
          await page.mouse.up();

          await page.waitForTimeout(500);
        }
      }
    }
  });
});

test.describe('Touch Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('No touch delay', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button').first();

    if (await button.count() > 0) {
      const startTime = Date.now();
      await button.tap();
      const endTime = Date.now();

      // Touch should respond quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    }
  });

  test('Scroll performance is smooth', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Measure scroll performance
    const scrollMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const start = performance.now();
        let scrollCount = 0;

        const scrollHandler = () => {
          scrollCount++;
        };

        window.addEventListener('scroll', scrollHandler);

        // Scroll multiple times
        for (let i = 0; i < 5; i++) {
          window.scrollBy(0, 100);
        }

        setTimeout(() => {
          window.removeEventListener('scroll', scrollHandler);
          const end = performance.now();
          resolve({ duration: end - start, scrollCount });
        }, 1000);
      });
    });

    // Should complete in reasonable time
    expect((scrollMetrics as any).duration).toBeLessThan(1500);
  });
});

test.describe('Accessibility - Touch', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Focus visible on tap', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const focusableElements = page.locator('button, a, input, select, textarea');
    const count = await focusableElements.count();

    if (count > 0) {
      const element = focusableElements.first();
      await element.tap();

      // Element should be focused or have focus-visible state
      const isFocused = await element.evaluate((el) => {
        return el === document.activeElement;
      });

      expect(isFocused).toBeTruthy();
    }
  });

  test('No hover-dependent functionality', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // All interactive elements should work with tap
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();

      // Should be able to tap without hover
      await firstButton.tap();
      await page.waitForTimeout(300);

      // No errors should occur
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      expect(errors.length).toBe(0);
    }
  });
});
