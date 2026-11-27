import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'
import type { ConsoleLiveClass } from '../../src/services/liveClassService'

const HOUR = 60 * 60 * 1000

function makeClass(id: string, overrides: Partial<ConsoleLiveClass> = {}): ConsoleLiveClass {
  const start = Date.now() + 24 * HOUR
  return {
    id,
    title: `Buổi ${id}`,
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 2 * HOUR).toISOString(),
    status: 'SCHEDULED',
    courseId: QUIZ_IDS.course,
    courseTitle: 'Khóa Toán QA',
    teacherName: 'Giáo viên QA',
    joinable: false,
    joinPrice: 2,
    admitted: false,
    refunded: false,
    ...overrides,
  }
}

interface ScheduleOptions {
  classes: ConsoleLiveClass[]
  balance?: number
  insufficientCredits?: boolean
  notAdmittedOnRoom?: boolean
}

async function installStudentSchedule(page: Page, options: ScheduleOptions) {
  const state = await installQuizFixture(page, 'STUDENT')
  let balance = options.balance ?? 20
  const calls = { join: [] as string[], room: [] as string[] }
  const answer = (data: unknown, status = 200, code?: string) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, status, code, message: code || 'OK', data }),
  })

  await page.route('**/api/v1/credits/me', (route) =>
    route.fulfill(answer({ available: balance, bonus: 0, paid: balance, held: 0 }))
  )
  await page.route('**/api/v1/live-classes/my-attendance-summary', (route) =>
    route.fulfill(answer({ totalClasses: 3, presentCount: 2, lateCount: 1, absentCount: 0, excusedCount: 0, attendanceRate: 100 }))
  )
  await page.route((url) => url.pathname === '/api/v1/live-classes', (route) =>
    route.fulfill(answer(options.classes))
  )
  await page.route('**/api/v1/live-classes/**', async (route) => {
    const request = route.request()
    const [, id, action] = new URL(request.url()).pathname.replace('/api/v1/live-classes', '').split('/')
    if (action === 'join' && request.method() === 'POST') {
      calls.join.push(id)
      if (options.insufficientCredits) {
        return route.fulfill(answer(null, 402, 'INSUFFICIENT_CREDITS'))
      }
      balance = Math.max(0, balance - 2)
      return route.fulfill(
        answer({ liveClassId: id, paidAmount: 2, paidAt: new Date().toISOString(), alreadyAdmitted: false, balance })
      )
    }
    if (action === 'room' && request.method() === 'POST') {
      calls.room.push(id)
      if (options.notAdmittedOnRoom) {
        return route.fulfill(answer(null, 403, 'LIVE_CLASS_NOT_ADMITTED'))
      }
      return route.fulfill(
        answer({
          liveClassId: id,
          title: `Buổi ${id}`,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + HOUR).toISOString(),
          embedded: false,
          sdkKey: null,
          signature: null,
          meetingNumber: null,
          passcode: null,
          userName: null,
          userEmail: null,
          role: 0,
          zak: null,
          registrantToken: null,
          fallbackUrl: 'https://zoom.us/j/123456',
        })
      )
    }
    return route.fulfill(answer(null, 501))
  })

  return { state, calls, getBalance: () => balance }
}

test('student schedule shows join states, refunded past classes and confirms paid join', async ({ page }) => {
  const now = Date.now()
  const liveStart = new Date(now - 10 * 60 * 1000).toISOString()
  const liveEnd = new Date(now + 90 * 60 * 1000).toISOString()
  const pastStart = new Date(now - 48 * HOUR).toISOString()
  const pastEnd = new Date(now - 46 * HOUR).toISOString()

  const { state, calls, getBalance } = await installStudentSchedule(page, {
    balance: 20,
    classes: [
      makeClass('upcoming-1', { status: 'SCHEDULED', joinable: false, joinPrice: 2 }),
      makeClass('live-unpaid', { startTime: liveStart, endTime: liveEnd, status: 'LIVE', joinable: true, joinPrice: 2, admitted: false }),
      makeClass('live-admitted', { startTime: liveStart, endTime: liveEnd, status: 'LIVE', joinable: true, joinPrice: 2, admitted: true }),
      makeClass('past-refunded', { startTime: pastStart, endTime: pastEnd, status: 'COMPLETED', refunded: true }),
    ],
  })

  await page.goto('/student/schedule')
  await expect(page.getByRole('button', { name: /Giữ chỗ|Hủy giữ chỗ|Hết chỗ/ })).toHaveCount(0)

  const agenda = page.getByRole('region', { name: 'Lịch 7 ngày tới' })
  await expect(agenda.getByRole('button', { name: /^Bắt đầu / })).toBeDisabled()
  await expect(agenda.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true })).toBeEnabled()
  await expect(agenda.getByRole('button', { name: 'Tham gia', exact: true })).toBeEnabled()

  await agenda.getByRole('button', { name: 'Đã học', exact: true }).click()
  await expect(agenda.getByText('Đã hoàn Sao', { exact: true })).toBeVisible()

  await agenda.getByRole('button', { name: 'Sắp tới', exact: true }).click()
  await agenda.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  const dialog = page.getByRole('alertdialog', { name: 'Tham gia buổi học?' })
  await expect(dialog).toContainText('2 Sao')
  await dialog.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  await expect(page).toHaveURL(/\/student\/live-classes\/live-unpaid\/room$/)
  expect(calls.join).toEqual(['live-unpaid'])
  expect(getBalance()).toBe(18)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('student schedule shows insufficient Sao dialog and redirects to wallet', async ({ page }) => {
  const now = Date.now()
  const { state } = await installStudentSchedule(page, {
    balance: 1,
    insufficientCredits: true,
    classes: [
      makeClass('live-unpaid', {
        startTime: new Date(now - 10 * 60 * 1000).toISOString(),
        endTime: new Date(now + 90 * 60 * 1000).toISOString(),
        status: 'LIVE',
        joinable: true,
        joinPrice: 2,
        admitted: false,
      }),
    ],
  })

  await page.goto('/student/schedule')
  const nextCard = page.getByRole('region', { name: 'Buổi tiếp theo' })
  await nextCard.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  const insufficient = page.getByRole('alertdialog', { name: 'Không đủ Sao' })
  await expect(insufficient).toBeVisible()
  await insufficient.getByRole('button', { name: 'Mua gói Sao', exact: true }).click()
  await expect(page).toHaveURL(/\/student\/wallet$/)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('entering live room without admission sends student back to schedule', async ({ page }) => {
  const now = Date.now()
  const { state } = await installStudentSchedule(page, {
    notAdmittedOnRoom: true,
    classes: [
      makeClass('live-unpaid', {
        startTime: new Date(now - 10 * 60 * 1000).toISOString(),
        endTime: new Date(now + 90 * 60 * 1000).toISOString(),
        status: 'LIVE',
        joinable: true,
        joinPrice: 2,
        admitted: false,
      }),
    ],
  })

  await page.goto('/student/live-classes/live-unpaid/room')
  await expect(page).toHaveURL(/\/student\/schedule$/)
  await expect(page.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).first()).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
