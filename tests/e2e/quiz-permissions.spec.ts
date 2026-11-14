import { expect, test, type Page, type Locator } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, quizToken, showEditorStep } from './quiz-permissions-fixture'

const writes = (state: Awaited<ReturnType<typeof installQuizFixture>>) => state.requests.filter(r => r.path.startsWith('/api/v1/teacher/') && r.method !== 'GET')

test('BE response without difficulty supports adding, updating and ordering questions', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByLabel('Tên bài kiểm tra', { exact: true })).toBeVisible()
  const result = await page.evaluate(async quizId => {
    const servicePath = '/src/services/teacherQuizService.ts'
    const service = await import(servicePath)
    const original = await service.getTeacherQuiz(quizId)
    const created = await service.addTeacherQuizQuestions(quizId, [{ questionText: 'Câu vừa thêm', questionType: 'SINGLE_CHOICE',
      options: [{ text: 'A', correct: true }, { text: 'B', correct: false }] }])
    const updated = await service.updateTeacherQuizQuestion(created[0].id, { questionText: 'Câu đã sửa', questionType: 'SINGLE_CHOICE',
      options: [{ text: 'A', correct: true }, { text: 'B', correct: false }] })
    const expectedIds = [updated.id, ...original.questions.map((q: { id: string }) => q.id)]
    const ordered = await service.reorderTeacherQuizQuestions(quizId, expectedIds)
    return { expectedIds, orderedIds: ordered.map((q: { id: string }) => q.id), text: updated.questionText,
      includesDifficulty: [...created, updated, ...ordered].some((q: object) => Object.hasOwn(q, 'difficulty')) }
  }, QUIZ_IDS.quiz)
  expect(result.orderedIds).toEqual(result.expectedIds)
  expect(result.text).toBe('Câu đã sửa')
  expect(result.includesDifficulty).toBe(false)
  expect(state.pageErrors).toEqual([])
})

