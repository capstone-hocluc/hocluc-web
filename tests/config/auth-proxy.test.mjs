import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer as createHttpServer } from 'node:http'
import { once } from 'node:events'
import test from 'node:test'
import { chromium } from '@playwright/test'
import { createServer, resolveConfig } from 'vite'

// A real browser -> Vite -> owned HTTP upstream, not route.fulfill.
// The cookie matches BE attributes, including Secure on localhost.
test('local proxy supports the current BE cookie contract', { timeout: 60_000 }, async t => {
  let origin, backendOrigin, vite, browser, context
  let cookieRevision = 0, refreshUnavailable = false
  const requests = [], sockets = new Set()
  const access = () => `fixture.${Buffer.from(JSON.stringify({ sub: 'proxy-user', role: 'ROLE_STUDENT', exp: 4102444800, cookieRevision })).toString('base64url')}.fixture`
  const cookie = (clear = false) => `hocluc_refresh=${clear ? '' : `proxy-${cookieRevision}`}; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth${clear ? '; Max-Age=0' : ''}`
  const upstream = createHttpServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    requests.push({ path: req.url, origin: req.headers.origin, host: req.headers.host, cookie: req.headers.cookie, body, authorization: req.headers.authorization })
    const reply = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ success: status < 400, status, data, message: status >= 400 ? 'Fixture failure' : 'OK' }))
    }
    if (req.url.startsWith('/api/v1/auth/') && req.headers.origin !== origin) return reply(403, null)
    if (req.url.endsWith('/login')) {
      cookieRevision++
      res.setHeader('set-cookie', cookie())
      return reply(200, { accessToken: access() })
    }
    if (req.url.endsWith('/refresh')) {
      if (refreshUnavailable) return reply(503, null)
      if (!req.headers.cookie?.includes(`hocluc_refresh=proxy-${cookieRevision}`)) return reply(401, null)
      cookieRevision++
      res.setHeader('set-cookie', cookie())
      return reply(200, { accessToken: access() })
    }
    if (req.url.endsWith('/logout')) {
      res.setHeader('set-cookie', cookie(true))
      return reply(200, null)
    }
    if (req.url === '/api/v1/session-probe') return reply(req.headers.authorization === `Bearer ${access()}` ? 200 : 401, { ready: true })
    reply(404, null)
  })
  upstream.on('upgrade', (req, socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    requests.push({ path: req.url, origin: req.headers.origin, host: req.headers.host, cookie: req.headers.cookie })
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
    socket.on('data', () => socket.end())
  })
  const previousEnv = { VITE_API_BASE_URL: process.env.VITE_API_BASE_URL, VITE_DEV_API_PROXY: process.env.VITE_DEV_API_PROXY }
  try {
    upstream.listen(0, '127.0.0.1')
    await once(upstream, 'listening')
    backendOrigin = `http://127.0.0.1:${upstream.address().port}`
    process.env.VITE_API_BASE_URL = backendOrigin
    process.env.VITE_DEV_API_PROXY = 'true'
    vite = await createServer({ server: { host: 'localhost', port: 0, open: false }, plugins: [{
      name: 'proxy-test-page', configureServer(server) {
        server.middlewares.use('/__proxy-check', (_req, res) => { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><title>Proxy check</title>') })
      },
    }] })
    await vite.listen()
    origin = `http://localhost:${vite.httpServer.address().port}`
    browser = await chromium.launch({ channel: 'chrome' })
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${origin}/__proxy-check`)

    await t.test('login stores a Secure HttpOnly Lax cookie on localhost and preserves Origin', async () => {
      const base = await page.evaluate(async () => {
        const api = await import('/src/lib/api.ts'), auth = await import('/src/services/authService.ts')
        await auth.login({ email: 'proxy@example.invalid', password: 'fixture-only', audience: 'LEARNER' })
        return api.API_BASE_URL
      })
      assert.equal(base, origin)
      const cookies = await context.cookies(`${origin}/api/v1/auth`)
      assert.equal(cookies.length, 1)
      assert.equal(cookies[0].domain, 'localhost')
      assert.equal(cookies[0].httpOnly, true)
      assert.equal(cookies[0].secure, true)
      assert.equal(cookies[0].sameSite, 'Lax')
      assert.equal(await page.evaluate(() => document.cookie.includes('hocluc_refresh')), false)
      assert.equal(requests.at(-1).origin, origin)
      assert.equal(requests.at(-1).host, new URL(backendOrigin).host)
    })
    await t.test('cookie-only restore rotates cookies and Bearer business requests still work', async () => {
      await page.evaluate(() => localStorage.removeItem('hocluc.accessToken'))
      await page.reload()
      const ready = await page.evaluate(async () => {
        const api = await import('/src/lib/api.ts')
        await api.restoreCookieSession()
        return (await api.request('/api/v1/session-probe', { auth: true })).data.ready
      })
      assert.equal(ready, true)
      const refresh = requests.find(req => req.path.endsWith('/refresh'))
      assert.equal(refresh.body, '')
      assert.equal(refresh.origin, origin)
      assert.equal(refresh.cookie, 'hocluc_refresh=proxy-1')
      assert.equal((await context.cookies(`${origin}/api/v1/auth`))[0].value, 'proxy-2')
      assert.equal(requests.at(-1).cookie, undefined) // Cookie path excludes business APIs.
    })
    await t.test('upstream 503 preserves the session for retry', async () => {
      refreshUnavailable = true
      const status = await page.evaluate(async () => {
        const api = await import('/src/lib/api.ts'), before = api.getAccessToken()
        try { await api.ensureFreshAccessToken(true) } catch (error) {
          return { status: error.status, retained: api.getAccessToken() === before }
        }
      })
      assert.deepEqual(status, { status: 503, retained: true })
      refreshUnavailable = false
    })
    await t.test('chat WebSocket uses the proxy without changing Origin or leaking refresh cookie', async () => {
      await page.evaluate(() => new Promise((resolve, reject) => {
        const socket = new WebSocket(`${location.origin.replace('http:', 'ws:')}/ws/chat`)
        socket.onopen = () => { socket.close(); resolve(true) }
        socket.onerror = () => reject(new Error('WebSocket proxy failed'))
      }))
      const handshake = requests.find(req => req.path === '/ws/chat')
      assert.equal(handshake.origin, origin)
      assert.equal(handshake.cookie, undefined)
    })
    await t.test('logout clears the localhost cookie; F5 does not restore the session', async () => {
      await page.evaluate(async () => { const auth = await import('/src/services/authService.ts'); await auth.logout() })
      assert.equal((await context.cookies(`${origin}/api/v1/auth`)).length, 0)
      const refreshCount = requests.filter(req => req.path.endsWith('/refresh')).length
      await page.reload()
      assert.equal(await page.evaluate(async () => { const api = await import('/src/lib/api.ts'); return api.restoreCookieSession() }), null)
      assert.equal(requests.filter(req => req.path.endsWith('/refresh')).length, refreshCount)
    })
    await t.test('build and preview do not enable the development proxy', async () => {
      const build = await resolveConfig({}, 'build')
      const preview = await resolveConfig({}, 'serve', 'production', 'production', true)
      assert.equal(build.define['import.meta.env.VITE_DEV_API_PROXY'], '"false"')
      assert.equal(build.server.proxy, undefined)
      assert.equal(preview.server.proxy, undefined)
    })
  } finally {
    await context?.close()
    await browser?.close()
    for (const socket of sockets) socket.destroy()
    await vite?.close()
    upstream.closeAllConnections()
    await new Promise(resolve => upstream.close(resolve))
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
