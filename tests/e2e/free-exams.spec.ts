import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS, quizToken } from './quiz-permissions-fixture'
import type { FreeExam, CourseCompetency } from '../../src/services/freeExamService'

const exam = (id: string, title: string, courseId: string | null = QUIZ_IDS.course): FreeExam => ({
  id, title, courseId, courseTitle: courseId === QUIZ_IDS.course ? 'Khóa A' : courseId ? 'Khóa B' : null,
  description: 'Đề thi thử miễn phí để đánh giá năng lực.', durationMinutes: 30, questionCount: 1,
  maxAttempts: 2, practiceAllowed: true, availableFrom: null, availableUntil: null, publishedAt: null,
  attemptsUsed: null, bestPercentage: null, locked: null, lockReason: null, inProgressAttemptId: null,
})
const analysis = (courseId: string, counted: boolean): CourseCompetency => ({
  courseId, courseTitle: courseId === QUIZ_IDS.course ? 'Khóa A' : 'Khóa B', studentId: QUIZ_IDS.user,
  examCount: counted ? 1 : 0, totalQuestions: counted ? 1 : 0, correctCount: counted ? 1 : 0, wrongCount: 0,
  score: counted ? 1 : null, maxScore: counted ? 1 : null, overallPercentage: counted ? 100 : null,
  timeSpentSeconds: counted ? 30 : 0, level: counted ? 'ADVANCED' : null,
  weakCategoryId: counted ? 'math' : null, strongCategoryId: counted ? 'math' : null,
  weakCategoryName: counted ? 'Toán' : null, strongCategoryName: counted ? 'Toán' : null,
  categories: counted ? [{ categoryId: 'math', categoryName: 'Toán', correctCount: 1, wrongCount: 0, totalCount: 1, score: 1, percentage: 100 }] : [],
  exams: counted ? [{ quizId: QUIZ_IDS.quiz, quizTitle: 'Đề đã chọn', attemptId: QUIZ_IDS.attempt, submittedAt: '2026-11-17T03:00:00Z', score: 1, maxScore: 1, percentage: 100 }] : [],
  pendingExams: counted ? [] : [{ quizId: QUIZ_IDS.otherQuiz, quizTitle: 'Đề chưa làm của B', durationMinutes: 30 }],
})

async function setup(page: Page, authenticated = true) {
  const state = await installQuizFixture(page, 'STUDENT', { authenticated })
  state.quizzes[0] = { ...state.quizzes[0], type: 'PLACEMENT', status: 'PUBLISHED' }
  let listStatus = 200
  let competencyStatus = 200
  const papers = [exam(QUIZ_IDS.exam, 'Đề mới nhất'), exam(QUIZ_IDS.quiz, 'Đề đã chọn'), exam(QUIZ_IDS.otherQuiz, 'Đề khóa B', QUIZ_IDS.otherCourse),
    ...Array.from({ length: 5 }, (_, index) => exam(`extra-${index}`, `Đề bổ sung ${index + 1}`, null))]
  await page.route('**/api/v1/free-exams*', route => route.fulfill({ status: listStatus, json: listStatus === 200 ? { success: true, data: papers } : { success: false, message: 'Lỗi danh sách kiểm thử' } }))
  await page.route('**/api/v1/courses/main', route => route.fulfill({ json: { success: true, data: [{ id: QUIZ_IDS.course, title: 'Khóa A', courseType: 'MAIN' }, { id: QUIZ_IDS.otherCourse, title: 'Khóa B', courseType: 'MAIN' }] } }))
  await page.route('**/api/v1/courses/my', route => route.fulfill({ json: { success: true, data: [] } }))
  const requestedCourses: string[] = []
  await page.route('**/api/v1/courses/*/competency', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2)!
    requestedCourses.push(id)
    return route.fulfill({ status: competencyStatus, json: competencyStatus === 200 ? { success: true, data: analysis(id, id === QUIZ_IDS.course) } : { success: false, message: 'Lỗi đánh giá kiểm thử' } })
  })
  await page.route('**/api/v1/assessments/quizzes/*/attempts/me', route => route.fulfill({ json: { success: true, data: [] } }))
  return { state, papers, requestedCourses, setListStatus: (status: number) => { listStatus = status }, setCompetencyStatus: (status: number) => { competencyStatus = status } }
}

