import { createHmac } from 'node:crypto'
import { expect, test } from './auth-live-test'

test('logout with an expired access token revokes the rotated session', async ({ page }) => {
  const secret = process.env.AUTH_TEST_JWT_SECRET
  test.skip(!secret, 'A local signing key is required to produce a genuinely expired access token.')
  await page.goto('/login')
  // Keep credentials and JWTs inside this evaluation; report only HTTP status codes.
  const result = await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
    await service.login({ email: 'student@gmail.com', password: '123456', audience: 'LEARNER' })
    return { claims: JSON.parse(atob(api.getAccessToken()!.split('.')[1])) }
  })
  const keyBytes = Buffer.from(secret!, 'base64')
  const key = keyBytes.length < 32 ? Buffer.from(secret!) : keyBytes
  const alg = key.length >= 64 ? 'sha512' : key.length >= 48 ? 'sha384' : 'sha256'
  const header = Buffer.from(JSON.stringify({ alg: alg.replace('sha', 'HS') })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ ...result.claims, exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url')
  const input = `${header}.${payload}`
  const expired = `${input}.${createHmac(alg, key).update(input).digest('base64url')}`
  const old = (await page.context().cookies('http://localhost:8080/api/v1/auth'))[0]
  await page.evaluate(async (expiredToken) => {
    const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
    api.setTokens({ accessToken: expiredToken })
    await api.request('/api/v1/users/profiles', { auth: true })
  }, expired)
  const rotated = (await page.context().cookies('http://localhost:8080/api/v1/auth'))[0]
  expect(Boolean(old && rotated && old.value !== rotated.value)).toBe(true)
  await page.evaluate(async (expiredToken) => {
    const apiPath = '/src/lib/api.ts'
    ;(await import(/* @vite-ignore */ apiPath)).setTokens({ accessToken: expiredToken })
    const path = '/src/services/authService.ts'
    await (await import(/* @vite-ignore */ path)).logout()
  }, expired)
  expect((await page.context().cookies('http://localhost:8080/api/v1/auth')).length).toBe(0)
  const statuses = []
  for (const cookie of [old, rotated]) {
    await page.context().addCookies([cookie])
    const response = await page.request.post('http://localhost:8080/api/v1/auth/refresh', {
      headers: { Origin: 'http://localhost:5174' },
    })
    statuses.push(response.status())
  }
  expect(statuses).toEqual([401, 401])
  await page.context().clearCookies()
})
