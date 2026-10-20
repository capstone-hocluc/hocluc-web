import { test, expect, type Page } from '@playwright/test'
import { installQuizFixture, quizToken } from './quiz-permissions-fixture'
import type { UserRole } from '../../src/services/userService'
import type { UserNotification } from '../../src/services/notificationService'

const prefix = '/api/v1/notifications'
const item = (index: number): UserNotification => ({
  id: `90000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
  title: `Thông báo QA ${index}`, message: `Nội dung thông báo ${index}. Nội dung đầy đủ được trả về từ API.`,
  type: 'COURSE', entityType: 'COURSE', entityId: null, read: false, readAt: null, createdAt: '2026-10-20T08:30:00Z',
})

async function fixture(page: Page, role: UserRole = 'STAFF', count = 3) {
  const base = await installQuizFixture(page, role)
  const state = { items: Array.from({ length: count }, (_, index) => item(index + 1)),
    requests: [] as { method: string; path: string; page: number; role: string }[],
    listStatus: 200, countStatus: 200, writeStatus: 200,
    listGate: null as Promise<void> | null, countGate: null as Promise<void> | null, writeGate: null as Promise<void> | null }
  await page.route('**/api/v1/notifications**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method()
    const token = req.headers().authorization?.split('.')[1]
    const actor = token ? JSON.parse(Buffer.from(token, 'base64url').toString()).role : ''
    state.requests.push({ method, path, page: Number(url.searchParams.get('page') ?? 0), role: actor })
    const answer = (data: unknown, status = 200) => route.fulfill({ status,
      json: { success: status < 400, status, data, message: status === 403 ? 'Forbidden' : 'Lỗi API kiểm thử' } })
    if (path.endsWith('/unread-count')) {
      const unread = state.items.filter(n => !n.read).length
      const gate = state.countGate
      state.countGate = null
      if (gate) await gate
      return answer({ unread }, state.countStatus)
    }
    if (method === 'PATCH') {
      if (state.writeStatus !== 200) return answer(null, state.writeStatus)
      const targets = state.items.filter(n => path.endsWith('/read-all') || path.includes(n.id))
      if (state.writeGate) await state.writeGate
      targets.forEach(n => { n.read = true; n.readAt = '2026-10-21T00:00:00Z' })
      return answer(path.endsWith('/read-all') ? { marked: targets.length } : targets[0])
    }
    const pageNumber = Number(url.searchParams.get('page') ?? 0)
    const content = state.items.slice(pageNumber * 20, (pageNumber + 1) * 20).map(n => ({ ...n }))
    if (state.listGate) await state.listGate
    return answer({ content, pageNumber, pageSize: 20, totalElements: state.items.length,
      totalPages: Math.ceil(state.items.length / 20), last: (pageNumber + 1) * 20 >= state.items.length }, state.listStatus)
  })
  return { state, base }
}

const visibleBell = (page: Page) => page.getByRole('button', { name: 'Thông báo', exact: true }).filter({ visible: true })

for (const [role, area] of [['STAFF', 'staff'], ['MANAGER', 'manager'], ['ADMINISTRATOR', 'admin'], ['TEACHER', 'teacher'], ['MENTOR', 'mentor'], ['STUDENT', 'student']] as const) {
  test(`${role}: notification feed and read state use the authenticated API`, async ({ page }) => {
    const { state, base } = await fixture(page, role)
    await page.goto(role === 'STUDENT' ? '/student/assessments/placement' : `/console/${area}/quizzes`)
    await expect(visibleBell(page)).toHaveAccessibleDescription('3 thông báo chưa đọc')
    await visibleBell(page).click()
    await page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).click()
    const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })
    await expect(detail).toBeVisible()
    await expect(detail.getByRole('heading', { name: 'Thông báo QA 1', exact: true })).toBeVisible()
    await detail.getByRole('button', { name: 'Đóng thông báo', exact: true }).click()
    await expect(visibleBell(page)).toHaveAccessibleDescription('2 thông báo chưa đọc')
    expect(state.requests.filter(r => r.method === 'PATCH')).toEqual([expect.objectContaining({ path: `${prefix}/${state.items[0].id}/read`, role: `ROLE_${role}` })])
    await visibleBell(page).click()
    await page.getByRole('button', { name: 'Đánh dấu đã đọc tất cả', exact: true }).click()
    await expect(visibleBell(page)).toHaveAccessibleDescription('0 thông báo chưa đọc')
    await page.keyboard.press('Escape')
    await visibleBell(page).click()
    await expect(page.getByLabel('Chưa đọc', { exact: true })).toHaveCount(0)
    expect(base.unmatched).toEqual([]); expect(base.pageErrors).toEqual([])
  })
}

test('pagination and mark-all cover unread notifications outside the visible page', async ({ page }) => {
  const { state, base } = await fixture(page, 'STAFF', 21)
  await page.goto('/console/staff/quizzes')
  await visibleBell(page).click()
  await expect(page.getByText('Trang 1/2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sau', exact: true }).click()
  await expect(page.getByText('Trang 2/2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 21', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Đánh dấu đã đọc tất cả', exact: true }).click()
  await expect(visibleBell(page)).toHaveAccessibleDescription('0 thông báo chưa đọc')
  expect(state.items.every(n => n.read)).toBe(true)
  await page.getByRole('button', { name: 'Trước', exact: true }).click()
  await expect(page.getByText('Trang 1/2', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Chưa đọc', { exact: true })).toHaveCount(0)
  expect(state.requests.every(r => r.method === 'GET' || r.path === `${prefix}/read-all`)).toBe(true)
  expect(base.unmatched).toEqual([]); expect(base.pageErrors).toEqual([])
})

test('empty, count failure, list 403 and retry are distinct states', async ({ page }) => {
  const { state } = await fixture(page, 'STUDENT', 0)
  state.countStatus = 500
  state.listStatus = 403
  await page.goto('/student/assessments/placement')
  await expect(visibleBell(page)).toHaveAccessibleDescription('Không thể tải số chưa đọc')
  await visibleBell(page).click()
  await expect(page.getByRole('alert')).toContainText('Bạn không có quyền')
  await expect(page.getByText('Chưa có thông báo nào.', { exact: true })).toHaveCount(0)
  state.listStatus = 200
  state.countStatus = 200
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByText('Chưa có thông báo nào.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Thử lại số chưa đọc', exact: true }).click()
  await expect(visibleBell(page)).toHaveAccessibleDescription('0 thông báo chưa đọc')
})

test('failed read does not clear unread state and can be retried', async ({ page }) => {
  const { state } = await fixture(page)
  state.writeStatus = 403
  await page.goto('/console/staff/quizzes')
  await visibleBell(page).click()
  const notification = page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true })
  await notification.click()
  const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })
  await expect(detail.getByRole('alert')).toContainText('Bạn không có quyền')
  await expect(detail.getByText('Chưa đọc', { exact: true })).toBeVisible()
  expect(state.items[0].read).toBe(false)
  expect(state.requests.filter(r => r.method === 'PATCH')).toHaveLength(1)
  state.writeStatus = 200
  await detail.getByRole('button', { name: 'Thử lại đánh dấu đã đọc', exact: true }).click()
  await expect(detail.getByText('Đã đọc', { exact: true })).toBeVisible()
  await detail.getByRole('button', { name: 'Đóng thông báo', exact: true }).click()
  await expect(visibleBell(page)).toHaveAccessibleDescription('2 thông báo chưa đọc')
})

for (const width of [1440, 390]) {
  test(`long notification detail scrolls within the dialog at ${width}px`, async ({ page }, testInfo) => {
    const { state, base } = await fixture(page, 'STUDENT')
    state.items[0].message = Array.from({ length: 70 }, (_, index) => `Đoạn ${index + 1}: Nội dung thông báo dài cần được hiển thị đầy đủ, giữ xuống dòng và đọc bằng vùng cuộn riêng.`).join('\n\n')
      + '\n' + 'X'.repeat(800) + '\nKẾT THÚC THÔNG BÁO'
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/student/assessments/placement')
    await visibleBell(page).click()
    const preview = page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).locator('span.whitespace-pre-wrap')
    expect(await preview.evaluate(element => element.clientHeight <= parseFloat(getComputedStyle(element).lineHeight) * 2 + 1)).toBe(true)
    await page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).click()
    const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })
    const body = detail.getByRole('region', { name: 'Nội dung thông báo', exact: true })
    await expect(detail).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Danh sách thông báo', exact: true })).toHaveCount(0)
    expect(await body.evaluate(element => element.scrollHeight > element.clientHeight && element.scrollWidth <= element.clientWidth)).toBe(true)
    const bounds = await detail.boundingBox()
    expect(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 844).toBeTruthy()
    await expect(detail.getByText('Đã đọc', { exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await body.evaluate(element => { element.scrollTop = element.scrollHeight })
    expect(await body.evaluate(element => {
      const node = element.querySelector('p')!.firstChild!
      const range = document.createRange()
      range.setStart(node, node.textContent!.length - 'KẾT THÚC THÔNG BÁO'.length)
      range.setEnd(node, node.textContent!.length)
      return range.getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom - 1
    })).toBe(true)
    await expect(detail.getByRole('button', { name: 'Đóng thông báo', exact: true })).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath(`notification-detail-${width}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await expect(visibleBell(page)).toBeFocused()
    await visibleBell(page).click()
    await page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).click()
    await expect(detail).toBeVisible()
    expect(state.requests.filter(request => request.method === 'PATCH')).toHaveLength(1)
    expect(base.unmatched).toEqual([]); expect(base.pageErrors).toEqual([])
  })
}