test('free-exams: guests browse newest first, paginate and retain the chosen exam through login and signup', async ({ page }, testInfo) => {
  const { state } = await setup(page, false)
  let rejectLogin = true
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: rejectLogin ? 401 : 200,
    json: rejectLogin ? { success: false, message: 'Thông tin đăng nhập không đúng.' } : { success: true, data: { accessToken: quizToken('STUDENT') } } }))
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Điều hướng cuối trang' }).getByRole('link', { name: 'Đề thi thử miễn phí', exact: true })).toHaveAttribute('href', '/free-exams')
  await page.locator('.hero-buttons').getByRole('link', { name: 'Đề thi thử miễn phí', exact: true }).click()
  await expect(page).toHaveURL('/free-exams')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('free-exams-desktop.png'), fullPage: true })
  await expect(page.getByRole('article')).toHaveCount(6)
  await expect(page.getByRole('article').first()).toContainText('Đề mới nhất')
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click()
  expect(state.requests.some(item => item.path.startsWith('/api/v1/assessments/'))).toBe(false)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('free-exams-mobile.png'), fullPage: true })
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Đề đã chọn', exact: true }) }).getByRole('link', { name: 'Làm bài miễn phí' }).click()
  const target = `/student/assessments/quizzes/${QUIZ_IDS.quiz}?from=free-exams`
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(target)}`)
  await page.reload()
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click()
  await expect(page).toHaveURL(`/signup?returnTo=${encodeURIComponent(target)}`)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await dialog.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('fixture-password')
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Thông tin đăng nhập không đúng.')
  rejectLogin = false
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(target)
  await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toBeVisible()
  expect(state.requests.some(item => item.method === 'POST' && item.path.endsWith('/attempts'))).toBe(false)
  expect(state.pageErrors).toEqual([])
})

test('free-exams: the selected paper uses the quiz API, persists its result and opens course competency', async ({ page }, testInfo) => {
  const { state } = await setup(page)
  await page.goto('/free-exams')
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Đề đã chọn', exact: true }) }).getByRole('link', { name: 'Làm bài miễn phí' }).click()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/quizzes/${QUIZ_IDS.quiz}/attempts/${QUIZ_IDS.attempt}`)
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  await page.reload()
  await expect(page.getByText('Giải thích đáp án Student', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem đánh giá năng lực', exact: true }).click()
  await expect(page).toHaveURL(`/student/learning-profile?tab=learning&courseId=${QUIZ_IDS.course}`)
  const panel = page.getByRole('region', { name: 'Đánh giá năng lực theo khóa', exact: true })
  await expect(panel.getByRole('list', { name: 'Đề được tính vào đánh giá' })).toContainText('Đề đã chọn')
  await expect(panel.getByText('Nâng cao', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('course-competency-desktop.png'), fullPage: true })
  expect(state.requests.some(item => item.path.includes('/placement'))).toBe(false)
  expect(state.requests.some(item => item.path.endsWith('/results/me'))).toBe(false)
  expect(state.requests.find(item => item.method === 'POST' && item.path.endsWith('/attempts'))?.path).toBe(`/api/v1/assessments/quizzes/${QUIZ_IDS.quiz}/attempts`)
  expect(state.pageErrors).toEqual([])
})

