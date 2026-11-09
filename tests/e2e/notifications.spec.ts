import { test, expect, type Page, type Request } from '@playwright/test'
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
    listGate: null as Promise<void> | null, countGate: null as Promise<void> | null, writeGate: null as Promise<void> | null,
    /** Each live stream asked for, in order; it stays quiet until the test sends it its events. */
    streams: [] as Stream[] }
  // The page closes a stream it no longer follows (dev StrictMode opens and closes one at every mount).
  const failed = new Set<Request>()
  page.on('requestfailed', request => {
    failed.add(request)
    state.streams.forEach(stream => { if (stream.request === request) stream.closedByPage = true })
  })
  await page.route('**/api/v1/notifications**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method()
    const token = req.headers().authorization?.split('.')[1]
    const actor = token ? JSON.parse(Buffer.from(token, 'base64url').toString()).role : ''
    state.requests.push({ method, path, page: Number(url.searchParams.get('page') ?? 0), role: actor })
    if (path.endsWith('/stream')) {
      const body = await new Promise<string>(resolve => {
        const stream: Stream = { role: actor, request: req, closedByPage: failed.has(req), answered: false,
          send: events => { stream.answered = true; resolve(events) } }
        state.streams.push(stream)
      })
      return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body }).catch(() => undefined)
    }
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
  /** Streams the page kept, answered or not. */
  const followed = () => state.streams.filter(stream => !stream.closedByPage)
  /** Streams the page keeps open and that have not been answered yet. */
  const waiting = () => followed().filter(stream => !stream.answered)
  return { state, base, followed, waiting }
}

interface Stream {
  role: string
  request: Request
  closedByPage: boolean
  answered: boolean
  send: (events: string) => void
}

const visibleBell = (page: Page) => page.getByRole('button', { name: 'Thông báo', exact: true }).filter({ visible: true })
const sse = (...events: [name: string, data: unknown][]) =>
  events.map(([name, data]) => `event: ${name}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`).join('')

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
  const { state, base, waiting } = await fixture(page)
  let release!: () => void
  state.countGate = new Promise<void>(resolve => { release = resolve })
  await page.goto('/console/staff/quizzes')
  await expect.poll(() => state.requests.filter(r => r.path.endsWith('/unread-count')).length).toBeGreaterThan(0)
  await expect.poll(() => waiting().map(stream => stream.role)).toEqual(['ROLE_STAFF'])
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
  // The old role's stream is closed and exactly one follows the new role.
  await expect.poll(() => waiting().map(stream => stream.role)).toEqual(['ROLE_TEACHER'])
  await page.waitForTimeout(500)
  expect(waiting().map(stream => stream.role)).toEqual(['ROLE_TEACHER'])
  expect(base.pageErrors).toEqual([])
})

test('a live notification raises the count and opens from its toast', async ({ page }) => {
  const { state, base, waiting } = await fixture(page)
  await page.goto('/console/staff/quizzes')
  await expect(visibleBell(page)).toHaveAccessibleDescription('3 thông báo chưa đọc')
  await expect.poll(() => waiting().length).toBe(1)
  const fresh = { ...item(50), title: 'Thông báo mới' }
  state.items.unshift(fresh)
  waiting()[0].send(sse(['ready', 'ok'], ['notification', fresh]))
  await expect(visibleBell(page)).toHaveAccessibleDescription('4 thông báo chưa đọc')
  await page.getByRole('button', { name: 'Mở thông báo: Thông báo mới', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })
  await expect(detail.getByRole('heading', { name: 'Thông báo mới', exact: true })).toBeVisible()
  await expect(detail.getByText('Đã đọc', { exact: true })).toBeVisible()
  expect(state.requests.filter(r => r.method === 'PATCH').map(r => r.path)).toEqual([`${prefix}/${fresh.id}/read`])
  await detail.getByRole('button', { name: 'Đóng thông báo', exact: true }).click()
  await expect(visibleBell(page)).toHaveAccessibleDescription('3 thông báo chưa đọc')
  expect(base.unmatched).toEqual([]); expect(base.pageErrors).toEqual([])
})

test('a notification that arrives while the list is open joins it without a toast', async ({ page }) => {
  const { state, base, waiting } = await fixture(page)
  await page.goto('/console/staff/quizzes')
  await visibleBell(page).click()
  const rows = page.getByRole('button', { name: /^Xem thông báo: / })
  await expect(rows).toHaveCount(3)
  await expect.poll(() => waiting().length).toBe(1)
  const fresh = { ...item(50), title: 'Thông báo mới' }
  state.items.unshift(fresh)
  waiting()[0].send(sse(['notification', fresh], ['notification', fresh]))
  await expect(rows).toHaveCount(4)
  await expect(rows.first()).toHaveAccessibleName('Xem thông báo: Thông báo mới')
  await expect(visibleBell(page)).toHaveAccessibleDescription('4 thông báo chưa đọc')
  await expect(page.getByRole('button', { name: 'Mở thông báo: Thông báo mới', exact: true })).toHaveCount(0)
  expect(base.unmatched).toEqual([]); expect(base.pageErrors).toEqual([])
})

