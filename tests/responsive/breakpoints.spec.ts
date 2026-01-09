import { test, expect } from '@playwright/test';

/**
 * Responsive Breakpoint Tests
 * Tests UI behavior across different viewport sizes
 */

const breakpoints = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Mobile Large', width: 428, height: 926 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Desktop Large', width: 1920, height: 1080 },
];

for (const bp of breakpoints) {
  test.describe(`${bp.name} (${bp.width}x${bp.height})`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test('Dashboard layout adapts correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Mobile: Single column layout
      if (bp.width < 640) {
        const cards = page.locator('[data-testid="metric-card"], .metric-card').first();
        if (await cards.count() > 0) {
          const box = await cards.boundingBox();
          // Card should take most of the width on mobile
          if (box) {
            expect(box.width).toBeGreaterThan(bp.width * 0.85);
          }
        }
      }

      // Desktop: Multi-column layout
      if (bp.width >= 1024) {
        // Check if grid exists and has multiple columns
        const gridElements = page.locator('[class*="grid"], [style*="grid"]');
        const count = await gridElements.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('Navigation menu works correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Mobile: Check for hamburger menu or mobile navigation
      if (bp.width < 768) {
        const mobileMenuButton = page.locator(
          '[data-testid="mobile-menu-button"], button[aria-label*="menu"], button[aria-label*="Menu"]'
        ).first();

        const mobileNav = page.locator(
          '[data-testid="mobile-menu"], nav[class*="mobile"]'
        );

        // Either mobile menu button exists or navigation is visible
        const buttonExists = await mobileMenuButton.count() > 0;
        const navExists = await mobileNav.count() > 0;

        expect(buttonExists || navExists).toBeTruthy();
      } else {
        // Desktop: Navigation should be visible
        const desktopNav = page.locator('nav, [role="navigation"]').first();
        await expect(desktopNav).toBeVisible();
      }
    });

    test('Property list cards layout', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('networkidle');

      // Wait for content to load
      await page.waitForTimeout(1000);

      const propertyCards = page.locator('[data-testid="property-card"], .property-card, [class*="card"]');
      const cardCount = await propertyCards.count();

      if (cardCount > 0) {
        const firstCard = propertyCards.first();
        const box = await firstCard.boundingBox();

        if (box) {
          // Mobile: Cards should be nearly full width
          if (bp.width < 640) {
            expect(box.width).toBeGreaterThan(bp.width * 0.85);
          }

          // Tablet: Cards should be in 2 columns (roughly half width)
          if (bp.width >= 640 && bp.width < 1024) {
            expect(box.width).toBeLessThan(bp.width * 0.55);
            expect(box.width).toBeGreaterThan(bp.width * 0.35);
          }

          // Desktop: Cards should be in 3+ columns (roughly third width or less)
          if (bp.width >= 1024) {
            expect(box.width).toBeLessThan(bp.width * 0.4);
          }
        }
      }
    });

    test('Forms are usable', async ({ page }) => {
      await page.goto('/properties/new');
      await page.waitForLoadState('networkidle');

      // Check if form inputs are properly sized
      const inputs = page.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const firstInput = inputs.first();
        await expect(firstInput).toBeVisible();

        const box = await firstInput.boundingBox();
        if (box) {
          // Inputs should not overflow viewport
          expect(box.width).toBeLessThan(bp.width);

          // Mobile: Inputs should take most of the width
          if (bp.width < 640) {
            expect(box.width).toBeGreaterThan(bp.width * 0.7);
          }
        }
      }
    });

    test('Modals/Dialogs fit viewport', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Try to open a modal (if exists)
      const modalTriggers = page.locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      );

      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(500);

        // Check if modal/dialog appears
        const modal = page.locator('[role="dialog"], [data-testid="modal"], .modal');
        if (await modal.count() > 0) {
          const modalBox = await modal.first().boundingBox();

          if (modalBox) {
            // Modal should not overflow viewport
            expect(modalBox.width).toBeLessThanOrEqual(bp.width);
            expect(modalBox.height).toBeLessThanOrEqual(bp.height);

            // Mobile: Modal should take most of screen
            if (bp.width < 640) {
              expect(modalBox.width).toBeGreaterThan(bp.width * 0.85);
            }
          }
        }
      }
    });

    test('Tables are scrollable on small screens', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('networkidle');

      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const table = tables.first();
        const tableBox = await table.boundingBox();

        if (tableBox) {
          // On mobile, table might be in a scrollable container
          if (bp.width < 768 && tableBox.width > bp.width) {
            const scrollContainer = page.locator('[style*="overflow"], .overflow-x-auto').first();
            const hasScroll = await scrollContainer.count() > 0;
            expect(hasScroll).toBeTruthy();
          }
        }
      }
    });

    test('Images are responsive', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        const firstImage = images.first();
        if (await firstImage.isVisible()) {
          const imgBox = await firstImage.boundingBox();

          if (imgBox) {
            // Images should not overflow viewport
            expect(imgBox.width).toBeLessThanOrEqual(bp.width);
          }
        }
      }
    });

    test('Text is readable (font-size)', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check body font size
      const fontSize = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? parseInt(window.getComputedStyle(body).fontSize) : 0;
      });

      // Font should be at least 14px for readability
      expect(fontSize).toBeGreaterThanOrEqual(14);
    });

    test('Touch targets are large enough on mobile', async ({ page }) => {
      if (bp.width < 768) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button, a[role="button"]');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
          const firstButton = buttons.first();
          const box = await firstButton.boundingBox();

          if (box) {
            // Touch targets should be at least 44x44px (WCAG guideline)
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });
}

test.describe('Responsive Features', () => {
  test('Viewport meta tag is present', async ({ page }) => {
    await page.goto('/');

    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });

    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });

  test('No horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });

    const clientWidth = await page.evaluate(() => {
      return document.documentElement.clientWidth;
    });

    // Allow small differences due to scrollbars
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });
});
