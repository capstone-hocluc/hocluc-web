import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, showEditorStep } from './quiz-permissions-fixture'

const editUrl = `/console/manager/mock-exams/${QUIZ_IDS.exam}/edit`
const api = (path: string) => `**/api/v1/teacher/quizzes/*/${path}`
const pdf = { name: 'de-thi.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') }

const examFile = { fileName: 'de-thi.pdf', contentType: 'application/pdf', size: 16, pageCount: 24, uploadedAt: '2026-10-24T01:00:00Z', url: null, expiresAt: null }
const baseJob = {
  id: 'job-1', quizId: QUIZ_IDS.exam, kind: 'EXAM_FILE', provider: 'anthropic', model: 'claude', progress: null, error: null,
  inputTokens: null, outputTokens: null, createdAt: '2026-10-24T01:01:00Z', startedAt: null, finishedAt: null,
  result: null, questionCount: null, needsReviewCount: null, missingAnswerCount: null, warnings: null,
}
const result = {
  sections: [{ key: 'P1', parentKey: null, title: 'Phần 1: Sử dụng ngôn ngữ', subject: null, suggestedMinutes: 60, fromQuestion: 1, toQuestion: 2 }],
  groups: [],
  questions: [
    { number: 1, sectionKey: 'P1', groupKey: null, text: 'Hai cộng hai bằng mấy?', explanation: null, subject: null, sourcePage: 1,
      hasFigure: false, figureIds: [], imageUrl: null, hasFormula: false, confidence: 0.95, reviewNote: null,
      options: [{ label: 'A', text: '3', correct: false }, { label: 'B', text: '4', correct: true }] },
    { number: 2, sectionKey: 'P1', groupKey: null, text: 'Hình bên là gì?', explanation: null, subject: null, sourcePage: 2,
      hasFigure: true, figureIds: ['E2-1'], imageUrl: 'https://files.example/figure.png', hasFormula: false, confidence: 0.5, reviewNote: null,
      options: [{ label: 'A', text: 'Tròn', correct: false }, { label: 'B', text: 'Vuông', correct: false }] },
  ],
  figures: [{ id: 'E2-1', page: 2, left: 0.1, top: 0.1, width: 0.5, height: 0.3, source: 'ESTIMATE' }],
  warnings: ['Thiếu câu 3.'], missingQuestions: [3], answerKeySource: 'marked', pageCount: 24,
}
const doneJob = { ...baseJob, status: 'DONE', progress: 'Đã đọc 24/24 trang', result, questionCount: 2, needsReviewCount: 1, missingAnswerCount: 1, warnings: ['Thiếu câu 3.'] }

async function uploadAndStart(page: Page) {
  await page.getByLabel('Đề thi dạng PDF').setInputFiles(pdf)
  await page.getByRole('button', { name: 'Tải file lên', exact: true }).click()
  await page.getByRole('button', { name: 'Đọc đề', exact: true }).click()
}

const steps = (page: Page) => page.getByRole('list', { name: 'Các bước đọc đề' })
const editorSteps = (page: Page) => page.getByRole('list', { name: 'Các bước soạn đề' })
const openPdfStep = (page: Page) => showEditorStep(page, 'Đề PDF')

test('exam preview opens editing on demand and keeps changes when returning to the paper', async ({ page }, testInfo) => {
  const state = await installQuizFixture(page, 'MANAGER')
  await page.goto(editUrl)
  await showEditorStep(page, 'Các phần và câu hỏi')
  const question = page.getByRole('article', { name: 'Câu 1', exact: true })
  await expect(question.getByRole('textbox')).toHaveCount(0)
  await expect(question.getByText('Câu hỏi được phân công', { exact: true })).toBeVisible()
  await question.getByRole('button', { name: 'Sửa', exact: true }).click()
  await question.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true }).fill('Nội dung đã sửa $x^2$')
  await question.getByRole('button', { name: 'Xong', exact: true }).click()
  await expect(question.getByRole('textbox')).toHaveCount(0)
  await expect(question.locator('.katex').first()).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('exam-preview-mobile.png') })
  await question.getByRole('button', { name: 'Sửa', exact: true }).click()
  await expect(question.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveValue('Nội dung đã sửa $x^2$')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
  expect(state.questions[0].questionText).toBe('Nội dung đã sửa $x^2$')
  expect(state.pageErrors).toEqual([])
})

