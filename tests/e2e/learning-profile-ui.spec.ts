import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'
import type { StudentProfile } from '../../src/services/userService'
import type { CourseExamSummary, CourseStudyLiveClass } from '../../src/services/courseService'

const profilePath = '/student/learning-profile'

test('Course curriculum keeps only overall progress and colors completed and active lessons from backend state', async ({ page }, testInfo) => {
  await installProfile(page)
  const giftBase = { phaseId: 'color-phase', lessonCount: 3, completedLessonCount: 0, progressPercentage: 0, chapterCount: 1 }
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.course, courseType: 'MAIN', title: 'Khóa học có trạng thái', totalLessons: 9, completedLessons: 3, progressPercentage: 33,
    continueLessonId: QUIZ_IDS.nextLesson, continueSectionCourseId: QUIZ_IDS.otherCourse,
    phases: [{ id: 'color-phase', name: 'Giai đoạn nền tảng', sequence: 1, progressPercentage: 33, sections: [], gifts: [
      { ...giftBase, courseId: 'completed-gift', title: 'Khóa nhỏ đã hoàn thành', completedLessonCount: 3, progressPercentage: 100 },
      { ...giftBase, courseId: QUIZ_IDS.otherCourse, title: 'Khóa nhỏ đang học' },
      { ...giftBase, courseId: 'not-started-gift', title: 'Khóa nhỏ chưa học' },
    ] }],
  } } }))
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.otherCourse}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.otherCourse, title: 'Khóa nhỏ đang học', totalLessons: 3, completedLessons: 0, progressPercentage: 0,
    phases: [{ id: null, gifts: [], sections: [{ sectionCourseId: QUIZ_IDS.otherCourse, title: 'Khóa nhỏ đang học', chapters: [{
      id: QUIZ_IDS.chapter, title: 'Chương đang học', lessonCount: 3, completedLessonCount: 1, completed: false, quizzes: [],
      lessons: [
        { id: QUIZ_IDS.lesson, title: 'Bài đã hoàn thành', status: 'COMPLETED', contentType: 'TEXT', sequence: 1, quizzes: [] },
        { id: QUIZ_IDS.nextLesson, title: 'Bài đang học dở', status: 'IN_PROGRESS', contentType: 'TEXT', sequence: 2, quizzes: [] },
        { id: 'not-started-lesson', title: 'Bài chưa bắt đầu', status: 'NOT_STARTED', contentType: 'TEXT', sequence: 3, quizzes: [] },
      ],
    }] }] }],
  } } }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/student/courses/${QUIZ_IDS.course}/study`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('progressbar')).toHaveCount(1)
  for (const [name, state] of [['Khóa nhỏ đã hoàn thành', 'completed'], ['Khóa nhỏ đang học', 'in-progress'], ['Khóa nhỏ chưa học', 'not-started']]) {
    await expect(page.getByRole('button', { name: new RegExp(name) }).locator('xpath=../..')).toHaveAttribute('data-learning-state', state)
  }
  const completed = page.getByRole('button', { name: /Bài đã hoàn thành/ })
  const active = page.getByRole('button', { name: /Bài đang học dở/ })
  const pending = page.getByRole('button', { name: /Bài chưa bắt đầu/ })
  await expect(completed).toHaveAttribute('data-learning-state', 'completed')
  await expect(active).toHaveAttribute('data-learning-state', 'in-progress')
  await expect(pending).toHaveAttribute('data-learning-state', 'not-started')
  const colors = await Promise.all([completed, active, pending].map(row => row.evaluate(element => getComputedStyle(element).backgroundColor)))
  expect(colors[0]).not.toBe(colors[1])
  expect(colors[1]).toBe(colors[2])
  await page.screenshot({ path: testInfo.outputPath('curriculum-states-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('curriculum-states-mobile.png'), fullPage: true })
})

test('Course live cards respect joinability, timezone, recordings, filters and pagination', async ({ page }, testInfo) => {
  await installProfile(page)
  const base: CourseStudyLiveClass = { id: 'session-next', title: 'Buổi học gần nhất', startTime: '2026-11-17T03:00:00Z',
    endTime: '2026-11-17T04:00:00Z', timezone: 'Asia/Ho_Chi_Minh', status: 'SCHEDULED',
    provider: 'ZOOM', instructorName: 'Giảng viên QA', joinable: false, meetingUrl: 'https://example.invalid/next',
    type: 'COURSE', seriesName: 'Luyện đề tổng hợp', dayNumber: 1 }
  let joinNext = false
  let status = 200
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/live-classes`, route => route.fulfill({
    status, json: status === 200 ? { success: true, data: { courseId: QUIZ_IDS.course, courseTitle: 'Khóa QA',
      next: { ...base, joinable: joinNext }, upcoming: [
        { ...base, joinable: joinNext },
        { ...base, id: 'session-live', title: 'Buổi đang diễn ra', status: 'LIVE', joinable: true, meetingUrl: 'https://example.invalid/join' },
        { ...base, id: 'session-later', title: 'Buổi chưa được tham gia', meetingUrl: 'https://example.invalid/locked' },
        { ...base, id: 'session-no-url', title: 'Buổi chưa có liên kết', joinable: true, meetingUrl: null },
        { ...base, id: 'session-invalid-url', title: 'Buổi có liên kết không hợp lệ', joinable: true, meetingUrl: 'javascript:alert(1)' },
      ], past: [
        { ...base, id: 'past-with-recording', title: 'Buổi có bản ghi', status: 'COMPLETED', recordingUrl: 'https://example.invalid/recording', meetingUrl: null },
        { ...base, id: 'past-no-recording', title: 'Buổi chưa có bản ghi', status: 'COMPLETED', meetingUrl: null },
        { ...base, id: 'past-multiple', title: 'Buổi có nhiều bản ghi', status: 'COMPLETED', meetingUrl: null,
          recordingUrl: 'https://example.invalid/recording-one', recordings: [
            { id: 'rec-a', recordingUrl: 'https://example.invalid/recording-one' },
            { id: 'rec-b', recordingUrl: 'https://example.invalid/recording-two' },
          ] },
      ] } } : { success: false, message: 'Không lấy được lịch kiểm thử' },
  }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  const url = `/student/courses/${QUIZ_IDS.course}/study?tab=live`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const list = page.getByRole('list', { name: 'Danh sách lớp học trực tuyến', exact: true })
  const cards = list.getByRole('listitem')
  await expect(cards).toHaveCount(6)
  await expect(page.getByRole('tab', { name: /^Tất cả 8$/ })).toBeVisible()
  await expect(cards.nth(0).getByText('10:00 – 11:00', { exact: true })).toBeVisible()
  await expect(cards.nth(0).getByText('Giờ học · GMT+7', { exact: true })).toBeVisible()
  await expect(cards.nth(0).getByText('Giảng viên QA', { exact: true })).toBeVisible()
  await expect(cards.nth(0).getByRole('link')).toHaveCount(0)
  await expect(cards.nth(1).getByRole('link', { name: 'Tham gia Buổi đang diễn ra', exact: true })).toHaveAttribute('href', 'https://example.invalid/join')
  await expect(cards.nth(2).getByRole('link')).toHaveCount(0)
  await expect(cards.nth(3).getByRole('button', { name: 'Chưa có liên kết' })).toBeDisabled()
  await expect(cards.nth(4).getByRole('link')).toHaveCount(0)
  await expect(cards.nth(5).getByRole('link', { name: 'Xem bản ghi Buổi có bản ghi', exact: true })).toHaveAttribute('href', 'https://example.invalid/recording')
  await page.screenshot({ path: testInfo.outputPath('course-live-cards-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Trang lớp học sau', exact: true }).click()
  await expect(cards).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Trang lớp học sau', exact: true })).toBeDisabled()
  await page.getByRole('tab', { name: /^Đã qua/ }).click()
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(1).getByText('Chưa có bản ghi cho buổi học này.', { exact: true })).toBeVisible()
  await cards.nth(2).getByText('Xem bản ghi (2)', { exact: true }).click()
  await expect(cards.nth(2).getByRole('link')).toHaveCount(2)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('tab', { name: /^Đã qua/ })).toHaveAttribute('aria-selected', 'true')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('course-live-cards-mobile.png'), fullPage: true })
  await page.getByRole('tab', { name: /^Sắp tới/ }).click()
  joinNext = true
  await page.getByRole('button', { name: 'Tải lại lịch học trực tuyến', exact: true }).click()
  await expect(cards.nth(0).getByRole('link', { name: 'Tham gia Buổi học gần nhất', exact: true })).toHaveAttribute('href', 'https://example.invalid/next')
  status = 403
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Bạn chưa có quyền tham gia lớp học của khóa này', { exact: true })).toBeVisible()
  await expect(list).toHaveCount(0)
  status = 500
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Không thể tải lịch học trực tuyến', { exact: true })).toBeVisible()
  status = 200
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(cards).toHaveCount(5)
})

