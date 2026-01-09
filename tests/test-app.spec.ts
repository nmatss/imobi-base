import { test, expect } from '@playwright/test';

test.describe('ImobiBase App', () => {
  test('should load the application', async ({ page }) => {
    // Collect console errors BEFORE navigating
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Collect page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('http://localhost:5000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ path: 'screenshot-app.png', fullPage: true });

    // Check if root div exists
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    // Check if React rendered something
    const rootContent = await root.innerHTML();
    console.log('Root innerHTML length:', rootContent.length);
    console.log('Root first 500 chars:', rootContent.substring(0, 500));

    // Check if CSS is loaded - verify computed styles
    const header = await page.locator('header').first();
    if (await header.count() > 0) {
      const headerStyles = await header.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          position: computed.position,
          backgroundColor: computed.backgroundColor,
          zIndex: computed.zIndex,
        };
      });
      console.log('Header computed styles:', headerStyles);
    }

    // Check if Tailwind classes are working
    const bgElements = await page.locator('[class*="bg-"]').count();
    console.log('Elements with bg- classes:', bgElements);

    // Log any console errors
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }

    // Log any page errors
    if (pageErrors.length > 0) {
      console.log('Page errors:', pageErrors.map(e => e.message));
    }

    // Check if there's any content in the page
    const bodyText = await page.textContent('body');
    console.log('Body has text:', bodyText && bodyText.length > 0);
  });
});
