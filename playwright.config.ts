import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 25 * 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5 * 60 * 1000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/report', open: 'never' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    channel: 'chrome',
    browserName: 'chromium',
    actionTimeout: 0,
    baseURL: 'http://localhost:8000',
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'retain-on-failure',
    storageState: './tests/artifacts/config/storageState.json',
  },
  testIgnore: ['*.js'],
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        ...devices['Desktop Chrome'],
      },
    },
  ],
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run serve:web-e2e',
    url: 'http://localhost:8000',
    timeout: 3 * 60 * 1000,
  },
};

export default config;
