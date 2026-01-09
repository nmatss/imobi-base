import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify('https://test@sentry.io/123456'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Only run unit and integration tests (*.test.ts, *.test.tsx)
    // Exclude Playwright e2e tests (*.spec.ts)
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.next',
      // Exclude all Playwright test files
      '**/*.spec.ts',
      'tests/e2e/**',
      'tests/accessibility/**',
      'tests/mobile/**',
      'tests/responsive/**',
      'tests/performance/**',
      'tests/visual/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/vite.ts',
        '**/static.ts',
        'script/**',
        '**/*.stories.tsx',
        '**/examples/**',
        '**/__tests__/**',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      all: true,
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@db': path.resolve(__dirname, './db'),
    },
  },
});
