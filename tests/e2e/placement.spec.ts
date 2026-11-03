import { test, expect, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, quizToken, showEditorStep } from './quiz-permissions-fixture'
import type { TeacherQuizRecord } from '../../src/services/teacherQuizService'

const createdId = '50000000-0000-0000-0000-000000000004'

test('landing free assessment resumes placement after login, retry and auth mode changes', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  state.quizzes[0] = seedPlacement(state.quizzes[0], createdId, 'Đầu vào từ landing', '2026-10-20T00:00:00Z')
  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/v1/courses/main', route => route.fulfill({ json: { success: true, data: [] } }))
  let rejectLogin = true
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: rejectLogin ? 401 : 200,
    json: rejectLogin ? { success: false, message: 'Thông tin đăng nhập không đúng.' }
      : { success: true, data: { accessToken: quizToken('STUDENT') } } }))
  await page.goto('/')
  const cta = page.locator('.hero-buttons').getByRole('link', { name: 'Làm đánh giá miễn phí' })
  await expect(cta).toHaveAttribute('href', '/student/assessments/placement')
  await cta.click()
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fstudent%2Fassessments%2Fplacement$/)
  await page.reload()
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click()
  await expect(page).toHaveURL(/\/signup\?returnTo=%2Fstudent%2Fassessments%2Fplacement$/)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await dialog.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('fixture-password')
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Thông tin đăng nhập không đúng.')
  await expect(page).toHaveURL(/returnTo=%2Fstudent%2Fassessments%2Fplacement$/)
  rejectLogin = false
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await expect(page.getByRole('heading', { name: 'Đầu vào từ landing', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toBeVisible()
  expect(state.pageErrors).toEqual([]); expect(state.unmatched).toEqual([])
})

test('signed-in Student enters placement directly from the landing assessment action', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  state.quizzes[0] = seedPlacement(state.quizzes[0], createdId, 'Đầu vào từ landing', '2026-10-20T00:00:00Z')
  await page.route('**/api/v1/courses/main', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.goto('/')
  await page.locator('.hero-buttons').getByRole('link', { name: 'Làm đánh giá miễn phí' }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await expect(page.getByRole('heading', { name: 'Đầu vào từ landing', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.pageErrors).toEqual([]); expect(state.unmatched).toEqual([])
})

test('landing assessment action does not grant Student access to active Staff', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.route('**/api/v1/courses/main', route => route.fulfill({ json: { success: true, data: [] } }))
  await page.goto('/')
  await page.locator('.hero-buttons').getByRole('link', { name: 'Làm đánh giá miễn phí' }).click()
  await expect(page.getByRole('heading', { name: 'Trang này dành cho học viên', exact: true })).toBeVisible()
  expect(state.requests.some(request => request.path.startsWith('/api/v1/assessments/'))).toBe(false)
  expect(state.pageErrors).toEqual([]); expect(state.unmatched).toEqual([])
})

for (const [role, area] of [['STAFF', 'staff'], ['MANAGER', 'manager'], ['ADMINISTRATOR', 'admin']] as const) {
  test(`${role}: assessment tabs share one sidebar entry and preserve filters and URLs`, async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const state = await installQuizFixture(page, role)
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto(`/console/${area}/quizzes`)
    await expect(page.getByRole('button', { name: 'Bài kiểm tra', exact: true }).and(page.locator('[aria-current="page"]'))).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Bài thi thử', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Đánh giá đầu vào', exact: true })).toHaveCount(0)
    await expect(page.getByRole('tab')).toHaveCount(3)
    await page.getByRole('searchbox', { name: 'Tìm bài kiểm tra, khóa học hoặc bài học...' }).fill('không có kết quả QA')
    await page.getByRole('tab', { name: 'Đánh giá đầu vào', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/console/${area}/placements$`))
    await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tạo đánh giá đầu vào', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bài kiểm tra', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.screenshot({ path: testInfo.outputPath('assessment-tabs-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 900 })
    await page.getByRole('searchbox', { name: 'Tìm bài đánh giá đầu vào...' }).fill('đầu vào QA')
    await page.getByRole('button', { name: /Lọc trạng thái$/ }).click()
    await page.getByRole('option', { name: 'Bản nháp', exact: true }).click()
    await page.getByRole('button', { name: 'Tạo đánh giá đầu vào', exact: true }).click()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await page.getByRole('button', { name: 'Quay lại đánh giá đầu vào', exact: true }).click()
    await expect(page.getByRole('searchbox', { name: 'Tìm bài đánh giá đầu vào...' })).toHaveValue('đầu vào QA')
    await expect(page.getByRole('button', { name: /Lọc trạng thái$/ })).toContainText('Bản nháp')
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Đánh giá đầu vào', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: /Lọc trạng thái$/ })).toContainText('Bản nháp')
    await page.getByRole('tab', { name: 'Thi thử', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/console/${area}/mock-exams$`))
    await expect(page.getByRole('button', { name: 'Tạo đề thi thử', exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Bài học / chương', exact: true }).click()
    await expect(page.getByRole('searchbox', { name: 'Tìm bài kiểm tra, khóa học hoặc bài học...' })).toHaveValue('không có kết quả QA')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await page.getByRole('tablist', { name: 'Loại bài kiểm tra' }).evaluate(list => {
      const bounds = list.getBoundingClientRect()
      return Array.from(list.querySelectorAll('[role="tab"]')).every(tab => {
        const rect = tab.getBoundingClientRect()
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
      })
    })).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('assessment-tabs-mobile.png'), fullPage: true })
    expect(state.requests.filter(request => request.method !== 'GET')).toEqual([])
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })
}