test('a stream replaced by another screen stays closed until this one is shown again', async ({ page }) => {
  const { base, followed, waiting } = await fixture(page)
  await page.goto('/console/staff/quizzes')
  await expect.poll(() => waiting().length).toBe(1)
  // A stream that just ends is followed again.
  waiting()[0].send(sse(['ready', 'ok']))
  await expect.poll(() => waiting().length).toBe(1)
  expect(followed()).toHaveLength(2)
  waiting()[0].send(sse(['ready', 'ok'], ['replaced', 'ok']))
  await page.waitForTimeout(3_000)
  expect(followed()).toHaveLength(2)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => waiting().length).toBe(1)
  expect(followed()).toHaveLength(3)
  expect(base.pageErrors).toEqual([])
})

test('each notification opens the page its active role can reach', async ({ page }) => {
  await fixture(page, 'STUDENT')
  await page.goto('/student/assessments/placement')
  const targets = await page.evaluate(async () => {
    const module = '/src/lib/notificationTarget.ts'
    const { notificationTarget } = await import(/* @vite-ignore */ module)
    const all = ['STUDENT', 'MENTOR', 'TEACHER', 'STAFF', 'MANAGER', 'ADMINISTRATOR']
    const to = (role: string | null, entityType: string | null, entityId: string | null = 'id 1', audience: string | null = null, roles = all) =>
      notificationTarget({ entityType, entityId, audience }, role, roles)
    return {
      studentCourse: to('STUDENT', 'COURSE'), studentClass: to('STUDENT', 'LIVE_CLASS', null),
      studentSolve: to('STUDENT', 'STUDENT_SOLVE'), studentOrder: to('STUDENT', 'ORDER'),
      studentOrderWithoutId: to('STUDENT', 'ORDER', null), studentOther: to('STUDENT', 'SYSTEM'),
      staffCourse: to('STAFF', 'COURSE'), managerCourse: to('MANAGER', 'COURSE'), adminCourse: to('ADMINISTRATOR', 'COURSE'),
      staffCourseWithoutId: to('STAFF', 'COURSE', null), teacherCourse: to('TEACHER', 'COURSE'),
      teacherClass: to('TEACHER', 'LIVE_CLASS'), staffClass: to('STAFF', 'LIVE_CLASS'), staffOrder: to('STAFF', 'ORDER'),
      sentToThisRole: to('STAFF', 'COURSE', 'id 1', 'STAFF'),
      sentToAnotherRole: to('STAFF', 'COURSE', 'id 1', 'TEACHER'),
      sentToARoleTheyLack: to('STAFF', 'COURSE', 'id 1', 'TEACHER', ['STAFF']),
      signedOut: to(null, 'COURSE'),
    }
  })
  expect(targets).toEqual({
    studentCourse: { href: '/courses/id%201' }, studentClass: { href: '/student/schedule' },
    studentSolve: { href: '/student/tutor' }, studentOrder: { href: '/orders/id%201' },
    studentOrderWithoutId: null, studentOther: null,
    staffCourse: { href: '/console/staff/courses?courseId=id%201' },
    managerCourse: { href: '/console/manager/courses?courseId=id%201' },
    adminCourse: { href: '/console/admin/courses?courseId=id%201' },
    staffCourseWithoutId: null, teacherCourse: null,
    teacherClass: { href: '/console/teacher/schedule' }, staffClass: null, staffOrder: null,
    sentToThisRole: { href: '/console/staff/courses?courseId=id%201' },
    sentToAnotherRole: { switchTo: 'TEACHER' },
    sentToARoleTheyLack: null,
    signedOut: null,
  })
})

for (const [role, start, entityType, entityId, destination] of [
  ['STUDENT', '/student/assessments/placement', 'ORDER', 'order-1', /\/orders\/order-1$/],
  ['STAFF', '/console/staff/quizzes', 'COURSE', 'course-1', /\/console\/staff\/courses\?courseId=course-1$/],
] as const) {
  test(`${role}: opening a notification with a page goes there and marks it read`, async ({ page }) => {
    const { state } = await fixture(page, role)
    state.items[0] = { ...state.items[0], entityType, entityId, title: 'Thông báo có trang' }
    await page.goto(start)
    await visibleBell(page).click()
    await page.getByRole('button', { name: 'Xem thông báo: Thông báo có trang', exact: true }).click()
    await expect(page).toHaveURL(destination)
    await expect(page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })).toHaveCount(0)
    await expect.poll(() => state.requests.filter(r => r.method === 'PATCH').map(r => r.path)).toEqual([`${prefix}/${state.items[0].id}/read`])
  })
}

test('a notification sent to another of the user\'s roles is labelled and asks to switch to it', async ({ page }) => {
  const { state, base } = await fixture(page)
  state.items[0] = { ...state.items[0], entityType: 'LIVE_CLASS', audience: 'TEACHER', title: 'Lớp học sắp bắt đầu' }
  state.items[1] = { ...state.items[1], audience: 'STAFF' }
  await page.goto('/console/staff/quizzes')
  await visibleBell(page).click()
  const row = page.getByRole('button', { name: 'Xem thông báo: Lớp học sắp bắt đầu', exact: true })
  await expect(row.getByText('Giáo viên', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem thông báo: Thông báo QA 2', exact: true }).getByText('Nhân viên', { exact: true })).toHaveCount(0)
  await row.click()
  const detail = page.getByRole('dialog', { name: 'Chi tiết thông báo', exact: true })
  await expect(detail.getByRole('heading', { name: 'Lớp học sắp bắt đầu', exact: true })).toBeVisible()
  await detail.getByRole('button', { name: 'Chuyển sang vai trò Giáo viên', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/teacher\/dashboard$/)
  expect(base.requests.filter(r => r.path === '/api/v1/auth/switch-role').map(r => r.body)).toEqual([{ role: 'TEACHER' }])
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
