import { defineConfig, devices } from '@playwright/test'

// Desktop only for this iteration. All course responses are browser fixtures.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['landing.spec.ts', 'auth-design.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: 'test-results/landing',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/landing', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:5191',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5191 --strictPort',
    url: 'http://127.0.0.1:5191',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:1', VITE_DEV_API_PROXY: 'false' },
    timeout: 60_000,
  },
})
