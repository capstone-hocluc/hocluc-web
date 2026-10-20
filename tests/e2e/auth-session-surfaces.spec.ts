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
