// Playwright config — setup/guest/authenticated projects, report output, headless in CI or when E2E_HEADLESS=true.
import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

function loadEnvFile(): void {
  try {
    const lines = readFileSync('.env', 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      value = value.replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadEnvFile();

const chromeLaunchOptions = {
  channel: 'chrome' as const,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
};

const emptyStorageState = { cookies: [], origins: [] };
const headless = !!process.env.CI || process.env.E2E_HEADLESS === 'true';

export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: 'reports/e2e/test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/e2e/html' }],
    ['junit', { outputFile: 'reports/e2e/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.producthunt.com',
    headless,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    launchOptions: chromeLaunchOptions,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /login\.spec\.ts/,
      timeout: 240_000,
      use: {
        headless,
        storageState: emptyStorageState,
        launchOptions: chromeLaunchOptions,
      },
    },
    {
      name: 'guest',
      testMatch: /guest-navigation\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromeLaunchOptions,
      },
    },
    {
      name: 'authenticated',
      testMatch: /authenticated-navigation\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromeLaunchOptions,
      },
    },
  ],
});
