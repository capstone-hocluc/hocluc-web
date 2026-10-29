import { expect, test, type Page, type Locator } from '@playwright/test'
import { IDS, installCrudFixture, fixtureProblems, STAMP } from './core-crud-fixture'

async function selectOption(scope: Page | Locator, page: Page, label: string, option: string) {
  await scope.getByRole('button', { name: new RegExp(label) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.afterEach(async ({ page }) => {
  expect(fixtureProblems(page)).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

// Rendered FE workflows against a fail-closed API fixture, not BE/integration proof.
test('category edit preserves metadata and sends stale-edit token', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/categories')
  await page
    .getByRole('row', { name: /^Toán / })
    .getByRole('button', { name: 'Sửa', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Sửa môn học', exact: true })
  await dialog.getByLabel('Tên môn học', { exact: true }).fill('Toán cập nhật')
  await dialog.getByRole('button', { name: 'Lưu môn học', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: /^Toán cập nhật / })).toBeVisible()
  const saved = state.requests.find((r) => r.method === 'PUT' && r.path.endsWith(IDS.root))!
  expect(saved.body).toMatchObject({
    name: 'Toán cập nhật',
    imageUrl: 'https://example.invalid/math.png',
    parentId: null,
    active: true,
    expectedUpdatedAt: STAMP,
  })
})

test('category creation and unknown mutation prevent blind retries', async ({ page }) => {
  const state = await installCrudFixture(page, 'ADMINISTRATOR')
  await page.goto('/admin/categories')
  await page.getByRole('button', { name: 'Tạo môn học', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo môn học', exact: true })
  await dialog.getByLabel('Tên môn học', { exact: true }).fill('Vật lý')
  state.failNext = 'network'
  await dialog.getByRole('button', { name: 'Lưu môn học', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Lưu môn học', exact: true })).toBeDisabled()
  await expect(dialog.getByText(/Chưa rõ kết quả lưu/)).toBeVisible()
  expect(state.requests.filter((r) => r.method === 'POST')).toHaveLength(1)
  const getsBeforeClose = state.requests.filter(
    (r) => r.method === 'GET' && r.path === '/api/v1/categories'
  ).length
  let releaseRead!: () => void
  state.categoryReadGate = new Promise<void>((resolve) => {
    releaseRead = resolve
  })
  await dialog.getByRole('button', { name: 'Đóng và kiểm tra', exact: true }).click()
  try {
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Tạo môn học', exact: true })).toBeDisabled()
  } finally {
    releaseRead()
  }
  await expect(page.getByRole('row', { name: /^Vật lý / })).toBeVisible()
  expect(
    state.requests.filter((r) => r.method === 'GET' && r.path === '/api/v1/categories').length
  ).toBeGreaterThan(getsBeforeClose)
  expect(state.requests.filter((r) => r.method === 'POST')).toHaveLength(1)
})

test('stale category edit keeps input and does not automatically resend', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/categories')
  await page
    .getByRole('row', { name: /^Toán / })
    .getByRole('button', { name: 'Sửa', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Sửa môn học', exact: true })
  await dialog.getByLabel('Tên môn học', { exact: true }).fill('Nội dung chưa lưu')
  state.failNext = 'conflict'
  await dialog.getByRole('button', { name: 'Lưu môn học', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(/Reload|tải lại|thay đổi/i)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Tên môn học', { exact: true })).toHaveValue('Nội dung chưa lưu')
  expect(state.requests.filter((r) => r.method === 'PUT')).toHaveLength(1)
  expect(state.categories.find((c) => c.id === IDS.root)!.name).toBe('Toán')
})

test('SECTION metadata create works without MAIN calendar fields', async ({ page }, testInfo) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo khóa học', exact: true })
  await selectOption(dialog, page, 'Loại khóa', 'Khóa nhỏ')
  await dialog.getByLabel('Tên khóa học', { exact: true }).fill('SECTION Hình học')
  const next = dialog.getByRole('button', { name: 'Tiếp tục', exact: true })
  await next.click()
  await dialog.getByText('Khóa có học phí', { exact: true }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Khóa có học phí', exact: true })).toBeChecked()
  await dialog.getByLabel('Học phí (VND)', { exact: true }).fill('150000')
  await next.click()
  // SECTION courses have no calendar step, so the next stop is the access window.
  await expect(dialog.getByLabel('Ngày bắt đầu', { exact: true })).toHaveCount(0)
  await selectOption(dialog, page, 'Hạn dùng khóa', 'N ngày kể từ khi mua')
  await dialog.getByLabel('Số ngày truy cập').fill('120')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: testInfo.outputPath('section-mobile-editor.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Lưu khóa học', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: /SECTION Hình học/ })).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path === '/api/v1/admin/courses')!.body
  ).toMatchObject({
    courseType: 'SECTION',
    title: 'SECTION Hình học',
    paid: true,
    price: 150000,
    track: null,
    startDate: null,
    endDate: null,
    accessMode: 'DAYS_FROM_PURCHASE',
    accessDays: 120,
  })
})

test('review submission rejection remains visible and uses current edit token', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page
    .getByRole('row', { name: /MAIN Toán/ })
    .getByRole('button', { name: 'Gửi duyệt', exact: true })
    .click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Gửi duyệt khóa học?', exact: true }) })
  await confirmation.getByRole('button', { name: 'Gửi duyệt', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  expect(
    state.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/review'))
  ).toHaveLength(1)
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path.endsWith('/review'))!.body
  ).toMatchObject({ expectedUpdatedAt: STAMP })
  await confirmation.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(
    page.getByRole('row', { name: /MAIN Toán/ }).getByText('Nháp', { exact: true })
  ).toBeVisible()
})

test('MAIN structure uses parent-scoped phase, gift and teacher IDs', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'MAIN Toán', exact: true }).click()
  await page.getByRole('tab', { name: 'Nội dung', exact: true }).click()
  await page.getByRole('button', { name: 'Đưa Nền tảng xuống', exact: true }).click()
  await expect
    .poll(() => state.requests.find((r) => r.path.endsWith('/phases/order'))?.body.ids)
    .toEqual([IDS.phase2, IDS.phase1])
  const phasesPanel = page
    .getByRole('heading', { name: 'Giai đoạn', exact: true })
    .locator('..')
    .locator('..')
  await expect(phasesPanel.locator('li h3')).toHaveText(['Luyện tập', 'Nền tảng'])
  await page.getByRole('tab', { name: 'Khóa tặng kèm', exact: true }).click()
  await selectOption(page, page, 'Khóa để tặng kèm', 'SECTION Đại số · Nháp')
  await page.getByRole('button', { name: 'Tặng kèm khóa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'SECTION Đại số', exact: true })).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path.endsWith('/sections'))
  ).toMatchObject({
    path: `/api/v1/admin/courses/${IDS.main}/sections`,
    body: { sectionCourseId: IDS.section },
  })
  await page.getByRole('tab', { name: 'Giảng viên', exact: true }).click()
  await selectOption(page, page, 'Giảng viên cần gán', 'Giáo viên QA')
  await page.getByRole('button', { name: 'Gán giảng viên', exact: true }).click()
  await expect(page.getByText('Giảng viên chính', { exact: true })).toBeVisible()
  expect(
    state.requests.find(
      (r) => r.method === 'PUT' && r.path.endsWith(`/instructors/${IDS.teacher}`)
    )!.body
  ).toMatchObject({ primaryInstructor: true, displayOrder: 0 })
})

test('category delete confirms the chosen leaf and keeps its parent', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/categories')
  await page
    .getByRole('row', { name: /^Đại số / })
    .getByRole('button', { name: 'Xóa', exact: true })
    .click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Xóa môn học?', exact: true }) })
  await confirmation.getByRole('button', { name: 'Xóa môn học', exact: true }).click()
  await expect(confirmation).toBeHidden()
  await expect(page.getByRole('row', { name: /^Toán / })).toBeVisible()
  await expect(page.getByRole('row', { name: /^Đại số / })).toHaveCount(0)
  expect(state.requests.filter((r) => r.method === 'DELETE')).toEqual([
    { path: `/api/v1/categories/${IDS.child}`, method: 'DELETE', body: {} },
  ])
})

test('draft course delete targets the selected course only', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page
    .getByRole('row', { name: /SECTION Đại số/ })
    .getByRole('button', { name: 'Thao tác khác với SECTION Đại số', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Xóa', exact: true }).click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Xóa khóa nháp?', exact: true }) })
  await confirmation.getByRole('button', { name: 'Xóa khóa', exact: true }).click()
  await expect(confirmation).toBeHidden()
  await expect(page.getByRole('row', { name: /MAIN Toán/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /SECTION Đại số/ })).toHaveCount(0)
  expect(state.requests.filter((r) => r.method === 'DELETE')).toEqual([
    { path: `/api/v1/admin/courses/${IDS.section}`, method: 'DELETE', body: {} },
  ])
})

test('manager has read-only category/course detail on a narrow viewport', async ({
  page,
}, testInfo) => {
  const state = await installCrudFixture(page, 'MANAGER')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/manager/categories')
  await expect(page.getByRole('row', { name: /^Toán / })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tạo môn học', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.goto('/manager/courses')
  await expect(page.getByRole('button', { name: 'Tạo khóa học', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page
    .getByRole('button', { name: 'MAIN Toán', exact: true })
    .click()
  await page.getByRole('tab', { name: 'Nội dung', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Giai đoạn', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm phần học', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Thêm chương', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Giảng viên', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Gán giảng viên', exact: true })).toHaveCount(0)
  expect(state.requests.filter((r) => r.method !== 'GET')).toHaveLength(0)
  expect(
    state.requests.filter((r) => r.path.includes('/users') && r.path !== '/api/v1/users/profiles')
  ).toHaveLength(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: testInfo.outputPath('manager-mobile.png'), fullPage: true })
})

test('SECTION content authoring creates and publishes a lesson with edit tokens', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'SECTION Đại số', exact: true }).click()
  await page.getByRole('tab', { name: 'Nội dung', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Chương và bài học', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Thêm chương', exact: true }).click()
  const chapterDialog = page.getByRole('dialog', { name: 'Thêm chương', exact: true })
  await chapterDialog.getByLabel('Tên chương', { exact: true }).fill('Chương 1')
  await chapterDialog.getByRole('button', { name: 'Lưu chương', exact: true }).click()
  await expect(chapterDialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Chương 1', exact: true })).toBeVisible()
  expect(
    state.requests.find(
      (r) => r.method === 'POST' && r.path === `/api/v1/courses/${IDS.section}/chapters`
    )!.body
  ).toMatchObject({ title: 'Chương 1', description: null })

  await page.getByRole('button', { name: 'Mở Chương 1', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm bài học', exact: true }).click()
  const lessonDialog = page.getByRole('dialog', { name: 'Thêm bài học', exact: true })
  await lessonDialog.getByLabel('Tên bài học', { exact: true }).fill('Bài 1')
  await lessonDialog.getByLabel('Nội dung bài học').fill('Nội dung bài 1')
  await lessonDialog.getByRole('button', { name: 'Lưu bài học', exact: true }).click()
  await expect(lessonDialog).toBeHidden()
  await expect(page.getByText('Bài 1', { exact: true })).toBeVisible()

  const chapterId = state.chapters[0].id
  expect(
    state.requests.find(
      (r) => r.method === 'POST' && r.path === `/api/v1/chapters/${chapterId}/lessons`
    )!.body
  ).toMatchObject({ title: 'Bài 1', contentType: 'TEXT', content: 'Nội dung bài 1' })

  const lessonId = state.lessons[chapterId][0].id
  await page.getByRole('button', { name: 'Xuất bản bài học Bài 1', exact: true }).click()
  await expect.poll(() => state.lessons[chapterId][0].published).toBe(true)
  expect(
    state.requests.find(
      (r) =>
        r.method === 'PATCH' &&
        r.path === `/api/v1/chapters/${chapterId}/lessons/${lessonId}/published`
    )!.body
  ).toMatchObject({ published: true, preview: false, expectedUpdatedAt: STAMP })
})

test('staff closes an unpaid order from its detail', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/orders')
  await page
    .getByRole('row', { name: /HL20261010001/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Hủy đơn hàng?', exact: true }) })
  await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Hủy đơn', exact: true }).click()
  await expect(confirmation).toBeHidden()
  await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible()
  expect(
    state.requests.filter(
      (r) => r.method === 'POST' && r.path === `/api/v1/admin/orders/${IDS.orderPending}/cancel`
    )
  ).toHaveLength(1)
  expect(state.orders.find((o) => o.id === IDS.orderPending)!.status).toBe('CANCELLED')
})

test('administrator confirms a payment by hand with a reason and no double settlement', async ({
  page,
}) => {
  const state = await installCrudFixture(page, 'ADMINISTRATOR')
  await page.goto('/admin/orders')
  await page
    .getByRole('row', { name: /HL20261010001/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  const paymentsBefore = state.orders.find((o) => o.id === IDS.orderPending)!.payments.length
  await page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Xác nhận thanh toán thủ công', exact: true })
  await dialog.getByLabel('Lý do xác nhận').fill('Khách quen chuyển khoản')
  await dialog.getByLabel('Số tiền thực nhận (VND)').fill('1800000')
  await dialog.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Đã thanh toán', { exact: true })).toBeVisible()
  await expect(page.getByText('Khách quen chuyển khoản', { exact: true }).first()).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path.endsWith('/confirm-payment'))!.body
  ).toMatchObject({ reason: 'Khách quen chuyển khoản', receivedAmount: 1800000 })
  const order = state.orders.find((o) => o.id === IDS.orderPending)!
  expect(order.payments).toHaveLength(paymentsBefore + 1)
  expect(order.payments.at(-1)).toMatchObject({ provider: 'MANUAL', status: 'SUCCESS', manual: true })
  // The settlement path is one call: no second confirm was issued.
  expect(state.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/confirm-payment'))).toHaveLength(1)
})

test('only an administrator may confirm a payment; staff and manager cannot', async ({ page }) => {
  const staffState = await installCrudFixture(page, 'STAFF')
  await page.goto('/staff/orders')
  await page
    .getByRole('row', { name: /HL20261010001/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hủy đơn', exact: true })).toHaveCount(1)
  expect(staffState.requests.filter((r) => r.method !== 'GET')).toHaveLength(0)
})

test('manager reads orders and enrollments without write affordances', async ({ page }) => {
  const state = await installCrudFixture(page, 'MANAGER')
  await page.goto('/manager/orders')
  await expect(page.getByRole('row', { name: /HL20261010001/ })).toBeVisible()
  await page
    .getByRole('row', { name: /HL20261010001/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Hủy đơn', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })).toHaveCount(0)
  await page.goto('/manager/enrollments')
  await expect(page.getByRole('row', { name: /SECTION Đại số/ })).toBeVisible()
  const managerMain = page.getByRole('main')
  await expect(managerMain.getByRole('button', { name: 'Ghi danh', exact: true })).toHaveCount(0)
  await expect(managerMain.getByRole('button', { name: 'Trạng thái', exact: true })).toHaveCount(0)
  await expect(managerMain.getByRole('button', { name: 'Hạn dùng', exact: true })).toHaveCount(0)
  expect(state.requests.filter((r) => r.method !== 'GET')).toHaveLength(0)
})

test('staff enrolls a student by hand with the course access window', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/enrollments')
  await page.getByRole('main').getByRole('button', { name: 'Ghi danh', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Ghi danh thủ công', exact: true })
  await selectOption(dialog, page, 'Học viên', 'Học viên QA')
  await selectOption(dialog, page, 'Khóa học', 'MAIN Toán · Trọn bộ')
  await dialog.getByRole('button', { name: 'Ghi danh', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: /MAIN Toán/ })).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path === '/api/v1/admin/enrollments')!.body
  ).toMatchObject({ studentId: IDS.student, courseId: IDS.main })
})

test('duplicate enrollment is refused and keeps the dialog without a blind retry', async ({
  page,
}) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/enrollments')
  await page.getByRole('main').getByRole('button', { name: 'Ghi danh', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Ghi danh thủ công', exact: true })
  await selectOption(dialog, page, 'Học viên', 'Học viên QA')
  await selectOption(dialog, page, 'Khóa học', 'SECTION Đại số · Khóa nhỏ')
  await dialog.getByRole('button', { name: 'Ghi danh', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(/đã có ghi danh/i)
  await expect(dialog).toBeVisible()
  expect(state.requests.filter((r) => r.method === 'POST')).toHaveLength(1)
})

test('staff suspends an enrollment and rewrites its expiry', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/enrollments')
  const row = page.getByRole('row', { name: /SECTION Đại số/ })
  await row.getByRole('button', { name: 'Trạng thái', exact: true }).click()
  const statusDialog = page.getByRole('dialog', { name: 'Đổi trạng thái ghi danh', exact: true })
  await selectOption(statusDialog, page, 'Trạng thái', 'Tạm dừng')
  await statusDialog.getByRole('button', { name: 'Lưu trạng thái', exact: true }).click()
  await expect(statusDialog).toBeHidden()
  await expect(page.getByRole('table').getByText('Tạm dừng', { exact: true })).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'PATCH' && r.path.endsWith('/status'))!.body
  ).toMatchObject({ status: 'SUSPENDED' })

  await page
    .getByRole('row', { name: /SECTION Đại số/ })
    .getByRole('button', { name: 'Hạn dùng', exact: true })
    .click()
  const expiryDialog = page.getByRole('dialog', { name: 'Sửa hạn truy cập', exact: true })
  const expiryDate = expiryDialog.getByRole('group', { name: 'Hết hạn ngày' })
  await expiryDate.getByRole('spinbutton').nth(0).fill('15')
  await expiryDate.getByRole('spinbutton').nth(1).fill('01')
  await expiryDate.getByRole('spinbutton').nth(2).fill('2027')
  await expiryDialog.getByRole('button', { name: 'Lưu hạn dùng', exact: true }).click()
  await expect(expiryDialog).toBeHidden()
  expect(
    state.requests.find((r) => r.method === 'PATCH' && r.path.endsWith('/expiry'))!.body
  ).toMatchObject({ expiresAt: '2027-01-15T23:59:59+07:00' })
})

test('administrator edits an account identity and a changed email resets verification', async ({
  page,
}) => {
  const state = await installCrudFixture(page, 'ADMINISTRATOR')
  await page.goto('/admin/users')
  await page.getByRole('row', { name: /Giáo viên QA/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi tiết tài khoản', exact: true })
  // Technical rows live on their own tab, and the form only opens on demand.
  await expect(dialog.getByRole('tab', { name: 'Tổng quan', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(dialog.getByRole('button', { name: 'Thông tin hệ thống', exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Họ', { exact: true })).toHaveCount(0)
  await dialog.getByRole('tab', { name: 'Hệ thống', exact: true }).click()
  await expect(
    dialog.getByRole('button', { name: 'Thông tin hệ thống', exact: true })
  ).toHaveAttribute('aria-expanded', 'false')
  await dialog.getByRole('tab', { name: 'Tổng quan', exact: true }).click()
  await dialog.getByRole('button', { name: 'Sửa thông tin', exact: true }).click()
  await dialog.getByLabel('Họ', { exact: true }).fill('Nguyễn')
  await dialog.getByLabel('Tên', { exact: true }).fill('An')
  await dialog.getByLabel('Email', { exact: true }).fill('an.nguyen@example.invalid')
  await dialog.getByRole('button', { name: 'Lưu thông tin', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Nguyễn An', exact: true })).toBeVisible()
  await expect(page.getByText('Đã lưu thông tin tài khoản.')).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'PUT' && r.path === `/api/v1/users/${IDS.teacher}`)!.body
  ).toMatchObject({
    firstName: 'Nguyễn',
    lastName: 'An',
    email: 'an.nguyen@example.invalid',
  })
  expect(state.users[IDS.teacher].emailVerified).toBe(false)
})

test('staff sees account details without the administrator editor', async ({ page }) => {
  await installCrudFixture(page)
  await page.goto('/staff/users')
  await page.getByRole('row', { name: /Giáo viên QA/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi tiết tài khoản', exact: true })
  await expect(dialog.getByRole('button', { name: 'Sửa thông tin', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Lưu thông tin', exact: true })).toHaveCount(0)
})

test('staff edits a recurring series and only the untouched sessions follow the new slot', async ({
  page,
}) => {
  // The scheduling screen is a lazily imported chunk and this is the first test that opens it, so
  // the dev server may take a while to serve its module graph.
  test.setTimeout(120_000)
  const state = await installCrudFixture(page)
  await page.goto('/staff/schedules')
  await expect(page.getByText('Lớp lặp Toán', { exact: true })).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText(/1 buổi đã sửa riêng/)).toBeVisible()

  await page.getByRole('button', { name: 'Sửa chuỗi', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Chỉnh sửa lớp học lặp', exact: true })
  await expect(sheet.getByText(/sinh lại theo lịch mới/)).toBeVisible()
  await expect(sheet.locator('[name="startTime"]')).toHaveValue('18:00')
  await sheet.locator('[name="startTime"]').fill('19:00')
  await sheet.locator('[name="endTime"]').fill('21:00')
  await sheet.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(sheet).toBeHidden()

  expect(
    state.requests.find(
      (request) => request.method === 'PATCH' && request.path === `/api/v1/recurring-classes/${IDS.recurring}`
    )!.body
  ).toMatchObject({
    teacherId: IDS.teacher,
    startTime: '19:00',
    endTime: '21:00',
    durationMinutes: 120,
  })
  await expect(page.getByText('19:00–21:00')).toBeVisible()
  // The hand-edited session keeps its own slot, the other one moves with the series.
  expect(state.classSessions.find((session) => session.id === IDS.session)!.startTime).toContain(
    'T19:00:00+07:00'
  )
  expect(
    state.classSessions.find((session) => session.id === IDS.sessionOverridden)!.startTime
  ).toContain('T18:00:00+07:00')
})

test('staff edits then deletes a class-session recording', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/schedules')
  await page
    .getByRole('button', { name: 'Xem chi tiết Lớp lặp Toán - Buổi 1', exact: true })
    .click()
  const details = page.getByRole('dialog', { name: 'Chi tiết lịch học', exact: true })
  // Recordings start folded until the session begins.
  await details.getByRole('button', { name: 'Bản ghi', exact: true }).click()
  await expect(details.getByText('Bản ghi buổi 1')).toBeVisible()

  await details.getByRole('button', { name: 'Sửa', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Sửa bản ghi', exact: true })
  await editor.locator('[name="editTitle"]').fill('Bản ghi buổi 1 (đã sửa)')
  await editor.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(details.getByText('Đã cập nhật bản ghi.')).toBeVisible()
  await expect(details.getByText('Bản ghi buổi 1 (đã sửa)')).toBeVisible()
  expect(
    state.requests.find(
      (request) =>
        request.method === 'PATCH' && request.path.endsWith(`/recordings/${IDS.recording}`)
    )!.body
  ).toMatchObject({ title: 'Bản ghi buổi 1 (đã sửa)', provider: 'ZOOM' })

  await details.getByRole('button', { name: 'Xóa', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Xóa bản ghi?' })
  await confirm.getByRole('button', { name: 'Xóa bản ghi', exact: true }).click()
  await expect(details.getByText('Chưa có bản ghi.')).toBeVisible()
  expect(
    state.requests.some(
      (request) =>
        request.method === 'DELETE' && request.path.endsWith(`/recordings/${IDS.recording}`)
    )
  ).toBe(true)
  expect(state.recordings).toHaveLength(0)
})

test('staff cancels one class session without touching the series', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/schedules')
  await page
    .getByRole('button', { name: 'Xem chi tiết Lớp lặp Toán - Buổi 1', exact: true })
    .click()
  const details = page.getByRole('dialog', { name: 'Chi tiết lịch học', exact: true })
  await details.getByRole('button', { name: 'Hủy buổi', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Hủy buổi học này?' })
  await confirm.getByRole('button', { name: 'Hủy buổi', exact: true }).click()
  await expect(page.getByText('Đã hủy buổi học.')).toBeVisible()
  expect(
    state.requests.find(
      (request) => request.method === 'PATCH' && request.path === `/api/v1/class-sessions/${IDS.session}`
    )!.body
  ).toEqual({ status: 'CANCELLED' })
  expect(state.classSessions.find((session) => session.id === IDS.session)!.status).toBe('CANCELLED')
  expect(state.requests.some((request) => request.method === 'DELETE')).toBe(false)
  expect(state.recurringClasses[0].status).toBe('SCHEDULED')
})

// Scheduling rights were deliberately not narrowed in this pass: a MANAGER may write a series,
// so this only proves the read path reaches the recordings.
test('manager reads the schedule console and its recordings without mutating', async ({ page }) => {
  // Match the staff schedule test's existing lazy-module readiness budget, not a fixed 5s wait.
  test.setTimeout(120_000)
  const state = await installCrudFixture(page, 'MANAGER')
  await page.goto('/manager/schedules')
  await expect(page.getByText('Lớp lặp Toán', { exact: true })).toBeVisible({ timeout: 90_000 })
  await page
    .getByRole('button', { name: 'Xem chi tiết Lớp lặp Toán - Buổi 1', exact: true })
    .click()
  const details = page.getByRole('dialog', { name: 'Chi tiết lịch học', exact: true })
  await details.getByRole('button', { name: 'Bản ghi', exact: true }).click()
  await expect(details.getByText('Bản ghi buổi 1')).toBeVisible()
  expect(state.requests.filter((request) => request.method !== 'GET')).toHaveLength(0)
})
