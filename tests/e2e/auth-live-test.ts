import { test as base, expect } from '@playwright/test'

// Respect the live API's login limits while leaving every assertion enabled.
export const test = base.extend<{ authRateLimit: void }>({
  authRateLimit: [async ({ browser }, use) => {
    void browser
    await new Promise((resolve) => setTimeout(resolve, 20_000))
    await use()
  }, { auto: true }],
})

export { expect }