test('role switch closes the notification detail and discards its old content', async ({ page }) => {
  const { state } = await fixture(page)
  await page.goto('/console/staff/quizzes')
  await visibleBell(page).click()
  await page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })).toBeVisible()
  state.items = [{ ...item(99), title: 'Thông báo của Teacher' }]
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
    window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: '/console/teacher/quizzes' } }))
  }, quizToken('TEACHER'))
  await expect(page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })).toHaveCount(0)
  await expect(visibleBell(page)).toHaveAccessibleDescription('1 thông báo chưa đọc')
  await visibleBell(page).click()
  await expect(page.getByRole('button', { name: 'Xem thông báo: Thông báo của Teacher', exact: true })).toBeVisible()
  await expect(page.getByText('Thông báo QA 1', { exact: true })).toHaveCount(0)
})

test('active-role change drops old feed and rejects a late count response', async ({ page }) => {
  const { state, base } = await fixture(page)
  let release!: () => void
  state.countGate = new Promise<void>(resolve => { release = resolve })
  await page.goto('/console/staff/quizzes')
  await expect.poll(() => state.requests.filter(r => r.path.endsWith('/unread-count')).length).toBeGreaterThan(0)
  state.items = [{ ...item(99), title: 'Thông báo của Teacher' }]
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
    window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: '/console/teacher/quizzes' } }))
  }, quizToken('TEACHER'))
  await expect(visibleBell(page)).toHaveAccessibleDescription('1 thông báo chưa đọc')
  release()
  await visibleBell(page).click()
  await expect(page.getByRole('button', { name: 'Xem thông báo: Thông báo của Teacher', exact: true })).toBeVisible()
  await expect(visibleBell(page)).toHaveAccessibleDescription('1 thông báo chưa đọc')
  expect(base.pageErrors).toEqual([])
})

test('mobile bell fits the viewport and keeps read state when the popover reopens', async ({ page }, testInfo) => {
  await fixture(page, 'STUDENT')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/student/assessments/placement')
  await visibleBell(page).click()
  await expect(page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true })).toBeVisible()
  const panel = page.getByRole('dialog', { name: 'Danh sách thông báo' })
  const bounds = await panel.boundingBox()
  expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390).toBeTruthy()
  await page.screenshot({ path: testInfo.outputPath('notifications-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 1', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(visibleBell(page)).toBeFocused()
  await visibleBell(page).click()
  await expect(visibleBell(page)).toHaveAccessibleDescription('2 thông báo chưa đọc')
})
