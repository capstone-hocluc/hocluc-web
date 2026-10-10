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
    .getByRole('row', { name: /Toán toan/ })
    .getByRole('button', { name: 'Sửa', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Sửa danh mục', exact: true })
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Toán cập nhật')
  await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: /Toán cập nhật toan/ })).toBeVisible()
  const saved = state.requests.find((r) => r.method === 'PUT' && r.path.endsWith(IDS.root))!
  expect(saved.body).toMatchObject({
    name: 'Toán cập nhật',
    slug: 'toan',
    imageUrl: 'https://example.invalid/math.png',
    parentId: null,
    active: true,
    expectedUpdatedAt: STAMP,
  })
})

test('category creation and unknown mutation prevent blind retries', async ({ page }) => {
  const state = await installCrudFixture(page, 'ADMINISTRATOR')
  await page.goto('/admin/categories')
  await page.getByRole('button', { name: 'Tạo danh mục', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo danh mục', exact: true })
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Vật lý')
  state.failNext = 'network'
  await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Lưu danh mục', exact: true })).toBeDisabled()
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
    await expect(page.getByRole('button', { name: 'Tạo danh mục', exact: true })).toBeDisabled()
  } finally {
    releaseRead()
  }
  await expect(page.getByRole('row', { name: /Vật lý new-category/ })).toBeVisible()
  expect(
    state.requests.filter((r) => r.method === 'GET' && r.path === '/api/v1/categories').length
  ).toBeGreaterThan(getsBeforeClose)
  expect(state.requests.filter((r) => r.method === 'POST')).toHaveLength(1)
})

test('stale category edit keeps input and does not automatically resend', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/categories')
  await page
    .getByRole('row', { name: /Toán toan/ })
    .getByRole('button', { name: 'Sửa', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Sửa danh mục', exact: true })
  await dialog.getByLabel('Tên danh mục', { exact: true }).fill('Nội dung chưa lưu')
  state.failNext = 'conflict'
  await dialog.getByRole('button', { name: 'Lưu danh mục', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(/Reload|tải lại|thay đổi/i)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Tên danh mục', { exact: true })).toHaveValue('Nội dung chưa lưu')
  expect(state.requests.filter((r) => r.method === 'PUT')).toHaveLength(1)
  expect(state.categories.find((c) => c.id === IDS.root)!.name).toBe('Toán')
})

test('SECTION metadata create works without MAIN calendar fields', async ({ page }, testInfo) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tạo khóa học', exact: true })
  await selectOption(dialog, page, 'Loại khóa', 'SECTION · Khóa nhỏ')
  await dialog.getByLabel('Tên khóa học', { exact: true }).fill('SECTION Hình học')
  await expect(dialog.getByLabel('Ngày bắt đầu', { exact: true })).toHaveCount(0)
  await dialog.getByText('Khóa có học phí', { exact: true }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Khóa có học phí', exact: true })).toBeChecked()
  await dialog.getByLabel('Học phí (VND)', { exact: true }).fill('150000')
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

test('publish rejection remains visible and uses current edit token', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page
    .getByRole('row', { name: /MAIN Toán/ })
    .getByRole('button', { name: 'Xuất bản', exact: true })
    .click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Xuất bản khóa học?', exact: true }) })
  await confirmation.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  expect(
    state.requests.filter((r) => r.method === 'PATCH' && r.path.endsWith('/status'))
  ).toHaveLength(1)
  expect(
    state.requests.find((r) => r.method === 'PATCH' && r.path.endsWith('/status'))!.body
  ).toMatchObject({ status: 'PUBLISHED', expectedUpdatedAt: STAMP })
  await confirmation.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(
    page.getByRole('row', { name: /MAIN Toán/ }).getByText('Nháp', { exact: true })
  ).toBeVisible()
})

test('MAIN structure uses parent-scoped phase/link and teacher IDs', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page
    .getByRole('row', { name: /MAIN Toán/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  await page.getByRole('button', { name: 'Đưa Nền tảng xuống', exact: true }).click()
  await expect
    .poll(() => state.requests.find((r) => r.path.endsWith('/phases/order'))?.body.ids)
    .toEqual([IDS.phase2, IDS.phase1])
  const phasesPanel = page
    .getByRole('heading', { name: 'Giai đoạn', exact: true })
    .locator('..')
    .locator('..')
  await expect(phasesPanel.locator('li h3')).toHaveText(['Luyện tập', 'Nền tảng'])
  await selectOption(page, page, 'SECTION để gắn', 'SECTION Đại số')
  await selectOption(page, page, 'Giai đoạn SECTION mới', 'Nền tảng')
  await page.getByRole('button', { name: 'Gắn SECTION', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'SECTION Đại số', exact: true })).toBeVisible()
  expect(
    state.requests.find((r) => r.method === 'POST' && r.path.endsWith('/sections'))
  ).toMatchObject({
    path: `/api/v1/admin/courses/${IDS.main}/sections`,
    body: { sectionCourseId: IDS.section, phaseId: IDS.phase1 },
  })
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
    .getByRole('row', { name: /Đại số dai-so/ })
    .getByRole('button', { name: 'Xóa', exact: true })
    .click()
  const confirmation = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Xóa danh mục?', exact: true }) })
  await confirmation.getByRole('button', { name: 'Xóa danh mục', exact: true }).click()
  await expect(confirmation).toBeHidden()
  await expect(page.getByRole('row', { name: /Toán toan/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Đại số dai-so/ })).toHaveCount(0)
  expect(state.requests.filter((r) => r.method === 'DELETE')).toEqual([
    { path: `/api/v1/categories/${IDS.child}`, method: 'DELETE', body: {} },
  ])
})

test('draft course delete targets the selected course only', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')
  await page
    .getByRole('row', { name: /SECTION Đại số/ })
    .getByRole('button', { name: 'Xóa', exact: true })
    .click()
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
  await expect(page.getByRole('row', { name: /Toán toan/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tạo danh mục', exact: true })).toHaveCount(0)
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
    .getByRole('row', { name: /MAIN Toán/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Giai đoạn', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gắn SECTION', exact: true })).toHaveCount(0)
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
  await page
    .getByRole('row', { name: /SECTION Đại số/ })
    .getByRole('button', { name: 'Chi tiết', exact: true })
    .click()
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