test('free-exams: course switching shows empty analysis, errors and retry without stale results', async ({ page }, testInfo) => {
  const { requestedCourses, setCompetencyStatus, state } = await setup(page)
  await page.goto(`/student/learning-profile?tab=learning&courseId=${QUIZ_IDS.course}`)
  const panel = page.getByRole('region', { name: 'Đánh giá năng lực theo khóa', exact: true })
  await expect(panel.getByText('Nâng cao', { exact: true })).toBeVisible()
  setCompetencyStatus(500)
  await panel.getByRole('combobox', { name: 'Khóa dùng để đánh giá' }).selectOption(QUIZ_IDS.otherCourse)
  await expect(panel.getByText('Không thể tải đánh giá năng lực', { exact: true })).toBeVisible()
  await expect(panel.getByText('Nâng cao', { exact: true })).toHaveCount(0)
  setCompetencyStatus(200)
  await panel.getByRole('button', { name: /Thử lại/ }).click()
  await expect(panel.getByText('Bạn chưa có kết quả đánh giá cho khóa này', { exact: true })).toBeVisible()
  await expect(panel.getByText('Đề chưa làm của B', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Khóa dùng để đánh giá' })).toHaveValue(QUIZ_IDS.otherCourse)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('course-competency-empty-mobile.png'), fullPage: true })
  expect(requestedCourses).toContain(QUIZ_IDS.otherCourse)
  expect(state.pageErrors).toEqual([])
})

test('free-exams: list errors retry and backend locks are displayed', async ({ page }) => {
  const { setListStatus, papers } = await setup(page)
  setListStatus(500)
  await page.goto('/free-exams')
  await expect(page.getByText('Chưa tải được đề thi miễn phí', { exact: true })).toBeVisible()
  setListStatus(200)
  papers[0].locked = true; papers[0].lockReason = 'NOT_OPEN_YET'; papers[0].attemptsUsed = 0
  papers[1].bestPercentage = 0; papers[1].attemptsUsed = 1
  await page.getByRole('button', { name: /Thử lại/ }).click()
  await expect(page.getByRole('article').first()).toContainText('chưa')
  await expect(page.getByRole('article').nth(1).getByText('Đã làm', { exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Tìm kiếm đề thi' }).fill('không tồn tại')
  await expect(page.getByText('Chưa có đề thi phù hợp', { exact: true })).toBeVisible()
})

test('free-exams: registration and email confirmation preserve the selected paper', async ({ page }) => {
  await setup(page, false)
  const target = `/student/assessments/quizzes/${QUIZ_IDS.quiz}?from=free-exams`
  const suffix = `?returnTo=${encodeURIComponent(target)}`
  await page.route('**/api/v1/auth/student-register', route => route.fulfill({ json: { success: true, message: 'Đã gửi mã xác nhận.' } }))
  await page.route('**/api/v1/auth/confirm', route => route.fulfill({ json: { success: true } }))
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: { success: true, data: { accessToken: quizToken('STUDENT') } } }))
  await page.goto(`/signup${suffix}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Họ', exact: true }).fill('Nguyễn')
  await dialog.getByRole('textbox', { name: 'Tên', exact: true }).fill('An')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await dialog.getByRole('textbox', { name: 'Số điện thoại', exact: true }).fill('0901234567')
  await dialog.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('FixturePass123!')
  await dialog.getByPlaceholder('Nhập lại mật khẩu', { exact: true }).fill('FixturePass123!')
  await dialog.getByRole('button', { name: 'Đăng ký ngay', exact: true }).click()
  await expect(page).toHaveURL(`/verify-email${suffix}`)
  await page.reload()
  await page.getByRole('textbox', { name: 'Mã xác nhận tài khoản', exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Xác nhận tài khoản', exact: true }).click()
  await expect(page).toHaveURL(`/login${suffix}`)
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await dialog.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('FixturePass123!')
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(target)
  await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toBeVisible()
})

test('free-exams: legacy entry goes to catalog and an existing sitting resumes without creating another', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/student/assessments/placement')
  await expect(page).toHaveURL('/free-exams')
  await page.goto(`/student/assessments/placement/attempts/${QUIZ_IDS.attempt}`)
  await expect(page).toHaveURL(`/student/assessments/quizzes/${QUIZ_IDS.quiz}/attempts/${QUIZ_IDS.attempt}`)
  await expect(page.getByRole('radio', { name: 'Đáp án Student' })).toBeVisible()
  expect(state.requests.some(item => item.method === 'POST' && item.path.endsWith('/attempts'))).toBe(false)
  expect(state.requests.some(item => item.path === '/api/v1/assessments/placement')).toBe(false)
})

test('signed-in public header aligns the start button with the account button', async ({ page }, testInfo) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}?from=free-exams`)
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  const actions = page.locator('.nav-actions')
  const start = actions.getByRole('link', { name: 'Bắt đầu', exact: true })
  const account = actions.getByRole('button', { name: /^Tài khoản:/ })
  await expect(start).toBeVisible()
  const startBox = (await start.boundingBox())!
  const accountBox = (await account.boundingBox())!
  expect(startBox.height).toBe(accountBox.height)
  expect(startBox.y).toBe(accountBox.y)
  expect(startBox.x + startBox.width).toBeLessThan(accountBox.x)
  await start.hover()
  expect((await start.boundingBox())!.y).toBe(accountBox.y)
  await page.locator('.public-chrome').screenshot({ path: testInfo.outputPath('public-header-aligned.png') })
})

test('Student login defaults to competency profile and uses the requested sidebar order', async ({ page }) => {
  await setup(page, false)
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: { success: true, data: { accessToken: quizToken('STUDENT') } } }))
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('student@example.invalid')
  await dialog.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill('FixturePass123!')
  await dialog.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL('/student/learning-profile')
  const sidebar = page.getByRole('navigation', { name: 'Điều hướng học sinh', exact: true })
  await expect(sidebar.getByRole('button')).toHaveText(['Hồ sơ năng lực', 'Khóa học', 'Bài kiểm tra', 'Hỏi Mentor', 'Tài khoản'])
  await expect(sidebar.getByRole('button', { name: 'Hồ sơ năng lực', exact: true })).toHaveAttribute('aria-current', 'page')
  await sidebar.getByRole('button', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL('/student/courses')
})

