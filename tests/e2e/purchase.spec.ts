import { test, expect, type Page, type Route } from '@playwright/test'

const profile = {
  id: 'fixture-student',
  role: 'STUDENT',
  displayName: 'Học viên kiểm thử',
  email: 'fixture@example.invalid',
}
const item = {
  courseId: 'fixture-course',
  title: 'Khóa học tư duy định lượng và phương pháp giải quyết vấn đề',
  price: 250000,
  endDate: '2099-12-31',
  thumbnailUrl: null,
  eligibility: { canPurchase: true, reasonCode: null, message: null },
}
const cart = {
  items: [item],
  itemCount: 1,
  totalAmount: 250000,
  version: 'v1',
  currency: 'VND',
  canCheckout: true,
}
const order = {
  id: 'fixture-order',
  orderCode: 'HL-TEST',
  paymentCode: 'HLTEST0001',
  status: 'PENDING',
  totalAmount: 250000,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 900000).toISOString(),
  paidAt: null,
  paymentAttempts: 1,
  items: [{ courseId: item.courseId, courseTitle: item.title, unitPrice: item.price }],
}
const payment = {
  order,
  bankCode: 'TEST',
  accountNumber: '0000000000',
  accountName: 'TAI KHOAN KIEM THU',
  amount: 250000,
  paymentCode: 'HLTEST0001',
  qrUrl: null,
}
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
}
async function respond(
  route: Route,
  data: unknown,
  status = 200,
  code?: string,
  errors?: Record<string, string>
) {
  await route.fulfill({
    status,
    headers: new URL(route.request().url()).pathname.startsWith('/api/v1/auth/')
      ? { ...headers, 'access-control-allow-origin': 'http://127.0.0.1:5192', 'access-control-allow-credentials': 'true' } : headers,
    json: {
      success: status < 400,
      data,
      code,
      errors,
      message: status >= 400 ? 'Lỗi kiểm thử có chủ đích' : undefined,
    },
  })
}
async function fixture(page: Page, loggedIn = true) {
  if (loggedIn)
    await page.addInitScript(() => localStorage.setItem('hocluc.accessToken', 'fixture-token'))
  await page.route('**/api/v1/**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/auth/refresh') return respond(route, null, 401)
    if (path === '/api/v1/users/profiles') return respond(route, profile)
    if (path === '/api/v1/cart') return respond(route, cart)
    if (path.endsWith('/payment') || path.endsWith('/pay') || path.endsWith('/checkout'))
      return respond(route, payment)
    if (path === '/api/v1/orders/' + order.id) return respond(route, order)
    return respond(route, [])
  })
}
test('purchase hydrates user once and cart uses learner brand on desktop/mobile', async ({
  page,
}) => {
  let hydrations = 0
  await fixture(page)
  await page.route('**/api/v1/users/profiles', (route) => {
    hydrations++
    return respond(route, profile)
  })
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Giỏ hàng của bạn' })).toBeVisible()
  await expect(page.getByRole('link', { name: item.title })).toHaveAttribute(
    'href',
    '/courses/' + item.courseId
  )
  expect(hydrations).toBe(1)
  await expect(page.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeEnabled()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy()
    expect(
      await page.locator('.hl-purchase').evaluate((el) => getComputedStyle(el).fontFamily)
    ).toContain('Be Vietnam Pro')
    await page.screenshot({ path: '.pi/qa/purchase/cart-' + width + '.png', fullPage: true })
  }
})
test('guest purchase preserves internal returnTo', async ({ page }) => {
  await fixture(page, false)
  let hydrations = 0
  await page.route('**/api/v1/users/profiles', (route) => {
    hydrations++
    return respond(route, null, 401)
  })
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout$/)
  expect(hydrations).toBe(0)
})
test('ineligible cart blocks checkout and explains the issue', async ({ page }) => {
  await fixture(page)
  await page.route('**/api/v1/cart', (route) =>
    respond(route, {
      ...cart,
      canCheckout: false,
      items: [
        {
          ...item,
          eligibility: {
            canPurchase: false,
            reasonCode: 'COURSE_ALREADY_OWNED',
            message: 'Bạn đã sở hữu khóa học này.',
          },
        },
      ],
    })
  )
  await page.goto('/cart')
  await expect(page.getByText('Bạn đã sở hữu khóa học này.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeDisabled()
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Tạo đơn & tiếp tục thanh toán' })).toBeDisabled()
})
test('mutation blocks checkout and other removals, clear requires confirmation', async ({
  page,
}) => {
  await fixture(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/cart/items/*', async (route) => {
    await gate
    await respond(route, { ...cart, items: [], itemCount: 0, totalAmount: 0 })
  })
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Xóa ' + item.title, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Xóa toàn bộ', exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Xóa toàn bộ', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Xác nhận xóa' })).toBeVisible()
})
test('checkout network retry reuses intent key and sends snapshot version', async ({ page }) => {
  await fixture(page)
  const keys: string[] = []
  await page.route('**/api/v1/orders/checkout', async (route) => {
    keys.push(route.request().headers()['idempotency-key'])
    expect(route.request().postDataJSON()).toEqual({ cartVersion: 'v1' })
    if (keys.length === 1) await route.abort('failed')
    else await respond(route, payment)
  })
  await page.goto('/checkout')
  await expect(page.getByText(profile.email, { exact: true })).toBeVisible()
  const submit = page.getByRole('button', { name: 'Tạo đơn & tiếp tục thanh toán' })
  await submit.click()
  await expect(page.getByRole('alert')).toContainText('Không thể kết nối')
  await submit.click()
  await expect(page).toHaveURL('/orders/' + order.id + '/payment')
  await expect(page.getByText(payment.accountNumber, { exact: true })).toBeVisible()
  expect(keys.length).toBe(2)
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).toBe(keys[0])
})
test('cart changed requires explicit reconfirmation and creates a new intent', async ({ page }) => {
  await fixture(page)
  let currentVersion = 'v1'
  const keys: string[] = []
  await page.route('**/api/v1/cart', (route) =>
    respond(route, { ...cart, version: currentVersion })
  )
  await page.route('**/api/v1/orders/checkout', async (route) => {
    keys.push(route.request().headers()['idempotency-key'])
    if (keys.length === 1) {
      currentVersion = 'v2'
      await respond(route, null, 409, 'CART_CHANGED')
    } else {
      expect(route.request().postDataJSON()).toEqual({ cartVersion: 'v2' })
      await respond(route, payment)
    }
  })
  await page.goto('/checkout')
  const submit = page.getByRole('button', { name: 'Tạo đơn & tiếp tục thanh toán' })
  await submit.click()
  await expect(page.getByRole('button', { name: 'Tôi đã kiểm tra thay đổi' })).toBeVisible()
  await expect(submit).toBeDisabled()
  await page.getByRole('button', { name: 'Tôi đã kiểm tra thay đổi' }).click()
  await submit.click()
  await expect(page).toHaveURL('/orders/' + order.id + '/payment')
  expect(keys[1]).not.toBe(keys[0])
})
test('direct payment reload restores current QR without POST and shows polling errors with cached order', async ({
  page,
}) => {
  await fixture(page)
  let failing = false,
    writes = 0
  await page.route('**/api/v1/orders/*/pay', (route) => {
    writes++
    return respond(route, payment)
  })
  await page.route('**/api/v1/orders/*/payment', (route) => {
    return !failing ? respond(route, payment) : respond(route, null, 503)
  })
  await page.goto('/orders/' + order.id + '/payment')
  await expect(page.getByText(payment.paymentCode, { exact: true })).toBeVisible()
  failing = true
  await expect(page.getByRole('alert')).toContainText('Lỗi kiểm thử', { timeout: 10000 })
  await expect(page.getByText(payment.paymentCode, { exact: true })).toBeVisible()
  expect(writes).toBe(0)
})
for (const status of ['FAILED', 'EXPIRED'])
  test(status + ' supports explicit retry and restores pending payment', async ({ page }) => {
    await fixture(page)
    let current = status
    let attempts = 0
    const activeId =
      status === 'FAILED' ? '11111111-1111-4111-8111-111111111111' : 'https://example.invalid/'
    await page.route('**/api/v1/orders/*/payment', (route) =>
      respond(route, {
        ...payment,
        order: { ...order, status: current },
        paymentCode: current === 'PENDING' ? payment.paymentCode : null,
      })
    )
    await page.route('**/api/v1/orders/*/pay', (route) => {
      attempts++
      if (attempts === 1)
        return respond(route, null, 409, 'ORDER_PAYMENT_IN_PROGRESS', { activeOrderId: activeId })
      current = 'PENDING'
      return respond(route, payment)
    })
    await page.goto('/orders/' + order.id + '/payment')
    await page.getByRole('button', { name: 'Thanh toán lại', exact: true }).click()
    if (status === 'FAILED')
      await expect(
        page.getByRole('link', { name: 'Tiếp tục thanh toán đơn đang chờ' })
      ).toHaveAttribute('href', '/orders/' + activeId + '/payment')
    else
      await expect(
        page.getByRole('link', { name: 'Tiếp tục thanh toán đơn đang chờ' })
      ).toHaveCount(0)
    await page.getByRole('button', { name: 'Thanh toán lại', exact: true }).click()
    await expect(page.getByText(payment.paymentCode, { exact: true })).toBeVisible()
  })

