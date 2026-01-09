import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * Generates and compares screenshots across browsers
 */

test.describe('Visual Regression - Dashboard', () => {
  test('Dashboard appearance consistent across browsers', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dynamic content to stabilize
    await page.waitForTimeout(1000);

    // Mask dynamic elements (dates, times, charts)
    const dynamicSelectors = [
      '.recharts-wrapper',
      '[class*="date"]',
      '[class*="time"]',
      '[data-dynamic="true"]',
    ];

    const maskElements: any[] = [];
    for (const selector of dynamicSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        maskElements.push(elements);
      }
    }

    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
      fullPage: true,
      mask: maskElements.length > 0 ? maskElements : undefined,
      maxDiffPixels: 100,
    });
  });

  test('Dashboard dark mode consistent', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Toggle dark mode
    const darkModeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"]').first();

    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`dashboard-dark-${browserName}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    }
  });
});

test.describe('Visual Regression - Properties', () => {
  test('Property list consistent', async ({ page, browserName }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(`properties-list-${browserName}.png`, {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });

  test('Property detail page consistent', async ({ page, browserName }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click first property if exists
    const propertyLink = page.locator('a[href*="/properties/"]').first();

    if (await propertyLink.count() > 0) {
      await propertyLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot(`property-detail-${browserName}.png`, {
        fullPage: true,
        maxDiffPixels: 150,
      });
    }
  });
});

test.describe('Visual Regression - Forms', () => {
  test('New property form consistent', async ({ page, browserName }) => {
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(`property-form-${browserName}.png`, {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Form validation errors display consistently', async ({ page, browserName }) => {
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`form-errors-${browserName}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    }
  });
});

test.describe('Visual Regression - Components', () => {
  test('Buttons render consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button').first();

    if (await buttons.count() > 0) {
      await expect(buttons).toHaveScreenshot(`button-${browserName}.png`, {
        maxDiffPixels: 10,
      });
    }
  });

  test('Cards render consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[class*="card"]').first();

    if (await card.count() > 0) {
      await expect(card).toHaveScreenshot(`card-${browserName}.png`, {
        maxDiffPixels: 20,
      });
    }
  });

  test('Modals render consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const modalTrigger = page.locator('button:has-text("Add"), button:has-text("New")').first();

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();

      if (await modal.count() > 0) {
        await expect(modal).toHaveScreenshot(`modal-${browserName}.png`, {
          maxDiffPixels: 50,
        });
      }
    }
  });

  test('Dropdowns render consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const dropdownTrigger = page.locator('button[role="combobox"], select, [data-testid*="dropdown"]').first();

    if (await dropdownTrigger.count() > 0) {
      await dropdownTrigger.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`dropdown-${browserName}.png`, {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Visual Regression - Navigation', () => {
  test('Navigation menu consistent', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.count() > 0) {
      await expect(nav).toHaveScreenshot(`navigation-${browserName}.png`, {
        maxDiffPixels: 30,
      });
    }
  });

  test('Mobile menu consistent', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]').first();

    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`mobile-menu-${browserName}.png`, {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Visual Regression - Responsive', () => {
  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const bp of breakpoints) {
    test(`Dashboard at ${bp.name} (${bp.width}x${bp.height})`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot(`dashboard-${bp.name}-${browserName}.png`, {
        fullPage: false,
        maxDiffPixels: 150,
      });
    });
  }
});

test.describe('Visual Regression - Charts', () => {
  test('Charts render consistently', async ({ page, browserName }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Charts need time to render

    const chartContainer = page.locator('[class*="recharts"], [data-testid="chart"]').first();

    if (await chartContainer.count() > 0) {
      // Mask animations
      await expect(page).toHaveScreenshot(`charts-${browserName}.png`, {
        fullPage: true,
        mask: [chartContainer],
        maxDiffPixels: 200,
      });
    }
  });
});

test.describe('Visual Regression - Tables', () => {
  test('Tables render consistently', async ({ page, browserName }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table').first();

    if (await table.count() > 0) {
      await expect(table).toHaveScreenshot(`table-${browserName}.png`, {
        maxDiffPixels: 100,
      });
    }
  });

  test('Table with data renders consistently', async ({ page, browserName }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(`leads-table-${browserName}.png`, {
      fullPage: true,
      maxDiffPixels: 150,
    });
  });
});

test.describe('Visual Regression - States', () => {
  test('Loading state consistent', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Capture loading state (before networkidle)
    await page.waitForTimeout(100);

    const loadingIndicator = page.locator('[data-testid="loading"], [class*="loading"]').first();

    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toHaveScreenshot(`loading-${browserName}.png`, {
        maxDiffPixels: 30,
      });
    }
  });

  test('Empty state consistent', async ({ page, browserName }) => {
    // Visit a page that might have empty state
    await page.goto('/rentals');
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('[data-testid="empty-state"], [class*="empty"]').first();

    if (await emptyState.count() > 0) {
      await expect(emptyState).toHaveScreenshot(`empty-state-${browserName}.png`, {
        maxDiffPixels: 50,
      });
    }
  });

  test('Error state consistent', async ({ page, browserName }) => {
    // Try to trigger an error by visiting invalid route
    await page.goto('/invalid-route-12345');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(`error-state-${browserName}.png`, {
      fullPage: true,
      maxDiffPixels: 50,
    });
  });
});

test.describe('Visual Regression - Hover States', () => {
  test('Button hover state consistent', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button').first();

    if (await button.count() > 0) {
      await button.hover();
      await page.waitForTimeout(200);

      await expect(button).toHaveScreenshot(`button-hover-${browserName}.png`, {
        maxDiffPixels: 20,
      });
    }
  });

  test('Link hover state consistent', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const link = page.locator('a').first();

    if (await link.count() > 0) {
      await link.hover();
      await page.waitForTimeout(200);

      await expect(link).toHaveScreenshot(`link-hover-${browserName}.png`, {
        maxDiffPixels: 15,
      });
    }
  });
});

test.describe('Visual Regression - Typography', () => {
  test('Typography renders consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Capture headings
    const headings = page.locator('h1, h2, h3').first();

    if (await headings.count() > 0) {
      await expect(headings).toHaveScreenshot(`typography-${browserName}.png`, {
        maxDiffPixels: 20,
      });
    }
  });

  test('Font rendering quality', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if fonts loaded
    const fontLoaded = await page.evaluate(async () => {
      try {
        await document.fonts.ready;
        return true;
      } catch {
        return false;
      }
    });

    expect(fontLoaded).toBeTruthy();
  });
});

test.describe('Visual Regression - Icons', () => {
  test('Icons render consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const icon = page.locator('svg').first();

    if (await icon.count() > 0) {
      await expect(icon).toHaveScreenshot(`icon-${browserName}.png`, {
        maxDiffPixels: 10,
      });
    }
  });
});
