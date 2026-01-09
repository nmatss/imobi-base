import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TEST_URL = process.env.DATABASE_TEST_URL || 'postgresql://test:test@localhost:5432/imobibase_test';
  process.env.SESSION_SECRET = 'test-secret-key-for-testing';
  process.env.VITE_API_URL = 'http://localhost:5000';

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Suppress console errors in tests (optional)
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn((...args: any[]) => {
      if (
        args[0]?.includes?.('Warning: ReactDOM.render') ||
        args[0]?.includes?.('Not implemented: HTMLFormElement.prototype.submit')
      ) {
        return;
      }
      originalError.call(console, ...args);
    });
  });

  afterAll(() => {
    console.error = originalError;
  });
});

// Global cleanup
afterAll(() => {
  vi.restoreAllMocks();
});