test('exam shows one card and navigates through the rail and neighbouring questions', async ({ page }) => {
  const state = await installQuizFixture(page, 'MANAGER')
  const original = state.questions[0]
  state.questions = Array.from({ length: 100 }, (_, index) => ({ ...original, id: `question-${index}`, sequence: index + 1, questionText: `Câu mẫu ${index + 1}` }))
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.goto(editUrl)
  await showEditorStep(page, 'Các phần và câu hỏi')
  await expect(page.getByRole('radiogroup', { name: 'Cách xem câu hỏi' })).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(1)
  const rail = page.getByRole('navigation', { name: 'Danh sách câu hỏi' })
  const tenth = rail.getByRole('button', { name: /^Câu 10(,|$)/ })
  await tenth.focus()
  await tenth.press('Enter')
  await expect(tenth).toBeFocused()
  await expect(tenth).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('article', { name: 'Câu 10', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Câu sau', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Câu 11', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Câu trước', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Câu 10', exact: true })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
  expect(state.requests.filter(request => request.method !== 'GET' && !request.path.startsWith('/api/v1/auth/'))).toEqual([])
  expect(state.pageErrors).toEqual([])
})

type Fixture = Awaited<ReturnType<typeof installQuizFixture>>
const stubUpload = (page: Page, state: Fixture) =>
  page.route(api('exam-file'), route => route.fulfill({ json: { success: true, data: { ...state.quizzes[0], examFile } } }))

