import { expect, test, type Page, type Route } from '@playwright/test'
import { IDS, fixtureProblems, installCrudFixture } from './core-crud-fixture'
import { installRoadmapFixture, roadmapProblems, roadmapStudy, ROADMAP_IDS } from './roadmap-fixture'
import { studentRoutes } from '../../src/lib/studentRoutes'

/** Course reviews: stars on catalog cards, the public review block, a student writing one, staff hiding one. */
const COURSE = 'fixture-reviewed'
const USER = '40000000-0000-0000-0000-000000000011'
const tokenFor = (role: string) =>
  `fixture.${Buffer.from(JSON.stringify({ sub: USER, role: `ROLE_${role}`, exp: 4102444800 })).toString('base64url')}.fixture`

const course = {
  id: COURSE,
  title: 'Luyện thi kiểm thử · Lộ trình Đánh giá',
  price: 1990000,
  startDate: '2026-12-10',
  endDate: '2027-03-23',
  averageRating: 4.5,
  reviewCount: 2,
}
const unrated = { id: 'fixture-unrated', title: 'Luyện thi kiểm thử · Lộ trình Mới', price: 990000, reviewCount: 0, averageRating: null }

const review = (id: string, rating: number, comment: string | null, authorName: string) => ({
  id,
  authorName,
  authorAvatarUrl: null,
  rating,
  comment,
  createdAt: '2026-11-10T03:00:00Z',
  updatedAt: '2026-11-10T03:00:00Z',
})

const respond = (route: Route, data: unknown, status = 200) =>
  route.fulfill({
    status,
    json: { success: status < 400, status, data },
    headers: { 'access-control-allow-origin': '*' },
  })

interface Summary {
  averageRating: number | null
  reviewCount: number
  distribution: number[]
  eligibility: string
  mine: null | { id: string; rating: number; comment: string | null; hidden: boolean; hiddenReason: string | null; updatedAt: string }
}

async function installPublic(page: Page, summary: Summary, role?: string) {
  const writes: Array<{ method: string; body: unknown }> = []
  if (role) {
    await page.addInitScript((value) => {
      if (!localStorage.getItem('hocluc.accessToken')) localStorage.setItem('hocluc.accessToken', value)
    }, tokenFor(role))
  }
  await page.route('**/api/v1/**', (route) => respond(route, []))
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      json: { success: false },
      headers: {
        'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
        'access-control-allow-credentials': 'true',
      },
    })
  )
  await page.route('**/api/v1/users/profiles', (route) =>
    respond(route, { id: USER, role: role ?? 'STUDENT', displayName: 'Học sinh', firstName: 'Học', lastName: 'Sinh',
      email: 'student@example.invalid', status: 'ACTIVE', emailVerified: true, studentProfile: null })
  )
  await page.route('**/api/v1/notifications/unread-count', (route) => respond(route, { unread: 0 }))
  await page.route('**/api/v1/notifications/stream', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/courses/main', (route) => respond(route, [course, unrated]))
  await page.route(`**/api/v1/courses/${COURSE}`, (route) =>
    respond(route, { ...course, giftCount: 0, phaseCount: 0, phases: [], purchased: role === 'STUDENT' })
  )
  await page.route(`**/api/v1/courses/${COURSE}/reviews/summary`, (route) => respond(route, summary))
  await page.route(`**/api/v1/courses/${COURSE}/reviews?**`, (route) =>
    respond(route, {
      content: [review('r1', 5, 'Giảng viên dạy rất dễ hiểu', 'Minh Anh'), review('r2', 4, null, 'Quốc Bảo')],
      pageNumber: 0, pageSize: 10, totalElements: 2, totalPages: 1, last: true,
    })
  )
  await page.route(`**/api/v1/courses/${COURSE}/reviews/mine`, async (route) => {
    const request = route.request()
    writes.push({ method: request.method(), body: request.postDataJSON?.() ?? null })
    summary.mine = { id: 'mine', rating: 4, comment: 'Ổn', hidden: false, hiddenReason: null, updatedAt: '2026-11-21T03:00:00Z' }
    await respond(route, summary.mine)
  })
  return writes
}

const baseSummary = (eligibility: string): Summary => ({
  averageRating: 4.5,
  reviewCount: 2,
  distribution: [0, 0, 0, 1, 1],
  eligibility,
  mine: null,
})

test('catalog cards show stars only for rated courses', async ({ page }) => {
  await installPublic(page, baseSummary('GUEST'))
  await page.goto('/courses')
  const cards = page.locator('.course-grid .landing-course')
  await expect(cards).toHaveCount(2)
  const rated = cards.filter({ hasText: 'Lộ trình Đánh giá' })
  await expect(rated).toContainText('4,5')
  await expect(rated).toContainText('(2 đánh giá)')
  await expect(cards.filter({ hasText: 'Lộ trình Mới' })).not.toContainText('đánh giá)')
})

