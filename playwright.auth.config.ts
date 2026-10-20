import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'auth-session*.spec.ts',
  workers: 1,
  timeout: 30_000,
  outputDir: 'test-results/auth-session',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:5174',
    trace: 'off',
  },
})