test('upload, reading and apply: steps follow the job and apply replaces after confirmation', async ({ page }) => {
  const state = await installQuizFixture(page, 'MANAGER')
  let applyBody: unknown = null
  let polls = 0
  await stubUpload(page, state)
  await page.route(api('ai/extract'), route => route.fulfill({ json: { success: true, data: { ...baseJob, status: 'RUNNING', progress: 'Đang đọc 3/24 trang' } } }))
  await page.route(api('ai/jobs/job-1'), route => { polls++; return route.fulfill({ json: { success: true, data: polls < 2 ? { ...baseJob, status: 'RUNNING', progress: 'Đang đọc 3/24 trang' } : doneJob } }) })
  await page.route(api('ai/jobs/job-1/apply'), async route => {
    applyBody = route.request().postDataJSON()
    await route.fulfill({ json: { success: true, data: { sectionsAdded: 1, groupsAdded: 0, questionsAdded: 2, needsReview: 1, missingAnswers: 1, answerKeySource: 'marked', warnings: ['Thiếu câu 3.'], totalQuestions: 2 } } })
  })
  await page.goto(editUrl)
  await openPdfStep(page)
  await expect(steps(page).getByRole('button', { name: /Đọc và duyệt/ })).toBeDisabled()
  await expect(steps(page).getByRole('button', { name: /Áp dụng/ })).toBeDisabled()

  await uploadAndStart(page)
  await expect(steps(page).getByRole('button', { name: /Đọc và duyệt/ })).toHaveAttribute('aria-current', 'step')
  await expect(page.getByRole('status').filter({ hasText: 'Đang đọc 3/24 trang' })).toBeVisible()

  await expect(steps(page).getByRole('button', { name: /Áp dụng/ })).toBeEnabled({ timeout: 15_000 })
  expect(polls).toBeGreaterThan(0)
  await expect(page.getByText('Thiếu 1 câu theo số in trên đề:')).toBeVisible()
  await expect(page.getByText('Hình AI ước lượng, cần kiểm tra')).toBeVisible()
  await expect(page.getByText('Thiếu đáp án').first()).toBeVisible()
  await expect(page.getByText('Hai cộng hai bằng mấy?')).toBeVisible()

  await page.getByRole('button', { name: 'Tiếp tục: áp dụng' }).click()
  await page.getByRole('button', { name: 'Áp dụng vào đề', exact: true }).click()
  const confirm = page.getByRole('dialog')
  await expect(confirm.getByText(/xoá \d+ câu hiện có/)).toBeVisible()
  await expect(confirm.getByText('còn thiếu 1 câu', { exact: false })).toBeVisible()
  await confirm.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(page.getByText('Đã áp dụng vào bản nháp.')).toBeVisible()
  expect(applyBody).toEqual({ mode: 'REPLACE' })
  await expect(page.getByRole('button', { name: 'Xem các phần và câu hỏi' })).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('cancelling the apply confirmation sends nothing', async ({ page }) => {
  await stubUpload(page, await installQuizFixture(page, 'MANAGER'))
  let applies = 0
  await page.route(api('ai/extract'), route => route.fulfill({ json: { success: true, data: doneJob } }))
  await page.route(api('ai/jobs/job-1/apply'), route => { applies++; return route.fulfill({ json: { success: true, data: {} } }) })
  await page.goto(editUrl)
  await openPdfStep(page)
  await uploadAndStart(page)
  await steps(page).getByRole('button', { name: /Áp dụng/ }).click()
  await page.getByRole('button', { name: 'Áp dụng vào đề', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Quay lại' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(applies).toBe(0)
})

test('a failed job shows the reason and can be read again', async ({ page }) => {
  await stubUpload(page, await installQuizFixture(page, 'MANAGER'))
  let starts = 0
  await page.route(api('ai/extract'), route => {
    starts++
    return route.fulfill({ json: { success: true, data: { ...baseJob, id: `job-${starts}`, status: 'FAILED', error: 'Nhà cung cấp AI trả lỗi.' } } })
  })
  await page.goto(editUrl)
  await openPdfStep(page)
  await uploadAndStart(page)
  await expect(page.getByRole('alert').filter({ hasText: 'Nhà cung cấp AI trả lỗi.' })).toBeVisible()
  await page.getByRole('button', { name: 'Đọc lại', exact: true }).click()
  await expect.poll(() => starts).toBe(2)
})

test('AI switched off on the server (503) is explained and blocks reading', async ({ page }) => {
  await stubUpload(page, await installQuizFixture(page, 'MANAGER'))
  await page.route(api('ai/extract'), route => route.fulfill({
    status: 503, json: { success: false, code: 'AI_NOT_CONFIGURED', message: 'AI is not configured on this server (AI_PROVIDER + credentials).' },
  }))
  await page.goto(editUrl)
  await openPdfStep(page)
  await uploadAndStart(page)
  await expect(page.getByText('AI chưa được bật trên máy chủ này', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đọc đề', exact: true })).toBeDisabled()
})

test('a PDF chosen while creating is stored with the draft, then the editor opens on it', async ({ page }) => {
  const state = await installQuizFixture(page, 'MANAGER')
  let body = ''
  await page.route('**/api/v1/teacher/quizzes/with-file', route => {
    body = route.request().postDataBuffer()?.toString('latin1') ?? ''
    return route.fulfill({ json: { success: true, data: { quiz: { ...state.quizzes.find(q => q.id === QUIZ_IDS.exam), examFile }, aiJob: { ...baseJob, status: 'RUNNING', progress: 'Đang đọc 1/24 trang' }, imported: null, warnings: [] } } })
  })
  await page.goto('/console/manager/mock-exams/new')
  await page.getByLabel('Tên đề thi thử', { exact: true }).fill('Đề có PDF')
  await page.locator('main').getByRole('button', { name: /Khóa học chính$/ }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(editorSteps(page).getByRole('button', { name: /Đề PDF/ })).toHaveAttribute('aria-current', 'step')
  await page.getByLabel('Đề thi dạng PDF').setInputFiles(pdf)
  await page.getByLabel('Đến trang').fill('5')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lưu và xuất bản' })).toBeDisabled()
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.getByText('Đã lưu đề thi dưới dạng bản nháp cùng file PDF.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Đưa đề PDF thành câu hỏi' })).toBeVisible()
  expect(body).toContain('filename="de-thi.pdf"')
  expect(body).toContain('name="title"')
  expect(body).toMatch(/name="read"\r\n\r\ntrue/)
  expect(body).toMatch(/name="toPage"\r\n\r\n5/)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
