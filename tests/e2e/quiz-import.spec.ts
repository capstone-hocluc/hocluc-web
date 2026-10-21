import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, quizToken } from './quiz-permissions-fixture'

const editUrl = `/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`
const importUrl = '**/api/v1/teacher/quizzes/*/import/file?mode=APPEND'
const entry = (page: Page) => page.getByRole('button', { name: 'Nhập câu hỏi từ file', exact: true })
const payload = (extension = 'txt') => ({ name: `cau-hoi.${extension}`, mimeType: 'application/octet-stream', buffer: Buffer.from('Câu 1. 2 + 2?\nA. 3\nB. 4\nĐáp án: B') })
const result = { sectionsAdded: 0, groupsAdded: 0, questionsAdded: 1, needsReview: 1, missingAnswers: 1,
  answerKeySource: 'INLINE', warnings: ['Kiểm tra đáp án câu mới.'], totalQuestions: 2 }
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

test('unsaved changes and a new draft cannot import; reverting edits restores access', async ({ page }) => {
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
  await expect(entry(page)).toBeDisabled()
  await expect(page.getByText('Lưu bản nháp rồi mở lại bài để nhập câu hỏi.')).toBeVisible()
})

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
  await expect(dialog.getByRole('link', { name: 'Tải file mẫu TXT' })).toHaveAttribute('download', 'mau-nhap-cau-hoi.txt')
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

test('Teacher direct editor and active-role switch do not expose import', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto(editUrl)
  await choose(page)
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
  }, quizToken('TEACHER'))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(entry(page)).toHaveCount(0)
  await page.goto(`/console/teacher/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  await expect(entry(page)).toHaveCount(0)
  const status = await page.evaluate(async id => {
    const modulePath = '/src/services/teacherQuizService.ts'
    const service = await import(modulePath)
    try { await service.importTeacherQuizFile(id, new File(['Câu 1. Test'], 'test.txt')); return 200 }
    catch (cause) { return (cause as { status: number }).status }
  }, QUIZ_IDS.quiz)
  expect(status).toBe(403)
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
