import { expect, test, type Page, type Route } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'
import type { UserRole } from '../../src/services/userService'

const origin = 'http://127.0.0.1:5174'
const cors = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type,Authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
const token = (role: UserRole = 'STUDENT', revision = 0, exp = 4102444800) => `fixture.${Buffer.from(JSON.stringify({
  sub: QUIZ_IDS.user, role: `ROLE_${role}`, exp, revision,
})).toString('base64url')}.fixture`
const cookie = (value: string, expire = false) => `hocluc_refresh=${value}; HttpOnly; Path=/api/v1/auth; SameSite=Lax${expire ? '; Max-Age=0' : ''}`

async function installAuthFixture(page: Page, role: UserRole = 'STUDENT') {
  const state = { role, access: token(role), revision: 1, activeCookie: 'session-1', refreshStatus: 200,
    malformed: false, network: false, logoutNetwork: false,
    refreshGate: null as Promise<void> | null, loginGate: null as Promise<void> | null,
    requests: [] as Array<{ path: string; cookie: string; body: string | null; authorization?: string }>,
  }
  const respond = (route: Route, data: unknown, status = 200, setCookie?: string) => route.fulfill({ status,
    headers: { ...cors, ...(setCookie ? { 'set-cookie': setCookie } : {}) }, json: { success: status < 400, status, data, message: status >= 400 ? 'Fixture rejected session' : 'OK' } })
  const attach = async (target: Page) => {
    await installQuizFixture(target, role, { authenticated: false })
    await target.route('**/api/v1/auth/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      const headers = await request.allHeaders()
      const receivedCookie = headers.cookie?.match(/(?:^|;\s*)hocluc_refresh=([^;]+)/)?.[1] ?? ''
      state.requests.push({ path, cookie: receivedCookie, body: request.postData(), authorization: headers.authorization })
      if (path.endsWith('/refresh')) {
        if (state.refreshGate) await state.refreshGate
        if (state.network) return route.abort('failed')
        if (state.refreshStatus !== 200) return respond(route, null, state.refreshStatus)
        if (!receivedCookie || receivedCookie !== state.activeCookie) return respond(route, null, 401)
        state.activeCookie = `session-${++state.revision}`
        state.access = token(state.role, state.revision)
        return respond(route, state.malformed ? {} : { accessToken: state.access }, 200, cookie(state.activeCookie))
      }
      if (path.endsWith('/logout')) {
        if (state.logoutNetwork) return route.abort('failed')
        state.activeCookie = ''
        return respond(route, null, 200, cookie('', true))
      }
      if (state.loginGate) await state.loginGate
      const body = request.postDataJSON() ?? {}
      if (path.endsWith('/switch-role')) state.role = body.role
      else state.role = path.endsWith('/google/console') || body.audience === 'CONSOLE' ? 'STAFF' : 'STUDENT'
      state.activeCookie = `session-${++state.revision}`
      state.access = token(state.role, state.revision)
      return respond(route, { accessToken: state.access }, 200, cookie(state.activeCookie))
    })
    await target.route('**/api/v1/session-probe**', async route => {
      const valid = route.request().headers().authorization === `Bearer ${state.access}`
      if (!valid) return respond(route, null, 401)
      if (route.request().url().endsWith('/blob')) return route.fulfill({ body: 'fixture-file', contentType: 'application/octet-stream' })
      return respond(route, { ready: true })
    })
  }
  await attach(page)
  const seedCookie = () => page.context().addCookies([{ name: 'hocluc_refresh', value: state.activeCookie,
    domain: '127.0.0.1', path: '/api/v1/auth', httpOnly: true, sameSite: 'Lax' }])
  return { state, attach, seedCookie }
}

async function signIn(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/services/authService.ts', auth = await import(path)
    await auth.login({ email: 'student@example.invalid', password: 'fixture-password', audience: 'LEARNER' })
  })
}
async function seedExpiredAccess(page: Page, role: UserRole = 'STUDENT') {
  await page.evaluate(async accessToken => {
    const path = '/src/lib/api.ts', api = await import(path)
    api.setTokens({ accessToken }, true)
  }, token(role, 0, 1))
}
const refreshes = (state: Awaited<ReturnType<typeof installAuthFixture>>['state']) => state.requests.filter(request => request.path.endsWith('/refresh'))