test('guest login resumes purchase', async ({ page }) => {
  await fixture(page, false)
  await page.route('**/api/v1/auth/login', (route) =>
    respond(route, { accessToken: 'fixture-signed-in' })
  )
  await page.goto('/checkout')
  await expect(page).toHaveURL(/returnTo=%2Fcheckout/)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@example.invalid')
  await page.getByPlaceholder('Nhập mật khẩu').fill('fixture-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  await expect(page.getByRole('heading', { name: 'Xác nhận đơn hàng', exact: true })).toBeVisible()
})
test('checkout, payment and order detail are readable on desktop and mobile', async ({ page }) => {
  await fixture(page)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const [path, name] of [
      ['/checkout', 'checkout'],
      ['/orders/' + order.id + '/payment', 'payment'],
      ['/orders/' + order.id, 'order-detail'],
    ]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('.purchase-panel, .hl-pay-card').first()).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      ).toBeTruthy()
      await page.screenshot({
        path: '.pi/qa/purchase/' + name + '-' + width + '.png',
        fullPage: true,
      })
    }
  }
})
test('free checkout shows confirmed access without bank instructions', async ({ page }) => {
  await fixture(page)
  await page.route('**/api/v1/cart', (route) =>
    respond(route, { ...cart, totalAmount: 0, items: [{ ...item, price: 0 }] })
  )
  await page.route('**/api/v1/orders/checkout', (route) =>
    respond(route, {
      ...payment,
      order: { ...order, status: 'PAID', totalAmount: 0 },
      paymentCode: null,
      bankCode: null,
      accountNumber: null,
      accountName: null,
      amount: null,
      qrUrl: null,
    })
  )
  await page.route('**/api/v1/orders/*/payment', (route) =>
    respond(route, {
      ...payment,
      order: { ...order, status: 'PAID', totalAmount: 0 },
      paymentCode: null,
      bankCode: null,
      accountNumber: null,
      accountName: null,
      amount: null,
      qrUrl: null,
    })
  )
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Đăng ký khóa học miễn phí' }).click()
  await expect(
    page.getByRole('heading', { name: 'Thanh toán thành công', exact: true })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vào khóa học của tôi' })).toBeVisible()
  await expect(page.locator('.hl-pay-card')).toHaveCount(0)
})
test('local countdown does not invent server failure or offer another payment', async ({
  page,
}) => {
  await fixture(page)
  await page.route('**/api/v1/orders/*/payment', (route) =>
    respond(route, {
      ...payment,
      order: { ...order, expiresAt: new Date(Date.now() - 1000).toISOString() },
    })
  )
  await page.goto('/orders/' + order.id + '/payment')
  await expect(page.getByText('Đã hết thời gian hiển thị mã.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thanh toán lại', exact: true })).toHaveCount(0)
  await expect(page.getByText('Chờ thanh toán', { exact: true })).toBeVisible()
})

test('leaving a pending checkout does not force navigation when response arrives', async ({
  page,
}) => {
  await fixture(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/orders/checkout', async (route) => {
    await gate
    await respond(route, payment)
  })
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Tiến hành thanh toán' }).click()
  await page.getByRole('button', { name: 'Tạo đơn & tiếp tục thanh toán' }).click()
  await expect(page.getByRole('button', { name: 'Đang tạo đơn hàng…' })).toBeDisabled()
  await page.goBack()
  await expect(page).toHaveURL('/cart')
  const completed = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/orders/checkout')
  )
  release()
  await completed
  await expect(page.getByRole('heading', { name: 'Giỏ hàng của bạn' })).toBeVisible()
  await expect(page).toHaveURL('/cart')
})
