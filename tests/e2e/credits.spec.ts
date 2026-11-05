import { expect, test, type Page } from '@playwright/test'

/** Student credits: wallet, pack purchase hand-off, and the photo solver, against BE-shaped fixtures. */
const USER = '40000000-0000-0000-0000-000000000009'
const ORDER = '80000000-0000-0000-0000-000000000001'
const REQUEST = '90000000-0000-0000-0000-000000000001'
const stamp = '2026-11-05T03:00:00Z'
const tokenFor = (role: string) => `fixture.${Buffer.from(JSON.stringify({ sub: USER, role: `ROLE_${role}`, exp: 4102444800 })).toString('base64url')}.fixture`
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

async function install(page: Page, role = 'STUDENT') {
  const state = {
    balance: { available: 42, bonus: 12, paid: 30, held: 0 },
    solvePolls: 0,
    freezeBought: 0,
    freezes: 1,
    checkout: [] as string[],
    unmatched: [] as string[],
    pageErrors: [] as string[],
    adminWrites: [] as Array<{ method: string; path: string; body: unknown }>,
  }
  page.on('pageerror', (error) => state.pageErrors.push(error.message))
  await page.addInitScript((value) => {
    if (!localStorage.getItem('hocluc.accessToken')) localStorage.setItem('hocluc.accessToken', value)
  }, tokenFor(role))
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (!path.startsWith('/api/')) {
      // The app itself (any dev-server port); only the fake API host is mocked.
      if (url.hostname === '127.0.0.1' && url.port !== '1') return route.continue()
      return route.abort('blockedbyclient')
    }
    const answer = (data: unknown, status = 200, extra: Record<string, unknown> = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: path.startsWith('/api/v1/auth/')
          ? { 'access-control-allow-origin': 'http://127.0.0.1:5192', 'access-control-allow-credentials': 'true' }
          : undefined,
        body: JSON.stringify({ success: status < 400, status, data, message: 'OK', ...extra }),
      })
    const method = request.method()
    if (path === '/api/v1/auth/refresh') return answer(null, 401)
    if (path === '/api/v1/notifications/unread-count') return answer({ unread: 0 })
    if (path === '/api/v1/notifications') return answer({ content: [], totalElements: 0, isLast: true })
    if (path === '/api/v1/users/profiles')
      return answer({ id: USER, role, roles: [role], displayName: 'Học sinh', firstName: 'Học', lastName: 'Sinh',
        email: 'student@example.invalid', status: 'ACTIVE', emailVerified: true, studentProfile: null })
    if (path === '/api/v1/credits/me') return answer(state.balance)
    if (path === '/api/v1/credits/streak')
      return answer({ current: 5, longest: 9, doneToday: true, freezesAvailable: state.freezes, maxFreezes: 2, freezePrice: 10,
        today: '2026-11-05', days: [{ date: '2026-11-05', qualified: true, frozen: false, lessonsCompleted: 1, quizzesPassed: 0 },
          { date: '2026-11-04', qualified: false, frozen: true, lessonsCompleted: 0, quizzesPassed: 0 }] })
    if (path === '/api/v1/credits/me/history')
      return answer({ content: [
        { id: 'h1', type: 'PURCHASE', amount: 30, balanceAfter: 42, refType: 'ORDER', refId: ORDER, expiresAt: null, note: 'Gói 50', createdAt: stamp },
        { id: 'h2', type: 'HOLD', amount: -10, balanceAfter: 12, refType: 'CHAT_QUESTION', refId: 'c1', expiresAt: null, note: null, createdAt: stamp },
        { id: 'h3', type: 'EARN_STREAK', amount: 1, balanceAfter: 22, refType: 'STREAK_DAY', refId: '2026-11-04', expiresAt: '2027-02-02T03:00:00Z', note: null, createdAt: stamp },
      ], pageNumber: 0, pageSize: 20, totalElements: 3, totalPages: 1, isLast: true })
    if (path === '/api/v1/credits/packs')
      return answer([
        { id: 'p1', code: 'STARTER', name: 'Gói 50', credits: 50, price: 49000, active: true, displayOrder: 1 },
        { id: 'p2', code: 'STANDARD', name: 'Gói 120', credits: 120, price: 99000, active: true, displayOrder: 2 },
        { id: 'p3', code: 'PLUS', name: 'Gói 300', credits: 300, price: 229000, active: true, displayOrder: 3 },
      ])
    const order = { id: ORDER, orderCode: 'HL20261105100000', paymentCode: 'HLABCD1234', status: 'PENDING', totalAmount: 99000,
      createdAt: stamp, expiresAt: '2099-01-01T00:00:00Z', paidAt: null, paymentAttempts: 1,
      items: [{ courseId: null, courseTitle: 'Gói 120', unitPrice: 99000, creditPackId: 'p2', credits: 120 }] }
    const payment = { order, paymentCode: 'HLABCD1234', bankCode: 'MB', accountNumber: '0123456789', accountName: 'HOCLUC',
      amount: 99000, qrUrl: 'data:image/png;base64,' + PNG.toString('base64') }
    if (path === '/api/v1/credits/packs/p2/checkout' && method === 'POST') {
      state.checkout.push(request.headers()['idempotency-key'] ?? '')
      return answer(payment)
    }
    if (path === `/api/v1/orders/${ORDER}/payment`) return answer(payment)
    if (path === `/api/v1/orders/${ORDER}`) return answer(order)
    if (path === '/api/v1/student/ai/solve' && method === 'POST')
      return answer({ id: REQUEST, status: 'QUEUED', note: null, creditCost: 2, creditStatus: 'HELD', solution: null, error: null,
        imageUrl: null, createdAt: stamp, finishedAt: null })
    if (path === `/api/v1/student/ai/requests/${REQUEST}`) {
      state.solvePolls++
      return answer({ id: REQUEST, status: 'DONE', note: null, creditCost: 2, creditStatus: 'CAPTURED', error: null, imageUrl: null,
        createdAt: stamp, finishedAt: stamp,
        solution: { readable: true, subject: 'Toán', problem: 'Giải phương trình $x^2 - 5x + 6 = 0$',
          steps: ['Tính $\\Delta = 25 - 24 = 1$', 'Nghiệm $x = \\dfrac{5 \\pm 1}{2}$'], answer: '$x = 2$ hoặc $x = 3$' } })
    }
    if (path === '/api/v1/student/ai/requests')
      return answer({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, isLast: true })
    if (path === '/api/v1/admin/credit-packs' && method === 'GET')
      return answer([{ id: 'p1', code: 'STARTER', name: 'Gói 50', credits: 50, price: 49000, active: false, displayOrder: 1 }])
    if (path === '/api/v1/admin/credit-packs/p1' && method === 'PUT') {
      state.adminWrites.push({ method, path, body: request.postDataJSON() })
      return answer({ id: 'p1', ...request.postDataJSON() })
    }
    if (path === '/api/v1/users' && method === 'GET')
      return answer({ content: [{ id: 'student-1', email: 'an@example.invalid', firstName: 'An', lastName: 'Nguyễn',
        displayName: 'Nguyễn An', status: 'ACTIVE', role: 'STUDENT', emailVerified: true }],
        pageNumber: 0, pageSize: 20, totalElements: 1, totalPages: 1, last: true })
    if (path === '/api/v1/admin/credits/users/student-1') return answer({ available: 15, bonus: 5, paid: 10, held: 0 })
    if (path === '/api/v1/admin/credits/users/student-1/history')
      return answer({ content: [{ id: 'a1', type: 'PURCHASE', bonusDelta: 0, paidDelta: 10, heldDelta: 0, balanceAfter: 15,
        refType: 'ORDER', refId: ORDER, expiresAt: null, note: 'Gói 50', actorId: null, createdAt: stamp }],
        pageNumber: 0, pageSize: 20, totalElements: 1, totalPages: 1, isLast: true })
    if (path === '/api/v1/admin/credits/users/student-1/adjust' && method === 'POST') {
      state.adminWrites.push({ method, path, body: request.postDataJSON() })
      return answer({ available: 20, bonus: 10, paid: 10, held: 0 })
    }
    if (path === '/api/v1/courses/my') return answer([])
    if (path === '/api/v1/assessments/results/me') return answer(null, 404)
    if (path === '/api/v1/credits/streak/freeze' && method === 'POST') {
      state.freezeBought++
      state.freezes++
      state.balance = { ...state.balance, available: state.balance.available - 10, bonus: 2 }
      return answer({ current: 5, longest: 9, doneToday: true, freezesAvailable: 2, maxFreezes: 2, freezePrice: 10,
        today: '2026-11-05', days: [] })
    }
    state.unmatched.push(`${method} ${path}`)
    return answer(null, 404)
  })
  return state
}

