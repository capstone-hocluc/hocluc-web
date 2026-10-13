import { defineConfig, devices } from '@playwright/test'
import { liveManifest } from './tests/e2e/chat-live-support'

liveManifest() // Require a fresh owned backend before launching either browser or proxy.
// Opt-in ONLY. No route.fulfill, HTTP fixtures or reused server; real owned local BE.
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'chat-live.spec.ts', workers: 1, fullyParallel: false, retries: 0, timeout: 240_000,
  outputDir: '.pi/qa/chat-live/results',
  reporter: [['list'], ['html', { outputFolder: '.pi/qa/chat-live/report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5184', ...devices['Desktop Chrome'], channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: {
    command: 'npm run dev -- --config vite.live.config.ts --host 127.0.0.1 --port 5184 --strictPort', url: 'http://127.0.0.1:5184', reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:5184', VITE_MENTOR_CHAT_ENABLED: 'true' }, timeout: 60_000,
  },
})
