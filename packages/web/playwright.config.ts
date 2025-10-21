import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    // Comprehensive test suites (desktop only for speed)
    {
      name: 'comprehensive-rbac',
      testMatch: '**/comprehensive/rbac-permutations.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000,
    },
    {
      name: 'comprehensive-user-lifecycle',
      testMatch: '**/comprehensive/user-lifecycle.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000,
    },
    {
      name: 'comprehensive-tenant-lifecycle',
      testMatch: '**/comprehensive/tenant-lifecycle.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000,
    },
    {
      name: 'comprehensive-module-workflows',
      testMatch: '**/comprehensive/module-workflows.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 90000,
    },
    {
      name: 'comprehensive-summary',
      testMatch: '**/comprehensive/comprehensive-test-runner.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 30000,
    },

    // Standard browser tests (for smoke and regression)
    {
      name: 'chromium',
      testIgnore: '**/comprehensive/**',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testIgnore: '**/comprehensive/**',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: '**/comprehensive/**',
      use: { ...devices['Desktop Safari'] },
    },

    // Test against mobile viewports (smoke tests only)
    {
      name: 'Mobile Chrome',
      testIgnore: '**/comprehensive/**',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: '**/comprehensive/**',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
