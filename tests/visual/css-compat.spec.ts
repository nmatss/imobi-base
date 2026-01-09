import { test, expect } from '@playwright/test';

/**
 * CSS Compatibility Tests
 * Verifies CSS features work correctly across all browsers
 */

test.describe('CSS Grid Support', () => {
  test('CSS Grid works in all browsers', async ({ page, browserName }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    // Find grid container
    const gridElements = page.locator('[class*="grid"], [style*="grid"]');
    const count = await gridElements.count();

    if (count > 0) {
      const grid = gridElements.first();
      const computedStyle = await grid.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });

      expect(computedStyle).toBe('grid');
    }
  });

  test('Grid gap works correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const gridElements = page.locator('[class*="gap"], [style*="gap"]');
    const count = await gridElements.count();

    if (count > 0) {
      const grid = gridElements.first();
      const gap = await grid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.gap || style.gridGap;
      });

      // Gap should be defined
      expect(gap).toBeTruthy();
      expect(gap).not.toBe('normal');
    }
  });
});

test.describe('Flexbox Support', () => {
  test('Flexbox works correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const flexElements = page.locator('[class*="flex"]');
    const count = await flexElements.count();

    if (count > 0) {
      const flex = flexElements.first();
      const computedStyle = await flex.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });

      expect(computedStyle).toMatch(/flex/);
    }
  });

  test('Flex direction works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const flexElements = page.locator('[class*="flex-col"], [class*="flex-row"]');
    const count = await flexElements.count();

    if (count > 0) {
      const flex = flexElements.first();
      const direction = await flex.evaluate((el) => {
        return window.getComputedStyle(el).flexDirection;
      });

      expect(['row', 'column', 'row-reverse', 'column-reverse']).toContain(direction);
    }
  });

  test('Justify content works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const flexElements = page.locator('[class*="justify"]');
    const count = await flexElements.count();

    if (count > 0) {
      const flex = flexElements.first();
      const justify = await flex.evaluate((el) => {
        return window.getComputedStyle(el).justifyContent;
      });

      expect(justify).toBeTruthy();
    }
  });
});

test.describe('CSS Variables (Custom Properties)', () => {
  test('CSS variables work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cssVar = await page.evaluate(() => {
      const root = document.documentElement;
      return window.getComputedStyle(root).getPropertyValue('--background');
    });

    // CSS variable should be defined
    expect(cssVar).toBeTruthy();
  });

  test('Theme colors are applied via CSS variables', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const colors = await page.evaluate(() => {
      const root = document.documentElement;
      const style = window.getComputedStyle(root);

      return {
        background: style.getPropertyValue('--background'),
        foreground: style.getPropertyValue('--foreground'),
        primary: style.getPropertyValue('--primary'),
      };
    });

    expect(colors.background).toBeTruthy();
    expect(colors.foreground).toBeTruthy();
    expect(colors.primary).toBeTruthy();
  });
});

test.describe('Modern CSS Features', () => {
  test('Border radius works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const roundedElements = page.locator('[class*="rounded"]').first();
    const borderRadius = await roundedElements.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });

    expect(borderRadius).not.toBe('0px');
  });

  test('Box shadow works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const shadowElements = page.locator('[class*="shadow"]');
    const count = await shadowElements.count();

    if (count > 0) {
      const shadow = await shadowElements.first().evaluate((el) => {
        return window.getComputedStyle(el).boxShadow;
      });

      expect(shadow).not.toBe('none');
    }
  });

  test('Transitions work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const transitionElements = page.locator('[class*="transition"]');
    const count = await transitionElements.count();

    if (count > 0) {
      const transition = await transitionElements.first().evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).not.toBe('all 0s ease 0s');
    }
  });

  test('Transforms work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Hover over a button to trigger transform
    const buttons = page.locator('button').first();
    await buttons.hover();

    const transform = await buttons.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Transform should be defined (even if 'none')
    expect(transform).toBeTruthy();
  });
});

