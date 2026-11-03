import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { installQuizFixture, QUIZ_IDS, quizToken, showEditorStep } from './quiz-permissions-fixture'

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
    if (path !== 'quizzes') await showEditorStep(page, 'Các phần và câu hỏi')
    await choose(page, extension)
    await page.getByRole('button', { name: 'Nhập vào bản nháp', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Đã nhập câu hỏi vào bản nháp. Bài chưa được tự động xuất bản.')).toBeVisible()
    await expect(dialog.getByText('Câu cần rà soát')).toBeVisible()
    await expect(dialog.getByText('Câu thiếu đáp án')).toBeVisible()
    await expect(dialog.getByText('Kiểm tra đáp án câu mới.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Tải lại bài để kiểm tra' }).click()
    if (path === 'quizzes') await expect(page.locator('textarea').filter({ hasText: 'Câu hỏi vừa nhập' })).toBeVisible()
    else {
      // The exam workspace shows one question at a time: the imported one is the second cell of the list.
      await page.getByRole('navigation', { name: 'Danh sách câu hỏi' }).getByRole('button', { name: /^Câu 2(,|$)/ }).click()
      await expect(page.getByText('Câu hỏi vừa nhập', { exact: true })).toBeVisible()
    }
    expect(uploads).toBe(1)
    expect(state.requests.filter(r => r.path.endsWith('/publish'))).toEqual([])
    expect(state.unmatched).toEqual([])
    expect(state.pageErrors).toEqual([])
  })
}

test('unsaved changes block append', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto(editUrl)
  await expect(entry(page)).toBeEnabled()
  const title = page.getByLabel('Tên bài kiểm tra', { exact: true })
  await title.fill('Chưa lưu')
  await expect(entry(page)).toBeDisabled()
  await title.fill('Quiz được giao')
  await page.locator('textarea').first().fill('Câu hỏi chưa lưu')
  await expect(entry(page)).toBeDisabled()
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
    else expect(bytes.toString('utf8').replace(/\r\n/g, '\n')).toBe(expected.replace(/\r\n/g, '\n'))
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
    const servicePath = '/src/services/teacherQuizService.ts'
    const service = await import(servicePath)
    const file = new File(['Câu 1. Test'], 'test.txt')
    try { await service.importTeacherQuizFile(id, file); return [200] } catch (cause) { return [(cause as { status: number }).status] }
  }, QUIZ_IDS.quiz)
  expect(statuses).toEqual([403])
})

test('Teacher direct editor URL denies access before exposing import', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto(`/console/teacher/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  await expect(entry(page)).toHaveCount(0)
  expect(state.requests.filter(r => r.path.startsWith('/api/v1/teacher/quizzes/'))).toEqual([])
})

test('imported grouped content is read-only after reload and is not flattened', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  let imported = false
  await page.route(`**/api/v1/teacher/quizzes/${QUIZ_IDS.quiz}`, route => {
    if (!imported || route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ json: { success: true, data: { quiz: state.quizzes[0], sections: [],
      groups: [{ id: 'group-1', questionIds: [QUIZ_IDS.question] }], questions: state.questions, pages: [] } } })
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