for (const mode of ['unchanged', 'edited', 'invalid-response'] as const) {
  test(`placement saves BE question DTO without difficulty: ${mode}`, async ({ page }) => {
    const state = await installQuizFixture(page, 'STAFF')
    Object.assign(state.quizzes[0], { type: 'PLACEMENT', courseId: null, chapterId: null, lessonId: null })
    if (mode === 'invalid-response') await page.route(`**/api/v1/teacher/questions/${QUIZ_IDS.question}`, route => {
      const { id, ...invalid } = state.questions[0]
      void id
      return route.fulfill({ json: { success: true, data: invalid } })
    })
    await page.goto(`/console/staff/placements/${QUIZ_IDS.quiz}/edit`)
    await expect(page.getByLabel('Tên bài đánh giá đầu vào', { exact: true })).toBeVisible()
    await showEditorStep(page, 'Các phần và câu hỏi')
    if (mode !== 'unchanged') {
      await page.getByRole('button', { name: 'Sửa', exact: true }).click()
      await page.getByPlaceholder('Nhập nội dung câu hỏi', { exact: true }).fill('Câu hỏi vừa chỉnh sửa')
    }
    await page.getByRole('button', { name: 'Lưu và xuất bản', exact: true }).click()
    if (mode === 'invalid-response') {
      await expect(page.getByText('Máy chủ có thể đã nhận một phần thay đổi câu hỏi', { exact: false })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Lưu và xuất bản', exact: true })).toBeDisabled()
      expect(writes(state).some(r => r.path.endsWith('/publish'))).toBe(false)
    } else {
      await expect(page.getByRole('table').getByText('Đã xuất bản', { exact: true })).toBeVisible()
      expect(writes(state).some(r => r.path.endsWith('/publish'))).toBe(true)
      const questionUpdates = writes(state).filter(r => r.path === `/api/v1/teacher/questions/${QUIZ_IDS.question}`)
      expect(questionUpdates).toHaveLength(mode === 'unchanged' ? 0 : 1)
      if (mode === 'edited') expect(state.questions[0].questionText).toBe('Câu hỏi vừa chỉnh sửa')
    }
    expect(state.pageErrors).toEqual([])
  })
}

for (const [path, id, label] of [
  ['quizzes', QUIZ_IDS.quiz, 'Dạng đáp án'],
  ['mock-exams', QUIZ_IDS.exam, 'Loại câu hỏi'],
  ['placements', QUIZ_IDS.quiz, 'Loại câu hỏi'],
] as const) {
  test(`${path}: editor hides the fixed question type and keeps the answer`, async ({ page }) => {
    const state = await installQuizFixture(page, 'STAFF')
    if (path === 'placements') Object.assign(state.quizzes[0], { type: 'PLACEMENT', courseId: null, chapterId: null, lessonId: null })
    await page.goto(`/console/staff/${path}/${id}/edit`)
    if (path !== 'quizzes') await showEditorStep(page, 'Các phần và câu hỏi')
    if (path !== 'quizzes') await page.getByRole('button', { name: 'Sửa', exact: true }).click()
    await expect(page.getByRole('button', { name: new RegExp(`${label}$`) })).toHaveCount(0)
    await expect(page.getByLabel('Đánh dấu lựa chọn A là đáp án đúng', { exact: true })).toBeChecked()
    expect(state.questions[0].questionType).toBe('SINGLE_CHOICE')
    expect(writes(state)).toEqual([])
  })
}

for (const type of ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER'] as const) {
  test(`${type}: existing non-single questions stay read-only and unchanged on metadata save`, async ({ page }) => {
    test.setTimeout(60_000)
    const state = await installQuizFixture(page, 'STAFF')
    state.questions[0].questionType = type
    if (type === 'SHORT_ANSWER' || type === 'LONG_ANSWER') state.questions[0].options = []
    if (type === 'MULTIPLE_CHOICE') state.questions[0].options.forEach(option => { option.correct = true })
    const original = JSON.stringify(state.questions[0])
    for (const [path, id] of [['quizzes', QUIZ_IDS.quiz], ['mock-exams', QUIZ_IDS.exam]]) {
      await page.goto(`/console/staff/${path}/${id}/edit`)
      if (path === 'mock-exams') await showEditorStep(page, 'Các phần và câu hỏi')
      await expect(page.getByRole('button', { name: /Dạng đáp án$|Loại câu hỏi$/ })).toHaveCount(0)
      if (path === 'quizzes') await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveCount(0)
      else {
        await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveCount(0)
        await expect(page.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0)
      }
      await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
      expect(JSON.stringify(state.questions[0])).toBe(original)
    }
    expect(writes(state).some(request => request.path.includes('/questions'))).toBe(false)
    expect(state.pageErrors).toEqual([])
  })
}
async function select(page: Page, label: string, option: string) {
  await page.locator('main').getByRole('button', { name: new RegExp(`${label}$`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

// Activate the source drag before scrolling to another tall card.
async function dragQuestionCard(page: Page, handle: Locator, target: Locator) {
  await handle.scrollIntoViewIfNeeded()
  await handle.hover()
  const source = await handle.boundingBox()
  if (!source) throw new Error('Question drag handle is not visible')
  const x = source.x + source.width / 2, y = source.y + source.height / 2
  await page.mouse.down()
  await page.mouse.move(x + 15, y, { steps: 10 })
  await target.scrollIntoViewIfNeeded()
  const destination = await target.boundingBox()
  if (!destination) throw new Error('Question drop target is not visible')
  const dropX = destination.x + Math.min(80, destination.width / 2)
  const top = Math.max(120, destination.y), bottom = Math.min(page.viewportSize()!.height - 20, destination.y + destination.height)
  const dropY = (top + bottom) / 2
  await page.mouse.move(dropX, dropY, { steps: 15 })
  await page.mouse.move(dropX + 2, dropY + 2)
  await page.mouse.up()
}

for (const [role, area] of [['STAFF', 'staff'], ['MANAGER', 'manager'], ['ADMINISTRATOR', 'admin']] as const) {
  test(`${role}: legacy quiz URL restores permissions and survives reload`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    await page.goto(`/${area}/quizzes`)
    await expect(page).toHaveURL(new RegExp(`/console/${area}/quizzes$`))
    await expect(page.getByRole('button', { name: 'Tạo bài kiểm tra', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Tạo bài kiểm tra', exact: true })).toBeVisible()
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  test(`${role}: shared quiz editor, publish, duplicate, delete, and attempts`, async ({ page }) => {
    // Combined authoring and attempt-review flow includes several full page navigations.
    test.setTimeout(60_000)
    const state = await installQuizFixture(page, role)
    await page.goto(`/console/${area}/quizzes`)
    const row = page.getByRole('row').filter({ has: page.getByRole('heading', { name: 'Quiz được giao', exact: true }) })
    await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
    await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill(`Quiz ${role}`)
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    const updated = page.getByRole('row').filter({ has: page.getByRole('heading', { name: `Quiz ${role}`, exact: true }) })
    await updated.getByRole('button', { name: 'Xuất bản', exact: true }).click()
    await expect(updated.getByText('Đã xuất bản', { exact: true })).toBeVisible()
    await updated.getByRole('button', { name: `Thao tác khác với Quiz ${role}` }).click()
    await page.getByRole('menuitem', { name: 'Sao chép thành bản nháp' }).click()
    const copy = page.getByRole('row').filter({ has: page.getByRole('heading', { name: `Quiz ${role} bản sao`, exact: true }) })
    await copy.getByRole('button', { name: `Thao tác khác với Quiz ${role} bản sao` }).click()
    await page.getByRole('menuitem', { name: 'Xóa quiz', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Xóa quiz', exact: true }).click()
    await expect(copy).toHaveCount(0)
    state.quizzes[0].attemptCount = 1
    await page.goto(`/console/${area}/attempts`)
    await expect(page.getByText('Student QA', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Xem bài làm', exact: true }).click()
    await expect(page.getByText(/Đúng 1\/1/)).toBeVisible()
    expect(writes(state).some(r => r.method === 'PUT')).toBe(true)
    expect(writes(state).some(r => r.path.endsWith('/publish'))).toBe(true)
    expect(writes(state).some(r => r.path.endsWith('/duplicate'))).toBe(true)
    expect(writes(state).some(r => r.method === 'DELETE')).toBe(true)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  test(`${role}: direct new quiz URL loads authenticated draft courses and lessons`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    await page.goto(`/console/${area}/quizzes/new`)
    await expect(page.getByRole('heading', { name: 'Tạo bài kiểm tra', exact: true })).toBeVisible()
    await select(page, 'Khóa học', 'Khóa được phân công')
    await select(page, 'Chương', 'Chương nháp')
    await select(page, 'Bài học', 'Bài nháp')
    await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill(`Quiz mới ${role}`)
    await page.getByText('Cho phép xem đáp án sau khi nộp', { exact: true }).click()
    await expect(page.getByRole('checkbox', { name: 'Cho phép xem đáp án sau khi nộp' })).toBeChecked()
    await page.locator('textarea').first().fill('Câu mới')
    for (const letter of ['A', 'B', 'C', 'D']) await page.getByLabel(`Nội dung lựa chọn ${letter} cho câu 1`, { exact: true }).fill(`Nội dung ${letter}`)
    await page.getByLabel('Đánh dấu lựa chọn A là đáp án đúng', { exact: true }).check()
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
    await expect(page.getByRole('heading', { name: `Quiz mới ${role}`, exact: true })).toBeVisible()
    expect(writes(state).find(r => r.path === '/api/v1/teacher/quizzes')?.body).toMatchObject({ type: 'QUICK', lessonId: QUIZ_IDS.lesson, showAnswers: true })
    expect(writes(state).some(r => r.path.endsWith('/questions'))).toBe(true)
    expect(state.requests.some(r => r.path === '/api/v1/courses/main')).toBe(false)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  test(`${role}: exam authoring uses shared screens`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    await page.goto(`/console/${area}/mock-exams/new`)
    await expect(page.getByLabel('Tên đề thi thử', { exact: true })).toBeVisible()
    await select(page, 'Khóa học chính', 'Khóa được phân công')
    expect(state.requests.find(r => r.path === '/api/v1/admin/courses')?.query).toContain('type=MAIN')
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  for (const [type, label] of [['LESSON', 'Kiểm tra cuối bài'], ['CHAPTER', 'Kiểm tra cuối chương']] as const) {
    test(`${role}: create and edit ${type} with immutable type and target`, async ({ page }) => {
      test.setTimeout(60_000)
      const state = await installQuizFixture(page, role)
      await page.goto(`/console/${area}/quizzes/new`)
      await select(page, 'Loại bài kiểm tra', label)
      await select(page, 'Khóa học', 'Khóa được phân công')
      await select(page, 'Chương', type === 'CHAPTER' ? 'Chương chưa có bài' : 'Chương nháp')
      if (type === 'LESSON') await select(page, 'Bài học', 'Bài nháp')
      else await expect(page.getByRole('button', { name: /Bài học$/ })).toHaveCount(0)
      await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill(`${label} QA`)
      await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
      const row = page.getByRole('row').filter({ has: page.getByRole('heading', { name: `${label} QA`, exact: true }) })
      await expect(row.getByText(label, { exact: true })).toBeVisible()
      const payload = writes(state).find(r => r.method === 'POST' && r.path === '/api/v1/teacher/quizzes')!.body
      expect(payload).toMatchObject(type === 'LESSON' ? { type, lessonId: QUIZ_IDS.lesson } : { type, chapterId: QUIZ_IDS.otherChapter })
      expect(payload).not.toHaveProperty('courseId')
      expect(payload).not.toHaveProperty(type === 'LESSON' ? 'chapterId' : 'lessonId')
      if (type === 'CHAPTER') expect(state.requests.some(r => r.path.endsWith('/lessons'))).toBe(false)
      await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
      await expect(page.locator('main').getByRole('button', { name: /Loại bài kiểm tra$|Chương$|Bài học$|Khóa học$/ })).toHaveCount(0)
      await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill(`${label} đã sửa`)
      await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
      await expect(page.getByRole('heading', { name: `${label} đã sửa`, exact: true })).toBeVisible()
      const update = writes(state).find(r => r.method === 'PUT')!.body
      for (const key of ['type', 'courseId', 'chapterId', 'lessonId']) expect(update).not.toHaveProperty(key)
      expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
    })
  }
}

for (const [screen, type] of [['quizzes', 'QUICK'], ['mock-exams', 'EXAM']] as const) {
  test(`Staff can configure answer review for a published ${type} with attempts`, async ({ page }) => {
    const state = await installQuizFixture(page, 'STAFF')
    const quiz = state.quizzes.find(item => item.type === type)!
    quiz.status = 'PUBLISHED'
    quiz.attemptCount = 1
    await page.goto(`/console/staff/${screen}`)
    await page.getByRole('button', { name: `Thao tác khác với ${quiz.title}` }).click()
    await page.getByRole('menuitem', { name: 'Cấu hình xem đáp án' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Bật xem đáp án' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes(state)).toMatchObject([{ method: 'PUT', path: `/api/v1/teacher/quizzes/${quiz.id}`, body: { showAnswers: true } }])
    expect(Object.keys(writes(state)[0].body)).toEqual(['showAnswers'])
    expect(quiz.status).toBe('PUBLISHED')
  })
}

test('Quiz type and hierarchy changes preserve content and clear invalid child targets', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/quizzes/new')
  await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill('Nội dung giữ lại')
  await page.locator('textarea').first().fill('Câu hỏi giữ lại')
  await select(page, 'Khóa học', 'Khóa được phân công')
  await select(page, 'Chương', 'Chương nháp')
  await select(page, 'Bài học', 'Bài nháp')
  await select(page, 'Loại bài kiểm tra', 'Kiểm tra cuối bài')
  await expect(page.getByRole('button', { name: /Bài học$/ })).toContainText('Bài nháp')
  await select(page, 'Loại bài kiểm tra', 'Kiểm tra cuối chương')
  await expect(page.getByRole('button', { name: /Bài học$/ })).toHaveCount(0)
  await select(page, 'Loại bài kiểm tra', 'Quiz nhanh')
  await expect(page.getByRole('button', { name: /Bài học$/ })).toContainText('Chọn bài học')
  await select(page, 'Bài học', 'Bài nháp')
  await select(page, 'Chương', 'Chương chưa có bài')
  await expect(page.getByRole('button', { name: /Bài học$/ })).toContainText('Chọn bài học')
  await select(page, 'Khóa học', 'Khóa nháp ngoài phân công')
  await expect(page.getByRole('button', { name: /Chương$/ })).toContainText('Chọn chương')
  await expect(page.getByRole('button', { name: /Bài học$/ })).toBeDisabled()
  await expect(page.getByLabel('Tên bài kiểm tra', { exact: true })).toHaveValue('Nội dung giữ lại')
  await expect(page.locator('textarea').first()).toHaveValue('Câu hỏi giữ lại')
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('Teacher can combine quiz type, status and search filters without write controls', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  state.quizzes.push({ ...state.quizzes[0], id: 'lesson-fixture', type: 'LESSON', title: 'Cuối bài QA', status: 'PUBLISHED' })
  state.quizzes.push({ ...state.quizzes[0], id: 'chapter-fixture', type: 'CHAPTER', title: 'Cuối chương QA', lessonId: null, lessonTitle: null })
  await page.goto('/console/teacher/quizzes')
  await select(page, 'Lọc loại bài kiểm tra', 'Kiểm tra cuối bài')
  await expect(page.getByRole('heading', { name: 'Cuối bài QA', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toHaveCount(0)
  await select(page, 'Lọc trạng thái', 'Bản nháp')
  await expect(page.getByRole('heading', { name: 'Cuối bài QA', exact: true })).toHaveCount(0)
  await select(page, 'Lọc trạng thái', 'Đã xuất bản')
  await page.getByRole('searchbox').fill('không có')
  await expect(page.getByRole('heading', { name: 'Cuối bài QA', exact: true })).toHaveCount(0)
  await page.getByRole('searchbox').fill('Chương nháp')
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()
  await expect(page.getByText('Kiểm tra cuối bài', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Chỉnh sửa|Xuất bản|Tạo bài kiểm tra/ })).toHaveCount(0)
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

for (const [type, reason, message] of [
  ['LESSON', 'LESSON_NOT_COMPLETED', 'Bạn cần hoàn thành bài học trước khi làm bài kiểm tra này.'],
  ['CHAPTER', 'CHAPTER_NOT_COMPLETED', 'Bạn cần hoàn thành tất cả bài học đã xuất bản trong chương trước khi làm bài kiểm tra này.'],
  ['QUICK', 'NOT_OPEN_YET', 'Bài kiểm tra chưa đến thời gian mở.'],
  ['QUICK', 'CLOSED', 'Bài kiểm tra đã hết thời gian mở.'],
  ['QUICK', 'NO_ATTEMPTS_LEFT', 'Bạn đã hết lượt làm bài kiểm tra này.'],
] as const) {
  test(`Student displays BE lock ${reason} and does not start an attempt`, async ({ page }) => {
    const state = await installQuizFixture(page, 'STUDENT')
    state.quizzes[0].type = type; state.studentLockReason = reason
    await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
    await expect(page.getByText(message, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toHaveCount(0)
    expect(state.requests.some(r => r.method === 'POST')).toBe(false)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })
}

test('Teacher reads quiz/exam/questions/attempts with no write controls or write requests', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'TEACHER')
  state.quizzes[0].attemptCount = 1
  await page.goto('/console/teacher/quizzes')
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
  await expect(page.getByText('Quiz ngoài phân công', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Tạo bài kiểm tra|Chỉnh sửa|Xuất bản|Thao tác khác/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()
  await expect(page.getByText('Giải thích được phép đọc', { exact: true })).toBeVisible()
  await expect(page.locator('main input,main textarea')).toHaveCount(0)
  await page.goto('/console/teacher/mock-exams')
  await expect(page.getByRole('heading', { name: 'Đề thi được giao', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Tạo đề|Chỉnh sửa|Xuất bản|Thao tác khác/ })).toHaveCount(0)
  await page.goto('/console/teacher/attempts')
  // the attempts screen loads its rows after the console chunk, which is slow when the whole suite runs
  await expect(page.getByText('Student QA', { exact: true })).toBeVisible({ timeout: 20_000 })
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('Teacher course list uses BE assignment scope and the course quiz shortcut stays read-only', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto('/console/teacher/courses')
  await page.getByRole('button', { name: /Khóa được phân công/ }).click()
  await page.locator('main').getByRole('button', { name: 'Bài kiểm tra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
  expect(state.requests.some(r => r.path === '/api/v1/admin/courses')).toBe(true)
  expect(state.requests.some(r => r.path === '/api/v1/courses/main')).toBe(false)
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('Teacher direct editor URLs, including the legacy URL, fail before mounting editors', async ({ page }) => {
  // five full page loads, each fetching every dev module through the fixture's route
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'TEACHER')
  for (const url of ['/console/teacher/quizzes/new', `/console/teacher/quizzes/${QUIZ_IDS.quiz}/edit`,
    '/console/teacher/mock-exams/new', `/console/teacher/mock-exams/${QUIZ_IDS.exam}/edit`,
    `/console/teacher/my-courses/${QUIZ_IDS.course}/quiz/new`]) {
    await page.goto(url)
    await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  }
  expect(state.requests.filter(r => r.path.startsWith('/api/v1/teacher/'))).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('Teacher read URL honors BE 403 and does not retain foreign quiz content', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto(`/console/teacher/quizzes/${QUIZ_IDS.otherQuiz}`)
  await expect(page.getByText('Tài khoản chưa được cấp quyền xem dữ liệu này.')).toBeVisible()
  await expect(page.getByText('Câu hỏi được phân công', { exact: true })).toHaveCount(0)
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('BE write 403 is displayed; the client does not retry it or report success', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill('Bị từ chối')
  state.denyNextWrite = true
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByText('Không có quyền ghi quiz.', { exact: true })).toBeVisible()
  expect(writes(state)).toHaveLength(1)
  expect(state.quizzes[0].title).toBe('Quiz được giao')
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('switch active role through the menu: old editor cannot be reopened as Teacher', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByLabel('Tên bài kiểm tra', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Quiz QA.*Đang dùng:/ }).click()
  await page.getByRole('menuitem', { name: 'Giáo viên', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Chuyển vai trò', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/teacher\/dashboard$/)
  await page.goto(`/console/teacher/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('late save after role switch is discarded and sends no follow-up question writes', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await page.getByLabel('Tên bài kiểm tra', { exact: true }).fill('Đang lưu')
  let release!: () => void
  state.writeGate = new Promise<void>(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect.poll(() => writes(state).length).toBe(1)
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
  }, quizToken('TEACHER'))
  // Profile invalidation now lets the outer management guard block the old role's URL.
  await expect(page.getByRole('heading', { name: 'Chuyển vai trò để tiếp tục', exact: true })).toBeVisible()
  await expect(page.getByLabel('Tên bài kiểm tra', { exact: true })).toHaveCount(0)
  const lateResponse = page.waitForResponse(response => response.request().method() === 'PUT'
    && new URL(response.url()).pathname === `/api/v1/teacher/quizzes/${QUIZ_IDS.quiz}`)
  release()
  await (await lateResponse).finished()
  await page.goto('/console/teacher/quizzes')
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
  expect(writes(state)).toHaveLength(1)
  expect(state.pageErrors).toEqual([])
})

test('Mentor cannot open quiz screens even with direct console URLs', async ({ page }) => {
  const state = await installQuizFixture(page, 'MENTOR')
  await page.goto('/console/mentor/quizzes')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  expect(state.requests.filter(r => r.path.startsWith('/api/v1/teacher/'))).toEqual([])
})

test('Student quiz detail fills the available width as the sidebar and viewport change', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  state.studentStatus = 'GRADED'
  await page.setViewportSize({ width: 1600, height: 950 })
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)

  const main = page.getByRole('main')
  const details = main.locator('section').filter({ has: page.getByRole('heading', { name: 'Quiz Student' }) }).last()
  const history = main.locator('section').filter({ has: page.getByRole('heading', { name: 'Lịch sử làm bài' }) }).last()
  const facts = details.getByRole('listitem')
  await expect(history).toBeVisible()

  const contentWidth = () => main.evaluate(element => {
    const { paddingLeft, paddingRight } = getComputedStyle(element)
    return element.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
  })
  const panelWidth = (panel: Locator) => panel.evaluate(element => element.getBoundingClientRect().width)
  const expandedWidth = await contentWidth()
  expect(await panelWidth(details)).toBe(expandedWidth)
  expect(await panelWidth(history)).toBe(expandedWidth)
  expect((await facts.first().boundingBox())?.y).toBe((await facts.last().boundingBox())?.y)

  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click()
  await expect.poll(() => panelWidth(details)).toBe(expandedWidth + 168)
  expect(await panelWidth(history)).toBe(await contentWidth())

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await panelWidth(details)).toBe(await contentWidth())
  expect((await facts.last().boundingBox())?.y).toBeGreaterThan((await facts.first().boundingBox())?.y ?? 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await expect(details.getByRole('button', { name: 'Bắt đầu làm bài' })).toBeVisible()
})

test('Student returns to the course exam tab after submitting and reloading the result', async ({ page }) => {
  test.setTimeout(60_000)
  await installQuizFixture(page, 'STUDENT')
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study`
  await page.goto(studyPath)
  await page.getByRole('tab', { name: 'Bài thi', exact: true }).click()
  await page.getByRole('button', { name: 'Xem bài thi Đề thi được giao' }).click()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(/\/review$/)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Quay lại bài kiểm tra', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/quizzes/${QUIZ_IDS.exam}`)
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(`${studyPath}?tab=exams`)
  await expect(page.getByRole('tab', { name: 'Bài thi', selected: true })).toBeVisible()
})

test('Student exits a quiz to its course content or lesson and can return from a direct quiz URL', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STUDENT')
  state.quizzes[0].courseId = QUIZ_IDS.otherCourse
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study`
  const lessonPath = `/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`
  const quizPath = `/student/assessments/quizzes/${QUIZ_IDS.quiz}`
  await page.goto(studyPath)
  await page.getByRole('button', { name: /Quiz được giao/ }).click()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('button', { name: 'Thoát bài kiểm tra', exact: true }).click()
  await expect(page).toHaveURL(quizPath)
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(studyPath)
  await expect(page.getByRole('tab', { name: 'Nội dung học', selected: true })).toBeVisible()

  await page.getByRole('button', { name: 'Tiếp tục học', exact: true }).click()
  await expect(page).toHaveURL(lessonPath)
  await page.getByRole('button', { name: /Quiz được giao/ }).click()
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(lessonPath)
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL(studyPath)

  await page.goto(quizPath)
  await expect(page.getByRole('heading', { name: 'Quiz Student' })).toBeVisible()
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(lessonPath)
})

test('Student resumes lessons, unlocks the lesson and chapter quizzes, and sees the daily star', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STUDENT', { trackLessonProgress: true })
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study`
  const lessonPath = `/student/courses/${QUIZ_IDS.otherCourse}/study/lessons`
  const resume = page.getByRole('button', { name: 'Tiếp tục học', exact: true })
  const lessonQuiz = page.getByRole('button', { name: /Quiz được giao/ })
  const chapterQuiz = page.getByRole('button', { name: /Quiz cuối chương/ })
  const complete = page.getByRole('button', { name: 'Đánh dấu hoàn thành' })

  await page.goto(studyPath)
  await expect(page.getByText('Quiz cuối chương', { exact: true })).toBeVisible()
  await expect(chapterQuiz).toHaveCount(0)
  await resume.click()
  await expect(page).toHaveURL(`${lessonPath}/${QUIZ_IDS.lesson}`)
  await expect(page.getByText('Quiz được giao', { exact: true })).toBeVisible()
  await expect(lessonQuiz).toHaveCount(0)
  await expect(page.getByRole('button', { name: '0 Sao', exact: true })).toBeVisible()

  await complete.click()
  await expect(page.getByText('Tiến độ bài học: 100%')).toBeVisible()
  await expect(lessonQuiz).toBeVisible()
  await expect(page.getByRole('button', { name: '1 Sao', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chuỗi 1 ngày', exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Tiến độ bài học: 100%')).toBeVisible()
  await expect(lessonQuiz).toBeVisible()

  const backToCourse = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Khóa học', exact: true })
  await backToCourse.click()
  await expect(page).toHaveURL(studyPath)
  await expect(page.getByText('1/2 bài học', { exact: true }).first()).toBeVisible()
  await expect(chapterQuiz).toHaveCount(0)
  await resume.click()
  await expect(page).toHaveURL(`${lessonPath}/${QUIZ_IDS.nextLesson}`)
  await complete.click()
  await expect(page.getByText('Chương đã hoàn thành')).toBeVisible()
  await backToCourse.click()
  await expect(chapterQuiz).toBeVisible()
  await page.getByRole('button', { name: '1 Sao', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ví Sao', exact: true })).toBeVisible()
  await expect(page.getByText('Học trong ngày', { exact: true })).toHaveCount(1)
  expect(state.completedLessons.size).toBe(2)
})

test('Student quiz start, answer, submit and review still use the assessment API', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
  await expect(page.getByRole('button', { name: '0 Sao', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(/\/review$/)
  await expect(page.getByText('Giải thích đáp án Student', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '1 Sao', exact: true })).toBeVisible()
  expect(state.requests.some(r => r.path.endsWith('/answers'))).toBe(true)
  expect(state.requests.some(r => r.path.endsWith('/submit'))).toBe(true)
  expect(state.requests.some(r => r.path.startsWith('/api/v1/teacher/'))).toBe(false)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('Student can retry a failed answer and reopen the score when the answer key is hidden', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STUDENT')
  state.studentShowAnswers = false
  state.studentAnswerFailures = 1
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  const retryAnswer = page.getByRole('button', { name: 'Lưu lại đáp án' })
  await expect(retryAnswer).toBeVisible()

  const confirmSubmit = async () => {
    await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  }
  await confirmSubmit()
  await expect(retryAnswer).toBeEnabled()
  expect(state.requests.filter(r => r.path.endsWith('/submit'))).toHaveLength(0)

  await retryAnswer.click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await confirmSubmit()
  await expect(page).toHaveURL(/\/review$/)
  await expect(page.getByText('Điểm: 1/1')).toBeVisible()
  await expect(page.getByText('Bài kiểm tra này không hiển thị đáp án sau khi nộp.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chi tiết bài làm' })).toHaveCount(0)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Điểm: 1/1')).toBeVisible()
  await page.getByRole('button', { name: 'Quay lại bài kiểm tra' }).click()
  await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click()
  await expect(page.getByText('Điểm: 1/1')).toBeVisible()
  expect(state.requests.filter(r => r.path.endsWith('/submit'))).toHaveLength(1)
  expect(state.requests.filter(r => r.path.endsWith('/review'))).toHaveLength(0)
  expect(state.pageErrors).toEqual([])
})

test('Student auto-submits at the deadline when an answer could not be saved', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STUDENT')
  state.studentShowAnswers = false
  state.studentAnswerFailures = 1
  const now = new Date('2026-11-10T08:00:00Z')
  state.studentDeadline = new Date(now.getTime() + 60_000).toISOString()
  await page.clock.install({ time: now })
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await expect(page.getByRole('button', { name: 'Lưu lại đáp án' })).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(page).toHaveURL(/\/review$/)
  await expect(page.getByText('Điểm: 0/1')).toBeVisible({ timeout: 15_000 })
  expect(state.requests.filter(r => r.path.endsWith('/submit'))).toHaveLength(1)
  expect(state.requests.filter(r => r.path.endsWith('/review'))).toHaveLength(0)
  expect(state.pageErrors).toEqual([])
})

test('Teacher write service backstop rejects every mutation before any HTTP request', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.goto('/console/teacher/quizzes')
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
  const statuses = await page.evaluate(async ids => {
    const modulePath = '/src/services/teacherQuizService.ts'
    const service = await import(modulePath)
    const operations = [
      () => service.createTeacherQuiz({ type: 'EXAM', title: 'Không được ghi', courseId: ids.course }),
      () => service.updateTeacherQuiz(ids.quiz, { title: 'Không được ghi' }),
      () => service.deleteTeacherQuiz(ids.quiz),
      () => service.publishTeacherQuiz(ids.quiz),
      () => service.unpublishTeacherQuiz(ids.quiz),
      () => service.duplicateTeacherQuiz(ids.quiz),
      () => service.addTeacherQuizQuestions(ids.quiz, [{ questionText: 'Không được ghi' }]),
      () => service.updateTeacherQuizQuestion(ids.question, { questionText: 'Không được ghi' }),
      () => service.deleteTeacherQuizQuestion(ids.question),
      () => service.reorderTeacherQuizQuestions(ids.quiz, [ids.question]),
      () => service.setTeacherQuizLayout(ids.quiz, []),
      () => service.markTeacherQuestionsReviewed(ids.quiz, [ids.question]),
    ]
    const results = []
    for (const operation of operations) {
      try { await operation(); results.push(200) } catch (error) { results.push((error as { status: number }).status) }
    }
    return results
  }, QUIZ_IDS)
  expect(statuses).toEqual(Array(12).fill(403))
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('Student cannot enter a console quiz editor through a direct URL', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập', exact: true })).toBeVisible()
  expect(state.requests.filter(r => r.path.startsWith('/api/v1/teacher/'))).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

for (const role of ['STAFF', 'TEACHER'] as const) {
  for (const width of [1440, 390]) {
    test(`${role}: quiz UI fits ${width}px and uses the shared list and detail components`, async ({ page }, testInfo) => {
      // This visual pass visits up to four pages and captures each one; keep its
      // budget separate from the single-flow tests, without automatic retries.
      test.setTimeout(60_000)
      const state = await installQuizFixture(page, role)
      const area = role.toLowerCase()
      await page.setViewportSize({ width, height: 950 })
      for (const screen of ['quizzes', 'mock-exams']) {
        await page.goto(`/console/${area}/${screen}`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: screen === 'quizzes' ? 'Quiz được giao' : 'Đề thi được giao', exact: true })).toBeVisible()
        await expect(page.getByRole('table')).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        if (role === 'TEACHER') await expect(page.getByText('Chế độ xem', { exact: true })).toBeVisible()
        await page.screenshot({ path: testInfo.outputPath(`${screen}-${width}.png`), fullPage: true })
      }
      await page.goto(`/console/${area}/quizzes/${QUIZ_IDS.quiz}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Giải thích được phép đọc', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`detail-${width}.png`), fullPage: true })
      if (role === 'STAFF') {
        await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`, { waitUntil: 'domcontentloaded' })
        await expect(page.getByLabel('Tên bài kiểm tra', { exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true })
      }
      expect(writes(state)).toEqual([])
      expect(state.pageErrors).toEqual([])
    })
  }
}

test('quiz list search, status filter and empty state keep their controls available', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/quizzes')
  const search = page.getByRole('searchbox')
  await search.fill('Không tồn tại')
  await expect(page.getByText('Không có kết quả phù hợp. Thử từ khóa hoặc bộ lọc khác.')).toBeVisible()
  await search.fill('Quiz được giao')
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Lọc trạng thái/ }).click()
  await page.getByRole('option', { name: 'Đã xuất bản', exact: true }).click()
  await expect(page.getByText('Không có kết quả phù hợp. Thử từ khóa hoặc bộ lọc khác.')).toBeVisible()
  expect(writes(state)).toEqual([])
})

test('quiz bottom add focuses the new question; drag reorders mixed saved/new cards and persists IDs', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`, { waitUntil: 'domcontentloaded' })
  const add = page.getByRole('button', { name: 'Thêm câu hỏi', exact: true })
  await expect(add).toHaveCount(2)
  await add.last().click()
  const texts = page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })
  await expect(texts.nth(1)).toBeFocused()
  await texts.nth(1).fill('Câu mới kéo lên đầu')
  for (const letter of ['A', 'B', 'C', 'D']) await page.getByLabel(`Nội dung lựa chọn ${letter} cho câu 2`, { exact: true }).fill(`Đáp án ${letter}`)
  await page.getByLabel('Đánh dấu lựa chọn A là đáp án đúng', { exact: true }).last().check()
  const cards = page.getByRole('article')
  await dragQuestionCard(page, page.getByRole('button', { name: 'Sắp xếp câu 2: kéo thả, hoặc dùng phím mũi tên lên xuống', exact: true }), cards.first())
  await expect(texts.first()).toHaveValue('Câu mới kéo lên đầu')
  await expect(texts.last()).toHaveValue('Câu hỏi được phân công')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
  const order = writes(state).find(request => request.path.endsWith('/questions/order'))
  expect(order?.body.questionIds).toEqual([state.questions[0].id, QUIZ_IDS.question])
  expect(state.questions[0].questionText).toBe('Câu mới kéo lên đầu')
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true }).first()).toHaveValue('Câu mới kéo lên đầu')
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('quiz keyboard reorder preserves content, omits empty new cards and handles reorder 403', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  state.questions.push({ ...state.questions[0], id: '60000000-0000-0000-0000-000000000009', sequence: 2, questionText: 'Câu thứ hai' })
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await page.getByRole('button', { name: /Sắp xếp câu 2:/ }).press('ArrowUp')
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true }).first()).toHaveValue('Câu thứ hai')
  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).last().click()
  state.denyNextOrder = true
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByText('Không có quyền sắp xếp câu hỏi.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true }).first()).toHaveValue('Câu thứ hai')
  expect(writes(state).filter(request => request.path.endsWith('/questions/order'))).toHaveLength(1)
  expect(state.questions[0].id).toBe(QUIZ_IDS.question)
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
  expect(state.questions.map(question => question.questionText)).toEqual(['Câu thứ hai', 'Câu hỏi được phân công'])
  expect(state.questions).toHaveLength(2)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('quiz with attempts disables bottom add and removes reorder controls', async ({ page }) => {
  const state = await installQuizFixture(page, 'STAFF')
  state.quizzes[0].attemptCount = 1
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`)
  await expect(page.getByRole('button', { name: 'Thêm câu hỏi', exact: true })).toHaveCount(2)
  for (const button of await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).all()) await expect(button).toBeDisabled()
  await expect(page.getByRole('button', { name: /Sắp xếp câu|Đưa câu hỏi/ })).toHaveCount(0)
  expect(writes(state)).toEqual([])
})

test('exam workspace moves a question up inside its section and persists the order on save', async ({ page }) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  state.questions.push({ ...state.questions[0], id: '60000000-0000-0000-0000-000000000009', sequence: 2, questionText: 'Câu thi thứ hai' })
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(`/console/staff/mock-exams/${QUIZ_IDS.exam}/edit`, { waitUntil: 'domcontentloaded' })
  await showEditorStep(page, 'Các phần và câu hỏi')
  await page.getByRole('navigation').getByRole('button', { name: /^Câu 2(,|$)/ }).click()
  await page.getByRole('button', { name: 'Sửa', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveValue('Câu thi thứ hai')
  await page.getByRole('button', { name: 'Đưa câu hỏi lên', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Câu 1' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })).toHaveValue('Câu thi thứ hai')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra', exact: true })).toBeVisible()
  expect(writes(state).find(request => request.path.endsWith('/questions/order'))?.body.questionIds).toEqual(['60000000-0000-0000-0000-000000000009', QUIZ_IDS.question])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('mobile question controls add at the bottom and move cards without overflow', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto(`/console/staff/quizzes/${QUIZ_IDS.quiz}/edit`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).last().click()
  const questions = page.getByRole('textbox', { name: 'Nội dung câu hỏi', exact: true })
  await expect(questions.last()).toBeFocused()
  await questions.last().fill('Câu thêm từ nút cuối danh sách')
  await page.getByRole('button', { name: 'Đưa câu hỏi 2 lên', exact: true }).click()
  await expect(questions.first()).toHaveValue('Câu thêm từ nút cuối danh sách')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('question-controls-mobile.png'), fullPage: true })
  expect(writes(state)).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('mobile quiz type form and combined filters fit the current console layout', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const state = await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto('/console/staff/quizzes/new')
  await select(page, 'Loại bài kiểm tra', 'Kiểm tra cuối bài')
  await select(page, 'Khóa học', 'Khóa được phân công')
  await select(page, 'Chương', 'Chương nháp')
  await select(page, 'Bài học', 'Bài nháp')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('quiz-type-form-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Quay lại danh sách quiz', exact: true }).click()
  await select(page, 'Lọc loại bài kiểm tra', 'Quiz nhanh')
  await select(page, 'Lọc trạng thái', 'Bản nháp')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('quiz-type-filters-mobile.png'), fullPage: true })
  expect(writes(state)).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('a teacher reads an assigned course\'s content without skill suggestions, which are never fetched', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  const suggestionRequests: string[] = []
  // Even a teacher who could label the subject: suggestions are authoring work, not teaching.
  await page.route('**/api/v1/question-bank/me/scopes', route =>
    route.fulfill({ json: { success: true, data: { administrator: true, authorSubjectIds: [], reviewerSubjectIds: [] } } }))
  await page.route('**/api/v1/authoring/**', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('skill-suggestions')) return route.fallback()
    suggestionRequests.push(`${route.request().method()} ${url.pathname}`)
    return route.fulfill({ json: { success: true, data: { courseId: QUIZ_IDS.course, run: null, suggestions: [] } } })
  })
  await page.goto('/console/teacher/courses')
  await page.getByRole('button', { name: /Khóa được phân công/ }).click()
  await expect(page.getByText('Chương nháp', { exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'Gợi ý kỹ năng' })).toHaveCount(0)
  expect(suggestionRequests).toEqual([])
  expect(state.requests.filter(r => r.path.includes('skill-suggestions'))).toEqual([])
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
