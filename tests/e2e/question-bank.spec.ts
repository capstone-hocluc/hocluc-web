import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

const label = {
  partCode: 'MA', domainCode: 'MA.D02', domainNameVi: 'Đại số', patternCode: 'MA.Q07', patternNameVi: 'Giải phương trình',
  primarySkillCode: 'MA.S03', microSkillCode: 'MA.M11', confidence: 0.93, needsFigure: 0.02, labelSource: 'JEV',
}
const rows = [
  { id: 'q-1', sourceCode: '2021-mau', sourceTitle: 'Đề mẫu 2021', year: 2021, round: 'MAU', sourceNumber: 61,
    text: 'Giải phương trình $x^2 - 5x + 6 = 0$.', hasFigure: false, hasFormula: true, answerSource: 'PUBLISHED_KEY', reviewNeeded: false, label },
  { id: 'q-2', sourceCode: '2023-mau', sourceTitle: 'Đề mẫu 2023', year: 2023, round: 'MAU', sourceNumber: 65,
    text: 'Biểu đồ cho biết điều gì?', hasFigure: true, hasFormula: false, answerSource: 'NONE', reviewNeeded: true, label: null },
]
const detail = {
  ...rows[0], passage: null, explanation: null, imageUrl: null, passageImageUrl: null, reviewNotes: null, extractConfidence: 0.97,
  options: [{ label: 'A', text: '2 và 3', correct: true }, { label: 'B', text: '1 và 6', correct: false }],
}
const stats = { total: 2, needsReview: 1, unlabelled: 1, byPart: { MA: 1 }, byYear: { 2023: 1, 2021: 1 },
  byAnswerSource: { PUBLISHED_KEY: 1, REFERENCE_KEY: 0, NONE: 1 } }
const patterns = [
  { code: 'MA.Q07', nameVi: 'Giải phương trình', domainCode: 'MA.D02', domainNameVi: 'Đại số', partCode: 'MA' },
  { code: 'MA.Q08', nameVi: 'Bất phương trình', domainCode: 'MA.D02', domainNameVi: 'Đại số', partCode: 'MA' },
]
const page0 = (content: unknown[]) => ({ content, pageNumber: 0, pageSize: 20, totalElements: content.length, totalPages: 1, last: true })

type Source = Record<string, unknown> & { status: string }
const source = (status: string, questionCount = 0): Source => ({
  id: 'src-1', code: '2021-mau', title: 'Đề mẫu 2021', year: 2021, round: 'mẫu', answerSource: 'REFERENCE_KEY', status,
  progress: status === 'DONE' ? null : 'Đang đọc đề', error: null, questionCount, duplicateCount: 0, needsReviewCount: 0,
  unlabelledCount: 0, finishedAt: null, retryable: true,
})
const failed = (retryable: boolean): Source => ({
  ...source('FAILED'), progress: null, retryable,
  error: "The model did not return valid JSON: Unrecognized token '$'",
})

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
const readQuestion = (number: number, text: string) => ({
  number, sectionKey: 'P1', groupKey: null, text, explanation: null, subject: null, sourcePage: 1, hasFigure: false,
  figureIds: [], imageUrl: null, hasFormula: true, confidence: 0.9, reviewNote: null,
  options: [{ label: 'A', text: '$2$', correct: false }, { label: 'B', text: '$3$', correct: false }],
})
const reading = (status: string, questions: ReturnType<typeof readQuestion>[]) => ({
  sourceId: 'src-1', status, stage: status === 'DONE' ? 'DONE' : 'QUESTIONS',
  progress: status === 'DONE' ? null : 'Đang đọc (câu 1-2)...', error: null, finished: status === 'DONE',
  pageCount: 2, sections: [], groups: [], questions,
  regions: [{ number: 1, page: 1, top: 0.1, bottom: 0.4 }, { number: 2, page: 1, top: 0.4, bottom: 0.96 }],
})

