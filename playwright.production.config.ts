import { defineConfig, devices } from '@playwright/test';

// Production suite: runs against the production artifact (dist) without test hooks,
// or against a deployed URL when PLAYWRIGHT_BASE_URL is set.
const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
const port = 4181;
const baseURL = deployedURL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  outputDir: deployedURL ? 'test-results/deployed' : 'test-results/production',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: deployedURL
    ? undefined
    : {
        command: `node node_modules/vite/bin/vite.js preview --outDir dist --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
