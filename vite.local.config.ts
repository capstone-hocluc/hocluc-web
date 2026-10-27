import { defineConfig, mergeConfig } from 'vite'
import { createAppConfig } from './vite.config'

const backend = process.env.CHAT_LOCAL_BACKEND
if (!backend || !/^http:\/\/127\.0\.0\.1:\d+$/.test(backend)) {
  throw new Error('CHAT_LOCAL_BACKEND must point to the owned loopback backend')
}
export default defineConfig(configEnv => mergeConfig(createAppConfig(configEnv), {
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: true,
    proxy: {
      '/api/v1': { target: backend, changeOrigin: true },
      '/ws/chat': { target: backend, changeOrigin: true, ws: true },
    },
  },
}))