/** A server-sent event stream as the server writes it. */
const sse = (...events: [string, unknown][]) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join('')
const snapshot = (live: boolean, status: string, stage: string | null, parts: unknown[] = [], error: string | null = null) => ({
  sourceId: 'src-1', live, status, stage, progress: live ? 'Đang đọc Phần 1 (câu 1-2)...' : null, error, parts, labelled: 0, labelTotal: 0,
})
const streamPart = (status: string, text: string, attempt = 1) => ({
  id: '1-2', title: 'Phần 1', fromQuestion: 1, toQuestion: 2, firstPage: 1, lastPage: 1, attempt, status, text, questions: status === 'DONE' ? 2 : 0,
})
/** What a paper not being read gets: what is stored of it, and the end. */
const storedStream = (status = 'DONE', error: string | null = null) =>
  sse(['snapshot', snapshot(false, status, status === 'DONE' ? 'DONE' : 'QUESTIONS', [], error)], ['end', { status, error }])

async function install(page: Page, role: 'MANAGER' | 'TEACHER' | 'STAFF', sources: () => Source[] = () => [],
  readings: () => unknown = () => reading('DONE', []), stream: () => string | null = () => storedStream(),
  labelling: { ready: boolean; reason: string | null } = { ready: true, reason: null }) {
  const state = await installQuizFixture(page, role)
  const seen: string[] = []
  let relabelBody: unknown = null
  let upload: string | null = null
  let retried = false
  let streams = 0
  let labelled = false
  await page.route('**/api/v1/question-bank/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    seen.push(`${request.method()} ${url.pathname}${url.search}`)
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data } })
    if (url.pathname.endsWith('/sources')) {
      if (request.method() === 'POST') {
        upload = request.postData()
        return route.fulfill({ status: 202, json: { success: true, status: 202, data: source('PENDING') } })
      }
      return ok(sources())
    }
    if (url.pathname.endsWith('/src-1/retry')) {
      retried = true
      return route.fulfill({ status: 202, json: { success: true, status: 202, data: source('PENDING') } })
    }
    if (url.pathname.endsWith('/src-1/stream')) {
      streams += 1
      const body = stream()
      return body === null
        ? route.fulfill({ status: 404, json: { success: false, status: 404, message: 'gone' } })
        : route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    }
    if (url.pathname.endsWith('/src-1/reading')) return ok(readings())
    if (url.pathname.includes('/src-1/pages/')) return route.fulfill({ contentType: 'image/png', body: PNG })
    if (url.pathname.endsWith('/labelling')) return ok(labelling)
    if (url.pathname.endsWith('/src-1/label')) {
      labelled = true
      return route.fulfill({ status: 202, json: { success: true, status: 202, data: source('PENDING') } })
    }
    if (url.pathname.endsWith('/stats')) return ok(stats)
    if (url.pathname.endsWith('/patterns')) return ok(patterns)
    if (url.pathname.endsWith('/label')) {
      relabelBody = request.postDataJSON()
      return ok({ ...detail, label: { ...label, patternCode: 'MA.Q08', patternNameVi: 'Bất phương trình', confidence: null, labelSource: 'MANUAL' } })
    }
    if (url.pathname.endsWith('/q-1')) return ok(detail)
    if (url.pathname.endsWith('/questions')) {
      const review = url.searchParams.get('needsReview') === 'true'
      return ok(page0(review ? rows.filter(row => row.reviewNeeded) : rows))
    }
    return route.fulfill({ status: 404, json: { success: false, status: 404, message: 'unmatched' } })
  })
  return { state, seen, relabelBody: () => relabelBody, upload: () => upload, retried: () => retried, streams: () => streams, labelled: () => labelled }
}

