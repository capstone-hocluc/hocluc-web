import { expect, test, type Page } from '@playwright/test'
import { studentRoutes } from '../../src/lib/studentRoutes'
import type { CourseLiveClasses, CourseStudyLiveClass } from '../../src/services/courseService'
import { installRoadmapFixture, roadmapProblems, roadmapStudy, ROADMAP_IDS } from './roadmap-fixture'

const HOUR = 60 * 60 * 1000
const JOIN_URL = 'https://zoom.us/w/900001?tk=student-own-token'
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
    booked: false,
    seatsLeft: 3,
    ...overrides,
  }
}

interface Calls {
  booked: string[]
  cancelled: string[]
}

/** Answers the booking endpoints ahead of the roadmap fixture's fail-closed route. */
async function installLiveClassRoutes(page: Page, schedule?: CourseLiveClasses): Promise<Calls> {
  const calls: Calls = { booked: [], cancelled: [] }
  const answer = (data: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, status, message: 'OK', data }),
  })
  await page.route('**/api/v1/live-classes/**', async (route) => {
    const request = route.request()
    const [, id, ...rest] = new URL(request.url()).pathname.replace('/api/v1/live-classes', '').split('/')
    const action = rest.join('/')
    if (action === 'bookings' && request.method() === 'POST') {
      calls.booked.push(id)
      return route.fulfill(answer({ liveClassId: id, status: 'BOOKED', seatsLeft: 2 }, 201))
    }
    if (action === 'bookings/me' && request.method() === 'DELETE') {
      calls.cancelled.push(id)
      return route.fulfill(answer({ liveClassId: id, status: 'CANCELLED', seatsLeft: 3 }))
    }
    if (action === 'join-link') return route.fulfill(answer({ liveClassId: id, joinUrl: JOIN_URL }))
    if (action === 'recordings') return route.fulfill(answer([{ id: 'rec-1', status: 'READY', recordingUrl: REPLAY_URL }]))
    return route.fulfill(answer(null, 501))
  })
  if (schedule) {
    await page.route(`**/api/v1/courses/${ROADMAP_IDS.main}/live-classes`, (route) => route.fulfill(answer(schedule)))
  }
  return calls
}

test.afterEach(async ({ page }) => {
  expect(roadmapProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [], consoleErrors: [] })
})

test('a student books the next class, sees the seat held and can give it back', async ({ page }) => {
  await installRoadmapFixture(page, {
    studies: { [ROADMAP_IDS.main]: { ...roadmapStudy(), nextLiveClass: liveClass('next') } },
  })
  const calls = await installLiveClassRoutes(page)
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))

  await expect(page.getByText('Còn 3 chỗ')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tham gia buổi học' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Giữ chỗ' }).click()

  await expect(page.getByText('Đã giữ chỗ')).toBeVisible()
  expect(calls.booked).toEqual(['next'])
  await page.getByRole('button', { name: 'Hủy giữ chỗ' }).click()
  await expect(page.getByRole('button', { name: 'Giữ chỗ' })).toBeVisible()
  expect(calls.cancelled).toEqual(['next'])
})

test('a booked class that has opened joins through the student own link', async ({ page }) => {
  const start = Date.now() + 10 * 60 * 1000
  await installRoadmapFixture(page, {
    studies: {
      [ROADMAP_IDS.main]: {
        ...roadmapStudy(),
        nextLiveClass: liveClass('open', {
          startTime: new Date(start).toISOString(),
          endTime: new Date(start + 2 * HOUR).toISOString(),
          joinable: true,
          booked: true,
        }),
      },
    },
  })
  await installLiveClassRoutes(page)
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))

  await expect(page.getByRole('link', { name: 'Tham gia buổi học' })).toHaveAttribute('href', JOIN_URL)
  await expect(page.getByRole('button', { name: 'Hủy giữ chỗ' })).toHaveCount(0)
})

test('a full class cannot be booked and only a booked past class can be replayed', async ({ page }) => {
  const past = Date.now() - 72 * HOUR
  const pastTimes = { startTime: new Date(past).toISOString(), endTime: new Date(past + 2 * HOUR).toISOString() }
  await installRoadmapFixture(page, {
    studies: { [ROADMAP_IDS.main]: roadmapStudy() },
  })
  await installLiveClassRoutes(page, {
    courseId: ROADMAP_IDS.main,
    courseTitle: 'MAIN Lộ trình kiểm thử',
    next: null,
    upcoming: [liveClass('full', { seatsLeft: 0 })],
    past: [
      liveClass('attended', { ...pastTimes, status: 'COMPLETED', booked: true }),
      liveClass('missed', { ...pastTimes, status: 'COMPLETED', booked: false }),
    ],
  })
  await page.goto(`${studentRoutes.courseStudy(ROADMAP_IDS.main)}?tab=live`)

  await expect(page.getByRole('button', { name: 'Hết chỗ' })).toBeDisabled()
  const replays = page.getByRole('link', { name: 'Xem bản ghi' })
  await expect(replays).toHaveCount(1)
  await expect(replays).toHaveAttribute('href', REPLAY_URL)
})
