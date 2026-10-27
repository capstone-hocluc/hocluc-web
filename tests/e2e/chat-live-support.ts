import { readFileSync, statSync } from 'node:fs'
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'

export type LiveRole = 'student' | 'mentor' | 'nextMentor' | 'staff' | 'manager'
export interface LiveManifest {
  backend: string
  conversationId: string
  subjectId: string
  enrollmentId: string
  accounts: Record<LiveRole, { id: string; email: string; password: string }>
}
export interface LiveTokens { accessToken: string; cookies: Awaited<ReturnType<APIRequestContext['storageState']>>['cookies'] }
export function liveManifest(): LiveManifest {
  const path = process.env.CHAT_LIVE_MANIFEST
  if (!path || Date.now() - statSync(path).mtimeMs > 15 * 60_000) throw new Error('Start the owned BE chat-live-test.ps1 -Browser harness first; fresh CHAT_LIVE_MANIFEST required.')
  const value = JSON.parse(readFileSync(path, 'utf8')) as LiveManifest
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(value.backend)) throw new Error('Refusing non-loopback live backend')
  for (const role of ['student', 'mentor', 'nextMentor', 'staff', 'manager'] as const) {
    if (!value.accounts[role]?.email.endsWith('@example.invalid')) throw new Error('Only synthetic owned accounts are allowed')
  }
  return value
}
export async function login(api: APIRequestContext, data: LiveManifest, role: LiveRole): Promise<LiveTokens> {
  const account = data.accounts[role]
  const response = await api.post(`${data.backend}/api/v1/auth/login`, { data: { email: account.email, password: account.password } })
  if (response.status() !== 200) throw new Error(`Real login ${role} failed: HTTP ${response.status()}`)
  const body = await response.json()
  if (!body.data?.accessToken) throw new Error('Real login response missing tokens')
  return { accessToken: body.data.accessToken, cookies: (await api.storageState()).cookies.filter(cookie => cookie.name === 'hocluc_refresh') }
}
export async function authenticated(context: BrowserContext, tokens: LiveTokens) {
  await context.addCookies(tokens.cookies)
  await context.addInitScript(({ accessToken }) => {
    if (location.origin !== 'http://127.0.0.1:5184') return // Never write tokens into storage/download/about:blank origins.
    localStorage.setItem('hocluc.accessToken', accessToken)
  }, tokens)
}
export function watch(page: Page) {
  const errors: string[] = [], metadata: Record<string, unknown>[] = [], urls: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('websocket', socket => {
    // Vite HMR has its own dev token/query; it is not the authenticated chat transport.
    if (new URL(socket.url()).pathname !== '/ws/chat') return
    urls.push(socket.url())
    socket.on('framereceived', ({ payload }) => {
      if (typeof payload !== 'string' || !payload.startsWith('MESSAGE')) return
      try { metadata.push(JSON.parse(payload.slice(payload.indexOf('\n\n') + 2).replace(/\0+$/, '')) as Record<string, unknown>) } catch { /* Other control frames are ignored. */ }
    })
  })
  return { errors, metadata, urls }
}