test('wallet shows the balance, the packs and the history, and a pack opens its QR payment', async ({ page }) => {
  const state = await install(page)
  await page.goto('/student/wallet')
  await expect(page.getByRole('heading', { name: 'Ví Sao' })).toBeVisible()
  await expect(page.getByRole('button', { name: '42 Sao' })).toBeVisible()
  await expect(page.getByText('12 Sao thưởng · 30 Sao đã mua')).toBeVisible()
  await expect(page.getByText('Tạm giữ · Hỏi mentor')).toBeVisible()
  await expect(page.getByRole('button', { name: '99.000đ' })).toBeVisible()
  await page.screenshot({ path: 'test-results/credits-wallet.png', fullPage: true })

  await page.getByRole('button', { name: '99.000đ' }).click()
  await expect(page).toHaveURL(new RegExp(`/orders/${ORDER}/payment$`))
  await expect(page.getByText('Thanh toán gói Sao')).toBeVisible()
  expect(state.checkout).toHaveLength(1)
  expect(state.pageErrors).toEqual([])
})

test('the AI tutor sends a photo and shows the worked solution', async ({ page }) => {
  const state = await install(page)
  await page.goto('/student/tutor')
  await expect(page.getByRole('heading', { name: 'Gia sư AI' })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'bai.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByAltText('Ảnh bài tập đã chọn')).toBeVisible()
  await page.getByRole('button', { name: 'Gửi ảnh' }).click()
  await expect(page.getByText('Đáp số')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.katex').first()).toBeVisible()
  expect(state.solvePolls).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/credits-tutor.png', fullPage: true })
  expect(state.pageErrors).toEqual([])
})

test('the dashboard shows the streak and buys a freeze with stars', async ({ page }) => {
  const state = await install(page)
  await page.goto('/student/dashboard')
  await expect(page.getByRole('heading', { name: 'Chuỗi học tập' })).toBeVisible()
  await expect(page.getByText('Chuỗi học tập 5 ngày')).toBeVisible()
  await expect(page.getByText('Dài nhất 9 ngày')).toBeVisible()
  await expect(page.getByLabel('1 lượt đóng băng')).toBeVisible()
  await page.screenshot({ path: 'test-results/credits-dashboard.png', fullPage: true })

  await page.getByRole('button', { name: 'Mua đóng băng chuỗi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mua', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đã đủ lượt đóng băng' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '32 Sao' })).toBeVisible()
  expect(state.freezeBought).toBe(1)
  expect(state.pageErrors).toEqual([])
})

test('an administrator switches a pack on and corrects a learner balance with a reason', async ({ page }) => {
  const state = await install(page, 'ADMINISTRATOR')
  await page.goto('/admin/credits')
  await expect(page.getByRole('heading', { name: 'Sao' })).toBeVisible()
  await expect(page.getByText('Đã tắt')).toBeVisible()
  await page.getByRole('row', { name: /Gói 50/ }).getByRole('button', { name: 'Sửa' }).click()
  const packDialog = page.getByRole('dialog', { name: 'Sửa gói' })
  await packDialog.getByLabel('Giá (VNĐ)').fill('59000')
  await packDialog.getByLabel('Đang bán').check()
  await packDialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(packDialog).toBeHidden()
  expect(state.adminWrites[0]).toMatchObject({ method: 'PUT', body: { price: 59000, active: true, credits: 50 } })

  await page.getByRole('tab', { name: 'Số dư học viên' }).click()
  await page.getByRole('button', { name: 'Học viên', exact: true }).filter({ hasText: 'Chọn học viên' }).click()
  await page.getByRole('option', { name: 'Nguyễn An' }).click()
  await expect(page.getByText('Mua gói · Gói 50').or(page.getByText('Mua gói'))).toBeVisible()
  await page.screenshot({ path: 'test-results/credits-admin.png', fullPage: true })
  await page.getByRole('button', { name: 'Điều chỉnh số dư' }).click()
  const adjust = page.getByRole('dialog', { name: 'Điều chỉnh số dư' })
  await adjust.getByLabel('Số Sao').fill('5')
  await adjust.getByLabel('Lý do').fill('Bù lỗi hệ thống')
  await adjust.getByRole('button', { name: 'Lưu' }).click()
  await expect(adjust).toBeHidden()
  expect(state.adminWrites[1]).toMatchObject({ method: 'POST', body: { amount: 5, bucket: 'BONUS', reason: 'Bù lỗi hệ thống' } })
  expect(state.pageErrors).toEqual([])
})
