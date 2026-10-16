import { expect, test, type Page } from '@playwright/test'

// The landing page and the public catalog only read the public course list. Every other API
// request is unexpected and fails the test.
const COURSES = [
  {
    id: 'course-late',
    title: 'Tăng tốc V-ACT đợt 2',
    targetExam: 'VNUHCM_DGNL',
    startDate: '2027-03-01',
    price: 1290000,
  },
  {
    id: 'course-soon',
    title: 'Lộ trình V-ACT toàn diện',
    description: 'Ôn đủ 5 nhóm kiến thức theo lộ trình.',
    targetExam: 'VNUHCM_DGNL',
    startDate: '2026-11-02',
    price: 2490000,
    purchased: true,
  },
  {
    id: 'course-mid',
    title: 'Nền tảng Toán & Tư duy định lượng',
    targetExam: 'VNUHCM_DGNL',
    startDate: '2027-01-05',
    price: 0,
  },
  { id: 'course-undated', title: 'Khóa chưa có lịch', price: 990000 },
]

type CoursesMode = 'data' | 'empty' | 'error'

async function installLandingFixture(page: Page, initialMode: CoursesMode) {
  const state = { mode: initialMode, unmatched: [] as string[], pageErrors: [] as string[] }
  page.on('pageerror', (error) => state.pageErrors.push(error.message))
  await page.route('http://127.0.0.1:1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v1/courses/main' && route.request().method() === 'GET') {
      if (state.mode === 'error') return route.abort()
      const data = state.mode === 'data' ? COURSES : []
      return route.fulfill({ json: { success: true, data } })
    }
    state.unmatched.push(`${route.request().method()} ${url.pathname}`)
    return route.abort()
  })
  return state
}

test('courses section lists the three courses starting soonest with price and ownership', async ({ page }) => {
  const state = await installLandingFixture(page, 'data')
  await page.goto('/')
  const section = page.locator('#cac-khoa-hoc')
  const cards = section.locator('a.course-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toContainText('Lộ trình V-ACT toàn diện')
  await expect(cards.nth(0)).toContainText('Đã sở hữu')
  await expect(cards.nth(0)).toContainText('2.490.000')
  await expect(cards.nth(1)).toContainText('Nền tảng Toán & Tư duy định lượng')
  await expect(cards.nth(1)).toContainText('Miễn phí')
  await expect(cards.nth(2)).toContainText('Tăng tốc V-ACT đợt 2')
  await expect(cards.nth(0)).toHaveAttribute('href', '/courses/course-soon')

  await section.getByRole('link', { name: 'Xem tất cả khóa học' }).click()
  await expect(page).toHaveURL(/\/courses$/)
  await expect(page.getByRole('heading', { name: 'Khám phá khóa học' })).toBeVisible()
  // The catalog shares the landing header and the learner look.
  await expect(page.locator('.public-chrome .nav-links')).toContainText('Khóa học')
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-learner'))).toBe(true)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('courses section explains an empty catalog and recovers after a failed load', async ({ page }) => {
  const state = await installLandingFixture(page, 'empty')
  await page.goto('/')
  const section = page.locator('#cac-khoa-hoc')
  await expect(section.getByText('Khóa học đang được cập nhật.')).toBeVisible()

  state.mode = 'error'
  await page.reload()
  await expect(section.getByRole('alert')).toContainText('Chưa tải được danh sách khóa học.')
  state.mode = 'data'
  await section.getByRole('button', { name: 'Thử lại' }).click()
  await expect(section.locator('a.course-card')).toHaveCount(3)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('header links to the courses, signup opens from the main call to action', async ({ page }) => {
  const state = await installLandingFixture(page, 'data')
  await page.goto('/')
  const nav = page.locator('.nav-links')
  await expect(nav.getByRole('link', { name: 'Khóa học' })).toHaveAttribute('href', '#cac-khoa-hoc')
  await expect(nav.getByRole('link', { name: 'Học thử' })).toHaveCount(0)
  await expect(page.locator('#chu-trinh, #may-tinh')).toHaveCount(0)

  // Primary buttons use navy text on the bright brand blue (readable contrast).
  const primaryColor = await page
    .locator('.hero-buttons .btn-primary')
    .evaluate((element) => getComputedStyle(element).color)
  expect(primaryColor).toBe('rgb(23, 53, 85)')

  await page.locator('.nav-actions').getByRole('link', { name: 'Bắt đầu miễn phí' }).click()
  await expect(page).toHaveURL(/\/signup$/)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('phone layout keeps the page within the viewport and swipes the course row', async ({ page }) => {
  const state = await installLandingFixture(page, 'data')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('#cac-khoa-hoc a.course-card')).toHaveCount(3)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true)
  const rowScrolls = await page
    .locator('#cac-khoa-hoc .course-grid')
    .evaluate((row) => row.scrollWidth > row.clientWidth)
  expect(rowScrolls).toBe(true)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
