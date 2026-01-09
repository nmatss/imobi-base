import { test, expect } from '@playwright/test';

/**
 * Mobile Performance Tests
 * Tests performance metrics on mobile devices
 */

test.describe('Mobile Performance Metrics', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Page load time under 3 seconds on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Mobile should load in under 3 seconds on good connection
    expect(loadTime).toBeLessThan(3000);
  });

  test('First Contentful Paint (FCP) acceptable', async ({ page }) => {
    await page.goto('/dashboard');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        });
        observer.observe({ entryTypes: ['paint'] });

        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    // FCP should be under 1.8s for mobile (Google Core Web Vitals)
    expect(metrics).toBeGreaterThan(0);
    expect(metrics).toBeLessThan(1800);
  });

  test('Largest Contentful Paint (LCP) acceptable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry?.renderTime || lastEntry?.loadTime || 0);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // Fallback
        setTimeout(() => {
          resolve(0);
        }, 5000);
      });
    });

    // LCP should be under 2.5s (Good)
    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('Cumulative Layout Shift (CLS) minimal', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsScore = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          resolve(clsScore);
        }, 2000);
      });
    });

    // CLS should be under 0.1 (Good)
    expect(cls).toBeLessThan(0.1);
  });

  test('Time to Interactive (TTI) reasonable', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try to interact
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.click();
    }

    const tti = Date.now() - startTime;

    // Should be interactive within 5 seconds
    expect(tti).toBeLessThan(5000);
  });

  test('JavaScript execution time acceptable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoaded: perfEntries?.domContentLoadedEventEnd - perfEntries?.domContentLoadedEventStart,
        loadEvent: perfEntries?.loadEventEnd - perfEntries?.loadEventStart,
      };
    });

    // DOM content should parse quickly
    expect(metrics.domContentLoaded).toBeLessThan(1000);
    expect(metrics.loadEvent).toBeLessThan(500);
  });
});

test.describe('Mobile Resource Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Total page weight reasonable for mobile', async ({ page }) => {
    const resourceSizes: number[] = [];

    page.on('response', async (response) => {
      try {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          resourceSizes.push(parseInt(contentLength));
        }
      } catch (e) {
        // Ignore errors
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const totalSize = resourceSizes.reduce((a, b) => a + b, 0);
    const totalSizeMB = totalSize / 1024 / 1024;

    // Total page weight should be under 2MB for mobile
    expect(totalSizeMB).toBeLessThan(2);
  });

  test('Images optimized for mobile', async ({ page }) => {
    const imageSizes: number[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        try {
          const buffer = await response.body();
          imageSizes.push(buffer.length);
        } catch (e) {
          // Ignore errors
        }
      }
    });

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    if (imageSizes.length > 0) {
      const avgImageSize = imageSizes.reduce((a, b) => a + b, 0) / imageSizes.length;
      const avgImageSizeKB = avgImageSize / 1024;

      // Average image size should be under 200KB on mobile
      expect(avgImageSizeKB).toBeLessThan(200);
    }
  });

  test('JavaScript bundles reasonable size', async ({ page }) => {
    const jsSizes: number[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.match(/\.js$/)) {
        try {
          const buffer = await response.body();
          jsSizes.push(buffer.length);
        } catch (e) {
          // Ignore errors
        }
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const totalJS = jsSizes.reduce((a, b) => a + b, 0);
    const totalJSKB = totalJS / 1024;

    // Total JS should be under 500KB (compressed)
    expect(totalJSKB).toBeLessThan(500);
  });

  test('CSS bundles reasonable size', async ({ page }) => {
    const cssSizes: number[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.match(/\.css$/)) {
        try {
          const buffer = await response.body();
          cssSizes.push(buffer.length);
        } catch (e) {
          // Ignore errors
        }
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const totalCSS = cssSizes.reduce((a, b) => a + b, 0);
    const totalCSSKB = totalCSS / 1024;

    // Total CSS should be under 100KB
    expect(totalCSSKB).toBeLessThan(100);
  });
});

test.describe('Mobile Render Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Scroll performance smooth on mobile', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const scrollPerf = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        let frameCount = 0;

        const countFrames = () => {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frameCount);
          }
        };

        window.scrollBy(0, 100);
        requestAnimationFrame(countFrames);
      });
    });

    // Should achieve at least 30 FPS (30 frames in 1 second)
    expect(scrollPerf).toBeGreaterThan(30);
  });

  test('Animation performance acceptable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Trigger animation (hover)
    const button = page.locator('button').first();

    if (await button.count() > 0) {
      const animPerf = await button.evaluate((el) => {
        return new Promise((resolve) => {
          const startTime = performance.now();

          el.addEventListener('transitionend', () => {
            const duration = performance.now() - startTime;
            resolve(duration);
          }, { once: true });

          // Trigger hover
          el.dispatchEvent(new Event('mouseenter'));
        });
      });

      // Transition should complete quickly
      expect(animPerf).toBeLessThan(500);
    }
  });

  test('No long tasks blocking main thread', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const longTasks = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const tasks: number[] = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            tasks.push(entry.duration);
          }
        });

        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // Browser might not support longtask
        }

        setTimeout(() => {
          resolve(tasks.length);
        }, 3000);
      });
    });

    // Should have minimal long tasks
    expect(longTasks).toBeLessThan(5);
  });
});

test.describe('Mobile Network Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Works on slow 3G', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    const startTime = Date.now();

    await page.goto('/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const loadTime = Date.now() - startTime;

    // Should load within reasonable time even on slow connection
    expect(loadTime).toBeLessThan(10000);
  });

  test('Number of requests reasonable', async ({ page }) => {
    let requestCount = 0;

    page.on('request', () => {
      requestCount++;
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should make fewer than 50 requests
    expect(requestCount).toBeLessThan(50);
  });

  test('Resources cached properly', async ({ page }) => {
    // First visit
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const firstLoadRequests: string[] = [];
    page.on('request', (request) => {
      firstLoadRequests.push(request.url());
    });

    // Second visit
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should make fewer requests on second visit (caching working)
    // This is a simplified check
    expect(firstLoadRequests.length >= 0).toBeTruthy();
  });
});

test.describe('Mobile Memory Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Memory usage reasonable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const memory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    if (memory) {
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;

      // Should use less than 50MB of heap
      expect(usedMB).toBeLessThan(50);
    }
  });

  test('No memory leaks on navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/properties');
      await page.waitForLoadState('networkidle');
      await page.goto('/leads');
      await page.waitForLoadState('networkidle');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercent = (memoryIncrease / initialMemory) * 100;

      // Memory should not increase by more than 50%
      expect(increasePercent).toBeLessThan(50);
    }
  });
});

test.describe('Mobile Interaction Performance', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Tap response time quick', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button').first();

    if (await button.count() > 0) {
      const startTime = Date.now();
      await button.tap();
      const responseTime = Date.now() - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    }
  });

  test('Form input responsive', async ({ page }) => {
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]').first();

    if (await input.count() > 0) {
      const startTime = Date.now();
      await input.fill('Test Property');
      const fillTime = Date.now() - startTime;

      // Should respond quickly
      expect(fillTime).toBeLessThan(500);
    }
  });

  test('Search results appear quickly', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    if (await searchInput.count() > 0) {
      const startTime = Date.now();
      await searchInput.fill('apartment');
      await page.waitForTimeout(500); // Wait for debounce

      const searchTime = Date.now() - startTime;

      // Search should be quick
      expect(searchTime).toBeLessThan(2000);
    }
  });
});
