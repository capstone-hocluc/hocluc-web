import { expect, test } from './auth-live-test'

test('wrong login surfaces reject seeded accounts without storing tokens', async ({ page }) => {
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
    return { statuses, empty: !api.getAccessToken() && !api.getRefreshToken() }
  })
  expect(result).toEqual({ statuses: [403, 403], empty: true })
})

test('logout after silent refresh invalidates both refresh tokens', async ({ page }) => {
  await page.goto('/login')
  const statuses = await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const apiPath = '/src/lib/api.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    const api = await import(/* @vite-ignore */ apiPath)
    await service.login({ email: 'student@gmail.com', password: '123456', audience: 'LEARNER' })
    const old = api.getRefreshToken()
    await api.ensureFreshAccessToken(true)
    const rotated = api.getRefreshToken()
    await service.logout()
    const codes = []
    for (const refreshToken of [old, rotated]) {
      const response = await fetch(`${api.API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      codes.push(response.status)
    }
    return codes
  })
  expect(statuses).toEqual([401, 401])
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
