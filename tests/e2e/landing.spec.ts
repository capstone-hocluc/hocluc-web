import { test, expect, type Route } from '@playwright/test'

const catalog = '**/api/v1/courses/main'
const courses = [
  {
    id: 'fixture-foundation',
    title: 'Khóa kiểm thử nền tảng',
    description: 'Dữ liệu kiểm thử giao diện, không phải khóa đang bán.',
    price: 1490000,
    startDate: '2026-11-01',
    targetExam: 'V-ACT',
  },
  { id: 'fixture-free', title: 'Khóa kiểm thử miễn phí', price: 0, purchased: true },
  { id: 'fixture-no-price', title: 'Khóa kiểm thử chưa có giá' },
  { id: 'fixture-extra', title: 'Khóa kiểm thử thứ tư', price: 250000 },
]
const respond = (route: Route, data: unknown = []) =>
  route.fulfill({
    json: { success: true, data },
    headers: { 'access-control-allow-origin': '*' },
  })

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => respond(route))
})

test('desktop hierarchy, anchors and empty state at common PC widths', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Khóa học đang được cập nhật' })).toBeVisible()
  await expect(page.locator('.exam-facts')).toHaveCount(0)
  await expect(page.locator('#ky-thi')).toHaveCount(1)
  await expect(page.locator('.hero-buttons a').last()).toHaveAttribute('href', '#khoa-hoc')
  await expect(page.locator('.nav-links a').first()).toHaveAttribute('href', '#khoa-hoc')
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    const metrics = await page.evaluate(() => {
      const ids = ['chuong-trinh', 'khoa-hoc', 'hoc-thu', 'lo-trinh', 'ho-tro', 'ky-thi', 'faq']
      const positions = ids.map((id) => document.getElementById(id)!.getBoundingClientRect().top)
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        ordered: positions.every((y, i) => i === 0 || y > positions[i - 1]),
      }
    })
    expect(metrics).toEqual({ overflow: false, ordered: true })
    await expect(page.locator('.nav-links')).toBeVisible()
  }
  await page.locator('.nav-links a').first().click()
  await expect(page).toHaveURL(/#khoa-hoc$/)
  expect(
    await page.locator('#khoa-hoc').evaluate((el) => el.getBoundingClientRect().top)
  ).toBeGreaterThanOrEqual(79)
})

test('local design preview shows one labeled course without requesting a real catalog', async ({
  page,
}) => {
  let catalogRequests = 0
  await page.route(catalog, (route) => {
    catalogRequests++
    return respond(route)
  })
  await page.goto('/?preview-course=1')
  await expect(page.locator('.landing-course')).toHaveCount(1)
  await expect(page.locator('.course-preview-notice')).toContainText('dữ liệu mẫu')
  await expect(page.locator('.landing-course h3')).toHaveText('V-ACT: Xây nền tảng, vững tư duy')
  await expect(page.locator('.landing-course a')).toHaveAttribute('href', '#hoc-thu')
  expect(catalogRequests).toBe(0)
  await page.locator('.landing-course a').click()
  await expect(page).toHaveURL(/#hoc-thu$/)
})

test('loading skeleton resolves to real course cards without invented prices', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(catalog, async (route) => {
    await gate
    await respond(route, courses)
  })
  await page.goto('/')
  await expect(page.getByText('Đang tải khóa học', { exact: true })).toBeAttached()
  await expect(page.locator('.course-skeleton')).toHaveCount(3)
  release()
  await expect(page.locator('.landing-course')).toHaveCount(3)
  await expect(page.locator('.course-skeleton')).toHaveCount(0)
  await expect(page.locator('.landing-course').first()).toContainText('1.490.000')
  await expect(page.locator('.landing-course').nth(1)).toContainText('Miễn phí')
  await expect(page.locator('.landing-course').nth(1)).toContainText('Đã sở hữu')
  await expect(page.locator('.landing-course').nth(2).locator('.course-price-label')).toHaveCount(0)
  await expect(page.getByText('Khóa kiểm thử thứ tư')).toHaveCount(0)
  await expect(page.locator('.course-cover-fallback')).toHaveCount(3)
})

test('catalog failure is recoverable with retry', async ({ page }) => {
  let fail = true
  await page.route(catalog, (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { success: false },
          headers: { 'access-control-allow-origin': '*' },
        })
      : respond(route, courses)
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Chưa tải được khóa học' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page.locator('.landing-course')).toHaveCount(3)
})

test('course navigation preserves native new-tab behavior and normal SPA navigation', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: 'Xem tất cả khóa học' })
  const popupPromise = context.waitForEvent('page')
  await link.click({ button: 'middle' })
  const popup = await popupPromise
  await expect(popup).toHaveURL(/\/courses$/)
  await popup.close()
  await expect(page).toHaveURL(/\/$/)
  await link.click()
  await expect(page).toHaveURL(/\/courses$/)
})