test('Course exam cards preserve backend states, zero scores and the return to exams on desktop and mobile', async ({ page }, testInfo) => {
  await installProfile(page)
  const base: CourseExamSummary = { id: 'exam-new', type: 'EXAM', title: 'Đề thi thử số 1', questionCount: 120,
    durationMinutes: 150, maxAttempts: 3, passingPercentage: 60, showAnswers: false,
    availableFrom: null, availableUntil: null, practiceAllowed: false, attemptsUsed: 0,
    bestPercentage: null, passed: false, locked: false, lockReason: null, inProgressAttemptId: null }
  const exams: CourseExamSummary[] = [base,
    { ...base, id: 'exam-progress', title: 'Đề đang làm', attemptsUsed: 1, inProgressAttemptId: 'active-attempt' },
    { ...base, id: 'exam-zero', title: 'Đề đã làm điểm không', attemptsUsed: 1, bestPercentage: 0 },
    { ...base, id: 'exam-passed', title: 'Đề đã đạt', attemptsUsed: 2, bestPercentage: 80, passed: true, showAnswers: true },
    { ...base, id: 'exam-closed', title: 'Đề đã hết hạn', locked: true, lockReason: 'CLOSED', availableUntil: '2026-01-01T00:00:00Z' },
    { ...base, id: 'exam-full', title: 'Đề hết lượt', locked: true, lockReason: 'NO_ATTEMPTS_LEFT', attemptsUsed: 3, bestPercentage: 20 },
    { ...base, id: 'exam-future', title: 'Đề chưa mở', locked: true, lockReason: 'NOT_OPEN_YET', availableFrom: '2030-01-01T00:00:00Z' },
  ]
  let responseStatus = 200
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/exams`, route => route.fulfill({
    status: responseStatus, json: responseStatus === 200 ? { success: true, data: exams } : { success: false, message: 'Không thể lấy đề kiểm thử' },
  }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study?tab=exams`
  await page.goto(studyPath, { waitUntil: 'domcontentloaded' })
  const list = page.getByRole('list', { name: 'Danh sách bài thi', exact: true })
  const cards = list.getByRole('listitem')
  await expect(cards).toHaveCount(6)
  await expect(cards.nth(0).getByText('120 câu hỏi')).toBeVisible()
  await expect(cards.nth(0).getByText('150 phút')).toBeVisible()
  await expect(cards.nth(0).getByText('Chưa có điểm')).toBeVisible()
  await expect(cards.nth(2).getByText('0%', { exact: true })).toBeVisible()
  await expect(cards.nth(3).getByText('80%', { exact: true })).toBeVisible()
  await expect(cards.nth(4).getByText('Đã đóng', { exact: true })).toBeVisible()
  await expect(cards.nth(5).getByText('Hết lượt chính thức', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trang bài thi trước', exact: true })).toBeDisabled()
  const firstRow = await Promise.all([0, 1, 2].map(index => cards.nth(index).boundingBox()))
  expect(Math.abs(firstRow[0]!.y - firstRow[2]!.y)).toBeLessThan(2)
  await list.screenshot({ path: testInfo.outputPath('course-exam-cards-desktop.png') })
  await page.getByRole('button', { name: 'Trang bài thi sau', exact: true }).click()
  await expect(cards).toHaveCount(1)
  await expect(cards.nth(0).getByText('Chưa mở', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trang bài thi sau', exact: true })).toBeDisabled()
  await cards.nth(0).getByRole('button', { name: 'Xem bài thi Đề chưa mở', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/quizzes/exam-future')
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(`${studyPath}&examPage=2`)
  await expect(cards).toHaveCount(1)
  await page.getByRole('button', { name: 'Trang bài thi trước', exact: true }).click()
  await page.getByRole('tab', { name: /^Đã làm/ }).click()
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0).getByText('0%', { exact: true })).toBeVisible()
  await expect(cards.nth(0)).toHaveAttribute('data-completed', 'true')
  await expect(page.getByRole('navigation', { name: 'Phân trang bài thi', exact: true })).toHaveCount(0)
  await list.screenshot({ path: testInfo.outputPath('course-exam-cards-completed.png') })
  await page.getByRole('tab', { name: /^Chưa làm/ }).click()
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(1).getByText('Đang làm', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: /^Tất cả/ }).click()
  await cards.nth(1).getByRole('button', { name: 'Tiếp tục bài thi Đề đang làm', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/quizzes/exam-progress')
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(studyPath)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await list.screenshot({ path: testInfo.outputPath('course-exam-cards-mobile.png') })
  responseStatus = 403
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Bạn chưa có quyền xem bài thi', { exact: true })).toBeVisible()
  await expect(list).toHaveCount(0)
  responseStatus = 500
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Không thể tải bài thi', { exact: true })).toBeVisible()
  responseStatus = 200
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(cards).toHaveCount(6)
})

test('Course study tabs show empty mascots and the draggable tutor shows guidance on every click', async ({ page }, testInfo) => {
  await installProfile(page)
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/exams`, route => route.fulfill({ json: { success: true, data: [] } }))
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/live-classes`, route => route.fulfill({ json: { success: true, data: { next: null, upcoming: [], past: [] } } }))
  await page.route(url => url.pathname === '/api/v1/student/ai/requests', route => route.fulfill({ json: { success: true, data: { content: [], last: true } } }))
  await page.setViewportSize({ width: 1440, height: 900 })
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study`
  await page.goto(`${studyPath}?tab=plan`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(studyPath)
  await expect(page.getByRole('tab', { name: 'Lộ trình học', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Bài thi', exact: true }).click()
  await expect(page.getByText('Khóa học chưa có bài thi', { exact: true })).toBeVisible()
  await expect(page.getByRole('tabpanel').locator('img[src="/mascot/03.png"]')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('course-tabs-empty-desktop.png') })
  await page.getByRole('tab', { name: 'Lớp học trực tuyến', exact: true }).click()
  await expect(page.getByText('Chưa có lịch học trực tuyến', { exact: true })).toBeVisible()
  await expect(page.getByRole('tabpanel').locator('img[src="/mascot/03.png"]')).toBeVisible()
  const launcher = page.getByRole('button', { name: 'Mở Gia sư AI', exact: true })
  const before = (await launcher.boundingBox())!
  await page.mouse.move(before.x + 48, before.y + 40)
  await page.mouse.down()
  await page.mouse.move(before.x - 150, before.y - 100, { steps: 10 })
  await page.mouse.up()
  const after = (await launcher.boundingBox())!
  expect(after.x).toBeLessThan(before.x - 100)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(`${studyPath}?tab=live`)
  await launcher.click()
  const guide = page.getByRole('dialog', { name: 'Học cùng Gia sư AI' })
  await expect(guide).toBeVisible()
  await expect(guide.locator('img')).toHaveCount(0)
  await expect(guide.getByText(/Kéo mascot/)).toHaveCount(0)
  await guide.screenshot({ path: testInfo.outputPath('tutor-guide-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await guide.screenshot({ path: testInfo.outputPath('tutor-guide-mobile.png') })
  await page.setViewportSize({ width: 1440, height: 900 })
  await guide.getByRole('button', { name: 'Để sau', exact: true }).click()
  await expect(page).toHaveURL(`${studyPath}?tab=live`)
  await launcher.click()
  await guide.getByRole('button', { name: 'Bắt đầu dùng', exact: true }).click()
  await expect(page).toHaveURL('/student/tutor')
  await page.getByRole('button', { name: 'Quay lại học tập', exact: true }).click()
  await expect(page).toHaveURL(`${studyPath}?tab=live`)
  await launcher.click()
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: 'Bắt đầu dùng', exact: true }).click()
  await expect(page).toHaveURL('/student/tutor')
  await page.getByRole('button', { name: 'Quay lại học tập', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => (await launcher.boundingBox())!.x + SIZE_FOR_TEST).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('course-tabs-empty-mobile.png'), fullPage: true })
})

const SIZE_FOR_TEST = 96

test('Course gifts expand lessons inline, retain course context and keep mascot inside the banner', async ({ page }, testInfo) => {
  await installProfile(page)
  let giftReads = 0
  const chapter = {
    id: QUIZ_IDS.chapter, title: 'Chương học trực tiếp', sequence: 1, lessonCount: 1,
    completedLessonCount: 0, completed: false, quizzes: [], lessons: [{
      id: QUIZ_IDS.lesson, title: 'Bài học trong khóa nhỏ', sequence: 1, contentType: 'VIDEO',
      durationSeconds: 60, status: 'NOT_STARTED', quizzes: [],
    }],
  }
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.course, title: 'Khóa chính kiểm thử', courseType: 'MAIN', totalLessons: 1,
    completedLessons: 0, progressPercentage: 0, continueLessonId: null, continueSectionCourseId: null,
    phases: [{ id: 'inline-phase', name: 'Giai đoạn kiểm thử', sequence: 1, progressPercentage: 0,
      sections: [], gifts: [{ courseId: QUIZ_IDS.otherCourse, title: 'Khóa nhỏ xổ xuống', lessonCount: 1,
        completedLessonCount: 0, progressPercentage: 0 }] }],
  } } }))
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.otherCourse}/study`, route => {
    giftReads++
    return route.fulfill({ json: { success: true, data: {
      courseId: QUIZ_IDS.otherCourse, title: 'Khóa nhỏ xổ xuống', courseType: 'SECTION',
      phases: [{ id: null, gifts: [], sections: [{ sectionCourseId: QUIZ_IDS.otherCourse,
        title: 'Khóa nhỏ xổ xuống', progressPercentage: 0, lessonCount: 1, completedLessonCount: 0,
        chapters: [chapter] }] }],
    } } })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  const studyPath = `/student/courses/${QUIZ_IDS.course}/study`
  await page.goto(studyPath, { waitUntil: 'domcontentloaded' })
  const gift = page.getByRole('button', { name: 'Khóa nhỏ xổ xuống' })
  await expect(gift).toBeVisible()
  expect(giftReads).toBe(0)
  await gift.click()
  const chapterButton = page.getByRole('button', { name: 'Chương học trực tiếp' })
  await expect(chapterButton).toBeVisible()
  await expect(chapterButton).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Khóa nhỏ xổ xuống', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('progressbar', { name: 'Khóa nhỏ xổ xuống', exact: true })).toHaveCount(0)
  await expect(page.getByRole('progressbar', { name: 'Tiến độ khóa học', exact: true })).toHaveCount(1)
  await chapterButton.click()
  await expect(page.getByText('Bài học trong khóa nhỏ', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(studyPath)
  await expect(page.getByRole('link', { name: 'Vào học', exact: true })).toHaveCount(0)
  const mascot = page.locator('img[src="/mascot/05.png"]')
  const image = await mascot.boundingBox()
  const banner = await mascot.locator('xpath=ancestor::header').boundingBox()
  expect(image!.y).toBeGreaterThanOrEqual(banner!.y)
  expect(image!.x + image!.width).toBeLessThanOrEqual(banner!.x + banner!.width)
  await page.screenshot({ path: testInfo.outputPath('course-flat-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('course-flat-mobile.png'), fullPage: true })
  await page.getByText('Bài học trong khóa nhỏ', { exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`)
  expect(await page.evaluate(() => window.history.state.lessonStudyCourseId)).toBe(QUIZ_IDS.course)
})

test('Course analytics compares all chapter tests, keeps partial data and shows the empty mascot', async ({ page }, testInfo) => {
  await installCourseAnalytics(page)
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.course, courseType: 'MAIN', totalLessons: 1, completedLessons: 0, progressPercentage: 0,
    phases: [{ sections: [{ chapters: [{ quizzes: [
      { id: 'chapter-a', title: 'Cuối chương 1', type: 'CHAPTER' }, { id: 'chapter-b', title: 'Cuối chương 2', type: 'CHAPTER' },
      { id: 'quick-outside-scope', title: 'Quiz nhanh', type: 'QUICK' },
    ], lessons: [] }] }] }], exams: [],
  } } }))
  let failure = false
  let empty = false
  const requests: string[] = []
  await page.route(url => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-3)!
    requests.push(id)
    if (failure && id === 'chapter-b') return route.fulfill({ status: 403, json: { success: false, message: 'Không được xem bài kiểm thử' } })
    if (empty) return route.fulfill({ json: { success: true, data: [] } })
    return route.fulfill({ json: { success: true, data: [1, 2].map(index => ({
      attemptId: `${id}-${index}`, attemptNumber: index, status: 'GRADED', mode: 'EXAM', percentage: id === 'chapter-a' ? 40 + index * 10 : 60 + index * 10,
      submittedAt: `2026-11-${String(index + (id === 'chapter-a' ? 1 : 3)).padStart(2, '0')}T02:00:00Z`,
    })) } })
  })
  const url = `${profilePath}?tab=learning&resultType=CHAPTER&resultQuiz=ALL`
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  const chart = analytics.getByRole('img', { name: 'Biểu đồ điểm các lần làm bài trong khóa học, đơn vị phần trăm' })
  await expect(chart.locator('circle')).toHaveCount(4)
  await expect(chart.locator('polyline')).toHaveCount(1)
  await expect(chart.locator('polyline')).toHaveAttribute('stroke', '#fd8945')
  await expect(analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true })).toContainText('Tất cả bài trong loại đã chọn')
  expect(new Set(requests)).toEqual(new Set(['chapter-a', 'chapter-b']))
  await expect(analytics.getByRole('table').getByText('Cuối chương 1', { exact: true })).toHaveCount(2)
  await expect(analytics.getByRole('table').getByText('Cuối chương 2', { exact: true })).toHaveCount(2)
  for (const line of await chart.locator('polyline').evaluateAll(elements => elements.map(element => element.getAttribute('points')!.split(' ')))) expect(line).toHaveLength(4)
  await expect(chart.locator('circle title')).toContainText(['Cuối chương 1', 'Cuối chương 1', 'Cuối chương 2', 'Cuối chương 2'])
  await analytics.screenshot({ path: testInfo.outputPath('all-chapter-tests.png') })
  await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Tất cả loại bài', exact: true }).click()
  await expect(chart.locator('polyline')).toHaveCount(2)
  expect(new Set(await chart.locator('polyline').evaluateAll(elements => elements.map(element => element.getAttribute('stroke'))))).toEqual(new Set(['#fd8945', '#1e88ff']))
  await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Kiểm tra cuối chương', exact: true }).click()
  await expect(chart.locator('polyline')).toHaveCount(1)
  await analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true }).click()
  await page.getByRole('option', { name: 'Cuối chương 1', exact: true }).click()
  await expect(chart.locator('circle')).toHaveCount(2)
  await expect(analytics.getByRole('button', { name: 'Xem bài kiểm tra', exact: true })).toBeVisible()
  failure = true
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expect(analytics.getByText(/Đã tải 1\/2 bài/)).toBeVisible()
  await expect(chart.locator('circle')).toHaveCount(2)
  failure = false
  await analytics.getByRole('button', { name: 'Thử tải lại lịch sử', exact: true }).click()
  await expect(chart.locator('circle')).toHaveCount(4)
  empty = true
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(analytics.getByText('Chưa có kết quả theo bộ lọc', { exact: true })).toBeVisible()
  await expect(analytics.locator('img[src="/mascot/03.png"]')).toBeVisible()
  expect(await analytics.locator('img[src="/mascot/03.png"]').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('Course analytics batches the selected type with no more than four simultaneous history requests', async ({ page }) => {
  await installCourseAnalytics(page)
  const quizzes = Array.from({ length: 9 }, (_, index) => ({ id: `batch-${index}`, title: `Bài chương ${index + 1}`, type: 'CHAPTER' }))
  await page.route(url => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.course, courseType: 'MAIN', totalLessons: 1, completedLessons: 0, progressPercentage: 0,
    phases: [{ sections: [{ chapters: [{ quizzes, lessons: [{ quizzes: [quizzes[0]] }] }] }] }], exams: [],
  } } }))
  let concurrent = 0
  let maximum = 0
  const ids = new Set<string>()
  await page.route(url => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), async route => {
    concurrent++
    maximum = Math.max(maximum, concurrent)
    ids.add(new URL(route.request().url()).pathname.split('/').at(-3)!)
    await new Promise(resolve => setTimeout(resolve, 30))
    await route.fulfill({ json: { success: true, data: [] } })
    concurrent--
  })
  await page.goto(`${profilePath}?tab=learning&resultType=CHAPTER`, { waitUntil: 'domcontentloaded' })
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  await expect(analytics.getByText('Chưa có kết quả theo bộ lọc', { exact: true })).toBeVisible()
  expect(ids.size).toBe(9)
  expect(maximum).toBeLessThanOrEqual(4)
})

async function installCourseAnalytics(page: Page) {
  const state = await installProfile(page)
  const quizzes = [
    { id: QUIZ_IDS.quiz, type: 'QUICK', title: 'Quiz nhanh theo dõi', bestPercentage: 70 },
    { id: 'history-lesson', type: 'LESSON', title: 'Kiểm tra cuối bài theo dõi', bestPercentage: null },
    { id: 'history-chapter', type: 'CHAPTER', title: 'Kiểm tra cuối chương theo dõi', bestPercentage: 60 },
  ]
  await page.route((url) => url.pathname === '/api/v1/courses/my', route => route.fulfill({ json: { success: true, data: [
    { course: { id: QUIZ_IDS.course, title: 'Khóa theo dõi', courseType: 'MAIN' }, progressPercentage: 50 },
    { course: { id: QUIZ_IDS.otherCourse, title: 'Khóa thứ hai', courseType: 'SECTION' }, progressPercentage: 0 },
  ] } }))
  await page.route((url) => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.course, courseType: 'MAIN', totalLessons: 2, completedLessons: 1, progressPercentage: 50,
    phases: [{ sections: [{ chapters: [{ quizzes, lessons: [{ quizzes: [quizzes[0]] }] }] }] }],
    exams: [{ id: QUIZ_IDS.exam, type: 'EXAM', title: 'Thi thử theo dõi', bestPercentage: 75 }],
  } } }))
  await page.route((url) => url.pathname === `/api/v1/courses/${QUIZ_IDS.otherCourse}/study`, route => route.fulfill({ json: { success: true, data: {
    courseId: QUIZ_IDS.otherCourse, courseType: 'SECTION', totalLessons: 1, completedLessons: 0, progressPercentage: 0,
    phases: [{ sections: [{ chapters: [{ quizzes: [{ id: 'second-course-quiz', type: 'LESSON', title: 'Bài khóa thứ hai', bestPercentage: null }], lessons: [] }] }] }], exams: [],
  } } }))
  return state
}

test('Course analytics filters course and quiz types without a mode filter and returns from a result', async ({ page }, testInfo) => {
  const state = await installCourseAnalytics(page)
  state.quiz.studentStatus = 'GRADED'
  state.quiz.studentShowAnswers = false
  const requests: string[] = []
  await page.route((url) => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), route => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    const values = path.includes(QUIZ_IDS.quiz) ? [
      { attemptId: 'first-grade', attemptNumber: 1, mode: 'EXAM', status: 'GRADED', percentage: 40, score: 2, maxScore: 5, submittedAt: '2026-11-01T02:00:00Z', timeSpentSeconds: 90 },
      { attemptId: QUIZ_IDS.attempt, attemptNumber: 3, mode: 'EXAM', status: 'GRADED', percentage: 70, score: 3.5, maxScore: 5, submittedAt: '2026-11-05T02:00:00Z', timeSpentSeconds: 120 },
      { attemptId: 'practice-grade', attemptNumber: 2, mode: 'PRACTICE', status: 'GRADED', percentage: 80, score: 4, maxScore: 5, submittedAt: '2026-11-04T02:00:00Z', timeSpentSeconds: 60 },
      { attemptId: 'legacy-grade', attemptNumber: 2, status: 'GRADED', percentage: 50, submittedAt: '2026-11-03T02:00:00Z' },
      { attemptId: 'open-grade', attemptNumber: 4, mode: 'EXAM', status: 'IN_PROGRESS', percentage: 99 },
      { attemptId: 'missing-grade', attemptNumber: 5, mode: 'EXAM', status: 'GRADED', percentage: null },
    ] : []
    return route.fulfill({ json: { success: true, data: values } })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${profilePath}?tab=learning&resultQuiz=${QUIZ_IDS.quiz}&resultMode=EXAM`, { waitUntil: 'domcontentloaded' })
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  const chart = analytics.getByRole('img', { name: 'Biểu đồ điểm các lần làm bài trong khóa học, đơn vị phần trăm' })
  await expect(chart.locator('circle')).toHaveCount(4)
  await expect(chart.locator('polyline')).toHaveCount(1)
  await expect(analytics.getByRole('heading', { name: 'Tiến bộ học tập', exact: true })).toHaveCount(1)
  await expect(analytics.getByRole('heading', { name: 'Kết quả học tập', exact: true })).toHaveCount(0)
  await expect(analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true })).toContainText('Quiz nhanh theo dõi')
  expect(requests.every(path => path.includes(QUIZ_IDS.quiz))).toBe(true)
  expect((await chart.boundingBox())!.height).toBeLessThanOrEqual(272)
  const courseFilter = await analytics.getByRole('button', { name: 'Lọc kết quả theo khóa học', exact: true }).boundingBox()
  const quizFilter = await analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true }).boundingBox()
  expect(Math.abs(courseFilter!.y - quizFilter!.y)).toBeLessThan(2)
  await expect(analytics.getByRole('button', { name: 'Lọc chế độ làm bài', exact: true })).toHaveCount(0)
  expect(new URL(page.url()).searchParams.has('resultMode')).toBe(false)
  expect((await chart.locator('polyline').getAttribute('points'))!.split(' ')).toHaveLength(4)
  const historyRegion = analytics.getByRole('region', { name: 'Cuộn lịch sử làm bài', exact: true })
  const chartBox = await chart.locator('..').boundingBox()
  const historyBox = await historyRegion.boundingBox()
  expect(chartBox!.height).toBe(272)
  expect(historyBox!.height).toBe(272)
  expect(Math.abs(chartBox!.y - historyBox!.y)).toBeLessThan(2)
  expect(Math.abs(chartBox!.y + chartBox!.height - historyBox!.y - historyBox!.height)).toBeLessThan(2)
  expect(await historyRegion.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await expect(analytics.getByText(/3 lượt mỗi khung/)).toHaveCount(0)
  await expect(analytics.getByText(/Đang xem .* bài trong bộ lọc/)).toHaveCount(0)
  await expect(analytics.getByText(/Biểu đồ hiển thị tối đa 30 lượt/)).toHaveCount(0)
  await historyRegion.evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect(historyRegion.getByText('Lần 1', { exact: true })).toBeVisible()
  await historyRegion.evaluate(element => { element.scrollTop = 0 })
  await analytics.screenshot({ path: testInfo.outputPath('course-analytics-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await analytics.screenshot({ path: testInfo.outputPath('course-analytics-chart-mobile.png') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await analytics.getByRole('button', { name: 'Xem kết quả', exact: true }).first().click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  await page.getByRole('button', { name: 'Quay lại hồ sơ năng lực', exact: true }).click()
  await expect(analytics.getByRole('button', { name: 'Lọc chế độ làm bài', exact: true })).toHaveCount(0)
  await expect(chart.locator('circle')).toHaveCount(4)
  for (const label of ['Quiz nhanh', 'Kiểm tra cuối bài', 'Kiểm tra cuối chương', 'Đề thi thử']) {
    await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true }).click()
    await expect(page.getByRole('option')).toHaveCount(2)
    await page.keyboard.press('Escape')
  }
  await expect(chart).toHaveCount(0)
  await analytics.getByRole('button', { name: 'Lọc kết quả theo khóa học', exact: true }).click()
  await page.getByRole('option', { name: 'Khóa thứ hai', exact: true }).click()
  await expect(analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true })).toContainText('Tất cả bài trong khóa')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await analytics.screenshot({ path: testInfo.outputPath('course-analytics-mobile.png') })
  expect(state.quiz.requests.filter(item => item.path.endsWith('/review'))).toHaveLength(0)
})

test('Course analytics handles loading, retries, forbidden and missing histories', async ({ page }) => {
  await installCourseAnalytics(page)
  let status = 503
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route((url) => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), async route => {
    await pending
    return route.fulfill({ status, json: status === 200 ? { success: true, data: [] } : { success: false, message: 'Không tải được lịch sử kiểm thử' } })
  })
  await page.goto(`${profilePath}?tab=learning`, { waitUntil: 'domcontentloaded' })
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  await expect(analytics.getByRole('status')).toHaveText('Đang tải lịch sử bài kiểm tra…')
  release()
  await expect(analytics.getByText('Không thể tải lịch sử bài kiểm tra', { exact: true })).toBeVisible()
  status = 200
  await analytics.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(analytics.getByText(/Chưa có lượt đã chấm/)).toBeVisible()
  status = 403
  await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Kiểm tra cuối chương', exact: true }).click()
  await expect(analytics.getByText('Bạn không có quyền xem lịch sử bài này', { exact: true })).toBeVisible()
  status = 404
  await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Kiểm tra cuối bài', exact: true }).click()
  await expect(analytics.getByText('Không tìm thấy bài kiểm tra', { exact: true })).toBeVisible()
})

test('Course analytics ignores a late history from a previously selected quiz', async ({ page }) => {
  await installCourseAnalytics(page)
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  const quickPath = `/api/v1/assessments/quizzes/${QUIZ_IDS.quiz}/attempts/me`
  await page.route((url) => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), async route => {
    const old = new URL(route.request().url()).pathname === quickPath
    if (old) await pending
    return route.fulfill({ json: { success: true, data: [{ attemptId: old ? 'stale-grade' : 'current-grade', attemptNumber: 1, status: 'GRADED', mode: 'EXAM', percentage: old ? 99 : 25, submittedAt: '2026-11-05T02:00:00Z' }] } })
  })
  await page.goto(`${profilePath}?tab=learning`, { waitUntil: 'domcontentloaded' })
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  await expect(analytics.getByRole('status')).toHaveText('Đang tải lịch sử bài kiểm tra…')
  await analytics.getByRole('button', { name: 'Lọc loại bài kiểm tra', exact: true }).click()
  await page.getByRole('option', { name: 'Đề thi thử', exact: true }).click()
  const chart = analytics.getByRole('img', { name: 'Biểu đồ điểm các lần làm bài trong khóa học, đơn vị phần trăm' })
  await expect(chart.locator('circle title')).toContainText(['25%'])
  const response = page.waitForResponse(item => new URL(item.url()).pathname === quickPath)
  release()
  await response
  await expect(chart.locator('circle title')).toContainText(['25%'])
  await expect(analytics.getByText('99%', { exact: true })).toHaveCount(0)
})

test('Learning goal dialog keeps both steps compact and preserves subject selections', async ({ page }, testInfo) => {
  const state = await installProfile(page)
  state.student.onboardingState = 'COMPLETED'
  state.student.targetUniversity = 'Đại học Bách khoa'
  state.student.targetMajor = 'Kỹ thuật'
  const subjects = ['Toán học', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý']
  await page.route((url) => url.pathname === '/api/v1/users/student-profiles/subjects', (route) => route.fulfill({ json: { success: true,
    data: subjects.map((name, index) => ({ id: `subject-${index}`, name })),
  } }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Mục tiêu học tập', exact: true })).toBeVisible()
  await expect(dialog.getByText('VNUHCM_DGNL', { exact: true })).toHaveCount(0)
  await dialog.screenshot({ path: testInfo.outputPath('goal-dialog-desktop.png') })
  const body = dialog.locator('[aria-busy]')
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await dialog.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBe(0)
  const math = dialog.getByRole('group', { name: 'Toán học', exact: true })
  await math.getByRole('button', { name: 'Tự tin', exact: true }).click()
  await expect(math.getByRole('button', { name: 'Tự tin', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await math.getByRole('button', { name: 'Cần cải thiện', exact: true }).click()
  await expect(math.getByRole('button', { name: 'Tự tin', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(math.getByRole('button', { name: 'Cần cải thiện', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('group', { name: 'Tiếng Anh', exact: true }).getByRole('button', { name: 'Tự tin', exact: true }).click()
  await dialog.screenshot({ path: testInfo.outputPath('subjects-dialog-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await dialog.screenshot({ path: testInfo.outputPath('subjects-dialog-mobile.png') })
  await dialog.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(dialog.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true })).toHaveValue('900')
  await dialog.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(math.getByRole('button', { name: 'Cần cải thiện', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].subjectAssessments).toEqual(expect.arrayContaining([
    { categoryId: 'subject-0', level: 'NEEDS_WORK' }, { categoryId: 'subject-2', level: 'STRONG' },
  ]))
})

test('Preview latest assessment with mock result data', async ({ page }, testInfo) => {
  await installProfile(page)
  await page.route((url) => url.pathname === '/api/v1/assessments/results/me', (route) => route.fulfill({ json: { success: true, data: {
    id: 'preview-result', totalQuestions: 120, correctCount: 90, wrongCount: 30, score: 90,
    overallPercentage: 75, timeSpentSeconds: 7200, level: 'INTERMEDIATE',
    strongCategoryId: 'language', strongCategoryName: 'Sử dụng ngôn ngữ',
    weakCategoryId: 'science', weakCategoryName: 'Giải quyết vấn đề',
    categories: [
      { categoryId: 'language', categoryName: 'Sử dụng ngôn ngữ', correctCount: 36, totalCount: 40, percentage: 90 },
      { categoryId: 'math', categoryName: 'Toán học, tư duy logic và phân tích số liệu', correctCount: 24, totalCount: 30, percentage: 80 },
      { categoryId: 'science', categoryName: 'Giải quyết vấn đề', correctCount: 30, totalCount: 50, percentage: 60 },
    ],
  } } }))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  const summary = page.locator('section').filter({ has: page.getByText('Kết quả đánh giá gần nhất', { exact: true }) }).last()
  await expect(summary.getByText('90/120 câu đúng', { exact: true })).toBeVisible()
  await expect(summary.getByText('120 câu', { exact: true })).toBeVisible()
  await expect(summary.getByText('30 câu', { exact: true })).toBeVisible()
  await expect(summary.getByText('2 giờ', { exact: true })).toBeVisible()
  await expect(summary.getByText('Sử dụng ngôn ngữ', { exact: true })).toBeVisible()
  await summary.screenshot({ path: testInfo.outputPath('assessment-summary-preview.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await summary.screenshot({ path: testInfo.outputPath('assessment-summary-mobile.png') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await summary.getByRole('button', { name: 'Xem năng lực theo lĩnh vực' }).click()
  await expect(page.getByRole('tab', { name: 'Học tập', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Luyện đề', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(`${profilePath}?tab=learning`)
  const details = page.getByText('Kết quả theo lĩnh vực', { exact: true }).locator('..')
  await expect(details.getByText('36/40 câu đúng', { exact: true })).toBeVisible()
  await details.screenshot({ path: testInfo.outputPath('assessment-details-preview.png') })
})

test('My courses links to the catalog and AI returns to its course or lesson after reload', async ({ page }, testInfo) => {
  const state = await installQuizFixture(page, 'STUDENT', { trackLessonProgress: true })
  await page.route((url) => url.pathname === '/api/v1/courses/my', (route) => route.fulfill({ json: { success: true, data: [
    { course: { id: QUIZ_IDS.course, title: 'Khóa học Student', courseType: 'MAIN' }, progressPercentage: 0 },
  ] } }))
  await page.route((url) => url.pathname === '/api/v1/student/ai/requests', (route) =>
    route.fulfill({ json: { success: true, data: { content: [], last: true } } })
  )
  await page.goto('/student/courses', { waitUntil: 'domcontentloaded' })
  const sidebar = page.getByRole('navigation', { name: 'Điều hướng học sinh' })
  for (const name of ['Tổng quan', 'Lộ trình của tôi', 'Lịch học', 'Gia sư AI', 'Khám phá khóa học']) {
    await expect(sidebar.getByRole('button', { name, exact: true })).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Khám phá khóa học', exact: true }).click()
  await expect(page).toHaveURL('/courses')
  await page.goto('/student/courses', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Khóa học Student/ }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.course}/study`)
  await page.getByRole('button', { name: 'Mở Gia sư AI', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Học cùng Gia sư AI' })).toBeVisible()
  await page.getByRole('button', { name: 'Bắt đầu dùng', exact: true }).click()
  await expect(page).toHaveURL('/student/tutor')
  await expect(sidebar.getByRole('button', { name: 'Khóa học của tôi', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Quay lại học tập', exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.course}/study`)
  await page.getByRole('button', { name: 'Tiếp tục học', exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`)
  await page.getByRole('button', { name: 'Gia sư AI', exact: true }).click()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Quay lại học tập', exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`)
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.course}/study`)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Mở Gia sư AI', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('course-ai-mobile.png'), fullPage: true })
  await page.goto('/student/tutor', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Quay lại học tập', exact: true }).click()
  await expect(page).toHaveURL('/student/courses')
  expect(state.pageErrors).toEqual([])
})

async function installProfile(page: Page) {
  const quiz = await installQuizFixture(page, 'STUDENT')
  await page.route((url) => /^\/api\/v1\/assessments\/quizzes\/[^/]+\/attempts\/me$/.test(url.pathname), (route) => route.fulfill({ json: { success: true, data: [] } }))
  quiz.quizzes.push({ ...quiz.quizzes[0], id: 'placement-qa', type: 'PLACEMENT', status: 'PUBLISHED' })
  const state = {
    placementStatus: 200, studyStatus: 200, secondCourse: false, planStatus: 200, emptyCourses: false,
    historyStatus: 200, activityStatus: 200, gradedHistory: false, overlapCourse: false, quiz,
    elapsedPercentage: 40 as number | null,
    writes: [] as Record<string, unknown>[],
    student: { id: 'student-profile', onboardingState: 'DEFERRED', targetExam: 'VNUHCM_DGNL',
      targetScore: 900, targetUniversity: 'Trường mục tiêu', subjectAssessments: [] } as StudentProfile,
  }
  await page.route((url) => url.pathname === '/api/v1/users/profiles', (route) => route.fulfill({ json: { success: true, data: {
    id: QUIZ_IDS.user, role: 'STUDENT', roles: ['STUDENT'], firstName: 'Nhu', lastName: 'Quỳnh', displayName: 'Quỳnh Như',
    email: 'student@example.invalid', status: 'ACTIVE', emailVerified: true, onboardingState: state.student.onboardingState,
    studentProfile: state.student,
  } } }))
  await page.route((url) => url.pathname === '/api/v1/users/student-profiles', (route) => {
    const payload = route.request().postDataJSON()
    state.writes.push(payload)
    Object.assign(state.student, payload)
    return route.fulfill({ json: { success: true, data: state.student } })
  })
  await page.route((url) => url.pathname === '/api/v1/users/student-profiles/subjects', (route) =>
    route.fulfill({ json: { success: true, data: [{ id: 'math', name: 'Toán học' }] } })
  )
  await page.route((url) => url.pathname === '/api/v1/credits/streak', (route) => route.fulfill({
    status: state.activityStatus, json: state.activityStatus === 200 ? { success: true, data: {
      current: 1, longest: 3, doneToday: true, freezesAvailable: 0, maxFreezes: 2, freezePrice: 10, today: '2026-11-14',
      days: [{ date: '2026-11-14', lessonsCompleted: 2, quizzesPassed: 1, qualified: true, frozen: false }],
    } } : { success: false, message: 'Lỗi tải hoạt động kiểm thử' },
  }))
  await page.route((url) => url.pathname === '/api/v1/assessments/placement/attempts/me', (route) => route.fulfill({
    status: state.historyStatus, json: state.historyStatus === 200 ? { success: true, data: state.gradedHistory ? [
      { attemptId: 'old-attempt', attemptNumber: 1, status: 'GRADED', percentage: 60, score: 3, maxScore: 5, startedAt: '2026-11-01T02:00:00Z', submittedAt: '2026-11-01T02:30:00Z' },
      { attemptId: QUIZ_IDS.attempt, attemptNumber: 2, status: 'GRADED', percentage: 100, score: 5, maxScore: 5, startedAt: '2026-11-14T02:00:00Z', submittedAt: '2026-11-14T02:30:00Z' },
      { attemptId: 'open-attempt', attemptNumber: 3, status: 'IN_PROGRESS', percentage: null, startedAt: '2026-11-14T03:00:00Z', submittedAt: null },
    ] : [] } : { success: false, code: state.historyStatus === 404 ? 'PLACEMENT_QUIZ_NOT_FOUND' : 'INTERNAL_ERROR' },
  }))
  await page.route((url) => url.pathname === '/api/v1/assessments/results/me', (route) => route.fulfill({
    status: state.placementStatus,
    json: state.placementStatus === 200 ? { success: true, data: {
      id: 'placement-result', totalQuestions: 5, correctCount: 3, wrongCount: 2, score: 3,
      overallPercentage: 60, level: 'INTERMEDIATE', strongCategoryName: 'Tiếng Anh', weakCategoryName: 'Toán học',
      categories: [
        { categoryId: 'math', categoryName: 'Toán học', correctCount: 1, totalCount: 3, percentage: 33.33 },
        { categoryId: 'english', categoryName: 'Tiếng Anh', correctCount: 2, totalCount: 2, percentage: 100 },
      ],
    } } : { success: false, code: state.placementStatus === 404 ? 'PLACEMENT_RESULT_NOT_FOUND' : 'INTERNAL_ERROR' },
  }))
  await page.route((url) => url.pathname === '/api/v1/courses/my', (route) => route.fulfill({ json: { success: true,
    data: state.emptyCourses ? [] : [
      { course: { id: QUIZ_IDS.course, title: 'Khóa ĐGNL QA', courseType: 'MAIN' }, progressPercentage: 50 },
      ...(state.secondCourse ? [{ course: { id: QUIZ_IDS.otherCourse, title: 'Khóa chưa tải được', courseType: 'SECTION' } }] : []),
    ],
  } }))
  const phases = [{ id: 'phase', name: 'Nền tảng', gifts: [], progressPercentage: 50, sections: [{ sectionCourseId: QUIZ_IDS.otherCourse, title: 'Toán', chapters: [{
    id: QUIZ_IDS.chapter, title: 'Chương 1', quizzes: [], lessons: [
      { id: QUIZ_IDS.lesson, title: 'Bài tiếp theo QA', status: 'COMPLETED', quizzes: [{ id: QUIZ_IDS.quiz, type: 'QUICK', title: 'Quiz đã chấm QA', bestPercentage: 80 }] },
      { id: QUIZ_IDS.nextLesson, title: 'Bài 2', status: 'NOT_STARTED', quizzes: [] },
    ],
  }] }] }]
  await page.route((url) => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/study`, (route) => route.fulfill({
    status: state.studyStatus, json: { success: state.studyStatus === 200, data: {
      courseId: QUIZ_IDS.course, title: 'Khóa ĐGNL QA', courseType: 'MAIN', totalLessons: 2, completedLessons: 1,
      progressPercentage: 50, continueLessonId: QUIZ_IDS.lesson, continueLessonTitle: 'Bài tiếp theo QA',
      continueSectionCourseId: QUIZ_IDS.otherCourse, phases,
      exams: [{ id: QUIZ_IDS.exam, type: 'EXAM', title: 'Thi thử QA', bestPercentage: 75, attemptsUsed: 1, maxAttempts: 3, locked: false }],
    } },
  }))
  await page.route((url) => url.pathname === `/api/v1/courses/${QUIZ_IDS.otherCourse}/study`, (route) =>
    route.fulfill(state.overlapCourse ? { json: { success: true, data: { courseId: QUIZ_IDS.otherCourse, courseType: 'SECTION', title: 'Khóa bổ trợ', totalLessons: 2, completedLessons: 1, progressPercentage: 50, phases } } }
      : { status: 503, json: { success: false, message: 'Không tải được khóa thứ hai' } })
  )
  await page.route((url) => url.pathname === `/api/v1/courses/${QUIZ_IDS.course}/enrollment-plan`, (route) => route.fulfill({
    status: state.planStatus, json: { success: state.planStatus === 200, data: {
      branch: 'CONDENSED_PRIORITIZED', message: null, elapsedPercentage: state.elapsedPercentage, recommendedCourse: null, catchUpRecordings: [],
      sectionOrder: [{ contentSectionId: 'content-1', title: 'Toán học theo lộ trình', phaseName: 'Giai đoạn nền tảng', sequence: 1 }],
    } },
  }))
  return state
}

test('Learning profile uses real categories and progress and restores the selected tab', async ({ page }, testInfo) => {
  await installProfile(page)
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Hồ sơ năng lực', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Tổng quan', exact: true })).toHaveCSS('background-color', 'rgb(30, 136, 255)')
  await expect(page.getByRole('heading', { name: 'Hồ sơ năng lực', exact: true })).toHaveCSS('color', 'rgb(30, 136, 255)')
  const mascot = page.getByRole('img', { name: 'Linh vật HOCLUC', exact: true })
  await expect(mascot).toHaveAttribute('src', '/mascot/01.png')
  await expect.poll(() => mascot.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  const banner = mascot.locator('xpath=ancestor::section[1]')
  expect((await banner.boundingBox())!.height).toBeLessThan(300)
  await expect(page.getByText('Mức năng lực', { exact: true })).toBeVisible()
  await expect(page.getByText('3/5 câu đúng', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Phân tích AI', exact: true })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('overview-desktop.png'), fullPage: true })
  await page.getByRole('tab', { name: 'Học tập', exact: true }).click()
  await expect(page.getByText('33.33%', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('competency-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Bài đánh giá đầu vào', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(`${profilePath}?tab=learning`)

  await page.getByRole('tab', { name: 'Học tập', exact: true }).click()
  await expect(page.getByText('1/2 bài hoàn thành', { exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('tab', { name: 'Học tập', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: /Khóa ĐGNL QA/ }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`)
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Khóa học', exact: true }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.course}/study`)

  await page.goto(`${profilePath}?tab=plan`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Tiến bộ học tập', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lộ trình của khóa học', exact: true })).toHaveCount(0)
  const courseListRegion = page.getByRole('region', { name: 'Khóa học của bạn', exact: true })
  const distributionRegion = page.getByRole('region', { name: 'Phân bố tiến độ khóa học', exact: true })
  await expect(courseListRegion.getByRole('heading', { name: 'Khóa học của bạn', exact: true })).toHaveCount(0)
  await expect(distributionRegion.getByRole('heading', { name: 'Tiến độ khóa học', exact: true })).toHaveCount(0)
  const firstCourse = await courseListRegion.locator('article').first().boundingBox()
  const distributionCard = await distributionRegion.getByRole('img').locator('..').locator('..').boundingBox()
  expect(Math.abs(firstCourse!.y - distributionCard!.y)).toBeLessThan(2)
  await page.screenshot({ path: testInfo.outputPath('learning-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Tổng quan học tập', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await expect(page.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('learning-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Khóa học của tôi', exact: true }).click()
  await expect(page).toHaveURL('/student/courses')
})

test('Learning profile distinguishes an absent assessment from a failed assessment and keeps successful courses', async ({ page }) => {
  const state = await installProfile(page)
  state.placementStatus = 503
  state.secondCourse = true
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Không thể tải kết quả đánh giá đầu vào', { exact: true })).toBeVisible()
  await expect(page.getByText('Bạn chưa có kết quả đánh giá đầu vào', { exact: true })).toHaveCount(0)
  state.placementStatus = 404
  await page.getByText('Không thể tải kết quả đánh giá đầu vào', { exact: true }).locator('..').getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByText('Bạn chưa có kết quả đánh giá đầu vào', { exact: true })).toBeVisible()
  await expect(page.getByText('Mức năng lực', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Học tập', exact: true }).click()
  await expect(page.getByText('1/2 bài hoàn thành', { exact: true })).toBeVisible()
  await expect(page.getByText('Không thể tải tiến độ khóa học này', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Khóa ĐGNL QA/ })).toBeVisible()
})

test('Learning profile saves goals without leaving the page, persists them after reload and fits mobile', async ({ page }, testInfo) => {
  const state = await installProfile(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('1201')
  await expect(dialog.getByRole('alert')).toContainText('0 đến 1200')
  await dialog.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('950')
  await dialog.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await dialog.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(profilePath)
  await expect(page.getByText('950 / 1200', { exact: true }).first()).toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ targetScore: 950, onboardingState: 'COMPLETED' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('950 / 1200', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('competency-mobile.png'), fullPage: true })
})

test('Learning profile gives useful empty course and analytics states without requesting roadmap', async ({ page }) => {
  const state = await installProfile(page)
  const requests: string[] = []
  page.on('request', request => requests.push(new URL(request.url()).pathname))
  state.emptyCourses = true
  await page.goto(`${profilePath}?tab=learning`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Bạn chưa có khóa học nào', { exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Học tập', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Chưa có bài kiểm tra phù hợp để theo dõi điểm.', { exact: true })).toBeVisible()
  state.emptyCourses = false
  state.planStatus = 503
  state.elapsedPercentage = null
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true })).toBeEnabled()
  await expect(page.getByText('Chưa có lượt đã chấm cho các bài kiểm tra đang chọn. Lượt đang làm hoặc chưa có điểm không được đưa vào biểu đồ.', { exact: true })).toBeVisible()
  expect(requests.some(path => path.endsWith('/enrollment-plan'))).toBe(false)
  await expect(page.getByRole('progressbar', { name: 'Tiến trình thời gian khóa học' })).toHaveCount(0)
})

test('Learning profile plots only graded attempts and returns from an explicit result without requesting hidden answers', async ({ page }, testInfo) => {
  const state = await installProfile(page)
  state.gradedHistory = true
  state.quiz.studentStatus = 'GRADED'
  state.quiz.studentShowAnswers = false
  await page.goto(`${profilePath}?tab=practice`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(`${profilePath}?tab=learning`)
  await expect(page.getByRole('region', { name: 'Khóa học của bạn', exact: true })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Hồ sơ năng lực' }).getByRole('tab')).toHaveCount(2)
  const chart = page.getByRole('img', { name: 'Biểu đồ tỷ lệ điểm các lượt đánh giá đầu vào, đơn vị phần trăm' })
  await expect(chart).toBeVisible()
  await expect(chart.locator('circle')).toHaveCount(2)
  const assessmentHistory = page.getByRole('region', { name: 'Theo dõi đánh giá đầu vào', exact: true })
  const chartFrame = await chart.locator('..').boundingBox()
  const historyFrame = await assessmentHistory.getByRole('list', { name: 'Lịch sử đánh giá đầu vào', exact: true }).boundingBox()
  expect(chartFrame!.height).toBe(272)
  expect(historyFrame!.height).toBe(272)
  expect(Math.abs(chartFrame!.y - historyFrame!.y)).toBeLessThan(2)
  await expect(page.getByText(/^Đã chấm ·/)).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Năng lực và luyện đề', exact: true }).getByText('Thi thử QA', { exact: true })).toBeVisible()
  await expect(page.getByText('Điểm cao nhất: 75%', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem bài thi', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/quizzes/${QUIZ_IDS.exam}`)
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(`${profilePath}?tab=learning`)
  await expect(page.getByRole('button', { name: 'Tiếp tục làm bài', exact: true })).toBeVisible()
  expect(state.quiz.requests.filter((request) => request.path.endsWith('/review'))).toHaveLength(0)
  await page.screenshot({ path: testInfo.outputPath('profile-practice-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Xem kết quả', exact: true }).first().click()
  await expect(page).toHaveURL(`/student/assessments/attempts/${QUIZ_IDS.attempt}/review`)
  await expect(page.getByText('Bài kiểm tra này không hiển thị đáp án sau khi nộp.', { exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Quay lại hồ sơ năng lực', exact: true }).click()
  await expect(page).toHaveURL(`${profilePath}?tab=learning`)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(chart).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('profile-practice-mobile.png'), fullPage: true })
  expect(state.quiz.pageErrors).toEqual([])
})

test('Learning profile deduplicates course quizzes without showing removed overview statistics or activity calendar', async ({ page }) => {
  const state = await installProfile(page)
  state.secondCourse = true
  state.overlapCourse = true
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Bài học đã hoàn thành', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Khóa học đã đăng ký', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Tần suất học tập', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Chuỗi học tập', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem tất cả', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Phân bố 2 khóa học' })).toBeVisible()
  const analytics = page.getByRole('region', { name: 'Theo dõi kết quả khóa học', exact: true })
  await analytics.getByRole('button', { name: 'Chọn bài kiểm tra xem biểu đồ', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Quiz đã chấm QA', exact: true })).toHaveCount(1)
  await page.getByRole('option', { name: 'Quiz đã chấm QA', exact: true }).click()
  const returnUrl = page.url()
  await analytics.getByRole('button', { name: 'Xem bài kiểm tra', exact: true }).click()
  await expect(page).toHaveURL(`/student/assessments/quizzes/${QUIZ_IDS.quiz}`)
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page).toHaveURL(returnUrl)
})

test('Learning profile distinguishes history failures from absent published tests', async ({ page }) => {
  const state = await installProfile(page)
  state.historyStatus = 503
  await page.goto(`${profilePath}?tab=practice`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Không thể tải lịch sử đánh giá', { exact: true })).toBeVisible()
  state.historyStatus = 404
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.getByText('Chưa có đề đánh giá đầu vào hiện hành', { exact: true })).toBeVisible()
})

test('Learning profile tabs stay below the header while scrolling and reveal the next panel on desktop and mobile', async ({ page }, testInfo) => {
  await installProfile(page)
  for (const viewport of [{ width: 1280, height: 600 }, { width: 390, height: 700 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${profilePath}?tab=learning`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Tiến bộ học tập', exact: true })).toBeVisible()
    const tabs = page.getByRole('tablist', { name: 'Hồ sơ năng lực' })
    const topbar = page.locator('.student-topbar')
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect.poll(async () => {
      const header = await topbar.boundingBox()
      const bar = await tabs.boundingBox()
      return Boolean(header && bar && bar.y >= header.y + header.height && bar.y <= header.y + header.height + 32)
    }).toBe(true)
    await page.evaluate(() => window.scrollBy(0, 150))
    await expect(tabs.getByRole('tab', { name: 'Tổng quan', exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`sticky-tabs-${viewport.width}.png`) })
    await tabs.getByRole('tab', { name: 'Tổng quan', exact: true }).click()
    await expect(tabs.getByRole('tab', { name: 'Tổng quan', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(async () => {
      const panel = await page.getByRole('tabpanel').boundingBox()
      const bar = await tabs.boundingBox()
      return Boolean(panel && bar && panel.y >= bar.y + bar.height)
    }).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  }
})

test('Overview scrolls compact courses beside the streak and sorts newest enrollments first', async ({ page }, testInfo) => {
  await installProfile(page)
  const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#1e88ff"/></svg>')
  const entries = [
    { id: 'old', title: 'Khóa cũ', date: '2026-11-01T12:00:00Z' },
    { id: 'new', title: 'Khóa mới nhất', date: '2026-11-14T12:00:00Z' },
    { id: 'middle', title: 'Khóa mới thứ hai', date: '2026-11-08T12:00:00Z' },
    { id: 'fourth', title: 'Khóa mới thứ ba', date: '2026-11-04T12:00:00Z' },
    { id: 'older', title: 'Khóa lâu nhất', date: '2026-10-15T12:00:00Z' },
    { id: 'invalid-date', title: 'Khóa ngày không hợp lệ', date: 'invalid' },
    { id: 'missing-date', title: 'Khóa chưa có ngày', date: undefined },
  ]
  await page.route((url) => url.pathname === '/api/v1/courses/my', (route) => route.fulfill({ json: { success: true, data: entries.map((entry) => ({
    course: { id: entry.id, title: entry.title, imageUrl: cover, description: 'Mô tả khóa từ API', courseType: 'SECTION' }, enrolledAt: entry.date,
  })) } }))
  await page.route((url) => entries.some((entry) => url.pathname === `/api/v1/courses/${entry.id}/study`), (route) => route.fulfill({ json: { success: true, data: {
    courseId: route.request().url().split('/').at(-2), title: 'Khóa đã đăng ký', courseType: 'SECTION', totalLessons: 1, completedLessons: 0,
    progressPercentage: 0, continueLessonId: QUIZ_IDS.lesson, continueSectionCourseId: QUIZ_IDS.otherCourse, phases: [], exams: [],
  } } }))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(profilePath, { waitUntil: 'domcontentloaded' })
  const carousel = page.getByRole('region', { name: 'Danh sách tiến độ khóa học', exact: true })
  const titles = carousel.getByRole('heading', { level: 3 })
  await expect(titles).toHaveText(['Khóa mới nhất', 'Khóa mới thứ hai', 'Khóa mới thứ ba', 'Khóa cũ', 'Khóa lâu nhất', 'Khóa ngày không hợp lệ', 'Khóa chưa có ngày'])
  await expect(carousel.locator('img')).toHaveCount(0)
  await expect(page.getByText('Mới nhất theo ngày đăng ký', { exact: true })).toHaveCount(0)
  const streakBox = await page.getByRole('region', { name: 'Chuỗi học tập', exact: true }).boundingBox()
  const courseBox = await carousel.boundingBox()
  expect(streakBox!.x).toBeGreaterThanOrEqual(courseBox!.x + courseBox!.width)
  await expect(carousel.getByRole('group', { name: 'Chuyển nhóm khóa học' })).toHaveCount(0)
  const scrollArea = carousel.getByRole('region', { name: 'Cuộn xem các khóa học', exact: true })
  expect(await scrollArea.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  const boxes = await carousel.locator('article').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))
  expect(boxes[1]).toBeGreaterThan(boxes[0])
  const firstCard = await carousel.locator('article').first().boundingBox()
  expect(firstCard!.width).toBeGreaterThan(courseBox!.width * 0.9)
  const contentBox = await page.locator('.student-page').first().boundingBox()
  expect(Math.abs(courseBox!.x - contentBox!.x)).toBeLessThan(2)
  expect(Math.abs(streakBox!.x + streakBox!.width - contentBox!.x - contentBox!.width)).toBeLessThan(2)
  expect(Math.abs(streakBox!.y - courseBox!.y)).toBeLessThan(2)
  expect(firstCard!.height).toBeLessThanOrEqual(160)
  await expect(carousel.getByText('Mô tả khóa từ API', { exact: true })).toHaveCount(0)
  await expect(carousel.getByText(/Đăng ký:/)).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('course-cards-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 1920, height: 1080 })
  const wideContent = await page.locator('.student-page').first().boundingBox()
  const wideCourses = await carousel.boundingBox()
  const wideStreak = await page.getByRole('region', { name: 'Chuỗi học tập', exact: true }).boundingBox()
  expect(Math.abs(wideContent!.x - wideCourses!.x)).toBeLessThan(2)
  expect(Math.abs(wideStreak!.x + wideStreak!.width - wideContent!.x - wideContent!.width)).toBeLessThan(2)
  expect(wideStreak!.width).toBeLessThanOrEqual(360)
  await page.screenshot({ path: testInfo.outputPath('course-cards-wide.png'), fullPage: true })
  await scrollArea.focus()
  await page.keyboard.press('End')
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect(titles.last()).toBeInViewport()
  await page.keyboard.press('Home')
  await expect(titles.first()).toBeInViewport()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(titles).toHaveCount(7)
  await scrollArea.scrollIntoViewIfNeeded()
  await scrollArea.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect(titles.last()).toBeInViewport()
  await scrollArea.evaluate((element) => { element.scrollTop = 0 })
  const mobileBoxes = await carousel.locator('article').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))
  expect(mobileBoxes[1]).toBeGreaterThan(mobileBoxes[0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('course-cards-mobile.png'), fullPage: true })
  await carousel.getByRole('button', { name: /Khóa mới nhất/ }).click()
  await expect(page).toHaveURL(`/student/courses/${QUIZ_IDS.otherCourse}/study/lessons/${QUIZ_IDS.lesson}`)
})
