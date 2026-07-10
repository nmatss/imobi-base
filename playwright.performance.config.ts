import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 0.0.0.0',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
