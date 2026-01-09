# Testing Guide - ImobiBase

This document provides comprehensive information about testing in the ImobiBase project.

## Table of Contents

1. [Overview](#overview)
2. [Test Setup](#test-setup)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Testing Patterns](#testing-patterns)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Overview

ImobiBase uses **Vitest** as its testing framework, providing:

- Fast unit and integration testing
- React component testing with Testing Library
- API endpoint testing with Supertest
- Code coverage reporting
- Watch mode for development
- UI mode for visual test debugging

### Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── unit/                       # Unit tests
│   ├── backend/               # Backend unit tests
│   │   ├── security.test.ts
│   │   └── validation.test.ts
│   └── frontend/              # Frontend unit tests
│       ├── components/
│       │   └── Button.test.tsx
│       └── hooks/
│           └── useToast.test.ts
├── integration/               # Integration tests
│   ├── auth.test.ts
│   └── properties.test.ts
├── mocks/                     # Mock services
│   ├── stripe-mock.ts
│   ├── email-mock.ts
│   └── storage-mock.ts
└── utils/                     # Test utilities
    └── test-helpers.ts
```

## Test Setup

### Installation

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install --save-dev --legacy-peer-deps vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom happy-dom supertest @types/supertest
```

### Configuration

The test configuration is defined in `vitest.config.ts`:

- **Environment**: jsdom (for React components)
- **Coverage Provider**: v8
- **Coverage Thresholds**: 80% statements, 75% branches, 80% functions, 80% lines
- **Test Timeout**: 10 seconds
- **Setup File**: `tests/setup.ts`

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

This generates:
- Terminal output
- HTML report in `coverage/index.html`
- LCOV report for CI tools

### UI Mode (visual test debugging)

```bash
npm run test:ui
```

Opens a browser-based UI for exploring and debugging tests.

## Writing Tests

### Backend Unit Tests

Test pure functions, utilities, and services without external dependencies.

```typescript
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '@server/auth/security';

describe('Password Security', () => {
  it('should validate a strong password', () => {
    const result = validatePasswordStrength('MyP@ssw0rd!');

    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should reject weak passwords', () => {
    const result = validatePasswordStrength('weak');

    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });
});
```

### Frontend Component Tests

Test React components using Testing Library.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render and handle clicks', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Frontend Hook Tests

Test custom React hooks.

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@/hooks/use-toast';

describe('useToast Hook', () => {
  it('should add and dismiss toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
```

### Integration Tests

Test API endpoints with Supertest.

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@server/app';

describe('Authentication API', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

## Testing Patterns

### Mocking External Services

Always mock external services (Stripe, SendGrid, etc.) in tests.

```typescript
import { vi } from 'vitest';
import { createMockStripe } from '@tests/mocks/stripe-mock';

describe('Payment Service', () => {
  it('should create subscription', async () => {
    const mockStripe = createMockStripe();

    // Test your service with the mock
  });
});
```

### Test Data Factories

Use factory functions from `tests/utils/test-helpers.ts`:

```typescript
import { createTestUser, createTestProperty } from '@tests/utils/test-helpers';

const user = createTestUser({ email: 'custom@example.com' });
const property = createTestProperty({ price: 500000 });
```

### Cleanup

Always clean up after tests:

```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Database Tests', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Clean up test data
  });
});
```

### Test Isolation

Each test should be independent:

```typescript
describe('User Service', () => {
  it('should create user', async () => {
    // This test doesn't depend on other tests
  });

  it('should update user', async () => {
    // Create user specifically for this test
  });
});
```

## Coverage Requirements

### Thresholds

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Excluded from Coverage

- Test files (`*.test.ts`, `*.spec.ts`)
- Configuration files (`*.config.ts`)
- Build scripts
- Development utilities (`vite.ts`, `static.ts`)

### Viewing Coverage

After running `npm run test:coverage`, open `coverage/index.html` in your browser to see detailed coverage reports.

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to the repository
- Every pull request

### CI Configuration

Add to `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Common Issues

#### 1. Tests timing out

Increase timeout in specific tests:

```typescript
it('slow test', async () => {
  // test code
}, 20000); // 20 second timeout
```

#### 2. Mock not working

Ensure mocks are set up before imports:

```typescript
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(),
}));

import { fetchData } from '@/lib/api';
```

#### 3. React component not rendering

Make sure you have the test setup file configured:

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

#### 4. Database connection errors

Use a separate test database:

```bash
export DATABASE_TEST_URL="postgresql://test:test@localhost:5432/imobibase_test"
```

### Getting Help

1. Check Vitest documentation: https://vitest.dev
2. Check Testing Library docs: https://testing-library.com
3. Review existing tests in the codebase
4. Ask the team in the development channel

## Best Practices

### DO

- Write tests for all new features
- Test both success and error cases
- Use descriptive test names
- Keep tests simple and focused
- Mock external dependencies
- Clean up after tests
- Aim for high coverage

### DON'T

- Test implementation details
- Share state between tests
- Use real external services
- Skip failing tests
- Write tests that depend on execution order
- Ignore coverage reports
- Mock everything (test real code when possible)

## Examples

### Testing Form Submission

```typescript
it('should submit form with valid data', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<PropertyForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/title/i), 'New Property');
  await user.type(screen.getByLabelText(/price/i), '500000');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    title: 'New Property',
    price: 500000,
  });
});
```

### Testing Async Operations

```typescript
it('should load data asynchronously', async () => {
  const { result } = renderHook(() => useProperties());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should handle API errors gracefully', async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));

  const { result } = renderHook(() => useApi(mockFetch));

  await waitFor(() => {
    expect(result.current.error).toBe('API Error');
  });
});
```

## Continuous Improvement

- Review test coverage weekly
- Add tests for bug fixes
- Refactor tests with production code
- Update this documentation as needed
- Share testing knowledge with the team

---

Last updated: 2024-12-24