test('a guest reads the rating block and the reviews but cannot write one', async ({ page }) => {
  await installPublic(page, baseSummary('GUEST'))
  await page.goto(`/courses/${COURSE}`)
  const block = page.locator('section', { has: page.getByRole('heading', { name: 'Đánh giá', exact: true }) })
  await expect(block).toContainText('4,5')
  await expect(block).toContainText('2 đánh giá')
  await expect(block.getByRole('progressbar', { name: '5 sao: 1 đánh giá' })).toBeVisible()
  await expect(block).toContainText('Giảng viên dạy rất dễ hiểu')
  await expect(block).toContainText('Quốc Bảo')
  await expect(block.getByRole('button', { name: 'Viết đánh giá' })).toHaveCount(0)
})

test('an owner who has not completed a lesson is told what is missing', async ({ page }) => {
  await installPublic(page, baseSummary('NO_LESSON_COMPLETED'), 'STUDENT')
  await page.goto(`/courses/${COURSE}`)
  await expect(page.getByText('Hoàn thành 1 bài học để đánh giá khóa học này.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Viết đánh giá' })).toHaveCount(0)
})

test('an eligible student picks stars, writes a comment and then sees an edit action', async ({ page }) => {
  const writes = await installPublic(page, baseSummary('CAN_REVIEW'), 'STUDENT')
  await page.goto(`/courses/${COURSE}`)
  await page.getByRole('button', { name: 'Viết đánh giá', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Đánh giá khóa học' })
  const send = dialog.getByRole('button', { name: 'Gửi đánh giá', exact: true })
  await expect(send).toBeDisabled()
  await dialog.getByRole('radio', { name: '4 sao' }).click()
  await expect(dialog).toContainText('Tốt')
  await dialog.getByLabel('Nhận xét').fill('Ổn')
  await send.click()
  await expect(dialog).toHaveCount(0)
  expect(writes).toEqual([{ method: 'PUT', body: { rating: 4, comment: 'Ổn' } }])
  await expect(page.getByRole('button', { name: 'Sửa đánh giá của bạn', exact: true })).toBeVisible()
})

test.describe('staff moderation', () => {
  test.afterEach(async ({ page }) => {
    expect(fixtureProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [], consoleErrors: [] })
  })

  test('staff hide a review with a reason from the course reviews tab', async ({ page }) => {
    await installCrudFixture(page)
    const visibility: unknown[] = []
    let hidden = false
    const row = () => ({
      id: 'r1', studentId: USER, authorName: 'Minh Anh', authorEmail: 'minh@example.invalid', rating: 1,
      comment: 'Quảng cáo trang khác', hidden, hiddenReason: hidden ? 'Quảng cáo' : null, hiddenByName: hidden ? 'Staff' : null,
      hiddenAt: hidden ? '2026-11-21T03:00:00Z' : null, createdAt: '2026-11-10T03:00:00Z', updatedAt: '2026-11-10T03:00:00Z',
    })
    await page.route(`**/api/v1/admin/courses/${IDS.main}/reviews?**`, (route) =>
      respond(route, { content: [row()], pageNumber: 0, pageSize: 20, totalElements: 1, totalPages: 1, last: true })
    )
    await page.route('**/api/v1/admin/course-reviews/r1/visibility', async (route) => {
      visibility.push(route.request().postDataJSON())
      hidden = true
      await respond(route, row())
    })

    await page.goto('/staff/courses')
    await page.getByRole('button', { name: 'MAIN Toán', exact: true }).click()
    await page.getByRole('tab', { name: 'Đánh giá', exact: true }).click()
    await expect(page.getByText('Quảng cáo trang khác')).toBeVisible()
    await expect(page.getByRole('table').getByText('Đang hiện', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Ẩn đánh giá', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Ẩn đánh giá' })
    const confirm = dialog.getByRole('button', { name: 'Ẩn đánh giá', exact: true })
    await expect(confirm).toBeDisabled()
    await dialog.getByLabel('Lý do').fill('Quảng cáo')
    await confirm.click()
    await expect(dialog).toHaveCount(0)
    expect(visibility).toEqual([{ hidden: true, reason: 'Quảng cáo' }])
    await expect(page.getByRole('table').getByText('Đã ẩn', { exact: true })).toBeVisible()
  })
})

test.describe('study page', () => {
  test.afterEach(async ({ page }) => {
    expect(roadmapProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [], consoleErrors: [] })
  })

  test('the study page offers the review once the student may write one', async ({ page }) => {
    const state = await installRoadmapFixture(page, {
      studies: { [ROADMAP_IDS.main]: roadmapStudy() },
      reviewSummary: { averageRating: null, reviewCount: 0, distribution: [0, 0, 0, 0, 0], eligibility: 'CAN_REVIEW', mine: null },
    })
    await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))
    await page.getByRole('button', { name: 'Đánh giá khóa học', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Đánh giá khóa học' })
    await dialog.getByRole('radio', { name: '5 sao' }).click()
    await expect(dialog).toContainText('Rất tốt')
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(state.requests.filter((r) => r.path.endsWith('/reviews/mine'))).toEqual([])
  })

  test('the study page hides the review action until a lesson is completed', async ({ page }) => {
    await installRoadmapFixture(page, { studies: { [ROADMAP_IDS.main]: roadmapStudy() } })
    await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))
    await expect(page.getByRole('heading', { name: 'MAIN Lộ trình kiểm thử', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đánh giá khóa học', exact: true })).toHaveCount(0)
  })
})