test('signup and login actions have matching destinations', async ({ page }) => {
  await page.goto('/')
  const signup = page.locator('.nav-actions a[data-auth="signup"]')
  await expect(signup).toHaveAttribute('href', '/signup')
  await signup.click()
  await expect(page).toHaveURL(/\/signup$/)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Đóng', exact: true }).click()
  await page.locator('.hero-buttons a[data-auth="login"]').click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('sample lesson explains answers, completes and restarts', async ({ page }) => {
  await page.goto('/')
  for (const index of [0, 2, 3]) {
    await page.locator(`#answers button[data-answer="${index}"]`).click()
    await page.locator('#check-answer').click()
    await expect(page.locator('#lesson-feedback')).not.toHaveText('')
    if (index !== 3) await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  }
  await expect(page.locator('#question-counter')).toContainText('2/3 đúng')
  await expect(page.locator('.sample-next')).toBeVisible()
  await expect(page.locator('.sample-next a').first()).toHaveAttribute('href', '#khoa-hoc')
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click()
  await expect(page.locator('#question-counter')).toHaveText('Câu 1 / 3')
  await expect(page.locator('#answers button').first()).toBeFocused()
})

test('subject dialog returns to sample with focus and FAQ expands', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Khám phá Tiếng Việt', exact: true }).click()
  await expect(page.locator('#detail-dialog')).toBeVisible()
  await page.locator('#detail-dialog').getByRole('button', { name: 'Thử một bài học' }).click()
  await expect(page.locator('#detail-dialog')).not.toBeVisible()
  await expect(page.locator('#answers button').first()).toBeFocused()
  const item = page.locator('.faq-list details').first()
  await item.locator('summary').click()
  await expect(item).toHaveAttribute('open', '')
  await expect(item.locator('p')).toBeVisible()
})

test('illustrated subjects preview on hover and focus without shifting the following section', async ({
  page,
}) => {
  await page.goto('/')
  const cards = page.locator('.subject-item')
  const preview = page.locator('.subject-preview-content.is-visible')
  await cards.first().scrollIntoViewIfNeeded()
  const courseTop = () =>
    page.locator('#khoa-hoc').evaluate((el) => el.getBoundingClientRect().top + scrollY)
  const initialCourseTop = await courseTop()

  for (let index = 0; index < 5; index++) {
    const card = cards.nth(index)
    await card.hover()
    await expect(preview.locator('h3')).toHaveText(await card.locator('.subject-name').innerText())
    await expect(page.locator('#detail-dialog')).not.toBeVisible()
    await expect(card.locator('img')).toHaveJSProperty('complete', true)
    expect(
      await card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)
    ).toBeGreaterThan(0)
    const imageDoesNotOverlap = await card.evaluate((el) => {
      const image = el.querySelector('img')!.getBoundingClientRect()
      const title = el.querySelector('.subject-name')!.getBoundingClientRect()
      return image.bottom <= title.top
    })
    expect(imageDoesNotOverlap).toBe(true)
    expect(Math.abs((await courseTop()) - initialCourseTop)).toBeLessThan(2)
  }

  // Moving into the preview keeps its content available for reading and clicking.
  await preview.hover()
  await expect(preview.locator('h3')).toHaveText('Suy luận Khoa học')
  await preview.getByRole('button', { name: 'Xem nội dung nhóm' }).click()
  await expect(page.locator('#detail-dialog h2')).toHaveText('Suy luận Khoa học')
  await page.keyboard.press('Escape')

  await cards.first().focus()
  await page.keyboard.press('Tab')
  await expect(cards.nth(1)).toBeFocused()
  await expect(preview.locator('h3')).toHaveText('Tiếng Anh')
  await page.keyboard.press('Enter')
  await expect(page.locator('#detail-dialog h2')).toHaveText('Tiếng Anh')
  await page.keyboard.press('Escape')
  await expect(cards.nth(1)).toBeFocused()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await cards.first().evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
})

test('carousel has manual selection and pause controls', async ({ page }) => {
  await page.goto('/')
  const slide = page.locator('.hero-slide-buttons button').nth(2)
  await slide.click()
  await expect(slide).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.hero-slide').nth(2)).toHaveAttribute('aria-hidden', 'false')
  await expect(page.getByRole('button', { name: 'Tiếp tục chuyển hình tự động' })).toBeVisible()
  await page.getByRole('button', { name: 'Tiếp tục chuyển hình tự động' }).click()
  await expect(page.getByRole('button', { name: 'Dừng chuyển hình tự động' })).toBeVisible()
})
