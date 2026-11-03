import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: { success: true, data: [] } }))
})

test('learner form validates, toggles password and submits with Enter', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let audience = ''
  await page.route('**/api/v1/auth/login', async (route) => {
    audience = route.request().postDataJSON().audience
    await gate
    await route.fulfill({
      status: 400,
      json: { success: false, message: 'Thông tin đăng nhập chưa đúng.' },
    })
  })
  await page.goto('/login')
  const email = page.locator('input[data-auth-field="email"]')
  const password = page.locator('input[data-auth-field="password"]')
  await expect(email).toBeFocused()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#learner-email-error')).toHaveText('Vui lòng nhập email.')
  await email.fill('learner@example.test')
  await password.fill('FixturePass123!')
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click()
  await password.press('Enter')
  await expect(page.locator('.hl-auth-submit')).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toHaveText('Thông tin đăng nhập chưa đúng.')
  expect(audience).toBe('LEARNER')
  await expect(page.locator('.hl-auth-submit')).toBeEnabled()
  await page.getByRole('button', { name: 'Quên mật khẩu?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.locator('.brand-auth-card')).toBeVisible()
  await page.getByRole('button', { name: 'Quay lại đăng nhập' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('management form preserves console audience, password visibility and theme switching', async ({
  page,
}) => {
  let audience = ''
  await page.route('**/api/v1/auth/login', async (route) => {
    audience = route.request().postDataJSON().audience
    await route.fulfill({
      status: 400,
      json: { success: false, message: 'Thông tin đăng nhập chưa đúng.' },
    })
  })
  await page.goto('/console/login')
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản lý' })).toBeVisible()
  await page.locator('#admin-email').fill('manager@example.test')
  await page.locator('#admin-password').fill('FixturePass123!')
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click()
  await expect(page.locator('#admin-password')).toHaveAttribute('type', 'text')
  await page.locator('#admin-password').press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Thông tin đăng nhập chưa đúng.')
  expect(audience).toBe('CONSOLE')
  const html = page.locator('html')
  const theme = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /^Chuyển sang giao diện/ }).click()
  await expect(html).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark')
  await expect(page.locator('[data-auth-card]')).toBeVisible()
  // The console palette is raised for this page only and dropped again on the way out.
  await expect(html).toHaveAttribute('data-console', '')
  await page.getByRole('button', { name: 'Quay lại trang chủ' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(html).not.toHaveAttribute('data-console', /.*/)
})

test('management form checks the fields before calling the API and focuses the one to fix', async ({
  page,
}) => {
  let loginRequests = 0
  await page.route('**/api/v1/auth/login', (route) => {
    loginRequests += 1
    return route.abort()
  })
  await page.goto('/console/login')
  const email = page.locator('#admin-email')
  const password = page.locator('#admin-password')
  const submit = page.getByRole('button', { name: 'Đăng nhập', exact: true })
  await expect(email).toBeFocused()

  await submit.click()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#admin-email-error')).toHaveText('Vui lòng nhập email.')
  await expect(email).toBeFocused()

  await email.fill('not-an-email')
  await submit.click()
  await expect(page.locator('#admin-email-error')).toHaveText('Email không hợp lệ.')

  // Editing a field clears its own message.
  await email.fill('manager@example.test')
  await expect(page.locator('#admin-email-error')).toBeHidden()
  await submit.click()
  await expect(page.locator('#admin-password-error')).toHaveText('Vui lòng nhập mật khẩu.')
  await expect(password).toBeFocused()
  expect(loginRequests).toBe(0)
})

test('management form stays busy while signing in and explains rejected credentials', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let loginRequests = 0
  await page.route('**/api/v1/auth/login', async (route) => {
    loginRequests += 1
    await gate
    await route.fulfill({
      status: 401,
      json: { success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
    })
  })
  await page.goto('/console/login')
  const password = page.locator('#admin-password')
  await page.locator('#admin-email').fill('manager@example.test')
  await password.fill('FixturePass123!')
  await password.press('Enter')
  await expect(page.getByRole('button', { name: 'Đang đăng nhập...' })).toBeDisabled()
  await expect(page.locator('form[aria-busy="true"]')).toBeVisible()
  await password.press('Enter')
  release()
  await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng.')
  await expect(password).toBeFocused()
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled()
  expect(loginRequests).toBe(1)
})

test('management sign-in rejects a student profile and clears its session', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { accessToken: 'fixture-access' },
      },
    })
  )
  await page.route('**/api/v1/users/profiles', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { id: 'fixture-student', email: 'learner@example.test', role: 'STUDENT' },
      },
    })
  )
  await page.goto('/console/login')
  await page.locator('#admin-email').fill('learner@example.test')
  await page.locator('#admin-password').fill('FixturePass123!')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('không có quyền truy cập khu vực quản lý')
  expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeNull()
  await expect(page).toHaveURL(/\/console\/login$/)
})

test('authentication stays usable across desktop widths and related learner steps', async ({
  page,
}) => {
  for (const path of [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/console/login',
  ]) {
    await page.goto(path)
    // The learner steps share the dialog card; the management sign-in is its own console page.
    const card = page.locator(path === '/console/login' ? '[data-auth-card]' : '.brand-auth-card')
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      await expect(card).toBeVisible()
      const layout = await card.evaluate((el) => {
        const b = el.getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          fits: b.left >= 0 && b.right <= innerWidth,
        }
      })
      expect(layout).toEqual({ overflow: false, fits: true })
    }
    if (path === '/login') {
      const submit = page.locator('.hl-auth-submit')
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeVisible()
    }
  }
})

for (const email of ['unknown@example.test', 'student@example.test']) {
  test(`password recovery uses the same conditional success screen for ${email}`, async ({ page }) => {
    await page.route('**/api/v1/auth/forgot-password', async (route) => {
      expect(route.request().postDataJSON()).toEqual({ email })
      await route.fulfill({ json: {
        success: true, status: 200,
        message: 'If the email is registered, a password reset code has been sent.',
      } })
    })
    await page.goto('/forgot-password')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByRole('button', { name: 'Gửi mã xác nhận', exact: true }).click()
    await expect(page.locator('.hl-auth-heading p')).toHaveText(
      `Nếu email ${email} đã được đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu.`
    )
    await expect(page.getByRole('textbox', { name: 'Mã xác nhận đặt lại mật khẩu' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue(email)
    await expect(page.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled()
    expect(await page.evaluate(() => sessionStorage.getItem('hocluc.pendingEmail.reset'))).toBe(email)
  })
}