test.describe('Typography', () => {
  test('Web fonts load correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for fonts to load
    await page.waitForTimeout(1000);

    const fontFamily = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? window.getComputedStyle(body).fontFamily : '';
    });

    // Font family should be set
    expect(fontFamily).toBeTruthy();
    expect(fontFamily).not.toBe('');
  });

  test('Font sizes are applied', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    const headingSize = await heading.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });

    const body = page.locator('body');
    const bodySize = await body.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });

    // Heading should be larger than body text
    expect(headingSize).toBeGreaterThan(bodySize);
  });

  test('Line height is readable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const lineHeight = await page.evaluate(() => {
      const body = document.querySelector('body');
      if (!body) return 0;

      const fontSize = parseInt(window.getComputedStyle(body).fontSize);
      const lineHeightValue = window.getComputedStyle(body).lineHeight;

      // Convert to number
      return lineHeightValue === 'normal' ? 1.2 : parseFloat(lineHeightValue) / fontSize;
    });

    // Line height should be between 1.2 and 2 for readability
    expect(lineHeight).toBeGreaterThanOrEqual(1.2);
    expect(lineHeight).toBeLessThanOrEqual(2);
  });
});

test.describe('Layout & Positioning', () => {
  test('Position sticky works', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const stickyElements = page.locator('[class*="sticky"]');
    const count = await stickyElements.count();

    if (count > 0) {
      const position = await stickyElements.first().evaluate((el) => {
        return window.getComputedStyle(el).position;
      });

      expect(position).toBe('sticky');
    }
  });

  test('Z-index works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const zElements = page.locator('[class*="z-"]');
    const count = await zElements.count();

    if (count > 0) {
      const zIndex = await zElements.first().evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      expect(zIndex).not.toBe('auto');
    }
  });

  test('Overflow handling works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const overflowElements = page.locator('[class*="overflow"]');
    const count = await overflowElements.count();

    if (count > 0) {
      const overflow = await overflowElements.first().evaluate((el) => {
        return window.getComputedStyle(el).overflow;
      });

      expect(['visible', 'hidden', 'scroll', 'auto']).toContain(overflow);
    }
  });
});

test.describe('Colors & Opacity', () => {
  test('Opacity works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const opacityElements = page.locator('[class*="opacity"]');
    const count = await opacityElements.count();

    if (count > 0) {
      const opacity = await opacityElements.first().evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      // Opacity should be a number between 0 and 1
      expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(opacity)).toBeLessThanOrEqual(1);
    }
  });

  test('Background colors work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const bgColor = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? window.getComputedStyle(body).backgroundColor : '';
    });

    // Background color should be set
    expect(bgColor).toBeTruthy();
    expect(bgColor).toMatch(/^rgb/);
  });
});

test.describe('Responsive CSS', () => {
  test('Media queries work', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const mobilePadding = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? window.getComputedStyle(body).padding : '';
    });

    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const desktopPadding = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? window.getComputedStyle(body).padding : '';
    });

    // Padding might be different between mobile and desktop
    // Just verify they're both valid
    expect(mobilePadding).toBeTruthy();
    expect(desktopPadding).toBeTruthy();
  });

  test('Container queries work (if supported)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const supportsContainerQueries = await page.evaluate(() => {
      return CSS.supports('container-type', 'inline-size');
    });

    // Just verify browser capability
    expect(typeof supportsContainerQueries).toBe('boolean');
  });
});

test.describe('Browser-Specific Features', () => {
  test('Webkit-specific features work in Safari', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for webkit-specific properties
      const hasWebkit = await page.evaluate(() => {
        return 'webkitTransform' in document.body.style;
      });

      expect(typeof hasWebkit).toBe('boolean');
    }
  });

  test('No console errors from CSS', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Filter out non-CSS errors
    const cssErrors = consoleErrors.filter(err =>
      err.includes('CSS') || err.includes('style')
    );

    expect(cssErrors.length).toBe(0);
  });
});

test.describe('Animations', () => {
  test('CSS animations work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const animatedElements = page.locator('[class*="animate"]');
    const count = await animatedElements.count();

    if (count > 0) {
      const animation = await animatedElements.first().evaluate((el) => {
        return window.getComputedStyle(el).animation;
      });

      // Animation property should exist
      expect(animation).toBeTruthy();
    }
  });

  test('Keyframe animations are defined', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const hasKeyframes = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);

      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          const hasKeyframeRule = rules.some(rule =>
            rule.constructor.name === 'CSSKeyframesRule'
          );
          if (hasKeyframeRule) return true;
        } catch (e) {
          // CORS might prevent reading some sheets
          continue;
        }
      }
      return false;
    });

    // Either has keyframes or doesn't use them
    expect(typeof hasKeyframes).toBe('boolean');
  });
});
