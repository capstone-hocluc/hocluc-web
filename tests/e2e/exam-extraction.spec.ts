import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'

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

type Fixture = Awaited<ReturnType<typeof installQuizFixture>>
const stubUpload = (page: Page, state: Fixture) =>
  page.route(api('exam-file'), route => route.fulfill({ json: { success: true, data: { ...state.quizzes[0], examFile } } }))

test('upload, reading and apply: tabs follow the job and apply replaces after confirmation', async ({ page }) => {
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
  await expect(page.getByRole('tab', { name: /^2 Tuỳ chọn|Tuỳ chọn/ })).toBeDisabled()
  await expect(page.getByRole('tab', { name: /Duyệt/ })).toBeDisabled()

  await uploadAndStart(page)
  await expect(page.getByRole('tab', { name: /AI đọc/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('status').filter({ hasText: 'Đang đọc 3/24 trang' })).toBeVisible()

  await expect(page.getByRole('tab', { name: /Duyệt/ })).toBeEnabled({ timeout: 15_000 })
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
  await uploadAndStart(page)
  await page.getByRole('tab', { name: /Áp dụng/ }).click()
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
  await uploadAndStart(page)
  await expect(page.getByText('AI chưa được bật trên máy chủ này', { exact: false }).first()).toBeVisible()
  await page.getByRole('tab', { name: /Tuỳ chọn/ }).click()
  await expect(page.getByRole('button', { name: 'Đọc đề', exact: true })).toBeDisabled()
})
