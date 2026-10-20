import { expect, test } from '@playwright/test'

test('a waiting tab reuses refresh but rejects account changes and logout', async ({ page, context }) => {
  await page.goto('/login')
  await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    await service.login({ email: 'student@gmail.com', password: '123456', audience: 'LEARNER' })
  })
  const sibling = await context.newPage()
  await sibling.goto('/login')
  const hold = async () => {
    await page.evaluate(() => {
      const state = window as unknown as { release: () => void; locked: Promise<void> }
      state.locked = new Promise<void>((ready) => {
        void navigator.locks.request('hocluc-token-refresh', async () => {
          await new Promise<void>((resolve) => { state.release = resolve; ready() })
        })
      })
      return state.locked
    })
  }
  const waitForRefresh = async () => {
    await sibling.evaluate(async () => {
      const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
      const state = window as unknown as { refreshResult: Promise<string | number> }
      state.refreshResult = api.ensureFreshAccessToken(true).then(
        async () => {
          await api.request('/api/v1/users/profiles', { auth: true })
          return 'reused'
        }, (error: { status: number }) => error.status,
      )
    })
    await expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).pending?.length)).toBe(1)
  }
  await hold()
  await waitForRefresh()
  await page.evaluate(async () => {
    const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
    await api.refreshToken()
    ;(window as unknown as { release: () => void }).release()
  })
  const reused = await sibling.evaluate(() => (window as unknown as { refreshResult: Promise<string | number> }).refreshResult)
  await hold()
  await waitForRefresh()
  await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    await service.logout()
    await service.login({ email: 'staff@gmail.com', password: '123456', audience: 'CONSOLE' })
    ;(window as unknown as { release: () => void }).release()
  })
  const switched = await sibling.evaluate(() => (window as unknown as { refreshResult: Promise<string | number> }).refreshResult)
  await hold()
  await waitForRefresh()
  await page.evaluate(async () => {
    const servicePath = '/src/services/authService.ts'
    const service = await import(/* @vite-ignore */ servicePath)
    await service.logout()
    ;(window as unknown as { release: () => void }).release()
  })
  const loggedOut = await sibling.evaluate(() => (window as unknown as { refreshResult: Promise<string | number> }).refreshResult)
  expect({ reused, switched, loggedOut }).toEqual({ reused: 'reused', switched: 409, loggedOut: 409 })
})
