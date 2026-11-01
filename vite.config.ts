import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { defineConfig, loadEnv, type ConfigEnv, type Plugin, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const MATHLIVE_FONTS = resolve(process.cwd(), 'node_modules/mathlive/fonts')

// MathLive loads its woff2 files from the directory it is given, so serve that directory in dev
// and place a copy in the build output; the formula editor never depends on a CDN.
function mathliveFonts(): Plugin {
  return {
    name: 'mathlive-fonts',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0]
        if (!pathname.startsWith('/mathlive-fonts/')) return next()
        const file = resolve(MATHLIVE_FONTS, basename(pathname))
        if (!existsSync(file)) return next()
        response.setHeader('Content-Type', 'font/woff2')
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        createReadStream(file).pipe(response)
      })
    },
    writeBundle(outputOptions) {
      if (!existsSync(MATHLIVE_FONTS)) return
      const target = resolve(outputOptions.dir ?? 'dist', 'mathlive-fonts')
      mkdirSync(target, { recursive: true })
      for (const name of readdirSync(MATHLIVE_FONTS))
        copyFileSync(resolve(MATHLIVE_FONTS, name), resolve(target, name))
    },
  }
}

export function createAppConfig({ command, mode, isPreview }: ConfigEnv): UserConfig {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const useProxy = command === 'serve' && !isPreview && env.VITE_DEV_API_PROXY !== 'false'
  const target = env.VITE_API_BASE_URL || env.VITE_API_URL || 'https://developments.hocluc.com'

  return {
    plugins: [react(), tailwindcss(), mathliveFonts()],
    define: { 'import.meta.env.VITE_DEV_API_PROXY': JSON.stringify(String(useProxy)) },
    server: {
      // Playwright and the QA scripts write traces and screenshots inside the repo while a run
      // is going; watching them makes the dev server churn on files no page imports.
      watch: { ignored: ['**/.pi/**', '**/test-results/**', '**/playwright-report/**', '**/.playwright-mcp/**'] },
      // Keep the browser on the FE origin so the BE's SameSite=Lax cookie works locally.
      // changeOrigin changes Host only; do not rewrite Origin or disable TLS verification.
      ...(useProxy && {
        proxy: {
          '/api/v1': { target, changeOrigin: true },
          '/ws/chat': { target, changeOrigin: true, ws: true },
        },
      }),
    },
  }
}

export default defineConfig(createAppConfig)
