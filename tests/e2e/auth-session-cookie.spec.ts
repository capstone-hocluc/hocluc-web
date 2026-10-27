import { expect, test } from './auth-live-test'

const apiUrl = 'http://localhost:8080/api/v1/auth'
const origin = 'http://localhost:5174'

test('cookie session survives reload and missing access storage, stays private, and rejects foreign Origin', async ({ page, context }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('hocluc.refreshToken', 'legacy-copy'))
  await page.reload()
  expect(await page.evaluate(() => localStorage.getItem('hocluc.refreshToken'))).toBeNull()
  const login = page.waitForResponse(response => response.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: 'Học viên student@gmail.com', exact: true }).click()
  expect(Object.keys((await (await login).json()).data)).toEqual(['accessToken'])
  await expect(page).toHaveURL(/\/student\//)
  const cookie = (await context.cookies(apiUrl)).find(cookie => cookie.name === 'hocluc_refresh')!
  expect(Boolean(cookie)).toBe(true)
  const { value: _secret, expires: _expires, ...attributes } = cookie
  void _secret; void _expires
  expect(attributes).toMatchObject({ name: 'hocluc_refresh', domain: 'localhost', path: '/api/v1/auth', httpOnly: true, secure: false, sameSite: 'Lax' })
  await page.reload()
  await expect(page).toHaveURL(/\/student\//)
  await expect(page.locator('main')).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('hocluc.accessToken'))
  const refreshed = page.waitForResponse(response => response.url().endsWith('/auth/refresh'))
  await page.reload()
  const response = await refreshed
  expect(response.status()).toBe(200)
  expect(response.request().method()).toBe('POST')
  expect(response.request().postData()).toBeNull()
  expect(Object.keys((await response.json()).data)).toEqual(['accessToken'])
  await expect(page).toHaveURL(/\/student\//)
  expect(Boolean(await page.evaluate(() => localStorage.getItem('hocluc.accessToken')))).toBe(true)
  const rotated = (await context.cookies(apiUrl)).find(cookie => cookie.name === 'hocluc_refresh')!
  expect(Boolean(rotated && cookie.value !== rotated.value)).toBe(true)
  const privateStorage = await page.evaluate(async () => {
    const containsRefresh = (value: unknown): boolean => {
      const text = JSON.stringify(value) ?? ''
      if (/refreshToken|hocluc_refresh/i.test(text)) return true
      return (text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []).some(token => {
        try { return Object.values(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))).some(value => String(value).toLowerCase() === 'refresh') }
        catch { return false }
      })
    }
    const databases = await indexedDB.databases()
    let indexed = false
    for (const database of databases) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(database.name!)
        open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error)
      })
      try {
        for (const store of Array.from(db.objectStoreNames)) {
          const values = await new Promise<unknown>((resolve, reject) => {
            const read = db.transaction(store).objectStore(store).getAll()
            read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error)
          })
          indexed ||= containsRefresh(values) || containsRefresh(store)
        }
      } finally { db.close() }
    }
    return { local: containsRefresh({ ...localStorage }), session: containsRefresh({ ...sessionStorage }), indexed, cookie: /hocluc_refresh/.test(document.cookie) }
  })
  expect(privateStorage).toEqual({ local: false, session: false, indexed: false, cookie: false })
  const rejected = await page.request.post(`${apiUrl}/refresh`, { headers: { Origin: 'https://foreign.example' } })
  expect(rejected.status()).toBe(403)
  expect(Boolean((await context.cookies(apiUrl)).find(cookie => cookie.name === 'hocluc_refresh')?.value === rotated.value)).toBe(true)
  // The rejected request must not consume the session cookie.
  expect((await page.request.post(`${apiUrl}/refresh`, { headers: { Origin: origin } })).status()).toBe(200)
  await page.evaluate(async () => {
    localStorage.removeItem('hocluc.accessToken')
    const path = '/src/services/authService.ts'
    await (await import(/* @vite-ignore */ path)).logout()
  })
  expect((await context.cookies(apiUrl)).length).toBe(0)
  expect((await page.request.post(`${apiUrl}/refresh`, { headers: { Origin: origin } })).status()).toBe(401)
  await page.screenshot({ path: '.pi/p5-cookie-session-logout.png' })
})

test('cookie-only logout-all revokes a second browser session and is tolerant without credentials', async ({ page, browser, context }) => {
  await page.goto('/login')
  await page.evaluate(async () => {
    const path = '/src/services/authService.ts'
    await (await import(/* @vite-ignore */ path)).login({ email: 'student@gmail.com', password: '123456', audience: 'LEARNER' })
  })
  const other = await browser.newContext()
  try {
    const second = await other.request.post(`${apiUrl}/login`, { headers: { Origin: origin }, data: { email: 'student@gmail.com', password: '123456', audience: 'LEARNER' } })
    expect(second.status()).toBe(200)
    expect(Object.keys((await second.json()).data)).toEqual(['accessToken'])
    expect((await other.cookies(apiUrl)).some(cookie => cookie.name === 'hocluc_refresh')).toBe(true)
    expect((await page.request.post(`${apiUrl}/logout-all`, { headers: { Origin: origin } })).status()).toBe(200)
    expect((await context.cookies(apiUrl)).length).toBe(0)
    expect((await other.request.post(`${apiUrl}/refresh`, { headers: { Origin: origin } })).status()).toBe(401)
    for (const endpoint of ['logout', 'logout-all']) {
      expect((await page.request.post(`${apiUrl}/${endpoint}`, { headers: { Origin: origin } })).status()).toBe(200)
      expect((await context.cookies(apiUrl)).length).toBe(0)
    }
  } finally { await other.close() }
})
