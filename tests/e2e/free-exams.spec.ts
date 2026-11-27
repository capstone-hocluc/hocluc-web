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

test('Student review workspace navigates all answers, filters verdicts and scrolls internally', async ({ page }, testInfo) => {
  const { state } = await setup(page)
  state.studentStatus = 'GRADED'
  await page.route(`**/api/v1/assessments/quizzes/${QUIZ_IDS.quiz}`, route => route.fulfill({ json: { success: true, data: {
    id: QUIZ_IDS.quiz, title: 'Đề thi xem lại', type: 'EXAM', showAnswers: true, questions: [], attempts: [{ attemptId: QUIZ_IDS.attempt, attemptNumber: 1, status: 'GRADED', score: 4, maxScore: 12, percentage: 33.33, timeSpentSeconds: 120, submittedAt: '2026-11-18T04:00:00Z' }],
  } } }))
  await page.route(`**/api/v1/assessments/attempts/${QUIZ_IDS.attempt}/review`, route => route.fulfill({ json: { success: true, data: {
    attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, totalQuestions: 12, correctCount: 4, questions: Array.from({ length: 12 }, (_, index) => ({
      questionId: `review-${index}`, sequence: index + 1, questionText: `Nội dung câu hỏi ${index + 1}`, answered: index % 3 !== 2, correct: index % 3 === 0, selectedOptionId: index % 3 === 2 ? null : index % 3 === 0 ? 'a' : 'b', explanation: `Giải thích câu ${index + 1}`,
      options: [{ optionId: 'a', optionText: 'Đáp án đúng', correct: true, sequence: 1 }, { optionId: 'b', optionText: 'Đáp án sai', correct: false, sequence: 2 }],
    })),
  } } }))
  await page.goto(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  const panel = page.getByRole('region', { name: 'Nội dung xem lại bài' })
  await expect(panel.getByText('Nội dung câu hỏi 12', { exact: true })).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await page.getByRole('navigation', { name: 'Danh sách câu hỏi' }).getByRole('button', { name: 'Câu 12, Chưa trả lời', exact: true }).click()
  await expect(panel.getByText('Nội dung câu hỏi 12', { exact: true })).toBeVisible()
  expect(await panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  const filters = page.getByRole('group', { name: 'Lọc câu hỏi xem lại' })
  await filters.getByRole('button', { name: /^Sai\s*4$/ }).click()
  await expect(panel.getByText('Nội dung câu hỏi 1', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Danh sách câu hỏi' }).getByRole('button')).toHaveCount(4)
  await filters.getByRole('button', { name: /^Tất cả\s*12$/ }).click()
  await panel.evaluate(element => element.scrollTop = 0)
  await page.screenshot({ path: testInfo.outputPath('student-review-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('student-review-mobile.png') })
})

test('Student account compacts and paginates orders, sorts wallet history and simplifies the account menu', async ({ page }) => {
  await setup(page)
  await page.route('**/api/v1/orders/me', route => route.fulfill({ json: { success: true, data: Array.from({ length: 7 }, (_, index) => ({
    id: `order-${index}`, orderCode: `ORDER-${index}`, status: 'EXPIRED', totalAmount: 49000, createdAt: `2026-11-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    items: [{ courseId: null, courseTitle: 'Gói Sao', credits: 50 }],
  })) } }))
  const historyRequests: string[] = []
  await page.route('**/api/v1/credits/me/history*', route => {
    const url = new URL(route.request().url())
    historyRequests.push(url.search)
    const second = url.searchParams.get('page') === '1'
    return route.fulfill({ json: { success: true, data: { content: Array.from({ length: 5 }, (_, index) => ({
      id: `entry-${second ? index + 5 : index}`, type: 'PURCHASE', amount: 50, note: `Giao dịch ${second ? index + 5 : index}`,
      createdAt: `2026-11-${String((second ? 5 : 10) - index).padStart(2, '0')}T00:00:00Z`, refType: null,
    })).reverse(), last: second } } })
  })
  await page.goto('/student/profile?section=orders')
  const panel = page.getByRole('region', { name: 'Nội dung tài khoản' })
  await expect(panel.getByRole('button', { name: /ORDER-/ })).toHaveCount(5)
  await expect(panel.getByRole('button', { name: /ORDER-/ }).first()).toContainText('ORDER-6')
  await panel.getByRole('button', { name: 'Sau', exact: true }).click()
  await expect(panel.getByRole('button', { name: /ORDER-/ })).toHaveCount(2)
  await page.getByRole('navigation', { name: 'Cài đặt tài khoản' }).getByRole('button', { name: 'Ví Sao' }).click()
  const history = panel.getByRole('list', { name: 'Lịch sử giao dịch Sao' })
  await expect(history.getByRole('listitem')).toHaveCount(5)
  await expect(history.getByRole('listitem').first()).toContainText('Giao dịch 0')
  await panel.getByRole('button', { name: 'Xem thêm', exact: true }).click()
  await expect(history.getByRole('listitem')).toHaveCount(10)
  await expect(history.getByRole('listitem').last()).toContainText('Giao dịch 9')
  expect(historyRequests.some(query => new URLSearchParams(query).get('size') === '5')).toBe(true)
  await expect(history).toHaveCSS('overflow-y', 'auto')
  await page.getByRole('button', { name: 'Mở menu hồ sơ' }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['Tài khoản', 'Đăng xuất'])
  await page.getByRole('menuitem', { name: 'Tài khoản', exact: true }).click()
  await expect(page).toHaveURL(/\/student\/profile$/)
})

test('Student account uses a fluid fixed workspace and scrolls only its content panel', async ({ page }, testInfo) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/student/profile')
  const content = page.getByRole('region', { name: 'Nội dung tài khoản' })
  await expect(content).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hồ sơ học tập', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toHaveCSS('color', 'rgb(30, 136, 255)')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  await expect(content).toHaveCSS('overflow-y', 'auto')
  expect(await content.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await content.evaluate(element => element.scrollTop = 250)
  expect(await content.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('student-account-desktop.png') })
  await page.getByRole('navigation', { name: 'Cài đặt tài khoản' }).getByRole('button', { name: 'Đổi mật khẩu' }).click()
  await expect(content.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeVisible()
  expect(await content.evaluate(element => element.scrollTop)).toBe(0)
  await page.goto('/student/profile?section=student')
  await expect(content.getByRole('heading', { name: 'Hồ sơ', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight && document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('student-account-mobile.png') })
})

test('Student suggested courses use saved goals in profile and course tabs with pagination and purchase navigation', async ({ page }, testInfo) => {
  await setup(page)
  let hasGoal = true
  let fail = false
  let calls = 0
  await page.route('**/api/v1/users/profiles', route => route.fulfill({ json: { success: true, data: {
    id: QUIZ_IDS.user, role: 'STUDENT', roles: ['STUDENT'], displayName: 'Quiz QA', emailVerified: true,
    studentProfile: hasGoal ? { targetExam: 'VNU_HCM', targetExamYear: 2027 } : null,
  } } }))
  await page.route('**/api/v1/courses/main/suggested', route => {
    calls++
    return route.fulfill({ status: fail ? 500 : 200, json: fail ? { success: false, message: 'Không tải được đề xuất' } : { success: true, data: Array.from({ length: 7 }, (_, index) => ({
      id: index === 0 ? QUIZ_IDS.course : `suggestion-${index}`, title: `Khóa đề xuất ${index + 1}`, targetExam: 'VNU_HCM', track: 'LONG',
      description: 'Lộ trình phù hợp với mục tiêu học tập.', recommended: index === 0, purchased: index === 0, price: 1200000,
    })) } })
  })
  await page.goto('/student/learning-profile')
  const suggestions = page.getByRole('region', { name: 'Khóa học đề xuất cho bạn' })
  await expect(suggestions.getByRole('button', { name: /Khóa đề xuất/ })).toHaveCount(6)
  await expect(suggestions.getByText('Phù hợp nhất', { exact: true })).toBeVisible()
  await suggestions.scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('profile-suggested-courses.png') })
  await suggestions.getByRole('button', { name: 'Trang đề xuất tiếp theo' }).click()
  await expect(suggestions.getByRole('button', { name: /Khóa đề xuất/ })).toHaveCount(1)
  await suggestions.getByRole('button', { name: /Khóa đề xuất 7/ }).click()
  await expect(page).toHaveURL(/\/courses\/suggestion-6$/)
  await page.goto('/student/courses')
  await page.getByRole('tab', { name: 'Khóa học đề xuất', exact: true }).click()
  await expect(suggestions.getByRole('button', { name: /Khóa đề xuất/ })).toHaveCount(6)
  await page.getByPlaceholder('Tìm kiếm khóa học').fill('Khóa đề xuất 1')
  await expect(suggestions.getByRole('button', { name: /Khóa đề xuất/ })).toHaveCount(1)
  await suggestions.getByRole('button', { name: /Khóa đề xuất 1/ }).click()
  await expect(page).toHaveURL(new RegExp(`/student/courses/${QUIZ_IDS.course}/study$`))
  fail = true
  await page.goto('/student/courses')
  await page.getByRole('tab', { name: 'Khóa học đề xuất', exact: true }).click()
  await expect(suggestions.getByText('Chưa tải được khóa học đề xuất')).toBeVisible()
  fail = false
  await suggestions.getByRole('button', { name: 'Thử lại' }).click()
  await expect(suggestions.getByRole('button', { name: /Khóa đề xuất/ })).toHaveCount(6)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('course-suggestions-mobile.png'), fullPage: true })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  hasGoal = false
  const before = calls
  await page.goto('/student/courses')
  await page.getByRole('tab', { name: 'Khóa học đề xuất', exact: true }).click()
  await expect(suggestions.getByText('Thêm mục tiêu để nhận đề xuất')).toBeVisible()
  expect(calls).toBe(before)
})

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

test('Student dropdowns constrain long course titles and support search on mobile', async ({ page }, testInfo) => {
  const { papers } = await setup(page)
  const title = 'Luyện thi ĐGNL ĐHQG-HCM 2027 · Lộ trình Dài hạn – Từ nền tảng đến bứt phá và luyện tập chuyên sâu'
  papers.filter(exam => exam.courseId === QUIZ_IDS.course).forEach(exam => { exam.courseTitle = title })
  await page.route('**/api/v1/courses/main', route => route.fulfill({ json: { success: true, data: [
    { id: QUIZ_IDS.course, title, courseType: 'MAIN' },
    { id: QUIZ_IDS.otherCourse, title: 'Khóa B', courseType: 'MAIN' },
  ] } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/student/learning-profile?tab=learning&courseId=${QUIZ_IDS.course}`)
  const trigger = page.getByRole('button', { name: 'Khóa dùng để đánh giá', exact: true })
  await trigger.click()
  const option = page.getByRole('option', { name: title, exact: true })
  await expect(option).toBeVisible()
  const menu = page.locator('[data-dropdown-content]')
  const bounds = await menu.boundingBox()
  const buttonBounds = await trigger.boundingBox()
  expect(bounds!.width).toBeLessThanOrEqual(buttonBounds!.width + 1)
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  expect(await option.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('student-dropdown-long-mobile.png'), fullPage: true })
  await page.getByRole('searchbox', { name: 'Tìm khóa dùng để đánh giá' }).fill('Khóa B')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.getByRole('option', { name: 'Khóa B', exact: true }).click()
  await expect(trigger).toContainText('Khóa B')
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})

test('free-exams: course switching shows empty analysis, errors and retry without stale results', async ({ page }, testInfo) => {
  const { requestedCourses, setCompetencyStatus, state } = await setup(page)
  await page.goto(`/student/learning-profile?tab=learning&courseId=${QUIZ_IDS.course}`)
  const panel = page.getByRole('region', { name: 'Đánh giá năng lực theo khóa', exact: true })
  await expect(panel.getByText('Nâng cao', { exact: true })).toBeVisible()
  setCompetencyStatus(500)
  await panel.getByRole('button', { name: 'Khóa dùng để đánh giá', exact: true }).click()
  await page.getByRole('option', { name: 'Khóa B', exact: true }).click()
  await expect(panel.getByText('Không thể tải đánh giá năng lực', { exact: true })).toBeVisible()
  await expect(panel.getByText('Nâng cao', { exact: true })).toHaveCount(0)
  setCompetencyStatus(200)
  await panel.getByRole('button', { name: /Thử lại/ }).click()
  await expect(panel.getByText('Bạn chưa có kết quả đánh giá cho khóa này', { exact: true })).toBeVisible()
  await expect(panel.getByText('Đề chưa làm của B', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Khóa dùng để đánh giá', exact: true })).toContainText('Khóa B')
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
  await expect(page).toHaveURL('/student/assessments?tab=free')
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
  await expect(sidebar.getByRole('button')).toHaveText(['Hồ sơ năng lực', 'Khóa học', 'Luyện đề', 'Hỏi Mentor', 'Tài khoản'])
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

test('Student assessment catalog combines enrolled course exams and lesson tests, filters, paginates and preserves return context', async ({ page }, testInfo) => {
  const { state } = await setup(page)
  let denySecondCourse = false
  const summary = (id: string, title: string, type = 'EXAM', bestPercentage: number | null = null) => ({
    id, title, type, questionCount: 1, durationMinutes: 30, maxAttempts: 2, passingPercentage: null,
    showAnswers: false, availableFrom: null, availableUntil: null, practiceAllowed: false,
    attemptsUsed: bestPercentage == null ? 0 : 1, bestPercentage, passed: false, locked: false,
    lockReason: null as string | null, inProgressAttemptId: null,
  })
  const sharedQuiz = summary(QUIZ_IDS.quiz, 'Quiz dùng chung', 'QUICK', 80)
  const lessonQuiz = { ...summary('lesson-check', 'Kiểm tra cuối bài đang khóa', 'LESSON'), locked: true, lockReason: 'LESSON_NOT_COMPLETED' }
  const chapter = (quizzes: ReturnType<typeof summary>[]) => ({ id: QUIZ_IDS.chapter, title: 'Chương 1', sequence: 1, lessonCount: 1, completedLessonCount: 0,
    quizzes: [summary('chapter-check', 'Kiểm tra cuối chương', 'CHAPTER')], lessons: [{ id: QUIZ_IDS.lesson, title: 'Bài 1', status: 'NOT_STARTED', quizzes }] })
  await page.route('**/api/v1/courses/my', route => route.fulfill({ json: { success: true, data: [
    { course: { id: QUIZ_IDS.course, title: 'Khóa chính A', courseType: 'MAIN' } },
    { course: { id: QUIZ_IDS.otherCourse, title: 'Khóa bổ trợ B', courseType: 'SECTION' } },
  ] } }))
  await page.route('**/api/v1/courses/*/study', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2)!
    if (id === QUIZ_IDS.otherCourse && denySecondCourse) return route.fulfill({ status: 403, json: { success: false, message: 'Khóa B tạm không truy cập được' } })
    const gift = id === 'gift-course'
    return route.fulfill({ json: { success: true, data: {
      courseId: id, courseType: id === QUIZ_IDS.course ? 'MAIN' : 'SECTION', title: gift ? 'Khóa tặng' : 'Khóa học',
      exams: id === QUIZ_IDS.course ? Array.from({ length: 7 }, (_, index) => summary(index === 0 ? QUIZ_IDS.exam : `exam-${index}`, index === 1 ? 'Đề đã làm được 0 điểm' : `Đề trong khóa ${index + 1}`, 'EXAM', index === 1 ? 0 : null)) : [],
      phases: [{ id: 'phase', sequence: 1, gifts: id === QUIZ_IDS.course ? [{ courseId: 'gift-course', title: 'Khóa tặng' }] : [],
        sections: [{ sectionCourseId: id, title: 'Nội dung', sequence: 1, chapters: [gift
          ? { ...chapter([]), quizzes: [], lessons: [{ id: 'gift-lesson', title: 'Bài tặng', quizzes: [summary('gift-check', 'Quiz trong khóa tặng', 'QUICK')] }] }
          : chapter(id === QUIZ_IDS.course ? [sharedQuiz, lessonQuiz] : [sharedQuiz])] }],
      }],
    } } })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/student/courses')
  await page.getByRole('navigation', { name: 'Điều hướng học sinh' }).getByRole('button', { name: 'Luyện đề', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments')
  await expect(page.getByRole('heading', { name: 'Chào mừng bạn đến với Luyện đề', exact: true })).toBeVisible()
  const list = page.getByRole('list', { name: 'Danh sách bài kiểm tra', exact: true })
  await expect(list.getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('searchbox', { name: 'Tìm kiếm bài kiểm tra' })).toHaveCSS('border-radius', '9999px')
  await page.getByRole('button', { name: 'Trang bài kiểm tra sau', exact: true }).click()
  await expect(list.getByRole('listitem')).toHaveCount(5)
  await page.getByRole('tab', { name: /^Đã làm/ }).click()
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(list.getByRole('listitem').filter({ hasText: 'Đề đã làm được 0 điểm' })).toHaveAttribute('data-completed', 'true')
  await page.getByRole('tab', { name: /^Tất cả/ }).click()
  await page.getByRole('button', { name: 'Loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Kiểm tra cuối bài', exact: true }).click()
  await expect(list).toContainText('Kiểm tra cuối bài đang khóa')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await page.getByRole('button', { name: 'Loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Tất cả loại bài', exact: true }).click()
  await page.getByRole('main').getByRole('button', { name: 'Khóa học', exact: true }).click()
  await page.getByRole('option', { name: 'Khóa bổ trợ B', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Tìm kiếm bài kiểm tra' }).fill('Quiz dùng chung')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  const returnUrl = page.url()
  await list.getByRole('button', { name: 'Xem đề Quiz dùng chung', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Điều hướng học sinh' }).getByRole('button', { name: 'Luyện đề', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.reload()
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(returnUrl)
  await expect(page.getByRole('main').getByRole('button', { name: 'Khóa học', exact: true })).toContainText('Khóa bổ trợ B')
  await page.getByRole('main').getByRole('button', { name: 'Khóa học', exact: true }).click()
  await page.getByRole('option', { name: 'Tất cả khóa học', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Tìm kiếm bài kiểm tra' }).fill('')
  await page.screenshot({ path: testInfo.outputPath('student-assessments-course-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('student-assessments-course-mobile.png'), fullPage: true })
  denySecondCourse = true
  await page.reload()
  await expect(page.getByText('Chưa tải được bài kiểm tra của một số khóa học.', { exact: true })).toBeVisible()
  await expect(list.getByRole('listitem')).toHaveCount(6)
  denySecondCourse = false
  await page.getByRole('button', { name: 'Thử lại các khóa học', exact: true }).click()
  await expect(page.getByText('Chưa tải được bài kiểm tra của một số khóa học.', { exact: true })).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
})

test('Student free exams stay in the Student shell and return to the filtered list after submitting', async ({ page }, testInfo) => {
  const { state } = await setup(page)
  await page.goto('/student/assessments')
  await expect(page.getByText('Chưa có bài kiểm tra trong khóa học', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem đề miễn phí', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments?tab=free')
  await expect(page.locator('.public-chrome')).toHaveCount(0)
  const list = page.getByRole('list', { name: 'Danh sách bài kiểm tra', exact: true })
  await expect(list.getByRole('listitem')).toHaveCount(6)
  await page.getByRole('button', { name: 'Trang bài kiểm tra sau', exact: true }).click()
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('searchbox', { name: 'Tìm kiếm bài kiểm tra' }).fill('Đề đã chọn')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  const returnUrl = page.url()
  await page.screenshot({ path: testInfo.outputPath('student-assessments-free-desktop.png'), fullPage: true })
  await list.getByRole('button', { name: 'Xem đề Đề đã chọn', exact: true }).click()
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click()
  await page.getByRole('radio', { name: 'Đáp án Student' }).click()
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).first().click()
  await expect(page.getByRole('alertdialog')).toHaveCSS('border-radius', '28px')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  await page.reload()
  await page.getByRole('button', { name: 'Quay lại bài kiểm tra', exact: true }).click()
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(returnUrl)
  await expect(page.getByRole('tab', { name: 'Miễn phí', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('searchbox', { name: 'Tìm kiếm bài kiểm tra' })).toHaveValue('Đề đã chọn')
  await expect(page.locator('.public-chrome')).toHaveCount(0)
  expect(state.pageErrors).toEqual([])
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

test('a practice run on chosen sections shows only their questions and a paused run resumes on opening', async ({ page }) => {
  await setup(page)
  const questions = Array.from({ length: 4 }, (_, index) => ({ id: `question-${index + 1}`, sequence: index + 1, sectionId: index < 2 ? 'section-a' : 'section-b',
    questionText: `Nội dung câu hỏi số ${index + 1}`, questionType: 'SINGLE_CHOICE', imageUrl: null,
    options: ['A', 'B'].map((letter, optionIndex) => ({ id: `option-${index}-${letter}`, sequence: optionIndex + 1, optionText: `Đáp án ${letter} câu ${index + 1}` })),
  }))
  let paused = true
  let resumes = 0
  const saved: string[] = []
  const attempt = () => ({
    attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, quizType: 'PLACEMENT', quizTitle: 'Đề luyện theo phần', status: 'IN_PROGRESS',
    mode: 'PRACTICE', sectionIds: ['section-a'], paused, pausedAt: paused ? new Date().toISOString() : null,
    deadlineAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), startedAt: new Date().toISOString(), remainingSeconds: 1200,
    attemptNumber: 1, totalQuestions: 2, answeredCount: 0, answers: [],
  })
  await page.route(url => url.pathname === `/api/v1/assessments/quizzes/${QUIZ_IDS.quiz}`, route => route.fulfill({ json: { success: true, data: {
    id: QUIZ_IDS.quiz, type: 'PLACEMENT', title: 'Đề luyện theo phần', description: null, questionCount: questions.length,
    durationMinutes: 30, maxAttempts: 10, attemptsUsed: 0, showAnswers: true, passingPercentage: null, bestPercentage: null, passed: false,
    locked: false, lockReason: null, inProgressAttemptId: QUIZ_IDS.attempt, sectionCourseId: QUIZ_IDS.course, questions, attempts: [],
  } } }))
  await page.route(url => url.pathname === `/api/v1/assessments/attempts/${QUIZ_IDS.attempt}`, route => route.fulfill({ json: { success: true, data: attempt() } }))
  await page.route(url => url.pathname === `/api/v1/assessments/attempts/${QUIZ_IDS.attempt}/resume`, route => {
    // A second resume, say from another tab, finds the run already going.
    if (!paused) return route.fulfill({ status: 409, json: { success: false, code: 'ATTEMPT_NOT_PAUSED', message: 'Bài làm không tạm dừng.' } })
    resumes++
    paused = false
    return route.fulfill({ json: { success: true, data: attempt() } })
  })
  await page.route(url => url.pathname === `/api/v1/assessments/attempts/${QUIZ_IDS.attempt}/answers`, route => {
    // The server refuses answers while paused and to questions outside the chosen sections.
    const body = route.request().postDataJSON() as { questionId: string }
    if (paused) return route.fulfill({ status: 409, json: { success: false, code: 'ATTEMPT_PAUSED', message: 'Bài làm đang tạm dừng.' } })
    if (!['question-1', 'question-2'].includes(body.questionId)) return route.fulfill({ status: 400, json: { success: false, code: 'QUESTION_NOT_IN_QUIZ', message: 'Câu hỏi không thuộc bài làm.' } })
    saved.push(body.questionId)
    return route.fulfill({ json: { success: true } })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/student/assessments/quizzes/${QUIZ_IDS.quiz}/attempts/${QUIZ_IDS.attempt}`)
  const paper = page.getByRole('region', { name: 'Nội dung đề thi', exact: true })
  const controls = page.getByRole('complementary', { name: 'Thời gian và tiến độ làm bài', exact: true })
  await expect(paper.getByRole('article')).toHaveCount(2)
  await expect(paper.getByText('Nội dung câu hỏi số 3', { exact: true })).toHaveCount(0)
  expect(resumes).toBe(1)
  await paper.getByRole('radio', { name: 'Đáp án A câu 1', exact: true }).click()
  await paper.getByRole('radio', { name: 'Đáp án B câu 2', exact: true }).click()
  await expect(controls.getByText('Đã trả lời 2/2 câu', { exact: true })).toBeVisible()
  await expect.poll(() => saved).toEqual(['question-1', 'question-2'])
  await controls.getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
})
