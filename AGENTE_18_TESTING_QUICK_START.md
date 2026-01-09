# TESTING QUICK START GUIDE

## Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests
npx playwright test

# Smoke tests (fast)
npm run test:smoke

# Accessibility tests
npm run test:a11y

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Changed files only
npm run test:changed

# Storybook
npm run storybook
```

---

## Fix Failing Tests (URGENT)

### 1. Payment Tests (19+9 failures)

```bash
# Issue: Missing Stripe/MercadoPago mocks
# Files:
# - server/payments/__tests__/stripe.test.ts
# - server/payments/__tests__/mercadopago.test.ts

# Fix:
# 1. Add proper mock setup
# 2. Mock external API calls
# 3. Use test API keys
```

### 2. Dashboard Tests (25 failures)

```bash
# Issue: Missing component mocks
# File: client/src/pages/__tests__/dashboard.test.tsx

# Fix:
# 1. Mock useImobi hook
# 2. Mock React Query
# 3. Add proper test data
```

---

## Write Your First Test

### Unit Test (Component)

```typescript
// client/src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click', async () => {
    const { user } = render(<MyComponent />);
    const button = screen.getByRole('button');
    await user.click(button);
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Integration Test (API)

```typescript
// tests/integration/my-api.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@server/index';

describe('My API', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### E2E Test

```typescript
// tests/e2e/my-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="start-button"]');
  await expect(page).toHaveURL(/\/success/);
});
```

---

## Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html

# Check coverage thresholds
# Edit vitest.config.ts:
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  }
}
```

---

## Common Issues

### Issue: Tests timeout
```bash
# Increase timeout in vitest.config.ts
testTimeout: 10000  # 10 seconds
```

### Issue: Flaky tests
```bash
# 1. Add proper waits
await page.waitForLoadState('networkidle');

# 2. Use data-testid
<button data-testid="save-button">Save</button>

# 3. Retry failed tests
retries: process.env.CI ? 2 : 0
```

### Issue: Mocking issues
```typescript
// Mock external dependencies
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}));
```

---

## Best Practices

### 1. Use Test Factories
```typescript
// test-utils/factories.ts
export const createProperty = (overrides = {}) => ({
  id: 1,
  title: 'Test Property',
  price: 500000,
  ...overrides,
});
```

### 2. Use Page Objects (E2E)
```typescript
// tests/e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}
```

### 3. Test User Interactions
```typescript
// Use @testing-library/user-event
const { user } = render(<Component />);
await user.click(button);
await user.type(input, 'text');
```

### 4. Use data-testid
```tsx
// Prefer data-testid over class/id
<button data-testid="save-button">Save</button>

// In tests
const button = screen.getByTestId('save-button');
```

### 5. AAA Pattern
```typescript
// Arrange
const data = { title: 'Test' };

// Act
render(<Component data={data} />);

// Assert
expect(screen.getByText('Test')).toBeInTheDocument();
```

---

## Debug Tests

### Vitest UI
```bash
npm run test:ui
# Opens interactive test UI
```

### Playwright Debug
```bash
npx playwright test --debug
npx playwright test --headed  # See browser
npx playwright test --trace on  # Record trace
```

### Console Logs
```typescript
// In test
console.log(screen.debug());  // Print DOM
console.log(result.current);  // Print hook result
```

---

## CI/CD

### Pre-commit Hook
```bash
# .husky/pre-commit
npx lint-staged
npx tsc --noEmit
npm run test:changed
```

### GitHub Actions
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: E2E tests
  run: npx playwright test
```

---

## Useful Resources

- **Vitest Docs:** https://vitest.dev/
- **Playwright Docs:** https://playwright.dev/
- **Testing Library:** https://testing-library.com/
- **Storybook:** https://storybook.js.org/

---

## Need Help?

1. Check `tests/README.md`
2. Look at existing tests for examples
3. Review `tests/setup.ts` for global config
4. Check `test-utils/index.tsx` for helpers

---

**Quick Start Date:** 2025-12-25
