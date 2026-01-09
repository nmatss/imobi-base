import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/properties', name: 'Properties List' },
  { path: '/leads', name: 'Leads' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/financial', name: 'Financial' },
  { path: '/rentals', name: 'Rentals' },
  { path: '/vendas', name: 'Sales' },
];

for (const pageInfo of pages) {
  test.describe(`Accessibility audit for ${pageInfo.name}`, () => {
    test('should not have WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto(pageInfo.path);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n${pageInfo.name} Violations:`);
        accessibilityScanResults.violations.forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Help: ${violation.helpUrl}`);
          console.log(`   Elements affected: ${violation.nodes.length}`);
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      if (contrastViolations.length > 0) {
        console.log(`\n${pageInfo.name} Color Contrast Issues:`);
        contrastViolations.forEach(violation => {
          violation.nodes.forEach(node => {
            console.log(`   - ${node.html}`);
            console.log(`     ${node.failureSummary}`);
          });
        });
      }

      expect(contrastViolations).toHaveLength(0);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.aria'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n${pageInfo.name} ARIA Issues:`);
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`   - ${violation.id}: ${violation.description}`);
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper keyboard navigation', async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.keyboard'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log(`\n${pageInfo.name} Keyboard Navigation Issues:`);
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`   - ${violation.id}: ${violation.description}`);
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
}

// Test specific interactive components
test.describe('Interactive Components Accessibility', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const hasAccessibleName = (ariaLabel && ariaLabel.trim().length > 0) ||
                                (text && text.trim().length > 0);

      if (!hasAccessibleName) {
        const html = await button.evaluate(el => el.outerHTML);
        console.log(`Button without accessible name: ${html}`);
      }
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should either have alt text or role="presentation"
      const hasAccessibleAlt = (alt !== null) || (role === 'presentation');

      if (!hasAccessibleAlt) {
        const src = await img.getAttribute('src');
        console.log(`Image without alt text: ${src}`);
      }

      expect(hasAccessibleAlt).toBeTruthy();
    }
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');

    const inputs = await page.locator('input:not([type="hidden"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      const hasLabel = ariaLabel || ariaLabelledby ||
                      (id && await page.locator(`label[for="${id}"]`).count() > 0);

      if (!hasLabel) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        console.log(`Input without label: type=${type}, name=${name}`);
      }
    }
  });
});
