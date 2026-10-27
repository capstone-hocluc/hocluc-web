import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { installQuizFixture, QUIZ_IDS, quizToken } from './quiz-permissions-fixture'
import type { TeacherQuizExtractionJob } from '../../src/services/teacherQuizService'

const editUrl = `/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`
const importUrl = '**/api/v1/teacher/quizzes/*/import/file?mode=APPEND'
const entry = (page: Page) => page.getByRole('button', { name: 'Nhập câu hỏi từ file', exact: true })
const payload = (extension = 'txt') => ({ name: `cau-hoi.${extension}`, mimeType: 'application/octet-stream', buffer: Buffer.from('Câu 1. 2 + 2?\nA. 3\nB. 4\nĐáp án: B') })
const result = { sectionsAdded: 0, groupsAdded: 0, questionsAdded: 1, needsReview: 1, missingAnswers: 1,
  answerKeySource: 'INLINE', warnings: ['Kiểm tra đáp án câu mới.'], totalQuestions: 2 }

const newId = '50000000-0000-0000-0000-000000000010'
const jobId = '80000000-0000-0000-0000-000000000001'
async function selectImportTarget(page: Page, label: string, option: string) {
  await page.locator('main').getByRole('button', { name: new RegExp(`${label}$`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
async function prepareNewImport(page: Page, area = 'staff', kind = 'placements') {
  await page.goto(`/console/${area}/${kind}/new`)
  if (kind === 'quizzes') {
    await selectImportTarget(page, 'Khóa học', 'Khóa được phân công')
    await selectImportTarget(page, 'Chương', 'Chương nháp')
    await selectImportTarget(page, 'Bài học', 'Bài nháp')
  }
  if (kind === 'mock-exams') await selectImportTarget(page, 'Khóa học chính', 'Khóa được phân công')
  await page.getByLabel(kind === 'quizzes' ? 'Tên bài kiểm tra' : kind === 'placements' ? 'Tên bài đánh giá đầu vào' : 'Tên đề thi thử', { exact: true }).fill('Đề tạo từ file')
  await entry(page).click()
}
async function installCreateImport(page: Page, role: 'STAFF' | 'MANAGER' | 'ADMINISTRATOR' = 'STAFF') {
  const state = await installQuizFixture(page, role)
  const flow = { uploads: [] as string[], status: 200, network: false, malformed: false, noAi: false,
    job: null as TeacherQuizExtractionJob | null, applies: 0, applyMode: '', applyLost: false, gate: null as Promise<void> | null }
  await page.route(`**/api/v1/teacher/quizzes/${newId}`, route => route.request().method() !== 'GET' ? route.fallback()
    : route.fulfill({ json: { success: true, data: { quiz: state.quizzes.find(q => q.id === newId), questions: state.questions, sections: [], groups: [], pages: [], latestJob: flow.job } } }))
  await page.route(`**/api/v1/teacher/quizzes/${newId}/ai/jobs/${jobId}`, route => route.fulfill({ json: { success: true, data: flow.job } }))
  await page.route(`**/api/v1/teacher/quizzes/${newId}/ai/jobs/${jobId}/apply`, route => {
    flow.applies++
    flow.applyMode = route.request().postDataJSON().mode
    flow.job!.status = 'APPLIED'
    state.questions = [pdfQuestion()]
    state.quizzes.find(q => q.id === newId)!.questionCount = 1
    if (flow.applyLost) return route.abort('failed')
    return route.fulfill({ json: { success: true, data: result } })
  })
  await page.route('**/api/v1/teacher/quizzes/with-file', async route => {
    const raw = route.request().postData() ?? ''
    flow.uploads.push(raw)
    if (flow.gate) await flow.gate
    if (flow.network) return route.abort('failed')
    if (flow.status !== 200) return route.fulfill({ status: flow.status, json: { success: false, message: 'File không hợp lệ.' } })
    if (flow.malformed) return route.fulfill({ json: { success: true, data: {} } })
    const field = (key: string) => raw.match(new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r]*)`))?.[1]
    const pdf = raw.includes('filename="cau-hoi.pdf"')
    const created = { ...state.quizzes[0], id: newId, type: field('type') as 'PLACEMENT' | 'EXAM' | 'QUICK',
      title: field('title')!, status: 'DRAFT' as const, questionCount: pdf ? 0 : 1,
      courseId: field('courseId') ?? (field('type') === 'PLACEMENT' ? null : QUIZ_IDS.course),
      examFileUrl: pdf ? 'https://storage.example.invalid/paper.pdf' : null }
    state.quizzes.push(created)
    if (!pdf) state.questions = [{ ...state.questions[0], questionText: 'Câu hỏi nhập cùng lúc tạo đề' }]
    else state.questions = []
    return route.fulfill({ json: { success: true, data: { quiz: created,
      imported: pdf ? null : result, aiJob: flow.job, warnings: flow.noAi ? ['AI is not configured on this server.'] : [] } } })
  })
  return { state, flow }
}
function pdfJob(status: TeacherQuizExtractionJob['status'] = 'DONE'): TeacherQuizExtractionJob {
  return { id: jobId, quizId: newId, kind: 'EXAM_FILE', status, progress: 'Đang đọc trang 1', error: null,
    questionCount: 1, needsReviewCount: 0, missingAnswerCount: 0, warnings: [],
    result: { sections: [], groups: [], warnings: [], missingQuestions: [], questions: [{ number: 1, text: 'Câu hỏi đọc từ PDF',
      options: [{ label: 'A', text: 'Lựa chọn A', correct: true }, { label: 'B', text: 'Lựa chọn B', correct: false }],
      explanation: null, imageUrl: null, reviewNote: null, sourcePage: 1 }] } }
}

for (const [role, area, kind, extension, type] of [
  ['STAFF', 'staff', 'quizzes', 'txt', 'QUICK'],
  ['MANAGER', 'manager', 'mock-exams', 'docx', 'EXAM'],
  ['ADMINISTRATOR', 'admin', 'placements', 'md', 'PLACEMENT'],
] as const) {
  test(`${role}: creates ${kind} with ${extension} atomically and opens the persisted editor`, async ({ page }) => {
    const { state, flow } = await installCreateImport(page, role)
    await prepareNewImport(page, area, kind)
    await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload(extension))
    await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
    await expect(page.getByText('Đã tạo bản nháp. Đề chưa được xuất bản.')).toBeVisible()
    await page.getByRole('button', { name: 'Mở bản nháp để rà soát' }).click()
    await expect(page).toHaveURL(`/console/${area}/${kind}/${newId}/edit`)
    await expect(page.locator('textarea').filter({ hasText: 'Câu hỏi nhập cùng lúc tạo đề' })).toBeVisible()
    expect(flow.uploads).toHaveLength(1)
    expect(flow.uploads[0]).toContain(`name="type"\r\n\r\n${type}`)
    expect(flow.uploads[0]).toContain('name="read"\r\n\r\ntrue')
    expect(flow.uploads[0]).toContain(`filename="cau-hoi.${extension}"`)
    if (kind === 'quizzes') expect(flow.uploads[0]).toContain(`name="lessonId"\r\n\r\n${QUIZ_IDS.lesson}`)
    if (kind === 'placements') expect(flow.uploads[0]).not.toContain('name="courseId"')
    expect(state.requests.filter(r => r.method === 'POST' && (r.path.endsWith('/publish') || r.path === '/api/v1/teacher/quizzes'))).toEqual([])
    await page.reload()
    await expect(page.locator('textarea').filter({ hasText: 'Câu hỏi nhập cùng lúc tạo đề' })).toBeVisible()
    expect(state.pageErrors).toEqual([])
    expect(state.unmatched).toEqual([])
  })
}

for (const status of [400, 403, 413, 500, 0, 200]) {
  test(`create with file ${status}: retains settings and prevents uncertain resubmission`, async ({ page }) => {
    const { flow } = await installCreateImport(page)
    flow.status = status || 200; flow.network = status === 0; flow.malformed = status === 200
    await prepareNewImport(page)
    await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload())
    await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    if ([0, 200, 500].includes(status)) {
      await expect(page.getByRole('dialog').getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Đóng và kiểm tra danh sách đề' }).click()
      await expect(entry(page)).toBeDisabled()
    } else {
      await expect(page.getByRole('dialog').locator('input[type=file]')).toHaveValue(/cau-hoi.txt$/)
      await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click()
    }
    await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toHaveValue('Đề tạo từ file')
    expect(flow.uploads).toHaveLength(1)
  })
}

test('new import protects manual questions and disables duplicate clicks while creating', async ({ page }, testInfo) => {
  const { flow } = await installCreateImport(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await prepareNewImport(page)
  await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload('xlsx'))
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Chỉ hỗ trợ file')
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).last().click()
  await page.locator('textarea').last().fill('Giải thích đang soạn')
  await expect(entry(page)).toBeDisabled()
  await page.locator('textarea').last().fill('')
  await entry(page).click()
  await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload())
  let release!: () => void
  flow.gate = new Promise<void>(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đang nhập...', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('new-quiz-import-mobile.png') })
  release()
  await expect(page.getByText('Đã tạo bản nháp. Đề chưa được xuất bản.')).toBeVisible()
  expect(flow.uploads).toHaveLength(1)
})

test('PDF without AI configuration keeps the saved draft and displays the server warning', async ({ page }) => {
  const { flow } = await installCreateImport(page)
  flow.noAi = true
  await prepareNewImport(page)
  await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload('pdf'))
  await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
  await expect(page.getByText('AI is not configured on this server.')).toBeVisible()
  await expect(page.getByText('File đã lưu; chưa nhập câu hỏi.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Mở bản nháp để rà soát' }).click()
  await expect(page).toHaveURL(`/console/staff/placements/${newId}/edit`)
  expect(flow.applies).toBe(0)
})

for (const mode of ['preview', 'unsupported', 'lost', 'auto'] as const) {
  test(`PDF ${mode}: follows BE job status and never reapplies completed work`, async ({ page }, testInfo) => {
    const { flow, state } = await installCreateImport(page)
    flow.job = pdfJob(mode === 'auto' ? 'RUNNING' : 'DONE')
    if (mode === 'unsupported') flow.job.result!.questions[0].options[1].correct = true
    flow.applyLost = mode === 'lost'
    await prepareNewImport(page)
    await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload('pdf'))
    await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
    await page.getByRole('button', { name: 'Mở bản nháp để rà soát' }).click()
    if (mode === 'auto') {
      await expect(page.getByText('Đang đọc trang 1', { exact: false })).toBeVisible()
      await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toBeDisabled()
      flow.job.status = 'APPLIED'
      flow.job.warnings = ['Rà soát hình ảnh sau khi AI tự nhập.']
      state.questions = [pdfQuestion()]
      state.quizzes.find(q => q.id === newId)!.questionCount = 1
      await expect(page.getByText('Kết quả AI đã được đưa vào đề.', { exact: false })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('Rà soát hình ảnh sau khi AI tự nhập.')).toBeVisible()
      await page.getByRole('button', { name: 'Tải lại nội dung đề' }).click()
      await expect(page.locator('textarea').filter({ hasText: 'Câu hỏi đọc từ PDF' })).toBeVisible()
      expect(flow.applies).toBe(0)
    } else {
      await page.getByRole('button', { name: 'Xem trước kết quả PDF' }).click()
      await expect(page.getByRole('dialog').getByText('Câu 1. Câu hỏi đọc từ PDF')).toBeVisible()
      await page.getByLabel('Tôi đã rà soát nội dung, đáp án và các cảnh báo.').check()
      if (mode === 'preview') await page.screenshot({ path: testInfo.outputPath('pdf-import-preview.png') })
      const apply = page.getByRole('button', { name: 'Áp dụng câu hỏi vào bản nháp' })
      if (mode === 'unsupported') { await expect(apply).toBeDisabled(); expect(flow.applies).toBe(0); return }
      // Simulate a question inserted by another writer after preview: it must be preserved with APPEND.
      state.quizzes.find(q => q.id === newId)!.questionCount = 1
      await apply.click()
      if (mode === 'lost') {
        await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
        await expect(apply).toHaveCount(0)
        await page.getByRole('dialog').getByRole('button', { name: 'Tải lại nội dung đề' }).click()
      }
      await expect(page.getByText('Kết quả AI đã được đưa vào đề.', { exact: false })).toBeVisible()
      expect(flow.applies).toBe(1)
      expect(flow.applyMode).toBe('APPEND')
    }
    expect(state.pageErrors).toEqual([])
  })
}

function pdfQuestion() {
  return { id: QUIZ_IDS.question, sequence: 1, sectionId: null, groupId: null, questionText: 'Câu hỏi đọc từ PDF',
    questionType: 'SINGLE_CHOICE' as const, difficulty: null, categoryId: null, categoryName: null, explanation: null,
    imageUrl: null, sourcePage: 1, marks: null, needsReview: false, reviewNote: null, correctLabels: 'A',
    options: [{ id: 'option-A', label: 'A', text: 'Lựa chọn A', sequence: 1, correct: true }, { id: 'option-B', label: 'B', text: 'Lựa chọn B', sequence: 2, correct: false }] }
}
async function choose(page: Page, extension = 'txt') {
  await entry(page).click()
  await page.getByLabel('File câu hỏi (.docx, .txt, .md)', { exact: true }).setInputFiles(payload(extension))
}

for (const [role, area, path, id, extension] of [
  ['STAFF', 'staff', 'quizzes', QUIZ_IDS.quiz, 'txt'],
  ['MANAGER', 'manager', 'mock-exams', QUIZ_IDS.exam, 'docx'],
  ['ADMINISTRATOR', 'admin', 'placements', QUIZ_IDS.quiz, 'md'],
] as const) {
  test(`${role}: ${path} imports ${extension} as multipart APPEND and reloads the editor`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    if (path === 'placements') Object.assign(state.quizzes[0], { type: 'PLACEMENT', courseId: null, chapterId: null, lessonId: null })
    let uploads = 0
    await page.route(importUrl, async route => {
      uploads++
      const request = route.request()
      expect(request.method()).toBe('POST')
      expect(request.headers()['content-type']).toContain('multipart/form-data; boundary=')
      expect(request.headers()['authorization']).toContain('Bearer ')
      expect(request.postData()).toContain('name="file"')
      expect(request.postData()).toContain(`filename="cau-hoi.${extension}"`)
      state.questions.push({ ...state.questions[0], id: 'imported-question', sequence: 2, questionText: 'Câu hỏi vừa nhập' })
      state.quizzes.find(quiz => quiz.id === id)!.questionCount = 2
      await route.fulfill({ json: { success: true, data: result } })
    })
    await page.goto(`/console/${area}/${path}/${id}/edit`)
    await choose(page, extension)
    await page.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Đã nhập câu hỏi vào bản nháp. Bài chưa được tự động xuất bản.')).toBeVisible()
    await expect(dialog.getByText('Câu cần rà soát')).toBeVisible()
    await expect(dialog.getByText('Câu thiếu đáp án')).toBeVisible()
    await expect(dialog.getByText('Kiểm tra đáp án câu mới.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Tải lại bài để kiểm tra' }).click()
    await expect(page.locator('textarea').filter({ hasText: 'Câu hỏi vừa nhập' })).toBeVisible()
    expect(uploads).toBe(1)
    expect(state.requests.filter(r => r.path.endsWith('/publish'))).toEqual([])
    expect(state.unmatched).toEqual([])
    expect(state.pageErrors).toEqual([])
  })
}

test('unsaved changes block append; new drafts require settings before opening import', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto(editUrl)
  await expect(entry(page)).toBeEnabled()
  const title = page.getByLabel('Tên bài kiểm tra', { exact: true })
  await title.fill('Chưa lưu')
  await expect(entry(page)).toBeDisabled()
  await title.fill('Quiz được giao')
  await page.locator('textarea').first().fill('Câu hỏi chưa lưu')
  await expect(entry(page)).toBeDisabled()
  await page.goto('/console/staff/placements/new')
  await expect(entry(page)).toBeEnabled()
  await entry(page).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('alert').filter({ hasText: 'Nhập tên đề thi' })).toBeVisible()
})

for (const kind of ['quizzes', 'placements'] as const) {
  test(`${kind}: validates settings before opening import and uses the completed settings`, async ({ page }) => {
    const { flow } = await installCreateImport(page)
    await page.goto(`/console/staff/${kind}/new`)
    await entry(page).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveCount(0)
    expect(flow.uploads).toHaveLength(0)
    await page.getByRole('textbox', { name: kind === 'quizzes' ? /^Tên bài kiểm tra/ : /^Tên bài đánh giá đầu vào/ }).fill('Đề đã đủ thông tin')
    if (kind === 'quizzes') {
      await entry(page).click()
      await expect(dialog).toHaveCount(0)
      await selectImportTarget(page, 'Khóa học', 'Khóa được phân công')
      await selectImportTarget(page, 'Chương', 'Chương nháp')
      await selectImportTarget(page, 'Bài học', 'Bài nháp')
    }
    await entry(page).click()
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload())
    await expect(dialog.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true })).toBeEnabled()
    await dialog.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
    await expect(dialog.getByText('Đã tạo bản nháp. Đề chưa được xuất bản.')).toBeVisible()
    expect(flow.uploads).toHaveLength(1)
    expect(flow.uploads[0]).toContain('Đề đã đủ thông tin')
    if (kind === 'quizzes') expect(flow.uploads[0]).toContain(`name="lessonId"\r\n\r\n${QUIZ_IDS.lesson}`)
  })
}

for (const status of ['PUBLISHED', 'ARCHIVED', 'ATTEMPT'] as const) {
  test(`${status}: import disabled on initial server state`, async ({ page }) => {
    const state = await installQuizFixture(page, 'STAFF')
    if (status === 'ATTEMPT') state.quizzes[0].attemptCount = 1
    else state.quizzes[0].status = status
    await page.goto(editUrl)
    await expect(entry(page)).toBeDisabled()
  })
}

test('preflight detects a draft published after opening without sending a file', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  let uploads = 0
  await page.route(importUrl, route => { uploads++; return route.fulfill({ json: { success: true, data: result } }) })
  await page.goto(editUrl)
  await choose(page)
  state.quizzes[0].status = 'PUBLISHED'
  await page.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Chỉ nhập câu hỏi vào bản nháp')
  expect(uploads).toBe(0)
})

for (const status of [400, 403, 413, 500, 200, 0]) {
  test(`import response ${status}: handles errors without automatic duplicate submissions`, async ({ page }) => {
    await installQuizFixture(page, 'STAFF')
    let uploads = 0
    await page.route(importUrl, async route => {
      uploads++
      if (status === 0) return route.abort('failed')
      return route.fulfill({ status, json: status === 200 ? { success: true, data: {} }
        : { success: false, message: 'Không thể nhập file kiểm thử.' } })
    })
    await page.goto(editUrl)
    await choose(page)
    await page.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('alert')).toBeVisible()
    if ([0, 200, 500].includes(status)) {
      await expect(dialog.getByRole('alert')).toContainText('Chưa xác nhận được kết quả nhập')
      await expect(dialog.getByRole('button', { name: 'Nhập vào bản nháp', exact: true })).toHaveCount(0)
    }
    if (status === 403) await expect(dialog.getByRole('alert')).toContainText('Bạn không có quyền')
    if (status === 413) await expect(dialog.getByRole('alert')).toContainText('vượt giới hạn')
    expect(uploads).toBe(1)
  })
}

test('blocks duplicate clicks and dismissal while uploading; validates files and supports mobile', async ({ page }, testInfo) => {
  await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 390, height: 844 })
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let uploads = 0
  await page.route(importUrl, async route => { uploads++; await gate; await route.fulfill({ json: { success: true, data: result } }) })
  await page.goto(editUrl)
  await choose(page, 'xlsx')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toContainText('Chỉ hỗ trợ file')
  await expect(dialog.getByRole('button', { name: 'Nhập vào bản nháp', exact: true })).toBeDisabled()
  await dialog.locator('input[type=file]').setInputFiles({ ...payload(), buffer: Buffer.alloc(0) })
  await expect(dialog.getByRole('alert')).toContainText('File đang trống')
  await dialog.locator('input[type=file]').setInputFiles(payload())
  await dialog.getByText('Hướng dẫn định dạng và file mẫu').click()
  await expect(dialog.getByRole('link', { name: 'Tải file mẫu TXT (.txt)', exact: true })).toHaveAttribute('download', 'mau-nhap-cau-hoi.txt')
  await expect(dialog.getByRole('link', { name: /^Tải file mẫu / })).toHaveCount(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('quiz-import-mobile.png') })
  await dialog.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Đang nhập...', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog.getByText('Tổng câu hỏi')).toBeVisible()
  expect(uploads).toBe(1)
})

test('format guide downloads real Word, TXT and Markdown templates with matching content', async ({ page }, testInfo) => {
  await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(editUrl)
  await entry(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Hướng dẫn định dạng và file mẫu').click()
  await expect(dialog.getByText('Ba định dạng cùng một mẫu điền trống.', { exact: false })).toBeVisible()
  const expected = (await readFile(new URL('../../docs/samples/quiz-import-template.txt', import.meta.url), 'utf8')).replace(/\r\n/g, '\n')
  expect(expected).toContain('Đáp án: [Điền ký tự đáp án đúng tại đây]')
  expect(expected).not.toContain('2 + 2')
  for (const [format, extension] of [['Word (.docx)', 'docx'], ['TXT (.txt)', 'txt'], ['Markdown (.md)', 'md']]) {
    const link = dialog.getByRole('link', { name: `Tải file mẫu ${format}`, exact: true })
    await expect(link).toHaveAttribute('href', `/templates/quiz-import/mau-nhap-cau-hoi.${extension}`)
    const downloading = page.waitForEvent('download')
    await link.click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe(`mau-nhap-cau-hoi.${extension}`)
    expect(await download.failure()).toBeNull()
    const bytes = await readFile((await download.path())!)
    if (extension === 'docx') expect(bytes.subarray(0, 2).toString()).toBe('PK')
    else expect(bytes.toString('utf8')).toBe(expected)
  }
  await page.screenshot({ path: testInfo.outputPath('quiz-import-guide-desktop.png') })
})

test('active-role switch removes import and Teacher cannot invoke import services', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto(editUrl)
  await choose(page)
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
  }, quizToken('TEACHER'))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(entry(page)).toHaveCount(0)
  const statuses = await page.evaluate(async id => {
    const modulePath = '/src/services/teacherQuizService.ts'
    const service = await import(modulePath)
    const file = new File(['Câu 1. Test'], 'test.txt')
    const codes: number[] = []
    for (const operation of [() => service.importTeacherQuizFile(id, file),
      () => service.createTeacherQuizWithFile({ type: 'PLACEMENT', title: 'Forbidden' }, file)]) {
      try { await operation(); codes.push(200) } catch (cause) { codes.push((cause as { status: number }).status) }
    }
    return codes
  }, QUIZ_IDS.quiz)
  expect(statuses).toEqual([403, 403])
})

test('Teacher direct editor URL denies access before exposing import', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto(`/console/teacher/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  await expect(entry(page)).toHaveCount(0)
  expect(state.requests.filter(r => r.path.startsWith('/api/v1/teacher/quizzes/'))).toEqual([])
})

test('PDF failure releases the editor after reloading, without starting another AI job', async ({ page }) => {
  const { flow } = await installCreateImport(page)
  flow.job = pdfJob('RUNNING')
  await prepareNewImport(page)
  await page.getByLabel('File đề (.pdf, .docx, .txt, .md)', { exact: true }).setInputFiles(payload('pdf'))
  await page.getByRole('button', { name: 'Tạo bản nháp và nhập câu hỏi', exact: true }).click()
  await page.getByRole('button', { name: 'Mở bản nháp để rà soát' }).click()
  await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toBeDisabled()
  flow.job.status = 'FAILED'
  flow.job.error = 'Không đọc được PDF thử nghiệm.'
  await expect(page.getByText('Không đọc được PDF thử nghiệm.', { exact: false })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Tải lại nội dung đề' }).click()
  await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toBeEnabled()
  expect(flow.uploads).toHaveLength(1)
  expect(flow.applies).toBe(0)
})

test('non-PDF AI generation jobs do not lock the editor or mount the PDF workflow', async ({ page }) => {
  const { flow, state } = await installCreateImport(page)
  flow.job = { ...pdfJob('RUNNING'), kind: 'GENERATE' }
  state.quizzes.push({ ...state.quizzes[0], id: newId, type: 'PLACEMENT' })
  await page.goto(`/console/staff/placements/${newId}/edit`)
  await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Đọc đề PDF bằng AI', { exact: true })).toHaveCount(0)
  expect(flow.applies).toBe(0)
})

test('imported grouped content is read-only after reload and is not flattened', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  let imported = false
  await page.route(`**/api/v1/teacher/quizzes/${QUIZ_IDS.quiz}`, route => {
    if (!imported || route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ json: { success: true, data: { quiz: state.quizzes[0], sections: [],
      groups: [{ id: 'group-1', questionIds: [QUIZ_IDS.question] }], questions: state.questions, pages: [], latestJob: null } } })
  })
  await page.route(importUrl, route => { imported = true; return route.fulfill({ json: { success: true, data: { ...result, groupsAdded: 1 } } }) })
  await page.goto(editUrl)
  await choose(page)
  await page.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
  await page.getByRole('button', { name: 'Tải lại bài để kiểm tra' }).click()
  await expect(page.getByText('Bài có phần hoặc nhóm câu hỏi ngoài phạm vi chỉnh sửa', { exact: false })).toBeVisible()
  await expect(page.locator('textarea').first()).toBeDisabled()
  await expect(entry(page)).toBeDisabled()
})
