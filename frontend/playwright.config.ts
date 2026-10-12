import { defineConfig, devices } from '@playwright/test'

/**
 * EMPULSE Step 9a smoke harness.
 * Expects backend on :8000 and `npm run dev` (or preview) on :5173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use installed Chrome when Playwright's bundled Chromium is unavailable.
        channel: 'chrome',
      },
    },
  ],
  outputDir: 'e2e/test-results',
})
