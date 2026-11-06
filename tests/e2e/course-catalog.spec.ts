import { test, expect, type Route } from '@playwright/test'

const respond = (route: Route, data: unknown = []) =>
  route.fulfill({
    json: { success: true, data },
    headers: { 'access-control-allow-origin': '*' },
  })

const session = (dateConfirmed: boolean) => ({
  id: 'fixture-session',
  name: 'Đợt 1',
  roundNo: 1,
  examYearId: 'fixture-year',
  examYear: 2027,
  examYearName: 'Năm thi kiểm thử',
  examStartDate: '2027-03-30',
  examEndDate: null,
  dateConfirmed,
})

// Today is fixed at 2026-11-03 in every test below.
const long = {
  id: 'fixture-long',
  title: 'Luyện thi kiểm thử · Lộ trình Dài – Ôn sớm',
  price: 3990000,
  startDate: '2026-12-10',
  endDate: '2027-03-23',
  examSessionDate: '2027-03-30',
  examSession: session(true),
  targetExam: 'VNUHCM_DGNL',
}
const short = {
  id: 'fixture-short',
  title: 'Luyện thi kiểm thử · Lộ trình Ngắn – Tăng tốc',
  price: 2990000,
  startDate: '2026-11-20',
  endDate: '2027-01-05',
  examSessionDate: '2027-01-08',
  examSession: null,
}
const owned = {
  id: 'fixture-owned',
  title: 'Luyện thi kiểm thử · Lộ trình Đã mua – Đang học',
  price: 1990000,
  startDate: '2026-09-01',
  endDate: '2027-03-23',
  examSessionDate: '2027-03-30',
  examSession: session(false),
  purchased: true,
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'))
  await page.route('**/api/v1/**', (route) => respond(route))
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
  await page.route('**/api/v1/courses/fixture-long', (route) =>
    respond(route, { ...long, giftCount: 19, phaseCount: 3, phases: [] })
  )
})

const plan = (page: import('@playwright/test').Page, name: string) =>
  page.locator('.roadmap-plans > li', { has: page.getByRole('heading', { name }) })

test('roadmaps compare as plans with facts from the data and a badge chosen by rule', async ({ page }) => {
  // Listed in an order that puts neither badged roadmap first.
  await page.route('**/api/v1/courses/main', (route) => respond(route, [owned, short, long]))
  await page.goto('/courses')

  const section = page.locator('.catalog-compare')
  await expect(section.getByRole('heading', { name: 'Lộ trình nào vừa với thời gian của bạn?' })).toBeVisible()
  await expect(section.locator('.roadmap-plans > li')).toHaveCount(3)

  // Most weeks before its exam and not opened yet: recommended. Opens soonest, within 30 days: opening soon.
  const longPlan = plan(page, 'Lộ trình Dài')
  await expect(longPlan.locator('.roadmap-badge')).toHaveText('Nên chọn')
  await expect(longPlan).toContainText('Phù hợp nếu bạn muốn ôn sớm')
  await expect(longPlan).toContainText('3.990.000')
  await expect(longPlan).toContainText('Còn 37 ngày')
  await expect(longPlan).toContainText('16 tuần')
  await expect(longPlan).toContainText('Đợt 1 · 30/03/2027')
  await expect(longPlan).not.toContainText('Dự kiến')
  await expect(longPlan).toContainText('Đủ 4 phần thi ĐGNL')
  await expect(longPlan).toContainText('19 khóa học thành phần, chia thành 3 giai đoạn')
  await expect(longPlan.getByRole('link', { name: /Xem lộ trình/ })).toHaveAttribute('href', '/courses/fixture-long')

  const shortPlan = plan(page, 'Lộ trình Ngắn')
  await expect(shortPlan.locator('.roadmap-badge')).toHaveText('Sắp khai giảng')
  await expect(shortPlan).toContainText('Phù hợp nếu bạn cần ôn nước rút')
  // No exam session to confirm the date, so it is shown as expected only.
  await expect(shortPlan).toContainText('Dự kiến')
  await expect(shortPlan).not.toContainText('khóa học thành phần')

  // Owned and already open: no badge, and the action continues the course.
  const ownedPlan = plan(page, 'Lộ trình Đã mua')
  await expect(ownedPlan.locator('.roadmap-badge')).toHaveCount(0)
  await expect(ownedPlan).toContainText('Đã sở hữu')
  await expect(ownedPlan).toContainText('Đã khai giảng')
  await expect(ownedPlan).toContainText('Dự kiến')
  await expect(ownedPlan.getByRole('link', { name: /Vào học/ })).toHaveAttribute('href', '/courses/fixture-owned')
})

test('a roadmap the backend suggests takes the only badge', async ({ page }) => {
  await page.route('**/api/v1/courses/main', (route) => respond(route, [long, { ...short, recommended: true }]))
  await page.goto('/courses')
  await expect(page.locator('.roadmap-badge')).toHaveCount(1)
  await expect(plan(page, 'Lộ trình Ngắn').locator('.roadmap-badge')).toHaveText('Đề xuất cho bạn')
})

test('plans sit side by side on a desktop and swipe inside their row on a phone', async ({ page }) => {
  await page.route('**/api/v1/courses/main', (route) => respond(route, [owned, short, long]))
  await page.goto('/courses')
  const row = page.locator('.roadmap-plans')
  await expect(row.locator('> li')).toHaveCount(3)
  for (const [width, oneRow, scrolls] of [
    [1440, true, false],
    [390, true, true],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await row.evaluate((el) => {
      const tops = Array.from(el.children).map((li) => Math.round(li.getBoundingClientRect().top))
      return {
        oneRow: new Set(tops).size === 1,
        scrolls: el.scrollWidth > el.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(layout, `${width}px`).toEqual({ oneRow, scrolls, pageOverflow: false })
  }
})