test('login stores access only, migrates legacy storage and receives an HttpOnly cookie', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('hocluc.refreshToken', 'legacy-fixture'))
  await signIn(page)
  const storage = await page.evaluate(() => ({ access: localStorage.getItem('hocluc.accessToken'), refresh: localStorage.getItem('hocluc.refreshToken') }))
  expect(storage).toEqual({ access: state.access, refresh: null })
  const cookies = await page.context().cookies('http://127.0.0.1:1/api/v1/auth')
  expect(cookies.find(item => item.name === 'hocluc_refresh')).toMatchObject({ httpOnly: true, path: '/api/v1/auth' })
  await page.evaluate(async () => { const path = '/src/lib/api.ts'; await (await import(path)).ensureFreshAccessToken(true) })
  expect(refreshes(state)).toHaveLength(1)
  expect(refreshes(state)[0]).toMatchObject({ body: null, cookie: 'session-2' })
})

test('Google learner and console responses need no refresh token in JSON', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  const roles = await page.evaluate(async () => {
    const path = '/src/services/authService.ts', auth = await import(path)
    const apiPath = '/src/lib/api.ts', api = await import(apiPath)
    await auth.googleAuth({ idToken: 'fixture-google-id' })
    const learner = api.accessTokenRole()
    await auth.googleConsoleAuth({ idToken: 'fixture-google-id' })
    return [learner, api.accessTokenRole(), localStorage.getItem('hocluc.refreshToken')]
  })
  expect(roles).toEqual(['STUDENT', 'STAFF', null])
  expect(state.requests.map(request => request.path)).toEqual(['/api/v1/auth/google', '/api/v1/auth/google/console'])
})

for (const role of ['STUDENT', 'STAFF'] as const) {
  test(`${role}: cookie-only session is restored before a protected direct URL and survives F5`, async ({ page }) => {
    const { state, seedCookie } = await installAuthFixture(page, role)
    await seedCookie()
    const destination = role === 'STUDENT' ? '/student/assessments/placement' : '/console/staff/quizzes'
    await page.goto(destination)
    const heading = role === 'STUDENT' ? 'Chưa có bài đánh giá đầu vào' : 'Bài kiểm tra'
    await expect(page.getByText(heading, { exact: true }).first()).toBeVisible()
    await expect(page).toHaveURL(destination)
    expect(refreshes(state)).toHaveLength(1)
    await page.reload()
    await expect(page.getByText(heading, { exact: true }).first()).toBeVisible()
    expect(refreshes(state)).toHaveLength(1)
  })
}

test('guest cookie rejection redirects once and preserves the placement return URL', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/student/assessments/placement')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fstudent%2Fassessments%2Fplacement$/)
  expect(refreshes(state)).toHaveLength(1)
  await page.reload()
  expect(refreshes(state)).toHaveLength(1)
})

test('cookie restore 5xx remains retryable and does not clear an existing access token', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page)
  await seedCookie()
  state.refreshStatus = 503
  await page.addInitScript(access => localStorage.setItem('hocluc.accessToken', access), token('STUDENT', 0, 1))
  await page.goto('/student/assessments/placement')
  await expect(page.getByRole('heading', { name: 'Không thể xác thực phiên đăng nhập' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBe(token('STUDENT', 0, 1))
  state.refreshStatus = 200
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByText('Chưa có bài đánh giá đầu vào', { exact: true })).toBeVisible()
  expect(refreshes(state)).toHaveLength(2)
})

test('HTTP, binary download and socket preparation share one cookie refresh', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page)
  await seedCookie()
  await page.goto('/login')
  await seedExpiredAccess(page)
  const results = await page.evaluate(async () => {
    const path = '/src/lib/api.ts', api = await import(path)
    const values = await Promise.all([
      api.request('/api/v1/session-probe', { auth: true }),
      api.requestBlob('/api/v1/session-probe/blob', { auth: true }),
      api.ensureFreshAccessToken(true), api.ensureFreshAccessToken(),
    ])
    return [values[0].data.ready, await values[1].text(), values[2] === values[3]]
  })
  expect(results).toEqual([true, 'fixture-file', true])
  expect(refreshes(state)).toHaveLength(1)
  expect(refreshes(state)[0].body).toBeNull()
})

for (const failure of ['network', 'server', 'malformed'] as const) {
  test(`refresh ${failure} failure preserves the session and does not redirect`, async ({ page }) => {
    const { state, seedCookie } = await installAuthFixture(page)
    await seedCookie()
    await page.goto('/login')
    await signIn(page)
    const original = state.access
    state.network = failure === 'network'
    state.refreshStatus = failure === 'server' ? 500 : 200
    state.malformed = failure === 'malformed'
    const kept = await page.evaluate(async () => {
      const path = '/src/lib/api.ts', api = await import(path)
      try { await api.ensureFreshAccessToken(true) } catch { /* assert preserved state */ }
      return api.getAccessToken()
    })
    expect(kept).toBe(original)
    await expect(page).toHaveURL('/login')
    expect(refreshes(state)).toHaveLength(1)
  })
}

