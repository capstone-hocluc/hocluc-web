import { expect, test } from './auth-live-test'

test('verification and reset email can be recovered after reload', async ({ page }) => {
  for (const path of ['/verify-email', '/reset-password']) {
    await page.goto(path)
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    const email = page.getByRole('textbox', { name: 'Email', exact: true })
    await expect(email).toBeVisible()
    await email.fill('student@gmail.com')
    await page.reload()
    if (path === '/verify-email') {
      await expect(page.locator('.hl-auth-heading strong')).toHaveText('student@gmail.com')
    } else {
      await expect(email).toHaveValue('student@gmail.com')
    }
  }
  const cleared = await page.evaluate(async () => {
    const apiPath = '/src/lib/api.ts'
    const api = await import(/* @vite-ignore */ apiPath)
    api.clearTokens()
    return ['verification', 'reset'].every((purpose) => !sessionStorage.getItem(`hocluc.pendingEmail.${purpose}`))
  })
  expect(cleared).toBe(true)
})

test('protected placement returns through login without widening the allowlist', async ({ page }) => {
  await page.goto('/student/assessments/placement')
  await expect(page).toHaveURL('/login?returnTo=%2Fstudent%2Fassessments%2Fplacement')
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click()
  await expect(page).toHaveURL('/signup?returnTo=%2Fstudent%2Fassessments%2Fplacement')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('button', { name: 'Học viên student@gmail.com', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  const result = await page.evaluate(async () => {
    const returnToPath = '/src/lib/auth-return-to.ts'
    const { safeAuthReturnTo } = await import(/* @vite-ignore */ returnToPath)
    const servicePath = '/src/services/authService.ts'
    const { logout } = await import(/* @vite-ignore */ servicePath)
    await logout()
    return ['https://example.com', '//example.com', '/student/profile'].map(safeAuthReturnTo)
  })
  expect(result).toEqual([null, null, null])
})
