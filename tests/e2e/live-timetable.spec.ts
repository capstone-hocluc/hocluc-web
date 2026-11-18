import { expect, test, type Page } from '@playwright/test'
import { fixtureProblems, IDS, installCrudFixture } from './core-crud-fixture'
import { installQuizFixture } from './quiz-permissions-fixture'

const SUBJECT = '61000000-0000-0000-0000-000000000001'

function answer(data: unknown, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, status, message: 'OK', data }) }
}

/** The main course with a subject on its section and one named phase, as the timetable form needs. */
async function courseWithSubject(page: Page) {
  await page.route(`**/api/v1/courses/${IDS.main}`, (route) => route.fulfill(answer({
    id: IDS.main,
    title: 'MAIN Toán',
    courseType: 'MAIN',
    phases: [{
      id: IDS.phase1,
      name: 'Nền tảng',
      sequence: 1,
      // as the API sends it: the subject sits on the gift course, the main course's own sections carry none
      gifts: [{ courseId: IDS.section, phaseId: IDS.phase1, title: 'SECTION Đại số', categoryId: SUBJECT, categoryName: 'Toán', chapterCount: 1, lessonCount: 1, completedLessonCount: 0 }],
      sections: [{ sectionCourseId: IDS.section, title: 'SECTION Đại số', sequence: 1, chapters: [] }],
    }],
  })))
}

test('staff generate a teacher live timetable and see what did not fit', async ({ page }) => {
  test.setTimeout(120_000)
  await installCrudFixture(page)
  await courseWithSubject(page)
  const sent: unknown[] = []
  await page.route(`**/api/v1/courses/${IDS.main}/live-timetables`, async (route) => {
    sent.push(route.request().postDataJSON())
    await route.fulfill(answer({
      sessions: [{ liveClassId: 'lc-1', title: 'Toán 1', startTime: '2026-12-01T12:30:00Z', needsAttention: false }],
      requestedSessions: 2,
      missingSessions: 1,
      warnings: ['Thứ Hai 01/12 trùng ngày bận của giáo viên.'],
    }))
  })
  await page.goto('/staff/schedules')
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Thời khóa biểu trực tuyến', exact: true }) })
  await expect(panel).toBeVisible({ timeout: 90_000 })

  await panel.locator('[name="liveTimetableTitle"]').fill('Toán tối 2-4')
  await panel.getByRole('button', { name: /Giáo viên/ }).click()
  await page.getByRole('option').first().click()
  await panel.getByRole('button', { name: /Môn học/ }).click()
  await page.getByRole('option', { name: 'Toán', exact: true }).click()
  await panel.getByRole('group', { name: 'Đến ngày' }).getByRole('spinbutton').first().click()
  await page.keyboard.type('31122026')
  await expect(panel.locator('[name="liveEndDate"]')).toHaveValue('2026-12-31')
  await panel.locator('[name="liveCapacity"]').fill('20')
  await panel.getByLabel('Nền tảng').fill('2')
  await panel.getByRole('button', { name: 'Tạo lớp trực tuyến', exact: true }).click()

  await expect(panel.getByText('Đã tạo 1 lớp trực tuyến.')).toBeVisible()
  await expect(panel.getByText('1 lớp không xếp được trước ngày kết thúc.')).toBeVisible()
  await expect(panel.getByText('Thứ Hai 01/12 trùng ngày bận của giáo viên.')).toBeVisible()
  expect(sent[0]).toMatchObject({
    teacherId: IDS.teacher,
    subjectId: SUBJECT,
    title: 'Toán tối 2-4',
    endDate: '2026-12-31',
    capacity: 20,
    slots: [{ dayOfWeek: 'MONDAY', startTime: '19:30', endTime: '21:30' }],
    phaseSessions: [{ phaseId: IDS.phase1, sessionCount: 2 }],
  })
  expect(fixtureProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [] })
})

test('a timetable whose outcome is unknown locks the form instead of inviting a resend', async ({ page }) => {
  test.setTimeout(120_000)
  await installCrudFixture(page)
  await courseWithSubject(page)
  let calls = 0
  await page.route(`**/api/v1/courses/${IDS.main}/live-timetables`, (route) => {
    calls += 1
    return route.fulfill(answer(null, 502))
  })
  await page.goto('/staff/schedules')
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Thời khóa biểu trực tuyến', exact: true }) })
  await expect(panel).toBeVisible({ timeout: 90_000 })

  await panel.locator('[name="liveTimetableTitle"]').fill('Toán tối')
  await panel.getByRole('button', { name: /Giáo viên/ }).click()
  await page.getByRole('option').first().click()
  await panel.getByRole('button', { name: /Môn học/ }).click()
  await page.getByRole('option', { name: 'Toán', exact: true }).click()
  await panel.getByRole('group', { name: 'Đến ngày' }).getByRole('spinbutton').first().click()
  await page.keyboard.type('31122026')
  await panel.getByRole('button', { name: 'Tạo lớp trực tuyến', exact: true }).click()

  await expect(panel.getByText(/Đừng gửi lại/)).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Tạo lớp trực tuyến', exact: true })).toBeDisabled()
  expect(calls).toBe(1)
})

test('a teacher fills in the title and description of a coming live class', async ({ page }) => {
  test.setTimeout(120_000)
  const state = await installQuizFixture(page, 'TEACHER')
  const start = Date.now() + 3 * 24 * 60 * 60 * 1000
  const liveClass = {
    id: 'lc-teacher',
    title: 'Toán tối 2-4 · Buổi 1',
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 2 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
    courseTitle: 'MAIN Toán',
    capacity: 20,
    bookedCount: 5,
    detailsFilled: false,
  }
  const patched: unknown[] = []
  await page.route('**/api/v1/schedules/teaching**', (route) => route.fulfill(answer([])))
  await page.route('**/api/v1/teachers/*/class-sessions**', (route) => route.fulfill(answer([])))
  await page.route('**/api/v1/live-classes**', async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      patched.push(request.postDataJSON())
      Object.assign(liveClass, request.postDataJSON(), { detailsFilled: true })
      return route.fulfill(answer(liveClass))
    }
    return route.fulfill(answer([liveClass]))
  })
  await page.goto('/console/teacher/schedule')

  const row = page.getByText('Toán tối 2-4 · Buổi 1', { exact: true }).locator('xpath=../../..')
  await expect(row).toContainText('5/20 học viên giữ chỗ', { timeout: 90_000 })
  await expect(row.getByText('Chưa có tiêu đề')).toBeVisible()
  await row.getByRole('button', { name: 'Điền thông tin', exact: true }).click()

  const sheet = page.getByRole('dialog', { name: 'Thông tin buổi học', exact: true })
  await sheet.locator('[name="title"]').fill('Phương trình bậc hai')
  await sheet.locator('[name="description"]').fill('Ôn công thức nghiệm và Vi-ét.')
  await sheet.getByRole('button', { name: 'Lưu', exact: true }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: 'Sửa thông tin', exact: true })).toBeVisible()
  expect(patched).toEqual([{ title: 'Phương trình bậc hai', description: 'Ôn công thức nghiệm và Vi-ét.' }])
  expect(state.pageErrors).toEqual([])
})