test('invalid cookie ends the local session without an infinite refresh loop', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  await signIn(page)
  state.refreshStatus = 401
  const value = await page.evaluate(async () => {
    const path = '/src/lib/api.ts', api = await import(path)
    try { await api.ensureFreshAccessToken(true) } catch { /* expected */ }
    return [api.getAccessToken(), await api.restoreCookieSession()]
  })
  expect(value).toEqual([null, null])
  expect(refreshes(state)).toHaveLength(1)
})

test('role switch uses access-only JSON, rotates the cookie and does not store a refresh credential', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page, 'STAFF')
  await seedCookie()
  await page.goto('/login')
  await page.evaluate(async accessToken => {
    const path = '/src/lib/api.ts', api = await import(path)
    api.setTokens({ accessToken }, true)
    const authPath = '/src/services/authService.ts', auth = await import(authPath)
    await auth.switchRole('TEACHER')
  }, state.access)
  expect(await page.evaluate(() => localStorage.getItem('hocluc.refreshToken'))).toBeNull()
  expect(state.role).toBe('TEACHER')
  expect(state.requests.find(request => request.path.endsWith('/switch-role'))?.cookie).toBe('session-1')
})

test('logout works with cookie only and prevents automatic restoration after F5', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page)
  await seedCookie()
  await page.goto('/login')
  await page.evaluate(async () => { const path = '/src/services/authService.ts'; await (await import(path)).logout() })
  expect(state.requests.find(request => request.path.endsWith('/logout'))).toMatchObject({ body: null, cookie: 'session-1' })
  expect((await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(false)
  await page.goto('/student/assessments/placement')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  expect(refreshes(state)).toHaveLength(0)
})

test('offline logout reports unconfirmed server logout and keeps leftover cookie blocked', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page)
  await seedCookie()
  await page.goto('/login')
  state.logoutNetwork = true
  const message = await page.evaluate(async () => {
    const path = '/src/services/authService.ts', auth = await import(path)
    try { await auth.logout(); return '' } catch (error) { return (error as Error).message }
  })
  expect(message).toContain('chưa xác nhận đăng xuất phía máy chủ')
  expect((await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(true)
  await page.goto('/student/assessments/placement')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  expect(refreshes(state)).toHaveLength(0)
})