test('Student collapsed sidebar expands on hover without shifting content and collapses on leaving', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/student/courses')
  const sidebar = page.locator('#student-navigation')
  const width = () => sidebar.evaluate(element => element.getBoundingClientRect().width)
  const main = page.getByRole('main')
  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng', exact: true }).click()
  await page.mouse.move(700, 400)
  await expect.poll(width).toBe(80)
  await expect.poll(async () => (await main.boundingBox())!.x).toBe(80)
  const contentX = (await main.boundingBox())!.x
  await sidebar.hover()
  await expect.poll(width).toBe(248)
  await expect(sidebar.getByText('Hồ sơ năng lực', { exact: true })).toBeVisible()
  expect((await main.boundingBox())!.x).toBe(contentX)
  await page.mouse.move(700, 400)
  await expect.poll(width).toBe(80)
  await page.getByRole('button', { name: 'Mở rộng thanh điều hướng', exact: true }).click()
  await page.setViewportSize({ width: 1000, height: 950 })
  await expect.poll(width).toBe(80)
  await sidebar.hover()
  await expect.poll(width).toBe(248)
  await sidebar.getByRole('button', { name: 'Khóa học', exact: true }).click()
  await page.mouse.move(700, 400)
  await expect.poll(width).toBe(80)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(sidebar).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Mở menu học tập', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Không gian học tập', exact: true })).toBeVisible()
})

