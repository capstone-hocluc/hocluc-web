import { expect, test, type Page } from '@playwright/test'
import { fixtureProblems, IDS, installCrudFixture } from './core-crud-fixture'
import { installQuizFixture } from './quiz-permissions-fixture'
import { localDateTimeToInstant, localToday, startOfLocalWeek, addLocalDays } from '../../src/lib/scheduling'
import type { ConsoleLiveClass, LiveClassAdmissionItem } from '../../src/services/liveClassService'

const SUBJECT = '61000000-0000-0000-0000-000000000001'

function answer(data: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, status, message: 'OK', data }) }
}

async function mockTeacherZoom(page: Page, connected = true) {
  await page.route((url) => /^\/api\/v1\/users\/[^/]+\/zoom-account$/.test(url.pathname), (route) =>
    route.fulfill(
      answer({
        connected,
        zoomEmail: connected ? 'an@hocluc.test' : null,
        planType: connected ? 'LICENSED' : null,
        zoomEnabled: true,
        status: connected ? 'CONNECTED' : null,
        lastError: null,
      })
    )
  )
}

test('staff schedules without capacity, views admissions, corrects attendance from detail and refunds a live session', async ({ page }) => {
  test.setTimeout(120_000)
  await installCrudFixture(page, 'STAFF')
  await mockTeacherZoom(page, true)

  const today = localToday()
  const weekStart = startOfLocalWeek(today)
  const monDate = weekStart
  const tueDate = addLocalDays(weekStart, 1)
  const wedDate = addLocalDays(weekStart, 2)

  let classes: ConsoleLiveClass[] = [
    {
      id: 'lc-scheduled',
      title: 'Buổi sắp tới',
      startTime: localDateTimeToInstant(monDate, 9, 0),
      endTime: localDateTimeToInstant(monDate, 11, 0),
      status: 'SCHEDULED',
      courseId: IDS.main,
      courseTitle: 'MAIN Toán',
      teacherId: IDS.teacher,
      teacherName: 'Giáo viên QA',
      admittedCount: 0,
      refunded: false,
    },
    {
      id: 'lc-live',
      title: 'Buổi đang dạy',
      startTime: localDateTimeToInstant(tueDate, 14, 0),
      endTime: localDateTimeToInstant(tueDate, 16, 0),
      status: 'LIVE',
      courseId: IDS.main,
      courseTitle: 'MAIN Toán',
      teacherId: IDS.teacher,
      teacherName: 'Giáo viên QA',
      admittedCount: 1,
      refunded: false,
    },
    {
      id: 'lc-cancelled',
      title: 'Buổi đã hủy',
      startTime: localDateTimeToInstant(wedDate, 14, 0),
      endTime: localDateTimeToInstant(wedDate, 16, 0),
      status: 'CANCELLED',
      courseId: IDS.main,
      courseTitle: 'MAIN Toán',
      teacherId: IDS.teacher,
      teacherName: 'Giáo viên QA',
      admittedCount: 0,
      refunded: false,
    },
  ]

  const admissionsByClass: Record<string, LiveClassAdmissionItem[]> = {
    'lc-scheduled': [],
    'lc-cancelled': [],
    'lc-live': [
      {
        studentId: IDS.student,
        studentName: 'Nguyễn Minh Anh',
        paidAmount: 2,
        paidAt: localDateTimeToInstant(tueDate, 14, 2),
        refundedAt: null,
        joinedAt: localDateTimeToInstant(tueDate, 14, 3),
        attendanceMinutes: 45,
      },
    ],
  }

  const previewBodies: Array<Record<string, unknown>> = []
  const createBodies: Array<Record<string, unknown>> = []
  const refundBodies: Array<Record<string, unknown>> = []

  await page.route(`**/api/v1/courses/${IDS.main}/teachers/${IDS.teacher}/teachable-subjects`, (route) =>
    route.fulfill(answer([{ id: SUBJECT, name: 'Toán', slug: 'toan' }]))
  )
  await page.route(`**/api/v1/teachers/availabilities/${IDS.teacher}`, (route) =>
    route.fulfill(
      answer({
        teacherId: IDS.teacher,
        teacherName: 'Giáo viên QA',
        recurringSlots: [{ dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '22:00' }],
        exceptions: [],
      })
    )
  )
  await page.route('**/api/v1/live-timetables/preview', async (route) => {
    previewBodies.push(route.request().postDataJSON() as Record<string, unknown>)
    return route.fulfill(
      answer({
        sessions: [
          {
            index: 1,
            date: monDate,
            start: '19:30',
            end: '21:30',
            startTime: localDateTimeToInstant(monDate, 19, 30),
            endTime: localDateTimeToInstant(monDate, 21, 30),
            title: 'Toán · Buổi 1',
            subjectId: SUBJECT,
            subject: 'Toán',
            blockingErrors: [],
          },
        ],
        blockingErrors: [],
        warnings: [],
        requestedSessions: 1,
        missingSessions: 0,
        canCreate: true,
      })
    )
  })
  await page.route(`**/api/v1/courses/${IDS.main}/live-timetables`, async (route) => {
    createBodies.push(route.request().postDataJSON() as Record<string, unknown>)
    return route.fulfill(
      answer({
        recurringClassIds: ['rc-1'],
        sessions: [
          {
            liveClassId: 'lc-new-1',
            title: 'Toán · Buổi 1',
            startTime: localDateTimeToInstant(monDate, 19, 30),
            needsAttention: false,
          },
        ],
        requestedSessions: 1,
        missingSessions: 0,
        warnings: [],
      })
    )
  })

  await page.route('**/api/v1/live-classes**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/v1/live-classes') return route.fulfill(answer(classes))

    const [, id, action] = path.replace('/api/v1/live-classes', '').split('/')
    if (action === 'admissions') return route.fulfill(answer(admissionsByClass[id] ?? []))
    if (action === 'attendances' && request.method() === 'GET') {
      return route.fulfill(
        answer([
          {
            id: 'att-1',
            scheduleId: id,
            studentId: IDS.student,
            studentName: 'Nguyễn Minh Anh',
            studentEmail: 'student@example.invalid',
            status: 'PRESENT',
            attendanceMinutes: 45,
          },
        ])
      )
    }
    if (action === 'attendances' && request.method() === 'PUT') {
      return route.fulfill(answer([]))
    }
    if (action === 'refund' && request.method() === 'POST') {
      refundBodies.push(request.postDataJSON() as Record<string, unknown>)
      classes = classes.map((c) => (c.id === id ? { ...c, refunded: true } : c))
      admissionsByClass[id] = (admissionsByClass[id] ?? []).map((a) => ({
        ...a,
        refundedAt: new Date().toISOString(),
      }))
      return route.fulfill(answer({ refundedCount: 1, refundedAmount: 2 }))
    }
    return route.fulfill(answer(null, 501))
  })

  await page.goto('/console/staff/schedules')

  // Staff sidebar must not expose "Điểm danh".
  await expect(page.locator('aside nav').getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0)

  // Wizard creates timetable without capacity field or payload.
  await page.getByRole('button', { name: 'Xếp lịch dạy', exact: true }).click()
  const wizard = page.getByRole('dialog', { name: 'Xếp lịch dạy', exact: true })
  await wizard.getByLabel('Tên lớp').fill('Toán tối 2-4')
  await wizard.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(wizard.getByLabel('Số chỗ mỗi buổi')).toHaveCount(0)
  await wizard.getByRole('button', { name: 'Xem trước', exact: true }).click()
  await expect(wizard.getByText(/chỗ/)).toHaveCount(0)
  await wizard.getByRole('button', { name: 'Tạo 1 buổi', exact: true }).click()
  await expect(wizard).toBeHidden()
  expect('capacity' in previewBodies[0]).toBe(false)
  expect('capacity' in createBodies[0]).toBe(false)

  // Switch to list view: shows admittedCount instead of seats.
  await page.getByRole('button', { name: 'Danh sách', exact: true }).click()
  await expect(page.getByText('1 học viên đã vào lớp', { exact: true })).toBeVisible()

  // SCHEDULED & CANCELLED hide "Hoàn Sao".
  await page.getByRole('button', { name: 'Xem chi tiết Buổi sắp tới', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Chi tiết buổi học', exact: true })
  await expect(sheet.getByRole('button', { name: 'Hoàn Sao', exact: true })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Xem chi tiết Buổi đã hủy', exact: true }).click()
  await expect(sheet.getByRole('button', { name: 'Hoàn Sao', exact: true })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Close', exact: true }).click()

  // LIVE class shows admissions, manual attendance button, and "Hoàn Sao" action.
  await page.getByRole('button', { name: 'Xem chi tiết Buổi đang dạy', exact: true }).click()
  await expect(sheet.getByText('Nguyễn Minh Anh', { exact: true })).toBeVisible()
  await expect(sheet.getByText(/45 phút/)).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Điểm danh', exact: true })).toBeVisible()

  await sheet.getByRole('button', { name: 'Hoàn Sao', exact: true }).click()
  const refundDialog = page.getByRole('dialog', { name: 'Hoàn Sao buổi học', exact: true })
  await refundDialog.getByRole('button', { name: 'Hoàn Sao', exact: true }).click()
  await expect(refundDialog.getByText('Vui lòng nhập lý do hoàn Sao.')).toBeVisible()

  await refundDialog.getByLabel('Lý do hoàn Sao').fill('Giáo viên sự cố mạng')
  await refundDialog.getByRole('button', { name: 'Hoàn Sao', exact: true }).click()
  await expect(refundDialog).toBeHidden()
  await expect(page.getByText('Đã hoàn 2 Sao cho 1 học viên.', { exact: true })).toBeVisible()
  expect(refundBodies).toEqual([{ reason: 'Giáo viên sự cố mạng' }])

  expect(fixtureProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [] })
})

test('teacher schedule shows admissions without attendance controls and edits session content', async ({ page }) => {
  test.setTimeout(120_000)
  const state = await installQuizFixture(page, 'TEACHER')
  await page.route('**/api/v1/teacher/zoom', (route) =>
    route.fulfill(
      answer({
        connected: true,
        zoomEmail: 'an@hocluc.test',
        planType: 'LICENSED',
        zoomEnabled: true,
        status: 'CONNECTED',
        lastError: null,
      })
    )
  )

  const today = localToday()
  const weekStart = startOfLocalWeek(today)
  const nextStart = localDateTimeToInstant(addLocalDays(today, 1), 19, 0)
  const nextEnd = localDateTimeToInstant(addLocalDays(today, 1), 21, 0)
  const completedStart = localDateTimeToInstant(weekStart, 9, 0)
  const completedEnd = localDateTimeToInstant(weekStart, 11, 0)

  let upcomingClass: ConsoleLiveClass = {
    id: 'lc-teacher',
    title: 'Toán tối 2-4 · Buổi 1',
    startTime: nextStart,
    endTime: nextEnd,
    status: 'SCHEDULED',
    courseTitle: 'MAIN Toán',
    admittedCount: 3,
    detailsFilled: false,
    refunded: false,
  }
  const completedClass: ConsoleLiveClass = {
    id: 'lc-teacher-done',
    title: 'Buổi đã dạy xong',
    startTime: completedStart,
    endTime: completedEnd,
    status: 'COMPLETED',
    courseTitle: 'MAIN Toán',
    admittedCount: 2,
    detailsFilled: true,
    refunded: false,
  }

  const patched: unknown[] = []
  await page.route('**/api/v1/live-classes**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/v1/live-classes') return route.fulfill(answer([completedClass, upcomingClass]))

    const [, , action] = path.replace('/api/v1/live-classes', '').split('/')
    if (action === 'admissions') {
      return route.fulfill(
        answer([
          {
            studentId: 'stu-1',
            studentName: 'Nguyễn Minh Anh',
            paidAmount: 2,
            paidAt: localDateTimeToInstant(today, 18, 55),
            refundedAt: null,
            joinedAt: localDateTimeToInstant(today, 19, 1),
            attendanceMinutes: 50,
          },
        ])
      )
    }
    if (action === 'details' && request.method() === 'PATCH') {
      patched.push(request.postDataJSON())
      upcomingClass = { ...upcomingClass, ...(request.postDataJSON() as Partial<ConsoleLiveClass>), detailsFilled: true }
      return route.fulfill(answer(upcomingClass))
    }
    return route.fulfill(answer(null, 501))
  })

  await page.goto('/console/teacher/schedule')
  await expect(page.getByText('Chưa điểm danh')).toHaveCount(0)
  await expect(page.getByText('3 học viên đã vào lớp')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0)

  // Open detail dialog: shows admissions and no attendance button.
  await page.getByRole('button', { name: /Toán tối 2-4 · Buổi 1/ }).click()
  const detail = page.getByRole('dialog', { name: 'Toán tối 2-4 · Buổi 1', exact: true })
  await expect(detail.getByText('Nguyễn Minh Anh', { exact: true })).toBeVisible()
  await expect(detail.getByText(/50 phút/)).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Điểm danh', exact: true })).toHaveCount(0)

  // Open content editor from detail dialog.
  await detail.getByRole('button', { name: 'Nội dung buổi', exact: true }).click()
  const contentDialog = page.getByRole('dialog', { name: 'Nội dung buổi học', exact: true })
  await contentDialog.locator('[name="title"]').fill('Phương trình bậc hai')
  await contentDialog.locator('[name="description"]').fill('Ôn công thức nghiệm và Vi-ét.')
  await contentDialog.getByRole('button', { name: 'Lưu nội dung', exact: true }).click()

  await expect(contentDialog).toBeHidden()
  expect(patched).toEqual([{ title: 'Phương trình bậc hai', description: 'Ôn công thức nghiệm và Vi-ét.' }])
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