test('a refresh response arriving after logout cannot resurrect the session or its cookie', async ({ page }) => {
  const { state, seedCookie } = await installAuthFixture(page)
  await seedCookie()
  await page.goto('/login')
  await seedExpiredAccess(page)
  let release!: () => void
  state.refreshGate = new Promise<void>(resolve => { release = resolve })
  const refreshing = page.evaluate(async () => {
    const path = '/src/lib/api.ts', api = await import(path)
    try { await api.ensureFreshAccessToken(true); return 200 } catch (error) { return (error as { status: number }).status }
  })
  await expect.poll(() => refreshes(state).length).toBe(1)
  const exiting = page.evaluate(async () => { const path = '/src/services/authService.ts'; await (await import(path)).logout() })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeNull()
  release()
  expect(await refreshing).toBe(409)
  await exiting
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeNull()
  expect((await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(false)
})

test('two tabs serialize cookie rotation and share the access token from the first refresh', async ({ page }) => {
  const { state, seedCookie, attach } = await installAuthFixture(page)
  await seedCookie()
  await page.goto('/login')
  await seedExpiredAccess(page)
  const sibling = await page.context().newPage()
  await attach(sibling)
  await sibling.goto('/login')
  let release!: () => void
  state.refreshGate = new Promise<void>(resolve => { release = resolve })
  const run = (target: Page) => target.evaluate(async () => {
    const path = '/src/lib/api.ts'; return (await import(path)).ensureFreshAccessToken(true)
  })
  const first = run(page)
  await expect.poll(() => refreshes(state).length).toBe(1)
  const second = run(sibling)
  // Verify the sibling has queued for the shared Web Lock before releasing it.
  await expect.poll(() => sibling.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBeGreaterThan(0)
  release()
  const values = await Promise.all([first, second])
  expect(values[0]).toBe(values[1])
  expect(refreshes(state)).toHaveLength(1)
})

test('a delayed 401 from before same-account login never clears or retries the new session', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  await signIn(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let probes = 0
  await page.route('**/api/v1/old-session', async route => { probes++; await gate; await route.fulfill({ status: 401, json: { success: false } }) })
  const old = page.evaluate(async () => {
    const path = '/src/lib/api.ts'; try { await (await import(path)).request('/api/v1/old-session', { auth: true }); return 200 }
    catch (error) { return (error as { status: number }).status }
  })
  await expect.poll(() => probes).toBe(1)
  await signIn(page)
  const newest = state.access
  release()
  expect(await old).toBe(409)
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBe(newest)
  expect(probes).toBe(1)
  expect(refreshes(state)).toHaveLength(0)
})

test('business 403 does not refresh or clear an authenticated session', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  await signIn(page)
  await page.route('**/api/v1/forbidden-fixture', route => route.fulfill({ status: 403, json: { success: false, message: 'Forbidden' } }))
  const status = await page.evaluate(async () => {
    const path = '/src/lib/api.ts'
    try { await (await import(path)).request('/api/v1/forbidden-fixture', { auth: true }); return 200 }
    catch (error) { return (error as { status: number }).status }
  })
  expect(status).toBe(403)
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBe(state.access)
  expect(refreshes(state)).toHaveLength(0)
})

test('logout during login waits for its cookie response and leaves no signed-in session', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.goto('/login')
  let release!: () => void
  state.loginGate = new Promise<void>(resolve => { release = resolve })
  const login = page.evaluate(async () => {
    const path = '/src/services/authService.ts'
    try { await (await import(path)).login({ email: 'student@example.invalid', password: 'fixture-password' }); return 200 }
    catch (error) { return (error as { status: number }).status }
  })
  await expect.poll(() => state.requests.some(request => request.path.endsWith('/login'))).toBe(true)
  const exiting = page.evaluate(async () => { const path = '/src/services/authService.ts'; await (await import(path)).logout() })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hocluc.cookieSessionBlocked'))).toBe('1')
  release()
  expect(await login).toBe(409)
  await exiting
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeNull()
  expect((await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(false)
})

test('logout in one tab closes the other protected tab without restoring the cookie', async ({ page }) => {
  const { state, attach } = await installAuthFixture(page)
  await page.goto('/login')
  await signIn(page)
  const sibling = await page.context().newPage()
  await attach(sibling)
  await sibling.goto('/student/assessments/placement')
  await expect(sibling.getByText('Chưa có bài đánh giá đầu vào', { exact: true })).toBeVisible()
  await page.evaluate(async () => { const path = '/src/services/authService.ts'; await (await import(path)).logout() })
  await expect(sibling).toHaveURL(/\/login\?returnTo=/)
  expect(refreshes(state)).toHaveLength(0)
})

test('console profile network failure retains the new session and allows deliberate login retry', async ({ page }) => {
  const { state } = await installAuthFixture(page, 'STAFF')
  await page.route('**/api/v1/users/profiles', route => route.fulfill({ status: 503, json: { success: false, message: 'Profile temporarily unavailable' } }))
  await page.goto('/console/login')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('staff@example.invalid')
  await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Profile temporarily unavailable')
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBe(state.access)
  expect((await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(true)
  await page.unroute('**/api/v1/users/profiles')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/staff\//)
})

test('a rejected console role is logged out on BE instead of leaving its refresh cookie behind', async ({ page }) => {
  const { state } = await installAuthFixture(page)
  await page.route('**/api/v1/users/profiles', route => route.fulfill({ json: { success: true,
    data: { id: QUIZ_IDS.user, role: 'STUDENT', roles: ['STUDENT'], displayName: 'Rejected learner' } } }))
  await page.goto('/console/login')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect.poll(() => state.requests.some(request => request.path.endsWith('/logout'))).toBe(true)
  await expect.poll(async () => (await page.context().cookies()).some(item => item.name === 'hocluc_refresh')).toBe(false)
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeNull()
})

test('same-account login does not reuse a profile request from the previous session', async ({ page }) => {
  const { seedCookie } = await installAuthFixture(page)
  await seedCookie()
  let profiles = 0, release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/users/profiles', async route => {
    profiles++
    if (profiles === 1) await gate
    return route.fallback()
  })
  await page.goto('/student/assessments/placement')
  await expect.poll(() => profiles).toBe(1)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hl-navigate', {
    detail: { path: '/login?returnTo=%2Fstudent%2Fassessments%2Fplacement' },
  })))
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  try {
    await expect(page.getByText('Chưa có bài đánh giá đầu vào', { exact: true })).toBeVisible()
    expect(profiles).toBe(2)
  } finally { release() }
  await expect(page).toHaveURL('/student/assessments/placement')
})
