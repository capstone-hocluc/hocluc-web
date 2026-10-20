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
  const statuses = await page.evaluate(async (expiredToken) => {
    const servicePath = '/src/services/authService.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
    const old = api.getRefreshToken()
    api.setTokens({ accessToken: expiredToken })
    let rotated: string | undefined
    const listener = () => { rotated = api.getRefreshToken() ?? rotated }
    window.addEventListener(api.AUTH_TOKENS_EVENT, listener)
    await service.logout()
    window.removeEventListener(api.AUTH_TOKENS_EVENT, listener)
    const refresh = async (token: string | null | undefined) => {
      if (!token) return 0
      const response = await fetch(`${api.API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      })
      // Clean up the leaked session when running this test against the old implementation.
      if (response.ok) {
        const { data } = await response.json()
        await fetch(`${api.API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.accessToken}` },
          body: JSON.stringify({ refreshToken: data.refreshToken }),
        })
      }
      return response.status
    }
    return { old: await refresh(old), rotated: await refresh(rotated), cleared: !api.getRefreshToken() }
  }, expired)
  expect(statuses).toEqual({ old: 401, rotated: 401, cleared: true })
})

