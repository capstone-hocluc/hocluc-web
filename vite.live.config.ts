import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config'
import { liveManifest } from './tests/e2e/chat-live-support'

const { backend } = liveManifest()
// Opt-in real same-origin reverse proxy, no mocked/fulfilled responses. Production config stays untouched.
export default mergeConfig(base, defineConfig({
  server: {
    proxy: {
      '/api/v1': { target: backend, changeOrigin: true },
      '/ws/chat': { target: backend, changeOrigin: true, ws: true },
    },
  },
}))
