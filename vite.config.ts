import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export function createAppConfig({ command, mode, isPreview }: ConfigEnv): UserConfig {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const useProxy = command === 'serve' && !isPreview && env.VITE_DEV_API_PROXY !== 'false'
  const target = env.VITE_API_BASE_URL || env.VITE_API_URL || 'https://developments.hocluc.com'

  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_DEV_API_PROXY': JSON.stringify(String(useProxy)) },
    // Keep the browser on the FE origin so the BE's SameSite=Lax cookie works locally.
    // changeOrigin changes Host only; do not rewrite Origin or disable TLS verification.
    server: useProxy ? {
      proxy: {
        '/api/v1': { target, changeOrigin: true },
        '/ws/chat': { target, changeOrigin: true, ws: true },
      },
    } : undefined,
  }
}

export default defineConfig(createAppConfig)