test('the bank lists questions with their labels and narrows to those needing review', async ({ page }) => {
  const { state, seen } = await install(page, 'MANAGER')
  await page.goto('/console/manager/question-bank')

  await expect(page.getByRole('heading', { name: 'Ngân hàng câu hỏi' })).toBeVisible()
  await expect(page.getByText('Tổng số câu')).toBeVisible()
  await expect(page.getByText('Biểu đồ cho biết điều gì?')).toBeVisible()
  const table = page.getByRole('table').filter({ hasText: 'Nội dung' })
  await expect(table.getByText('Toán học')).toBeVisible()
  await expect(table.getByText('Chưa gán', { exact: true })).toBeVisible()
  await expect(page.getByText('2 câu', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Lọc theo tình trạng' }).click()
  await page.getByRole('option', { name: 'Cần duyệt' }).click()
  await expect(page.getByText('1 câu', { exact: true })).toBeVisible()
  await expect(table.getByText('Toán học')).toBeHidden()
  expect(seen.some(entry => entry.includes('needsReview=true'))).toBe(true)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('a manager corrects a label and the screen asks the server to set the chosen pattern', async ({ page }) => {
  const fixture = await install(page, 'MANAGER')
  await page.goto('/console/manager/question-bank')

  await page.getByRole('row', { name: /2021/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('2 và 3')).toBeVisible()
  await expect(dialog.getByText('Jev gán')).toBeVisible()

  await dialog.getByRole('button', { name: 'Dạng câu đúng' }).click()
  await page.getByRole('option', { name: /Bất phương trình/ }).click()
  await dialog.getByRole('button', { name: 'Lưu nhãn' }).click()

  await expect.poll(fixture.relabelBody).toEqual({ patternCode: 'MA.Q08' })
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a teacher can read the bank but not change a label', async ({ page }) => {
  const { state } = await install(page, 'TEACHER')
  await page.goto('/console/teacher/question-bank')

  await page.getByRole('row', { name: /2021/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('2 và 3')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Lưu nhãn' })).toHaveCount(0)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('staff upload a paper after confirming the AI cost and follow it until it is read', async ({ page }) => {
  // Empty until the upload, then running for two reads, then read.
  let readsAfterUpload = 0
  const fixture = await install(page, 'STAFF', () =>
    !fixture.upload() ? [] : readsAfterUpload++ < 2 ? [source('RUNNING')] : [source('DONE', 120)]
  )
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await expect(page.getByText('Chưa nạp đề nào.')).toBeVisible()

  await page.getByRole('button', { name: 'Nhập đề' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('File đề (PDF)').setInputFiles({ name: 'de-2021.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await dialog.getByLabel('File đáp án').setInputFiles({ name: 'dap-an.txt', mimeType: 'text/plain', buffer: Buffer.from('1A 2B') })
  await dialog.getByLabel('Năm').fill('2021')
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await expect(dialog.getByText(/tốn token/)).toBeVisible()
  expect(fixture.upload()).toBeNull()

  await dialog.getByRole('button', { name: 'Xác nhận nhập' }).click()
  await expect(dialog).toBeHidden()
  const body = fixture.upload() ?? ''
  expect(body).toContain('de-2021.pdf')
  expect(body).toContain('REFERENCE_KEY')
  await expect(page.getByText('Đang đọc', { exact: true })).toBeVisible()
  const statsBefore = fixture.seen.filter(entry => entry.endsWith('/stats')).length
  await expect(page.getByText('Xong', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => fixture.seen.filter(entry => entry.endsWith('/stats')).length).toBeGreaterThan(statsBefore)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a teacher sees the loaded papers but cannot upload one', async ({ page }) => {
  const { state } = await install(page, 'TEACHER', () => [source('DONE', 120)])
  await page.goto('/console/teacher/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await expect(page.getByText('Xong', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhập đề' })).toHaveCount(0)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('the reading view streams what the AI writes onto the page and lights the pipeline', async ({ page }) => {
  // question 1 is written whole, question 2 is still being written when the stream is looked at
  const writing = sse(
    ['snapshot', snapshot(true, 'RUNNING', 'QUESTIONS', [streamPart('READING', '')])],
    ['text', { partId: '1-2', attempt: 1, text: '{"groups": [], "questions": [{"number": 1, "text": "Câu 1: Giải x + 1 = 3", ' }],
    ['text', { partId: '1-2', attempt: 1, text: '"options": [{"label": "A", "text": "2"}]}, {"number": 2, "text": "Tính 2 + 2 bằng' }],
  )
  const { state } = await install(page, 'STAFF', () => [source('RUNNING')], () => reading('RUNNING', []), () => writing)
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()

  const view = page.getByRole('region', { name: 'Đề Đề mẫu 2021' })
  await expect(view.getByRole('img', { name: 'Trang 1 của đề' })).toBeVisible()
  await expect(view.getByRole('button', { name: 'Câu 2, AI đang viết' })).toBeVisible()
  await expect(view.getByRole('button', { name: 'Câu 1, AI đã đọc' })).toBeVisible()
  const paper = view.getByLabel('Đề gốc')
  await expect(paper.getByText('Tính 2 + 2 bằng')).toBeVisible()
  await expect(paper.getByText('Giải x + 1 = 3')).toBeVisible()
  const pipeline = view.getByLabel('Pipeline nạp đề')
  await expect(pipeline.getByText('Đọc cấu trúc đề')).toBeVisible()
  await expect(pipeline.getByText('Phần 1 · câu 1–2')).toBeVisible()
  await expect(pipeline.getByText('Gán nhãn bằng Jev')).toBeVisible()
  await expect(view.getByText('Đã kết nối, đang theo dõi AI đọc đề')).toBeVisible()
  await view.getByRole('button', { name: 'Hiện chữ AI viết' }).click()
  await expect(paper.getByText('Tính 2 + 2 bằng')).toHaveCount(0)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('a stream that ends is not opened again, and the end is told in the log', async ({ page }) => {
  const done = sse(
    ['snapshot', snapshot(true, 'RUNNING', 'QUESTIONS', [streamPart('READING', '')])],
    ['part', streamPart('DONE', '{"questions": []}')],
    ['stage', { stage: 'LABEL', progress: 'Đang gán nhãn bằng Jev...' }],
    ['label', { labelled: 2, labelTotal: 2 }],
    ['end', { status: 'DONE', error: null }],
  )
  const fixture = await install(page, 'STAFF', () => [source('DONE', 2)], () => reading('DONE', [readQuestion(1, 'Một'), readQuestion(2, 'Hai')]), () => done)
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()

  const view = page.getByRole('region', { name: 'Đề Đề mẫu 2021' })
  await expect(view.getByText('Nạp đề xong')).toBeVisible()
  await expect(view.getByText('AI viết xong Phần 1 · câu 1–2: 2 câu')).toBeVisible()
  await expect(view.getByText('2/2 câu')).toBeVisible()
  // in development React opens it twice (the first is dropped at once); what matters is that it is not opened again
  const opened = fixture.streams()
  await page.waitForTimeout(3000)
  expect(fixture.streams()).toBe(opened)
  expect(opened).toBeLessThanOrEqual(2)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('without the stream the reading view falls back to asking now and then', async ({ page }) => {
  const fixture = await install(page, 'STAFF', () => [source('RUNNING')], () => reading('RUNNING', [readQuestion(1, 'Một')]), () => null)
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()

  const view = page.getByRole('region', { name: 'Đề Đề mẫu 2021' })
  await expect(view.getByText(/đang cập nhật 4 giây một lần/)).toBeVisible()
  await expect(view.getByRole('button', { name: 'Câu 1, AI đã đọc' })).toBeVisible()
  const opened = fixture.streams()
  await page.waitForTimeout(3000)
  expect(fixture.streams()).toBe(opened)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a failed paper whose files were kept is read again after a confirmation', async ({ page }) => {
  let retried = () => false
  const fixture = await install(page, 'STAFF', () => (retried() ? [source('RUNNING')] : [failed(true)]))
  retried = fixture.retried
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await expect(page.getByText(/AI trả về dữ liệu hỏng/)).toBeVisible()
  await expect(page.getByText(/Unrecognized token/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Nạp lại' }).click()
  const confirm = page.getByRole('dialog')
  await expect(confirm.getByText(/tốn token/)).toBeVisible()
  expect(fixture.retried()).toBe(false)
  await confirm.getByRole('button', { name: 'Nạp lại' }).click()

  await expect.poll(fixture.retried).toBe(true)
  await expect(page.getByText('Đang đọc', { exact: true })).toBeVisible()
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a failed paper loaded before its files were kept opens the upload with its details filled in', async ({ page }) => {
  const fixture = await install(page, 'STAFF', () => [failed(false)])
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Nạp lại' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Nạp lại đề Đề mẫu 2021' })).toBeVisible()
  await expect(dialog.getByLabel('Năm')).toHaveValue('2021')
  await expect(dialog.getByLabel('Tên đề')).toHaveValue('Đề mẫu 2021')
  await dialog.getByLabel('File đề (PDF)').setInputFiles({ name: 'de.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await dialog.getByRole('button', { name: 'Xác nhận nhập' }).click()

  await expect.poll(fixture.upload).toContain('2021-mau')
  expect(fixture.retried()).toBe(false)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('the reading view of a failed paper offers to load it again', async ({ page }) => {
  const broken = { ...reading('FAILED', []), error: failed(true).error, pageCount: 0, regions: [] }
  const fixture = await install(page, 'STAFF', () => [failed(true)], () => broken, () => storedStream('FAILED', failed(true).error as string))
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()
  const view = page.getByRole('region', { name: 'Đề Đề mẫu 2021' })
  await expect(view.getByText(/AI trả về dữ liệu hỏng/)).toBeVisible()
  await view.getByRole('button', { name: 'Nạp lại' }).click()
  await expect(page.getByRole('heading', { name: 'Nạp lại đề Đề mẫu 2021?' })).toBeVisible()
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

const NO_MASTER_DATA = 'Chưa có Master Data đang dùng nên Jev chưa gán nhãn được.'
const unlabelledPaper = (): Source => ({ ...source('DONE', 3), unlabelledCount: 3 })

test('without Master Data the papers tab says why nothing is labelled, and labelling is not sent', async ({ page }) => {
  const fixture = await install(page, 'STAFF', () => [unlabelledPaper()], undefined, undefined, { ready: false, reason: NO_MASTER_DATA })
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await expect(page.getByText(NO_MASTER_DATA)).toBeVisible()

  await page.getByRole('button', { name: 'Gán nhãn' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.labelled()).toBe(false)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a finished paper with unlabelled questions is labelled after a confirmation', async ({ page }) => {
  const fixture = await install(page, 'STAFF', () => [unlabelledPaper()])
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()

  await page.getByRole('button', { name: 'Gán nhãn' }).click()
  const confirm = page.getByRole('dialog')
  await expect(confirm.getByText(/Jev gán nhãn 3 câu/)).toBeVisible()
  await confirm.getByRole('button', { name: 'Gán nhãn' }).click()
  await expect.poll(fixture.labelled).toBe(true)
  expect(fixture.state.unmatched).toEqual([]); expect(fixture.state.pageErrors).toEqual([])
})

test('a paper opens in the page, not in a popup, and back returns to the list', async ({ page }) => {
  const { state } = await install(page, 'STAFF', () => [source('DONE', 2)], () => reading('DONE', [readQuestion(1, 'Một')]))
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('row', { name: /Đề mẫu 2021/ }).click()

  const view = page.getByRole('region', { name: 'Đề Đề mẫu 2021' })
  await expect(view.getByLabel('Pipeline nạp đề')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('table')).toHaveCount(0)

  await view.getByRole('button', { name: 'Danh sách đề' }).click()
  await expect(view).toHaveCount(0)
  await expect(page.getByRole('row', { name: /Đề mẫu 2021/ })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('without the PDF the paper is shown as HTML from what the AI read, a question it gave back empty said so', async ({ page }) => {
  const noPdf = {
    ...reading('DONE', [readQuestion(1, 'Giải phương trình'), { ...readQuestion(2, ''), options: [] }]),
    pageCount: 0, regions: [],
    sections: [{ key: 'P2', parentKey: null, title: 'PHẦN 2. TOÁN HỌC', subject: null, suggestedMinutes: null, fromQuestion: 1, toQuestion: 2 }],
  }
  const { state } = await install(page, 'STAFF', () => [source('DONE', 1)], () => noPdf)
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()

  const paper = page.getByRole('article', { name: 'Bản đề AI đọc được' })
  await expect(paper.getByRole('heading', { name: 'PHẦN 2. TOÁN HỌC' })).toBeVisible()
  await expect(paper.getByText('Giải phương trình')).toBeVisible()
  await expect(paper.getByText('(AI chưa đọc được câu này)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trang gốc' })).toHaveCount(0)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('a paper with its PDF can be seen as the page or as HTML', async ({ page }) => {
  const { state } = await install(page, 'STAFF', () => [source('DONE', 1)], () => reading('DONE', [readQuestion(1, 'Giải phương trình')]))
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await page.getByRole('button', { name: 'Xem AI đọc đề' }).click()

  await expect(page.getByRole('img', { name: 'Trang 1 của đề' })).toBeVisible()
  await page.getByRole('button', { name: 'Bản HTML' }).click()
  await expect(page.getByRole('article', { name: 'Bản đề AI đọc được' }).getByText('Giải phương trình')).toBeVisible()
  await page.getByRole('button', { name: 'Trang gốc' }).click()
  await expect(page.getByRole('img', { name: 'Trang 1 của đề' })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
