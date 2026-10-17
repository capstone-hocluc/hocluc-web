import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, quizToken } from './quiz-permissions-fixture'

const writes = (state: Awaited<ReturnType<typeof installQuizFixture>>) => state.requests.filter(r => r.path.startsWith('/api/v1/teacher/') && r.method !== 'GET')
async function select(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: new RegExp(`${label}$`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

for (const [role, area] of [['STAFF', 'staff'], ['MANAGER', 'manager'], ['ADMINISTRATOR', 'admin']] as const) {
  test(`${role}: legacy quiz URL restores permissions and survives reload`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    await page.goto(`/${area}/quizzes`)
    await expect(page).toHaveURL(new RegExp(`/console/${area}/quizzes$`))
    await expect(page.getByRole('button', { name: 'Tạo quiz', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Tạo quiz', exact: true })).toBeVisible()
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  test(`${role}: shared quiz editor, publish, duplicate, delete, and attempts`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    await page.goto(`/console/${area}/quizzes`)
    const row = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Quiz được giao', exact: true }) })
    await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
    await page.getByLabel('Tên quiz', { exact: true }).fill(`Quiz ${role}`)
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    const updated = page.getByRole('article').filter({ has: page.getByRole('heading', { name: `Quiz ${role}`, exact: true }) })
    await updated.getByRole('button', { name: 'Xuất bản', exact: true }).click()
    await expect(updated.getByText('Đã xuất bản', { exact: true })).toBeVisible()
    await updated.getByRole('button', { name: `Thao tác khác với Quiz ${role}` }).click()
    await page.getByRole('menuitem', { name: 'Sao chép thành bản nháp' }).click()
    const copy = page.getByRole('article').filter({ has: page.getByRole('heading', { name: `Quiz ${role} bản sao`, exact: true }) })
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
    await expect(page.getByRole('heading', { name: 'Tạo quiz nhanh', exact: true })).toBeVisible()
    await select(page, 'Khóa học chính', 'Khóa được phân công')
    await select(page, 'Bài học', 'Chương nháp · Bài nháp')
    await page.getByLabel('Tên quiz', { exact: true }).fill(`Quiz mới ${role}`)
    await page.locator('textarea').first().fill('Câu mới')
    for (const letter of ['A', 'B', 'C', 'D']) await page.getByLabel(`Nội dung lựa chọn ${letter} cho câu 1`, { exact: true }).fill(`Nội dung ${letter}`)
    await page.getByLabel('Đánh dấu lựa chọn A là đáp án đúng', { exact: true }).check()
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
    await expect(page.getByRole('heading', { name: `Quiz mới ${role}`, exact: true })).toBeVisible()
    expect(writes(state).find(r => r.path === '/api/v1/teacher/quizzes')?.body).toMatchObject({ type: 'QUICK', lessonId: QUIZ_IDS.lesson })
    expect(writes(state).some(r => r.path.endsWith('/questions'))).toBe(true)
    expect(state.requests.some(r => r.path === '/api/v1/courses/main')).toBe(false)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })

  test(`${role}: exam authoring and review use shared screens`, async ({ page }) => {
    const state = await installQuizFixture(page, role)
    state.questions[0].needsReview = true; state.quizzes[0].needsReviewCount = 1
    await page.goto(`/console/${area}/mock-exams/new`)
    await expect(page.getByLabel('Tên đề thi thử', { exact: true })).toBeVisible()
    await select(page, 'Khóa học chính', 'Khóa được phân công')
    expect(state.requests.find(r => r.path === '/api/v1/admin/courses')?.query).toContain('type=MAIN')
    await page.goto(`/console/${area}/question-review`)
    await page.getByRole('button', { name: 'Thao tác duyệt câu hỏi' }).first().click()
    await page.getByRole('menuitem', { name: 'Đánh dấu đã duyệt' }).click()
    await expect(page.getByText('Không có câu hỏi nào chờ duyệt.')).toBeVisible()
    expect(writes(state).some(r => r.path.endsWith('/questions/reviewed'))).toBe(true)
    expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
  })
}

test('Teacher reads quiz/exam/questions/attempts with no write controls or write requests', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  state.quizzes[0].attemptCount = 1; state.quizzes[0].needsReviewCount = 1; state.questions[0].needsReview = true
  await page.goto('/console/teacher/quizzes')
  await expect(page.getByRole('heading', { name: 'Quiz được giao', exact: true })).toBeVisible()
  await expect(page.getByText('Quiz ngoài phân công', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Tạo quiz|Chỉnh sửa|Xuất bản|Thao tác khác/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()
  await expect(page.getByText('Giải thích được phép đọc', { exact: true })).toBeVisible()
  await expect(page.locator('main input,main textarea')).toHaveCount(0)
  await page.goto('/console/teacher/mock-exams')
  await expect(page.getByRole('heading', { name: 'Đề thi được giao', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Tạo đề|Chỉnh sửa|Xuất bản|Thao tác khác/ })).toHaveCount(0)
  await page.goto('/console/teacher/question-review')
  await expect(page.getByText('Câu hỏi được phân công', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thao tác duyệt câu hỏi' })).toHaveCount(0)
  await page.goto('/console/teacher/attempts')
  await expect(page.getByText('Student QA', { exact: true })).toBeVisible()
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
  await page.getByLabel('Tên quiz', { exact: true }).fill('Bị từ chối')
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
  await expect(page.getByLabel('Tên quiz', { exact: true })).toBeVisible()
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
  await page.getByLabel('Tên quiz', { exact: true }).fill('Đang lưu')
  let release!: () => void
  state.writeGate = new Promise<void>(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect.poll(() => writes(state).length).toBe(1)
  await page.evaluate(token => {
    localStorage.setItem('hocluc.accessToken', token)
    window.dispatchEvent(new Event('hocluc:tokens-changed'))
  }, quizToken('TEACHER'))
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  release()
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

test('Student quiz start, answer, submit and review still use the assessment API', async ({ page }) => {
  const state = await installQuizFixture(page, 'STUDENT')
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(/\/review$/)
  expect(state.requests.some(r => r.path.endsWith('/answers'))).toBe(true)
  expect(state.requests.some(r => r.path.endsWith('/submit'))).toBe(true)
  expect(state.requests.some(r => r.path.startsWith('/api/v1/teacher/'))).toBe(false)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
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