test('Teacher assessment tabs keep assigned read scope and deny placement direct URLs', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto('/console/teacher/quizzes')
  await expect(page.getByRole('tab')).toHaveCount(2)
  await expect(page.getByRole('tab', { name: 'Đánh giá đầu vào', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Thi thử', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/teacher\/mock-exams$/)
  await expect(page.getByRole('button', { name: 'Tạo đề thi thử', exact: true })).toHaveCount(0)
  await page.goto('/console/teacher/placements')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập', exact: true })).toBeVisible()
  expect(state.requests.filter(request => request.method !== 'GET')).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
function seedPlacement(base: TeacherQuizRecord, id: string, title: string, createdAt: string): TeacherQuizRecord {
  return { ...base, id, title, type: 'PLACEMENT', courseId: null, courseTitle: null, chapterId: null, chapterTitle: null,
    lessonId: null, lessonTitle: null, passingPercentage: null, status: 'PUBLISHED', createdAt }
}
async function createPlacement(page: Page, area: string) {
  await page.goto(`/console/${area}/placements/new`)
  await expect(page.getByRole('heading', { name: 'Tạo đánh giá đầu vào', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Khóa học chính$/ })).toHaveCount(0)
  await page.getByLabel('Tên bài đánh giá đầu vào', { exact: true }).fill('Đầu vào QA')
  await page.getByLabel('Mô tả', { exact: true }).fill('Đánh giá năng lực trước khi học')
  await showEditorStep(page, 'Các phần và câu hỏi')
  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).click()
  await page.getByRole('button', { name: 'Sửa', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true }).fill('2 + 2 bằng bao nhiêu?')
  for (const [index, letter] of ['A','B','C','D'].entries()) {
    await page.getByPlaceholder('Lựa chọn ' + letter, { exact: true }).fill(String(index + 4))
  }
  await page.getByLabel('Đánh dấu lựa chọn A là đáp án đúng', { exact: true }).check()
  await page.getByRole('button', { name: /Môn cho câu 1 trong Phần 1$/ }).click()
  await page.getByRole('option', { name: 'Toán', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu và xuất bản', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đầu vào QA', exact: true })).toBeVisible()
}

for (const [role, area] of [['STAFF','staff'], ['MANAGER','manager'], ['ADMINISTRATOR','admin']] as const) {
  test(`${role}: create standalone placement, publish, copy and delete draft`, async ({ page }) => {
    test.setTimeout(60_000)
    const state = await installQuizFixture(page, role)
    await createPlacement(page, area)
    const created = state.requests.find(r => r.method === 'POST' && r.path === '/api/v1/teacher/quizzes')!.body
    expect(created).toMatchObject({ type: 'PLACEMENT', title: 'Đầu vào QA', description: 'Đánh giá năng lực trước khi học' })
    for (const key of ['courseId','chapterId','lessonId','practiceAllowed','availableFrom','availableUntil','passingPercentage']) expect(created).not.toHaveProperty(key)
    expect(state.requests.some(r => r.path === '/api/v1/admin/courses')).toBe(false)
    expect(state.requests.find(r => r.path.endsWith('/questions') && r.method === 'POST')?.body.questions).toMatchObject([{ questionType: 'SINGLE_CHOICE', categoryId: 'category-1' }])
    await expect(page.getByText('Đang dùng cho Student', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Thao tác khác với Đầu vào QA', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Sao chép thành bản nháp' }).click()
    const copy = page.getByRole('row').filter({ has: page.getByRole('heading', { name: 'Đầu vào QA bản sao', exact: true }) })
    await copy.getByRole('button', { name: 'Thao tác khác với Đầu vào QA bản sao' }).click()
    await page.getByRole('menuitem', { name: /Xóa/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Xóa/ }).click()
    await expect(copy).toHaveCount(0)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })
}

test('Staff publication becomes the Student placement and supports submit, result and review', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  await createPlacement(page, 'staff')
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
  }, quizToken('STUDENT'))
  await page.goto('/student/assessments/placement')
  await expect(page.getByRole('heading', { name: 'Đầu vào QA', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  expect(state.activeStudentQuizId).toBe(createdId)
  await page.getByRole('radio', { name: '4', exact: true }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(/\/placement\/result$/)
  await expect(page.getByRole('heading', { name: 'Chi tiết theo chủ đề', exact: true })).toBeVisible()
  await expect(page.getByText('Toán', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem lại đáp án', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/placement/attempts/${QUIZ_IDS.attempt}/review$`))
  await expect(page.getByRole('heading', { name: 'Xem lại đáp án', exact: true })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

for (const [role, area] of [['TEACHER','teacher'],['MENTOR','mentor']] as const) {
  test(`${role}: placement menu and direct authoring URLs are denied`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    for (const suffix of ['', '/new', `/${createdId}/edit`]) {
      await page.goto(`/console/${area}/placements${suffix}`)
      await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Đánh giá đầu vào', exact: true })).toHaveCount(0)
    }
    expect(state.requests.some(r => r.path.startsWith('/api/v1/teacher/'))).toBe(false)
  })
}

test('Student without published placement sees an empty state', async ({ page }) => {
  await installQuizFixture(page, 'STUDENT')
  await page.goto('/student/assessments/placement')
  await expect(page.getByText('Chưa có bài đánh giá đầu vào', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toHaveCount(0)
})

test('placement create 409 keeps the draft and does not retry or publish', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/placements/new')
  await page.getByLabel('Tên bài đánh giá đầu vào', { exact: true }).fill('Giữ bản nháp')
  state.denyNextWrite = true
  state.denyWriteStatus = 409; state.denyWriteMessage = 'This operation conflicts with referenced or concurrently changed data.'
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.getByText(state.denyWriteMessage, { exact: true })).toBeVisible()
  await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toHaveValue('Giữ bản nháp')
  expect(state.requests.filter(r => r.method === 'POST' && r.path === '/api/v1/teacher/quizzes')).toHaveLength(1)
  expect(state.requests.some(r => r.path.endsWith('/publish'))).toBe(false)
})

test('newest published placement is selected; hiding it falls back to the earlier published one', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  state.quizzes.push(seedPlacement(state.quizzes[0], createdId, 'Bài cũ', '2026-10-18T00:00:00Z'),
    seedPlacement(state.quizzes[0], '50000000-0000-0000-0000-000000000009', 'Bài mới', '2026-10-20T00:00:00Z'))
  await page.goto('/console/staff/placements')
  const row = (title: string) => page.getByRole('row').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
  await expect(row('Bài mới').getByText('Đang dùng cho Student', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toHaveCount(0)
  await row('Bài mới').getByRole('button', { name: 'Ẩn bài', exact: true }).click()
  await expect(row('Bài cũ').getByText('Đang dùng cho Student', { exact: true })).toBeVisible()
  await expect(row('Bài mới').getByText('Đang dùng cho Student', { exact: true })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
})

test('existing placement with attempts only saves mutable metadata and keeps questions locked', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  state.quizzes.push({ ...seedPlacement(state.quizzes[0], createdId, 'Bài đã có lượt', '2026-10-20T00:00:00Z'), status: 'DRAFT', attemptCount: 1 })
  await page.goto(`/console/staff/placements/${createdId}/edit`)
  await expect(page.getByLabel('Thời gian làm bài (phút)', { exact: true })).toBeDisabled()
  await showEditorStep(page, 'Các phần và câu hỏi')
  await expect(page.getByRole('button', { name: 'Thêm câu hỏi', exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0)
  await showEditorStep(page, 'Thông tin và quy định')
  await page.getByLabel('Tên bài đánh giá đầu vào', { exact: true }).fill('Đổi tên')
  await page.getByLabel('Mô tả', { exact: true }).fill('Mô tả mới')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đổi tên', exact: true })).toBeVisible()
  const writes = state.requests.filter(r => r.method !== 'GET')
  expect(writes).toHaveLength(1)
  expect(writes[0].body).toEqual({ title: 'Đổi tên', description: 'Mô tả mới' })
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('placement editor rejects an EXAM id on its direct URL', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto(`/console/staff/placements/${QUIZ_IDS.exam}/edit`)
  await expect(page.getByText('Bài kiểm tra không thuộc loại đang mở.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toHaveCount(0)
  expect(state.requests.some(r => r.method !== 'GET')).toBe(false)
})

test('placement editor fits mobile and hides the fixed question type', async ({ page }, testInfo) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto('/console/staff/placements/new')
  await page.getByLabel('Tên bài đánh giá đầu vào', { exact: true }).fill('Đầu vào di động')
  await showEditorStep(page, 'Các phần và câu hỏi')
  await page.getByRole('button', { name: 'Danh sách câu', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Câu 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Loại câu hỏi$/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('placement-mobile.png'), fullPage: true })
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
