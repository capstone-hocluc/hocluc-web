import { expect, test, type Page } from '@playwright/test'
import { studentRoutes } from '../../src/lib/studentRoutes'
import type { CourseLiveClasses, CourseStudyLiveClass } from '../../src/services/courseService'
import { installRoadmapFixture, roadmapProblems, roadmapStudy, ROADMAP_IDS } from './roadmap-fixture'

const HOUR = 60 * 60 * 1000
const REPLAY_URL = 'https://files.example.invalid/recordings/class-past.mp4'

function liveClass(id: string, overrides: Partial<CourseStudyLiveClass> = {}): CourseStudyLiveClass {
  const start = Date.now() + 48 * HOUR
  return {
    id,
    title: `Lớp ${id}`,
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 2 * HOUR).toISOString(),
    status: 'SCHEDULED',
    instructorName: 'Giáo viên QA',
    meetingUrl: null,
    recordingUrl: null,
    joinable: false,
    joinPrice: 2,
    admitted: false,
    refunded: false,
    ...overrides,
  }
}

interface FixtureOptions {
  schedule?: CourseLiveClasses
  balance?: number
  insufficientCredits?: boolean
}

async function installLiveClassRoutes(page: Page, options: FixtureOptions = {}) {
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
  await page.route('**/api/v1/credits/streak', (route) =>
    route.fulfill(answer({ current: 1, longest: 1, doneToday: false, freezesAvailable: 0, maxFreezes: 2, freezePrice: 10, today: '2026-11-27', days: [] }))
  )
  await page.route('**/api/v1/credits/packs', (route) => route.fulfill(answer([])))
  await page.route('**/api/v1/credits/me/history**', (route) => route.fulfill(answer({ content: [], last: true })))

  await page.route('**/api/v1/live-classes/**', async (route) => {
    const request = route.request()
    const [, id, ...rest] = new URL(request.url()).pathname.replace('/api/v1/live-classes', '').split('/')
    const action = rest.join('/')
    if (action === 'join' && request.method() === 'POST') {
      calls.join.push(id)
      if (options.insufficientCredits) {
        roadmapProblems(page)?.expectedNetworkErrors.push(request.url())
        return route.fulfill(answer(null, 402, 'INSUFFICIENT_CREDITS'))
      }
      balance = Math.max(0, balance - 2)
      return route.fulfill(
        answer({ liveClassId: id, paidAmount: 2, paidAt: new Date().toISOString(), alreadyAdmitted: false, balance })
      )
    }
    if (action === 'room' && request.method() === 'POST') {
      calls.room.push(id)
      return route.fulfill(
        answer({
          liveClassId: id,
          title: `Lớp ${id}`,
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
    if (action === 'recordings') return route.fulfill(answer([{ id: 'rec-1', status: 'READY', recordingUrl: REPLAY_URL }]))
    return route.fulfill(answer(null, 501))
  })

  if (options.schedule) {
    await page.route(`**/api/v1/courses/${ROADMAP_IDS.main}/live-classes`, (route) =>
      route.fulfill(answer(options.schedule))
    )
  }

  return calls
}

test.afterEach(async ({ page }) => {
  expect(roadmapProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [], consoleErrors: [] })
})

test('course live cards show the three join states and no seat booking UI', async ({ page }) => {
  const past = Date.now() - 72 * HOUR
  const pastTimes = { startTime: new Date(past).toISOString(), endTime: new Date(past + 2 * HOUR).toISOString() }
  const liveNow = Date.now() - 10 * 60 * 1000
  const liveTimes = { startTime: new Date(liveNow).toISOString(), endTime: new Date(liveNow + 2 * HOUR).toISOString() }

  await installRoadmapFixture(page, { studies: { [ROADMAP_IDS.main]: roadmapStudy() } })
  const calls = await installLiveClassRoutes(page, {
    schedule: {
      courseId: ROADMAP_IDS.main,
      courseTitle: 'MAIN Lộ trình kiểm thử',
      next: null,
      upcoming: [
        liveClass('scheduled', { status: 'SCHEDULED', joinable: false, joinPrice: 2 }),
        liveClass('paid-live', { ...liveTimes, status: 'LIVE', joinable: true, joinPrice: 2, admitted: false }),
        liveClass('free-live', { ...liveTimes, status: 'LIVE', joinable: true, joinPrice: 0, admitted: false }),
        liveClass('admitted-live', { ...liveTimes, status: 'LIVE', joinable: true, joinPrice: 2, admitted: true }),
      ],
      past: [
        liveClass('past-refunded', { ...pastTimes, status: 'COMPLETED', refunded: true }),
        liveClass('past-normal', { ...pastTimes, status: 'COMPLETED', refunded: false }),
      ],
    },
  })

  await page.goto(`${studentRoutes.courseStudy(ROADMAP_IDS.main)}?tab=live`)
  const list = page.getByRole('list', { name: 'Danh sách lớp học trực tuyến', exact: true })
  const cards = list.getByRole('listitem')

  await expect(page.getByRole('button', { name: /Giữ chỗ|Hủy giữ chỗ|Hết chỗ/ })).toHaveCount(0)
  await expect(cards.nth(0).getByRole('button', { name: /^Bắt đầu / })).toBeDisabled()
  await expect(cards.nth(1).getByRole('button', { name: 'Tham gia · 2 Sao', exact: true })).toBeEnabled()
  await expect(cards.nth(2).getByRole('button', { name: 'Tham gia', exact: true })).toBeEnabled()
  await expect(cards.nth(3).getByRole('button', { name: 'Tham gia', exact: true })).toBeEnabled()
  await expect(cards.nth(4).getByText('Đã hoàn Sao', { exact: true })).toBeVisible()
  await expect(cards.nth(4).getByRole('link', { name: 'Xem bản ghi', exact: true })).toHaveAttribute('href', REPLAY_URL)

  await cards.nth(3).getByRole('button', { name: 'Tham gia', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/student/live-classes/admitted-live/room$`))
  expect(calls.join).toEqual([])
  expect(calls.room).toEqual(['admitted-live'])
})

test('first paid join confirms the price, deducts Sao, refreshes balance and opens the room', async ({ page }) => {
  const liveNow = Date.now() - 10 * 60 * 1000
  await installRoadmapFixture(page, {
    studies: {
      [ROADMAP_IDS.main]: {
        ...roadmapStudy(),
        nextLiveClass: liveClass('paid-next', {
          startTime: new Date(liveNow).toISOString(),
          endTime: new Date(liveNow + 2 * HOUR).toISOString(),
          status: 'LIVE',
          joinable: true,
          joinPrice: 2,
          admitted: false,
        }),
      },
    },
  })
  const calls = await installLiveClassRoutes(page, { balance: 20 })
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))

  await expect(page.getByText('20', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('2 Sao')
  await dialog.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  await expect(page).toHaveURL(/\/student\/live-classes\/paid-next\/room$/)
  expect(calls.join).toEqual(['paid-next'])
  expect(calls.room).toEqual(['paid-next'])
})

test('insufficient credits opens a dialog linking to the credit packs wallet page', async ({ page }) => {
  const liveNow = Date.now() - 10 * 60 * 1000
  await installRoadmapFixture(page, {
    studies: {
      [ROADMAP_IDS.main]: {
        ...roadmapStudy(),
        nextLiveClass: liveClass('paid-next', {
          startTime: new Date(liveNow).toISOString(),
          endTime: new Date(liveNow + 2 * HOUR).toISOString(),
          status: 'LIVE',
          joinable: true,
          joinPrice: 2,
          admitted: false,
        }),
      },
    },
  })
  await installLiveClassRoutes(page, { balance: 0, insufficientCredits: true })
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))

  await page.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()
  const confirmDialog = page.getByRole('alertdialog')
  await confirmDialog.getByRole('button', { name: 'Tham gia · 2 Sao', exact: true }).click()

  const insufficientDialog = page.getByRole('alertdialog', { name: 'Không đủ Sao' })
  await expect(insufficientDialog).toBeVisible()
  await insufficientDialog.getByRole('button', { name: 'Mua gói Sao', exact: true }).click()
  await expect(page).toHaveURL(/\/student\/wallet$/)
})
