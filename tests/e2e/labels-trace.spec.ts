import { expect, test, type Page } from '@playwright/test'
import { LABEL_IDS, installLabelsTrace, labelsTraceProblems } from './labels-trace-fixture'

const contentUrl = `/console/staff/courses?courseId=${LABEL_IDS.course}`
const area = 'staff'
const traceHref = (kind: string, code: string) =>
  `/console/${area}/taxonomy?categoryId=${LABEL_IDS.subject}&kind=${kind}&code=${code}`
const courseHref = `/console/${area}/courses?courseId=${LABEL_IDS.course}`

const chapterRow = (page: Page) =>
  page.locator('li').filter({ has: page.getByRole('heading', { name: 'Đọc hiểu', exact: true }) })
const lessonList = (page: Page) => page.locator('ul').filter({ hasText: 'Bài đọc 1' })

async function openContent(page: Page) {
  await page.goto(contentUrl)
  await expect(page.getByRole('tab', { name: 'Nội dung' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Chương và bài học' })).toBeVisible()
}

async function openLessons(page: Page) {
  await page.getByRole('button', { name: 'Mở Đọc hiểu' }).click()
  await expect(lessonList(page)).toBeVisible()
}

test.afterEach(async ({ page }) => {
  expect(labelsTraceProblems(page)).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

// Rendered FE workflows against a fail-closed API fixture, not BE/integration proof.
test('course covers keep only http(s) or root images and ?courseId opens the content tab', async ({
  page,
}) => {
  const fixture = await installLabelsTrace(page)
  await page.goto(`/console/${area}/courses`)
  const row = (title: string) => page.getByRole('row').filter({ hasText: title })

  await expect(row('Ngữ văn 12').getByRole('img', { name: 'Ngữ văn 12' })).toHaveAttribute(
    'src',
    /\/cover-ok\.png$/
  )
  // A broken remote image falls back to the subject's first letter; an unsafe or relative URL is
  // never requested at all, so its tile comes from the subject, else the title.
  await expect(row('Toán nâng cao').getByRole('img', { name: 'Toán nâng cao' })).toHaveText('T')
  await expect(row('Khóa hình ảnh lạ').getByRole('img', { name: 'Khóa hình ảnh lạ' })).toHaveText('K')
  await expect(
    row('Khóa đường dẫn tương đối').getByRole('img', { name: 'Khóa đường dẫn tương đối' })
  ).toHaveText('T')
  expect(fixture.external()).toEqual([])

  await row('Ngữ văn 12').getByRole('button', { name: 'Ngữ văn 12', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Ngữ văn 12' })).toHaveAttribute(
    'src',
    /\/cover-ok\.png$/
  )

  await page.goto(contentUrl)
  await expect(page.getByRole('tab', { name: 'Nội dung' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Chương và bài học' })).toBeVisible()
})

test('a labeler saves a chapter with domains from the active label set', async ({ page }) => {
  const fixture = await installLabelsTrace(page)
  await openContent(page)

  await expect(chapterRow(page).getByText('TV.D01', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sửa chương Đọc hiểu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa chương' })
  // Each domain is its own checkbox, named by that domain, not a shared <label> around the group.
  const domain = (code: string) => dialog.getByRole('checkbox', { name: code })
  await expect(dialog.getByRole('checkbox')).toHaveCount(3)
  await expect(domain('TV.D01')).toBeChecked()
  await expect(domain('TV.D02')).not.toBeChecked()
  await expect(domain('TV.D03')).not.toBeChecked()
  // The box drawn over the input is what a person clicks; the input itself sits under it.
  await domain('TV.D02').check({ force: true })
  await dialog.getByRole('button', { name: 'Lưu chương' }).click()
  await expect(dialog).toBeHidden()

  expect(fixture.chapterSaves()[0]).toMatchObject({
    title: 'Đọc hiểu',
    domainCodes: ['TV.D01', 'TV.D02'],
    expectedUpdatedAt: '2026-10-20T00:00:00Z',
  })
  await expect(chapterRow(page).getByText('TV.D02', { exact: true })).toBeVisible()
})

test('the chapter domain choices are named and fit a 390px viewport', async ({ page }) => {
  const fixture = await installLabelsTrace(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openContent(page)

  await page.getByRole('button', { name: 'Sửa chương Đọc hiểu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa chương' })
  await expect(dialog.getByRole('checkbox', { name: 'TV.D01' })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: 'TV.D02' })).not.toBeChecked()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)

  await dialog.getByRole('checkbox', { name: 'TV.D02' }).check({ force: true })
  await dialog.getByRole('checkbox', { name: 'TV.D01' }).uncheck({ force: true })
  await dialog.getByRole('button', { name: 'Lưu chương' }).click()
  await expect(dialog).toBeHidden()
  expect(fixture.chapterSaves()[0]).toMatchObject({
    title: 'Đọc hiểu',
    domainCodes: ['TV.D02'],
  })
})

test('a labeler without an active label set sees no domain choices and sends none', async ({
  page,
}) => {
  const fixture = await installLabelsTrace(page, { activeMasterData: false })
  await openContent(page)

  await expect(chapterRow(page).getByText('TV.D01', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sửa chương Đọc hiểu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa chương' })
  await expect(dialog.getByText('Môn này chưa có khung đề thi đang dùng.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Lưu chương' }).click()
  await expect(dialog).toBeHidden()

  const saved = fixture.chapterSaves()[0]
  expect(saved).not.toHaveProperty('domainCodes')
})

test('a reader gets neither domain choices nor the lesson label button, but still sees chips', async ({
  page,
}) => {
  await installLabelsTrace(page, { labeler: false })
  await openContent(page)

  await expect(chapterRow(page).getByText('TV.D01', { exact: true })).toBeVisible()
  await openLessons(page)
  await expect(lessonList(page).getByRole('button', { name: 'Nhãn' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Sửa chương Đọc hiểu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa chương' })
  await expect(dialog.getByText('Domain', { exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
})

test('the lesson label dialog lists only the chapter-domain skills and keeps exactly one primary', async ({
  page,
}) => {
  const fixture = await installLabelsTrace(page)
  await openContent(page)
  await openLessons(page)
  await lessonList(page).getByRole('button', { name: 'Nhãn' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nhãn bài học' })
  const checkbox = (code: string) => dialog.getByRole('checkbox', { name: code })
  const radios = dialog.getByRole('radio', { name: 'Kỹ năng chính' })

  // The chapter is in TV.D01 only: TV.S03 (TV.D02) is not offered and there is no show-all control.
  await expect(checkbox('TV.S01')).toBeVisible()
  await expect(checkbox('TV.S02')).toBeVisible()
  await expect(checkbox('TV.S03')).toHaveCount(0)
  await expect(dialog.getByText('Hiện tất cả')).toHaveCount(0)

  // The first ticked skill becomes primary; another pick does not take it over.
  await checkbox('TV.S02').check({ force: true })
  await expect(radios).toHaveCount(1)
  await expect(radios.nth(0)).toBeChecked()
  await checkbox('TV.S01').check({ force: true })
  await expect(radios).toHaveCount(2)
  await expect(radios.nth(1)).toBeChecked()

  // Choosing another primary and then unticking it hands the role to the next ticked skill.
  await radios.nth(0).click()
  await expect(radios.nth(0)).toBeChecked()
  await expect(radios.nth(1)).not.toBeChecked()
  await checkbox('TV.S01').uncheck({ force: true })
  await expect(radios).toHaveCount(1)
  await expect(radios.nth(0)).toBeChecked()

  await dialog.getByRole('button', { name: 'Lưu nhãn' }).click()
  await expect(dialog).toBeHidden()
  expect(fixture.labelSaves()[0]).toEqual({ skills: [{ code: 'TV.S02', primary: true }] })
  await expect(lessonList(page).getByText('TV.S02', { exact: true })).toBeVisible()
})

test('a chapter in TV.D03 offers its own skill and hides every skill of the other domains', async ({
  page,
}) => {
  await installLabelsTrace(page, { chapterDomains: ['TV.D03'] })
  await openContent(page)
  await openLessons(page)
  await lessonList(page).getByRole('button', { name: 'Nhãn' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nhãn bài học' })
  await expect(dialog.getByRole('checkbox', { name: 'TV.S04' })).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: 'TV.S01' })).toHaveCount(0)
  await expect(dialog.getByRole('checkbox', { name: 'TV.S03' })).toHaveCount(0)
  await expect(dialog.getByText('Hiện tất cả')).toHaveCount(0)
})

test('question label facts link to their taxonomy records and the lessons are deduped', async ({
  page,
}) => {
  await installLabelsTrace(page)
  await page.goto(`/console/${area}/question-bank`)
  await page
    .getByRole('row', { name: /Đề Ngữ văn 2024/ })
    .getByRole('button', { name: 'Chi tiết' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Tiếng Việt · Đề Ngữ văn 2024 · Câu 1' })

  await expect(dialog.getByRole('link', { name: 'TV.D01 · Đọc hiểu' })).toHaveAttribute(
    'href',
    traceHref('domains', 'TV.D01')
  )
  await expect(
    dialog.getByRole('link', { name: 'TV.P01 · Đọc hiểu văn bản' })
  ).toHaveAttribute('href', traceHref('patterns', 'TV.P01'))
  await expect(dialog.getByRole('link', { name: 'TV.S02 · Suy luận' })).toHaveAttribute(
    'href',
    traceHref('skills', 'TV.S02')
  )
  await expect(dialog.getByRole('link', { name: 'TV.M01 · Tìm từ khóa' })).toHaveAttribute(
    'href',
    traceHref('microSkills', 'TV.M01')
  )

  await expect(dialog.getByRole('heading', { name: 'Bài học dạy kỹ năng này' })).toBeVisible()
  const lessons = dialog.getByRole('link', { name: 'Ngữ văn 12 › Đọc hiểu › Bài đọc 1' })
  await expect(lessons).toHaveCount(1)
  await expect(lessons).toHaveAttribute('href', courseHref)
})

test('a question whose primary skill teaches no lesson says so', async ({ page }) => {
  await installLabelsTrace(page)
  await page.goto(`/console/${area}/question-bank`)
  await page
    .getByRole('row', { name: /Đề Ngữ văn 2025/ })
    .getByRole('button', { name: 'Chi tiết' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Tiếng Việt · Đề Ngữ văn 2025 · Câu 2' })
  await expect(dialog.getByRole('heading', { name: 'Bài học dạy kỹ năng này' })).toBeVisible()
  await expect(dialog.getByText('Chưa có bài học', { exact: true })).toBeVisible()
})

test('taxonomy deep links open the subject, related lessons, questions and chapters', async ({
  page,
}) => {
  // Three cold SPA navigations; under a shared worker this needs more than the default 30s.
  test.setTimeout(60_000)
  const fixture = await installLabelsTrace(page)
  await page.goto(
    `/console/${area}/taxonomy?categoryId=${LABEL_IDS.subject}&kind=skills&code=TV.S02`
  )
  await expect(
    page.getByRole('navigation', { name: 'Môn học' }).getByRole('button', { name: 'Ngữ văn' })
  ).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('button', { name: 'v1.0 · Đang dùng' })).toBeVisible()

  const sheet = page.getByRole('dialog', { name: 'Kỹ năng' })
  await expect(sheet.getByText('Suy luận', { exact: true })).toBeVisible()
  await sheet.getByRole('button', { name: 'Bài học (1)' }).click()
  await expect(
    sheet.getByRole('link', { name: 'Ngữ văn 12 › Đọc hiểu › Bài đọc 1' })
  ).toHaveAttribute('href', courseHref)
  await expect(sheet.getByRole('link', { name: 'Câu hỏi (7)' })).toHaveAttribute(
    'href',
    `/console/${area}/question-bank?primarySkillCode=TV.S02`
  )

  await page.goto(
    `/console/${area}/taxonomy?categoryId=${LABEL_IDS.subject}&kind=domains&code=TV.D01`
  )
  const domainSheet = page.getByRole('dialog', { name: 'Domain' })
  await domainSheet.getByRole('button', { name: 'Chương (1)' }).click()
  await expect(
    domainSheet.getByRole('link', { name: 'Ngữ văn 12 › Đọc hiểu' })
  ).toHaveAttribute('href', courseHref)

  await page.goto(
    `/console/${area}/taxonomy?categoryId=${LABEL_IDS.subject}&kind=skills&code=TV.S02`
  )
  await page.getByRole('link', { name: 'Câu hỏi (7)' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/console/${area}/question-bank\\?primarySkillCode=TV\\.S02$`)
  )
  // The URL changes on click; the cold bank route mounts behind it, so wait for its first render
  // before reading the rows (otherwise "no second row" would pass on an empty page).
  await expect(page.getByText('Kỹ năng chính: TV.S02', { exact: true })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('row', { name: /Đề Ngữ văn 2024/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Đề Ngữ văn 2025/ })).toHaveCount(0)
  expect(
    fixture
      .api()
      .some(
        (call) =>
          call.path === '/api/v1/question-bank/questions' &&
          call.query.includes('primarySkillCode=TV.S02') &&
          call.query.includes('size=20')
      )
  ).toBe(true)
})

test('the label dialog and the question detail fit a 390px viewport', async ({ page }) => {
  await installLabelsTrace(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openContent(page)
  await openLessons(page)

  await lessonList(page).getByRole('button', { name: 'Nhãn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nhãn bài học' })
  await expect(dialog.getByRole('checkbox', { name: 'TV.S01' })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)
  await dialog.getByRole('button', { name: 'Hủy' }).click()

  await page.goto(`/console/${area}/question-bank`)
  await page
    .getByRole('row', { name: /Đề Ngữ văn 2024/ })
    .getByRole('button', { name: 'Chi tiết' })
    .click()
  const detail = page.getByRole('dialog', { name: 'Tiếng Việt · Đề Ngữ văn 2024 · Câu 1' })
  await expect(
    detail.getByRole('link', { name: 'Ngữ văn 12 › Đọc hiểu › Bài đọc 1' })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)
})
