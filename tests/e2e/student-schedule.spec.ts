import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'
import type { ClassSessionResponse, ScheduleResponse } from '../../src/types/scheduling'

const course = { id: QUIZ_IDS.course, title: 'Khóa Toán QA' }
const schedule: ScheduleResponse = {
  id: 'schedule-qa', courseId: course.id, courseName: course.title,
  instructorId: QUIZ_IDS.user, instructorName: 'Giáo viên QA', title: 'Lịch đơn QA',
  startTime: '2026-11-09T07:00:00Z', endTime: '2026-11-09T08:00:00Z', timezone: 'Asia/Ho_Chi_Minh',
  deliveryMode: 'OFFLINE', location: 'Phòng QA', status: 'COMPLETED',
}
const session: ClassSessionResponse = {
  id: 'session-qa', recurringClassId: 'series-qa', courseId: course.id,
  teacherId: QUIZ_IDS.user, teacherName: 'Giáo viên QA', title: 'Buổi định kỳ QA', sessionDate: '2026-11-10',
  startTime: '2026-11-10T07:00:00Z', endTime: '2026-11-10T08:00:00Z',
  mode: 'ONLINE', meetingProvider: 'ZOOM', meetingLink: 'https://example.invalid/join', status: 'SCHEDULED', overridden: false,
}
const sessionPath = (courseId: string) => `/api/v1/courses/${courseId}/class-sessions`

async function installSchedule(page: Page, courses = [course]) {
  await installQuizFixture(page, 'STUDENT')
  await page.clock.setFixedTime(new Date('2026-11-09T09:00:00Z'))
  const mock = async (path: string, data: unknown) => page.route(
    (url) => url.pathname === path,
    (route) => route.fulfill({ json: { success: true, data } })
  )
  await mock('/api/v1/schedules/student', [schedule])
  await mock('/api/v1/courses/my', courses.map((item) => ({ course: item })))
  await mock(`/api/v1/courses/${course.id}/attendances/student`, {
    totalSchedules: 1, presentCount: 1, absentCount: 0, lateCount: 0, excusedCount: 0, attendanceRate: 100,
  })
  return mock
}

test('Student sees both weekly sources, session changes and scoped recordings', async ({ page }) => {
  const mock = await installSchedule(page)
  let sessions = [session, session, {
    ...session, id: 'outside-week', title: 'Buổi tuần sau', sessionDate: '2026-11-16',
    startTime: '2026-11-16T07:00:00Z', endTime: '2026-11-16T08:00:00Z',
  }]
  await page.route((url) => url.pathname === sessionPath(course.id), (route) => {
    const query = new URL(route.request().url()).searchParams
    expect(query.get('startDate')).toBe('2026-11-09')
    expect(query.get('endDate')).toBe('2026-11-15')
    return route.fulfill({ json: { success: true, data: sessions } })
  })
  await mock(`/api/v1/schedules/${schedule.id}/my-attendance`, { status: 'PRESENT', attendanceMinutes: 60 })
  await mock(`/api/v1/class-sessions/${session.id}/recordings`, [
    { id: 'valid', title: 'Bản ghi có link', streamUrl: 'https://example.invalid/recording' },
    { id: 'invalid', title: 'Bản ghi thiếu link hợp lệ', videoUrl: 'javascript:void(0)' },
  ])
  const paths: string[] = []
  page.on('request', (request) => paths.push(new URL(request.url()).pathname))

  await page.goto('/student/schedule')
  const detail = page.getByRole('dialog', { name: 'Chi tiết lịch học' })
  const openSession = page.getByRole('button', { name: 'Xem chi tiết ' + session.title })
  await page.getByRole('button', { name: 'Xem chi tiết ' + schedule.title }).click()
  await expect(detail.getByText('Có mặt', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()

  await expect(openSession).toHaveCount(1)
  await expect(page.getByText('Buổi tuần sau', { exact: true })).toHaveCount(0)
  const search = page.getByLabel('Tìm lịch theo tên buổi hoặc lớp')
  await search.fill('Khóa Toán định kỳ')
  await expect(openSession).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem chi tiết ' + schedule.title })).toHaveCount(0)
  await search.clear()
  await openSession.click()
  await expect(detail.getByRole('link', { name: 'Vào lớp' })).toHaveAttribute('href', session.meetingLink!)
  await detail.getByRole('button', { name: 'Bản ghi buổi học' }).click()
  await expect(detail.getByRole('link', { name: 'Xem bản ghi' })).toHaveAttribute('href', 'https://example.invalid/recording')
  await expect(detail.getByText('Chưa có link xem')).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Điểm danh buổi học' })).toHaveCount(0)
  expect(paths).not.toContain(`/api/v1/schedules/${session.id}/my-attendance`)
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()

  const reload = page.getByRole('button', { name: 'Tải lại', exact: true })
  sessions = [{ ...session, startTime: '2026-11-10T09:00:00Z', endTime: '2026-11-10T10:00:00Z', overridden: true }]
  await reload.click()
  await expect(page.getByText('16:00 – 17:00', { exact: true })).toBeVisible()
  await expect(page.getByText('Đã điều chỉnh', { exact: true })).toBeVisible()

  sessions = [{ ...sessions[0], status: 'CANCELLED' }]
  await reload.click()
  await openSession.click()
  await expect(detail.getByText('Đã hủy', { exact: true })).toBeVisible()
  await expect(detail.getByRole('link', { name: 'Vào lớp' })).toHaveCount(0)
})

test('Student keeps available schedules if a course request fails and can retry', async ({ page }) => {
  const secondCourse = { id: QUIZ_IDS.otherCourse, title: 'Khóa thứ hai' }
  const revokedCourse = { id: 'revoked-course', title: 'Khóa hết quyền' }
  const mock = await installSchedule(page, [course, secondCourse, revokedCourse])
  await mock(sessionPath(course.id), [session])
  await page.route((url) => url.pathname === sessionPath(revokedCourse.id), (route) =>
    route.fulfill({ status: 403, json: { success: false, code: 'COURSE_NOT_PURCHASED' } })
  )
  let fail = true
  await page.route((url) => url.pathname === sessionPath(secondCourse.id), (route) => fail
    ? route.fulfill({ status: 503, json: { success: false } })
    : route.fulfill({ json: { success: true, data: [{ ...session, id: 'second-session', courseId: secondCourse.id, title: 'Buổi phục hồi' }] } })
  )

  await page.goto('/student/schedule')
  await expect(page.getByText('Chưa tải được đầy đủ lịch học.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem chi tiết ' + schedule.title })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem chi tiết ' + session.title })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Thử tải lại lịch' }).click()
  await expect(page.getByRole('button', { name: 'Xem chi tiết Buổi phục hồi' })).toBeVisible()
  await expect(page.getByText('Chưa tải được đầy đủ lịch học.')).toHaveCount(0)
})
