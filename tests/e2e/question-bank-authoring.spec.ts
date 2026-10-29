import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

async function install(page: Page, role: 'STAFF' | 'TEACHER') {
  const state = await installQuizFixture(page, role)
  let status = 'DRAFT'
  let version = 1
  let conflict = false
  let body: Record<string, unknown> = {}
  const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = []
  const detail = () => ({
    id: 'q-1',
    sourceCode: null,
    sourceTitle: null,
    sourceNumber: null,
    year: null,
    round: null,
    text: (body.question as { questionText?: string })?.questionText ?? '',
    passage: null,
    explanation: null,
    imageUrl: null,
    passageImageUrl: null,
    hasFigure: false,
    hasFormula: false,
    answerSource: 'NONE',
    reviewNeeded: false,
    reviewNotes: null,
    extractConfidence: null,
    label: null,
    reviewStatus: null,
    status,
    origin: 'MANUAL',
    difficulty: body.difficulty ?? 'TB',
    questionType: 'SINGLE_CHOICE',
    categoryId: 'category-1',
    categoryName: 'Toán học',
    headVersionNo: version,
    approvedVersionNo: null,
    createdByName: 'QA',
    canEdit: true,
    canReview: true,
    options: (
      (body.question as { options?: Array<{ text: string; correct: boolean }> })?.options ?? []
    ).map((option, i) => ({ ...option, label: String.fromCharCode(65 + i) })),
  })
  await page.route('**/api/v1/categories', (route) =>
    route.fulfill({
      json: {
        success: true,
        status: 200,
        data: [{ id: 'category-1', name: 'Toán học', active: true, parentId: null, sortOrder: 1 }],
      },
    })
  )
  await page.route('**/api/v1/question-bank/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const method = req.method()
    const payload =
      method === 'POST' || method === 'PUT' ? (req.postDataJSON() as Record<string, unknown>) : {}
    calls.push({ method, path, body: payload })
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data } })
    if (path.endsWith('/me/scopes'))
      return ok({
        administrator: false,
        authorSubjectIds: role === 'STAFF' ? ['category-1'] : [],
        reviewerSubjectIds: [],
      })
    if (path.endsWith('/stats'))
      return ok({
        total: 0,
        needsReview: 0,
        unlabelled: 0,
        byPart: {},
        byYear: {},
        byAnswerSource: {},
        bySubject: [],
      })
    if (
      path.endsWith('/patterns') ||
      path.endsWith('/sources') ||
      path.endsWith('/versions') ||
      path.endsWith('/events')
    )
      return ok([])
    if (path.endsWith('/submit')) {
      status = 'IN_REVIEW'
      return ok(detail())
    }
    if (path.endsWith('/questions') && method === 'POST') {
      body = payload
      return ok(detail())
    }
    if (path.endsWith('/questions') && method === 'GET')
      return ok({
        content: body.question ? [detail()] : [],
        pageNumber: 0,
        pageSize: 20,
        totalElements: body.question ? 1 : 0,
        totalPages: 1,
        last: true,
      })
    if (path.endsWith('/q-1') && method === 'GET') return ok(detail())
    if (path.endsWith('/q-1') && method === 'PUT') {
      if (conflict)
        return route.fulfill({
          status: 409,
          json: { success: false, status: 409, message: 'Conflict' },
        })
      body = payload
      version++
      return ok(detail())
    }
    return route.fulfill({
      status: 404,
      json: { success: false, status: 404, message: 'unmatched' },
    })
  })
  return {
    state,
    calls,
    setConflict: () => {
      conflict = true
    },
  }
}

test('staff authors, submits, edits and handles a concurrent save', async ({ page }) => {
  const { calls, setConflict, state } = await install(page, 'STAFF')
  await page.goto('/console/staff/question-bank')
  await page.getByRole('button', { name: 'Soạn câu' }).click()
  await page.getByLabel('Nội dung câu hỏi').fill('Một cộng một bằng mấy?')
  for (const [i, letter] of ['A', 'B', 'C', 'D'].entries())
    await page.getByPlaceholder(`Lựa chọn ${letter}`).fill(String(i + 1))
  await page.getByLabel('Đánh dấu lựa chọn B là đáp án đúng').click()
  await page.getByRole('button', { name: /Chọn môn Môn học$/ }).click()
  await page.getByRole('option', { name: 'Toán học' }).click()
  await page.getByRole('button', { name: /Chọn độ khó Độ khó$/ }).click()
  await page.getByRole('option', { name: 'Trung bình' }).click()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  const draftStatus = page.getByText('Nháp', { exact: true })
  await expect(draftStatus).toHaveCount(1)
  await expect(draftStatus).toBeVisible()
  const post = calls.find((call) => call.path.endsWith('/questions') && call.method === 'POST')
  expect(post?.body).toEqual({
    question: {
      questionText: 'Một cộng một bằng mấy?',
      questionType: 'SINGLE_CHOICE',
      explanation: null,
      categoryId: 'category-1',
      options: [1, 2, 3, 4].map((n, i) => ({ text: String(n), correct: i === 1 })),
    },
    difficulty: 'TB',
    changeNote: null,
  })
  const submit = page.getByRole('button', { name: 'Gửi duyệt', exact: true })
  await expect(submit).toHaveCount(1)
  await expect(submit).toBeEnabled()
  await submit.click()
  const reviewStatus = page.getByText('Chờ duyệt', { exact: true })
  await expect(reviewStatus).toHaveCount(1)
  await expect(reviewStatus).toBeVisible()
  expect(calls.some((call) => call.path.endsWith('/q-1/submit') && call.method === 'POST')).toBe(
    true
  )
  await page.getByLabel('Nội dung câu hỏi').fill('Một cộng một bằng bao nhiêu?')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect
    .poll(() => calls.find((call) => call.method === 'PUT')?.body.expectedVersionNo)
    .toBe(1)
  await expect(page.getByText('Đã lưu câu hỏi.')).toBeVisible()
  setConflict()
  await page.getByLabel('Nội dung câu hỏi').fill('Câu mới')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(
    page.getByText('Câu hỏi đã được người khác thay đổi. Hãy tải lại trước khi lưu.')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải lại' })).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('teacher without author scope cannot start authoring', async ({ page }) => {
  await install(page, 'TEACHER')
  await page.goto('/console/teacher/question-bank')
  await expect(page.getByText('Tổng số câu')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Soạn câu' })).toHaveCount(0)
})
