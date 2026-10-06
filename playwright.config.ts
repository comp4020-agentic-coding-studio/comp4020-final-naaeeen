import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: process.env.PW_OUTPUT_DIR ?? '.local/browser-results',
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  globalTimeout: process.env.CI ? 300_000 : undefined,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.PW_REPORT_DIR ?? '.local/browser-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.APP_URL ?? 'http://127.0.0.1:4088',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PW_EXECUTABLE,
      chromiumSandbox: true,
      args: ['--use-angle=swiftshader'],
    },
  },
});
