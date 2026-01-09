import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ImobiBase E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Match all *.spec.ts files in tests directory and subdirectories
  testMatch: /.*\.spec\.ts$/,
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']]
    : [['html'], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:5000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 10 * 1000,

    // Action timeout
    actionTimeout: 5 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
      },
    },

    {
      name: 'Samsung Internet',
      use: {
        ...devices['Galaxy S9+'],
      },
    },

    // Tablets
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
      },
    },

    // Specific breakpoints for responsive testing
    {
      name: 'Mobile Small (375x667)',
      use: {
        ...devices['iPhone 13 Mini'],
      },
    },

    {
      name: 'Mobile Large (428x926)',
      use: {
        ...devices['iPhone 13 Pro Max'],
      },
    },

    {
      name: 'Tablet (768x1024)',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },

    {
      name: 'Desktop Medium (1280x720)',
      use: {
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
