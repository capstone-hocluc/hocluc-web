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
  // The placement guard waits for the cookie session; a guest's refresh is a plain 401. It is sent with
  // credentials, so the mock has to allow them or the browser turns it into a connection error. The
  // allowed origin is the page's own, so the test does not depend on which port serves the app.
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
})

test('desktop hierarchy, anchors and empty state at common PC widths', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Khóa học đang được cập nhật' })).toBeVisible()
  // The exam facts live in the exam section only; there is no second strip elsewhere on the page.
  await expect(page.locator('.exam-key-facts')).toHaveCount(1)
  await expect(page.locator('#ky-thi .exam-key-facts')).toHaveCount(1)
  await expect(page.locator('#ky-thi')).toHaveCount(1)
  await expect(page.locator('.hero-buttons a').first()).toHaveAttribute('href', '#khoa-hoc')
  await expect(page.locator('.nav-links a').first()).toHaveAttribute('href', '#khoa-hoc')
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    const metrics = await page.evaluate(() => {
      const ids = ['khoa-hoc', 'ung-dung', 'lo-trinh', 'ho-tro', 'ky-thi', 'faq']
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
  // The sample has no detail page, so the card links nowhere.
  await expect(page.locator('.landing-course a')).toHaveCount(0)
  expect(catalogRequests).toBe(0)
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
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fstudent%2Fassessments%2Fplacement$/)
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('app section introduces the Hocluc app on phones and links to its newest APK', async ({ page }) => {
  await page.goto('/')
  const section = page.locator('#ung-dung')
  await expect(section.getByRole('heading', { name: 'Mở ứng dụng là biết hôm nay học gì' })).toBeVisible()
  await expect(section).not.toContainText('Đang phát triển')
  // The one action is the download: the newest release on GitHub, always the same address.
  await expect(section.getByRole('link')).toHaveCount(1)
  await expect(section.getByRole('link', { name: 'Tải ứng dụng cho Android' })).toHaveAttribute(
    'href',
    'https://github.com/nguyenquocan0101/HocLuc-Releases/releases/latest/download/hocluc.apk'
  )
  await expect(section.getByRole('button')).toHaveCount(0)
  await expect(section.getByRole('img', { name: /Trang chủ ứng dụng Hocluc/ })).toBeVisible()
  await expect(section.getByRole('img', { name: /Máy tính CW-880/ })).toBeVisible()
})

test('app section fits narrow screens and holds still when motion is reduced', async ({ page }) => {
  const phone = page.locator('#ung-dung .motion-safe\\:animate-float-slow').first()
  await page.goto('/')
  await expect.poll(() => phone.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => phone.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    // The glow behind the phone is clipped on purpose, so measure the page and the visible parts.
    const fit = await page.evaluate(() => ({
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      partsOutside: Array.from(
        document.querySelectorAll<HTMLElement>('#ung-dung h2, #ung-dung li, #ung-dung img, #ung-dung button')
      ).filter((el) => {
        const { left, right } = el.getBoundingClientRect()
        return left < 0 || right > innerWidth
      }).length,
    }))
    expect(fit).toEqual({ pageOverflow: false, partsOutside: 0 })
  }
})

test('practice detail opens from the learning journey and closes back to its button', async ({ page }) => {
  await page.goto('/')
  const pill = page.locator('.practice-pills button').first()
  await pill.click()
  const dialog = page.locator('#detail-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('#detail-body p')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /câu mẫu/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Đóng chi tiết' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(pill).toBeFocused()
})

test('FAQ answers expand on demand', async ({ page }) => {
  await page.goto('/')
  const item = page.locator('.faq-list details').first()
  await expect(item.locator('p')).toBeHidden()
  await item.locator('summary').click()
  await expect(item).toHaveAttribute('open', '')
  await expect(item.locator('p')).toBeVisible()
})

test('subject tabs list the courses each roadmap is built from, priced from their own pages', async ({
  page,
}) => {
  const roadmap = { id: 'fixture-roadmap', title: 'Lộ trình kiểm thử', price: 2990000 }
  const gift = (courseId: string, title: string, categoryName: string) => ({
    courseId,
    title,
    categoryName,
    chapterCount: 2,
    lessonCount: 6,
  })
  await page.route(catalog, (route) => respond(route, [roadmap]))
  await page.route('**/api/v1/courses/fixture-roadmap', (route) =>
    respond(route, {
      ...roadmap,
      phases: [
        {
          id: 'phase-1',
          name: 'Giai đoạn 1',
          sections: [],
          gifts: [
            gift('fixture-math', 'Khóa Toán kiểm thử', 'Toán học'),
            gift('fixture-viet', 'Khóa Tiếng Việt kiểm thử', 'Tiếng Việt'),
          ],
        },
      ],
    })
  )
  await page.route('**/api/v1/courses/fixture-math', (route) =>
    respond(route, { id: 'fixture-math', title: 'Khóa Toán kiểm thử', paid: true, price: 390000 })
  )
  // A standalone course that is not paid is only studied inside a roadmap.
  await page.route('**/api/v1/courses/fixture-viet', (route) =>
    respond(route, { id: 'fixture-viet', title: 'Khóa Tiếng Việt kiểm thử', paid: false })
  )

  await page.goto('/')
  const mathTab = page.getByRole('tab', { name: /Toán/ })
  await expect(mathTab).toBeVisible()
  await expect(page.getByRole('tab', { name: /Khoa học/ })).toHaveCount(0)

  await mathTab.click()
  await expect(mathTab).toHaveAttribute('aria-selected', 'true')
  const mathCard = page.getByRole('tabpanel').locator('article', { hasText: 'Khóa Toán kiểm thử' })
  await expect(mathCard).toContainText('390.000')
  await expect(mathCard).toContainText('Có trong 1 lộ trình')
  await expect(mathCard.getByRole('link')).toHaveAttribute('href', '/courses/fixture-math')

  await page.getByRole('tab', { name: /Tiếng Việt/ }).click()
  const vietCard = page.getByRole('tabpanel').locator('article', { hasText: 'Khóa Tiếng Việt kiểm thử' })
  await expect(vietCard).toContainText('Học trong lộ trình')
  await expect(vietCard).not.toContainText('Học phí')
})

test('course filter row is centered when it fits and starts at its first chip when it scrolls', async ({
  page,
}) => {
  const roadmap = { id: 'fixture-roadmap', title: 'Lộ trình kiểm thử', price: 2990000 }
  const categories = ['Tiếng Việt', 'Tiếng Anh', 'Toán học', 'Logic', 'Khoa học', 'Chung']
  await page.route(catalog, (route) => respond(route, [roadmap]))
  await page.route('**/api/v1/courses/fixture-roadmap', (route) =>
    respond(route, {
      ...roadmap,
      phases: [
        {
          id: 'phase-1',
          name: 'Giai đoạn 1',
          sections: [],
          gifts: categories.map((categoryName, index) => ({
            courseId: `fixture-subject-${index}`,
            title: `Khóa ${categoryName} kiểm thử`,
            categoryName,
            chapterCount: 1,
            lessonCount: 3,
          })),
        },
      ],
    })
  )
  await page.goto('/')
  const tabs = page.getByRole('tablist', { name: 'Nhóm khóa học' })
  // The roadmap chip plus one chip per subject.
  await expect(tabs.getByRole('tab')).toHaveCount(1 + categories.length)

  const measure = () =>
    page.evaluate(() => {
      const list = document.querySelector<HTMLElement>('#khoa-hoc [role="tablist"]')!
      const row = list.parentElement!.getBoundingClientRect()
      const container = document.querySelector('#khoa-hoc .container')!.getBoundingClientRect()
      const chips = list.querySelectorAll<HTMLElement>('[role="tab"]')
      return {
        centerOffset: Math.abs((row.left + row.right) / 2 - (container.left + container.right) / 2),
        scrolls: list.scrollWidth > list.clientWidth,
        scrollLeft: list.scrollLeft,
        fade: getComputedStyle(list).maskImage,
        firstChipCut: chips[0].getBoundingClientRect().left < row.left,
        lastChipCut: chips[chips.length - 1].getBoundingClientRect().right > row.right + 0.5,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      }
    })

  // Wide enough to hold every chip: the row sits in the middle and nothing fades.
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(measure)
      .toMatchObject({ scrolls: false, fade: 'none', firstChipCut: false, lastChipCut: false, pageOverflow: false })
    expect((await measure()).centerOffset).toBeLessThan(1.5)
  }

  // Too narrow: the row takes the full width, opens on the first chip and scrolls to the last one.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect
      .poll(measure)
      .toMatchObject({ scrolls: true, scrollLeft: 0, firstChipCut: false, pageOverflow: false })
    expect((await measure()).fade).not.toBe('none')
    await tabs.evaluate((list) => list.scrollTo({ left: list.scrollWidth, behavior: 'instant' }))
    await expect.poll(measure).toMatchObject({ lastChipCut: false, pageOverflow: false })
    await tabs.evaluate((list) => list.scrollTo({ left: 0, behavior: 'instant' }))
  }
})

test('exam section shows the key facts from the official ĐHQG-HCM pages above the structure table', async ({
  page,
}) => {
  await page.goto('/')
  const section = page.locator('#ky-thi')
  const facts = section.locator('.exam-key-facts')
  await expect(facts.locator('dd')).toHaveText(['120', '150', '1.200', 'Trên giấy', '2', 'Hơn 100'])
  await expect(facts.locator('dt')).toHaveText([
    'Câu hỏi trắc nghiệm',
    'Phút làm bài',
    'Điểm tối đa',
    'Hình thức thi',
    'Đợt thi năm 2026',
    'Trường dùng kết quả để xét tuyển',
  ])
  const source = section.getByRole('link', { name: /Thông tin từ ĐHQG-HCM/ })
  await expect(source).toHaveAttribute('href', /^https:\/\/cetqa\.vnuhcm\.edu\.vn\//)
  await expect(source).toHaveAttribute('target', '_blank')
  await expect(source).toHaveAttribute('rel', /noopener/)
  await expect(section).toContainText(/cập nhật \d{2}\/\d{2}\/\d{4}/)

  // The figures come before the table and do not restate it: no per-part rows among them.
  const tops = await section.evaluate((el) => ({
    facts: el.querySelector('.exam-key-facts')!.getBoundingClientRect().top,
    table: el.querySelector('table')!.getBoundingClientRect().top,
  }))
  expect(tops.facts).toBeLessThan(tops.table)

  // Six cells divide into 6, 3 or 2 columns, and every figure stays inside its cell down to a small phone.
  const expectedRows = [
    [1440, 2],
    [1280, 2],
    [1024, 2],
    [768, 2],
    [390, 3],
    [320, 3],
  ] as const
  for (const [width, rows] of expectedRows) {
    await page.setViewportSize({ width, height: 900 })
    const fit = await facts.evaluate((el) => {
      const cells = Array.from(el.children) as HTMLElement[]
      return {
        rows: new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().top))).size,
        clipped: cells.filter((cell) => {
          const figure = cell.querySelector('dd')!
          return (
            figure.scrollWidth > figure.clientWidth ||
            figure.getBoundingClientRect().right > cell.getBoundingClientRect().right
          )
        }).length,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(fit, `${width}px`).toEqual({ rows, clipped: 0, pageOverflow: false })
  }
})

test('support section lists three ways to get help, with the app item leading to the app section', async ({
  page,
}) => {
  await page.goto('/')
  const section = page.locator('#ho-tro')
  await expect(section.getByRole('heading', { level: 3 })).toHaveText([
    'Hỏi mentor',
    'Hỏi gia sư AI',
  ])
  const app = section.getByRole('link', { name: /Học trên ứng dụng Hocluc/ })
  await expect(app).toHaveAttribute('href', '#ung-dung')
  await expect(app).not.toContainText('Đang phát triển')
  await expect(section.locator('li')).toHaveCount(3)

  // The photo sits beside the text on a wide screen and under the heading on a phone, and the heading
  // stays first in the reading order either way.
  for (const [width, beside] of [
    [1440, true],
    [390, false],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await section.evaluate((el) => {
      const heading = el.querySelector('h2')!.getBoundingClientRect()
      const photo = el.querySelector('img')!.getBoundingClientRect()
      const list = el.querySelector('ul')!.getBoundingClientRect()
      return {
        photoLeftOfHeading: photo.right <= heading.left,
        photoBelowHeading: photo.top >= heading.bottom,
        listBelowPhoto: list.top >= photo.bottom,
        listBesidePhoto: list.left >= photo.right,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(layout, `${width}px`).toEqual({
      photoLeftOfHeading: beside,
      photoBelowHeading: !beside,
      listBelowPhoto: !beside,
      listBesidePhoto: beside,
      pageOverflow: false,
    })
  }
})

test('carousel keeps looping after a slide is picked by hand', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const slides = page.locator('.hero-slide')
  const dots = page.locator('.hero-slide-buttons button')
  const last = (await dots.count()) - 1
  const dot = dots.nth(last)
  await dot.click()
  await expect(dot).toHaveAttribute('aria-current', 'true')
  await expect(slides.nth(last)).toHaveAttribute('aria-hidden', 'false')
  // The last slide wraps around to the first instead of stopping.
  await page.clock.runFor(6500)
  await expect(slides.nth(0)).toHaveAttribute('aria-hidden', 'false')
  await expect(page.getByRole('button', { name: /chuyển hình tự động/ })).toHaveCount(0)
})

// One roadmap built from two Toán courses and one Tiếng Việt course.
async function routeSubjectCatalog(page: import('@playwright/test').Page) {
  const roadmap = { id: 'fixture-roadmap', title: 'Lộ trình kiểm thử', price: 2990000 }
  const gift = (courseId: string, title: string, categoryName: string) => ({
    courseId,
    title,
    categoryName,
    chapterCount: 2,
    lessonCount: 6,
  })
  await page.route(catalog, (route) => respond(route, [roadmap]))
  await page.route('**/api/v1/courses/fixture-roadmap', (route) =>
    respond(route, {
      ...roadmap,
      phases: [
        {
          id: 'phase-1',
          name: 'Giai đoạn 1',
          sections: [],
          gifts: [
            gift('fixture-math', 'Khóa Toán kiểm thử', 'Toán học'),
            gift('fixture-math-2', 'Khóa Toán luyện đề kiểm thử', 'Toán học'),
            gift('fixture-viet', 'Khóa Tiếng Việt kiểm thử', 'Tiếng Việt'),
          ],
        },
      ],
    })
  )
}

const coursesButton = (page: import('@playwright/test').Page) =>
  page.locator('.nav-links').getByRole('button', { name: 'Khóa học theo môn' })
const coursesPanel = (page: import('@playwright/test').Page) => page.locator('#courses-nav-panel')

test('header course menu lists the subjects that have courses, with counts', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.goto('/')
  const button = coursesButton(page)
  const panel = coursesPanel(page)
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(button).toHaveAttribute('aria-controls', 'courses-nav-panel')
  await expect(panel).toBeHidden()
  // The "Khóa học" link keeps its own destination next to the button.
  await expect(page.locator('.nav-links a').first()).toHaveAttribute('href', '#khoa-hoc')

  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('link', { name: /Toán học/ })).toContainText('2 khóa')
  await expect(panel.getByRole('link', { name: /Tiếng Việt/ })).toContainText('1 khóa')
  await expect(panel.getByRole('link', { name: /Suy luận khoa học/ })).toHaveCount(0)
  await expect(panel.getByRole('link', { name: /Lộ trình trọn gói/ })).toContainText('1 khóa')
  await expect(panel.getByRole('link', { name: 'Xem tất cả khóa học' })).toHaveAttribute('href', '/courses')

  // A click outside closes it.
  await page.locator('#main h1').click()
  await expect(panel).toBeHidden()
})

test('choosing a subject in the header menu filters the course list on the home page', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.goto('/')
  await coursesButton(page).click()
  await coursesPanel(page).getByRole('link', { name: /Toán học/ }).click()
  await expect(coursesPanel(page)).toBeHidden()
  await expect(page.getByRole('tab', { name: /Toán/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('Khóa Toán kiểm thử')
  await expect
    .poll(() => page.locator('#khoa-hoc').evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBeLessThan(200)

  await coursesButton(page).click()
  await coursesPanel(page).getByRole('link', { name: /Lộ trình trọn gói/ }).click()
  await expect(page.getByRole('tab', { name: 'Lộ trình trọn gói' })).toHaveAttribute('aria-selected', 'true')
})

test('from another page a subject opens the home page with that filter in the URL', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.goto('/courses')
  await coursesButton(page).click()
  const math = coursesPanel(page).getByRole('link', { name: /Toán học/ })
  await expect(math).toHaveAttribute('href', '/?mon=toan#khoa-hoc')
  await math.click()
  await expect(page).toHaveURL(/\/\?mon=toan#khoa-hoc$/)
  await expect(page.getByRole('tab', { name: /Toán/ })).toHaveAttribute('aria-selected', 'true')
})

test('header course menu works from the keyboard and closes on Esc', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.goto('/')
  const button = coursesButton(page)
  const panel = coursesPanel(page)
  // Tabbing onto the button leaves the panel closed, and the next Tab goes on to the next nav item.
  await page.locator('.nav-links a').first().focus()
  await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
  await expect(panel).toBeHidden()
  await page.keyboard.press('Tab')
  await expect(page.locator('.nav-links').getByRole('link', { name: 'Ứng dụng' })).toBeFocused()

  // Enter and Space toggle it; Down opens it on its first item.
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(panel).toBeVisible()
  await page.keyboard.press('Space')
  await expect(panel).toBeHidden()
  await page.keyboard.press('ArrowDown')
  await expect(panel).toBeVisible()
  const links = panel.getByRole('link')
  await expect(links.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(links.nth(1)).toBeFocused()
  await page.keyboard.press('End')
  await expect(links.last()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(links.first()).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(button).toBeFocused()
})

test('header course menu opens when the mouse rests on it and closes when it leaves', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.goto('/')
  const panel = coursesPanel(page)
  await page.locator('.nav-links a').first().hover()
  await expect(panel).toBeVisible()
  await panel.getByRole('link', { name: /Tiếng Việt/ }).hover()
  await expect(panel).toBeVisible()
  // The first click on the button after hovering keeps the panel open.
  await coursesButton(page).click()
  await expect(panel).toBeVisible()
  await page.mouse.move(700, 700)
  await expect(panel).toBeHidden()
})

test('phone menu shows the courses as a group that expands', async ({ page }) => {
  await routeSubjectCatalog(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  const mobileNav = page.locator('#mobile-nav')
  const group = mobileNav.getByRole('button', { name: 'Khóa học' })
  await expect(group).toHaveAttribute('aria-expanded', 'false')
  await expect(mobileNav.getByRole('link', { name: /Toán học/ })).toHaveCount(0)
  await group.click()
  await expect(group).toHaveAttribute('aria-expanded', 'true')
  await expect(mobileNav.getByRole('link', { name: /Toán học/ })).toContainText('2 khóa')
  await expect(mobileNav.getByRole('link', { name: 'Xem tất cả khóa học' })).toBeVisible()
  const fit = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  expect(fit).toBe(false)

  await mobileNav.getByRole('link', { name: /Tiếng Việt/ }).click()
  await expect(mobileNav).toBeHidden()
  await expect(page.getByRole('tab', { name: /Tiếng Việt/ })).toHaveAttribute('aria-selected', 'true')
})
