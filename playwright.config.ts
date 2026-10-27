import { defineConfig, devices } from '@playwright/test'

// These tests never call the live API: the browser routes every API request to a fixture.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['core-crud.spec.ts', 'chat.spec.ts', 'landing.spec.ts', 'quiz-permissions.spec.ts', 'placement.spec.ts', 'purchase.spec.ts', 'lesson-labels.spec.ts', 'notifications.spec.ts', 'quiz-import.spec.ts', 'exam-extraction.spec.ts', 'auth-cookie.spec.ts', 'question-bank.spec.ts', 'master-data.spec.ts', 'quiz-paper.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: '.pi/qa/core-crud/results',
  reporter: [['list'], ['html', { outputFolder: '.pi/qa/core-crud/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5192',
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5192 --strictPort',
    url: 'http://127.0.0.1:5192',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:1', VITE_DEV_API_PROXY: 'false', VITE_MENTOR_CHAT_ENABLED: 'true' },
    timeout: 60_000,
  },
})
