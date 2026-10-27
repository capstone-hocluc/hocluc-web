import { expect, test } from './auth-live-test'

test('wrong login surfaces reject seeded accounts without storing tokens', async ({ page, context }) => {
  await page.goto('/login')
  const result = await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const apiPath = '/src/lib/api.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    const api = await import(/* @vite-ignore */ apiPath)
    const statuses = []
    for (const [email, audience] of [['staff@gmail.com', 'LEARNER'], ['student@gmail.com', 'CONSOLE']]) {
      try {
        await service.login({ email, audience, password: '123456' })
        statuses.push(200)
      } catch (error) {
        statuses.push((error as { status: number }).status)
      }
    }
    return { statuses, empty: !api.getAccessToken() }
  })
  expect(result).toEqual({ statuses: [403, 403], empty: true })
  expect((await context.cookies('http://localhost:8080/api/v1/auth')).length).toBe(0)
})

test('logout after silent refresh invalidates both refresh cookies', async ({ page, context }) => {
  await page.goto('/login')
  await page.evaluate(async () => {
    const path = '/src/services/authService.ts'
    await (await import(/* @vite-ignore */ path)).login({ email: 'student@gmail.com', password: '123456', audience: 'LEARNER' })
  })
  const old = (await context.cookies('http://localhost:8080/api/v1/auth'))[0]
  await page.evaluate(async () => {
    const path = '/src/lib/api.ts'
    await (await import(/* @vite-ignore */ path)).ensureFreshAccessToken(true)
  })
  const rotated = (await context.cookies('http://localhost:8080/api/v1/auth'))[0]
  expect(Boolean(old && rotated && old.value !== rotated.value)).toBe(true)
  await page.evaluate(async () => {
    const path = '/src/services/authService.ts'
    await (await import(/* @vite-ignore */ path)).logout()
  })
  expect((await context.cookies('http://localhost:8080/api/v1/auth')).length).toBe(0)
  const codes = []
  for (const cookie of [old, rotated]) {
    await context.addCookies([cookie])
    codes.push((await page.request.post('http://localhost:8080/api/v1/auth/refresh', { headers: { Origin: 'http://localhost:5174' } })).status())
  }
  expect(codes).toEqual([401, 401])
  await context.clearCookies()
})

test('unknown email and wrong password have identical login errors', async ({ page }) => {
  const messages = []
  const bodies = []
  for (const email of ['unknown-auth-check@example.test', 'student@gmail.com']) {
    await page.goto('/login')
    await page.locator('input[data-auth-field="email"]').fill(email)
    await page.locator('input[data-auth-field="password"]').fill('incorrect-password')
    const response = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'))
    await page.locator('input[data-auth-field="password"]').press('Enter')
    const result = await response
    expect(result.status()).toBe(401)
    const { timestamp, ...body } = await result.json()
    expect(timestamp).toBeTruthy()
    bodies.push(body)
    await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
    messages.push(await page.getByRole('alert').textContent())
  }
  expect(bodies[0]).toEqual(bodies[1])
  expect(messages[0]).toBe(messages[1])
})