test('assessment workspace shows every question, jumps from the left panel and restores separate answers', async ({ page }, testInfo) => {
  const { state } = await setup(page)
  const questions = Array.from({ length: 12 }, (_, index) => ({ id: `question-${index + 1}`, sequence: index + 1,
    questionText: `Nội dung câu hỏi số ${index + 1}`, questionType: 'SINGLE_CHOICE', imageUrl: null,
    options: ['A', 'B'].map((letter, optionIndex) => ({ id: `option-${index}-${letter}`, sequence: optionIndex + 1, optionText: `Đáp án ${letter} câu ${index + 1}` })),
  }))
  const answers = new Map<string, string>()
  const deadlineAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const history = Array.from({ length: 4 }, (_, index) => ({ attemptId: `past-${index}`, attemptNumber: index + 1,
    status: 'GRADED', mode: 'EXAM', score: index, maxScore: 5, percentage: index * 20, timeSpentSeconds: 120,
    startedAt: `2026-11-${10 + index}T03:00:00Z`, submittedAt: `2026-11-${10 + index}T03:02:00Z`,
  }))
  await page.route(url => url.pathname === `/api/v1/assessments/quizzes/${QUIZ_IDS.quiz}`, route => route.fulfill({ json: { success: true, data: {
    id: QUIZ_IDS.quiz, type: 'PLACEMENT', title: 'Đề thi nhiều câu', description: 'Làm bài liên tục với toàn bộ câu hỏi trong đề.', questionCount: questions.length,
    durationMinutes: 30, maxAttempts: 10, attemptsUsed: 4, showAnswers: true, passingPercentage: null, bestPercentage: 60, passed: false,
    locked: false, lockReason: null, inProgressAttemptId: null, sectionCourseId: QUIZ_IDS.course, questions,
    attempts: state.studentStatus === 'GRADED' ? [{ ...history[0], attemptId: QUIZ_IDS.attempt, percentage: 100 }, ...history] : history,
  } } }))
  await page.route(url => url.pathname === `/api/v1/assessments/attempts/${QUIZ_IDS.attempt}`, route => route.fulfill({ json: { success: true, data: {
    attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, quizType: 'PLACEMENT', quizTitle: 'Đề thi nhiều câu', status: state.studentStatus,
    deadlineAt, startedAt: new Date().toISOString(), remainingSeconds: 1800, attemptNumber: 5, totalQuestions: questions.length,
    answers: [...answers].map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })),
  } } }))
  await page.route(url => url.pathname === `/api/v1/assessments/attempts/${QUIZ_IDS.attempt}/answers`, route => {
    const body = route.request().postDataJSON() as { questionId: string; selectedOptionId: string }
    answers.set(body.questionId, body.selectedOptionId)
    return route.fulfill({ json: { success: true } })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}?from=free-exams`)
  const historyRegion = page.getByRole('region', { name: 'Lịch sử làm bài', exact: true })
  await expect(historyRegion.getByRole('listitem')).toHaveCount(2)
  await historyRegion.getByRole('button', { name: 'Xem tất cả (4)', exact: true }).click()
  await expect(historyRegion.getByRole('listitem')).toHaveCount(4)
  await page.screenshot({ path: testInfo.outputPath('quiz-overview-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  const paper = page.getByRole('region', { name: 'Nội dung đề thi', exact: true })
  const controls = page.getByRole('complementary', { name: 'Thời gian và tiến độ làm bài', exact: true })
  await expect(paper.getByRole('article')).toHaveCount(12)
  expect((await controls.boundingBox())!.x).toBeLessThan((await paper.boundingBox())!.x)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await controls.getByRole('button', { name: 'Câu 12', exact: true }).click()
  await expect(paper.getByRole('article', { name: 'Câu 12', exact: true })).toBeInViewport()
  expect(await paper.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await expect(controls.getByRole('timer')).toBeInViewport()
  await paper.getByRole('radio', { name: 'Đáp án A câu 12', exact: true }).click()
  await expect(controls.getByRole('button', { name: 'Câu 12, đã trả lời', exact: true })).toHaveAttribute('aria-current', 'step')
  await controls.getByRole('button', { name: 'Câu 1', exact: true }).click()
  await paper.getByRole('radio', { name: 'Đáp án B câu 1', exact: true }).click()
  await expect(controls.getByText('Đã trả lời 2/12 câu', { exact: true })).toBeVisible()
  await expect.poll(() => answers.size).toBe(2)
  await page.reload()
  await expect(paper.getByRole('radio', { name: 'Đáp án B câu 1', exact: true })).toBeChecked()
  await expect(paper.getByRole('radio', { name: 'Đáp án A câu 12', exact: true })).toBeChecked()
  await page.screenshot({ path: testInfo.outputPath('quiz-all-questions-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await expect(paper.getByRole('article')).toHaveCount(12)
  await page.screenshot({ path: testInfo.outputPath('quiz-all-questions-mobile.png'), fullPage: true })
  await controls.getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('2/12 câu')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  expect(state.pageErrors).toEqual([])
})
