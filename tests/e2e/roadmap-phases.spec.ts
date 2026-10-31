import { expect, test, type Locator, type Page } from '@playwright/test'
import { fixtureProblems, IDS, installCrudFixture } from './core-crud-fixture'
import { studentRoutes } from '../../src/lib/studentRoutes'
import {
  installRoadmapFixture,
  roadmapCourse,
  roadmapLesson,
  roadmapProblems,
  roadmapStudy,
  ROADMAP_IDS,
  sparseCourse,
  unphasedStudy,
} from './roadmap-fixture'

const LINKS = {
  a1: '72000000-0000-0000-0000-000000000001',
  a2: '72000000-0000-0000-0000-000000000002',
  b: '72000000-0000-0000-0000-000000000003',
  c: '72000000-0000-0000-0000-000000000004',
}

async function selectOption(scope: Page | Locator, page: Page, label: string, option: string) {
  await scope.getByRole('button', { name: new RegExp(label) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

// The `<h3>` group heading is a direct child of its `<section>`.
function giftGroup(page: Page, name: string) {
  return page.getByRole('heading', { name, exact: true }).locator('..')
}

function seedGiftLinks(state: Awaited<ReturnType<typeof installCrudFixture>>) {
  const main = state.courses.find((course) => course.id === IDS.main)!
  main.sections = [
    { id: LINKS.a1, sectionCourseId: 'gift-a1', title: 'Quà A1', status: 'DRAFT', sequence: 1, phaseId: IDS.phase1 },
    { id: LINKS.a2, sectionCourseId: 'gift-a2', title: 'Quà A2', status: 'DRAFT', sequence: 2, phaseId: IDS.phase1 },
    { id: LINKS.b, sectionCourseId: 'gift-b', title: 'Quà B', status: 'DRAFT', sequence: 3, phaseId: IDS.phase2 },
    { id: LINKS.c, sectionCourseId: 'gift-c', title: 'Quà C', status: 'DRAFT', sequence: 4, phaseId: IDS.phase2 },
  ]
}

test.afterEach(async ({ page }) => {
  const problems = fixtureProblems(page) ?? roadmapProblems(page)
  expect(problems).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

test('admin groups gifts by phase and reassigns one to another phase', async ({ page }) => {
  const state = await installCrudFixture(page)
  seedGiftLinks(state)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'MAIN Toán', exact: true }).click()
  await page.getByRole('tab', { name: 'Khóa tặng kèm', exact: true }).click()

  await expect(giftGroup(page, 'Nền tảng').getByRole('heading', { name: 'Quà A1', exact: true })).toBeVisible()
  await expect(giftGroup(page, 'Nền tảng').getByRole('heading', { name: 'Quà A2', exact: true })).toBeVisible()
  await expect(giftGroup(page, 'Luyện tập').getByRole('heading', { name: 'Quà B', exact: true })).toBeVisible()
  await expect(giftGroup(page, 'Luyện tập').getByRole('heading', { name: 'Quà C', exact: true })).toBeVisible()

  await selectOption(page, page, 'Giai đoạn của Quà B', 'Nền tảng')
  await expect
    .poll(
      () =>
        state.requests.find(
          (request) =>
            request.method === 'PUT' &&
            request.path === `/api/v1/admin/courses/${IDS.main}/sections/${LINKS.b}/phase`
        )?.body
    )
    .toEqual({ phaseId: IDS.phase1 })
  await expect(giftGroup(page, 'Nền tảng').getByRole('heading', { name: 'Quà B', exact: true })).toBeVisible()
  await expect(giftGroup(page, 'Luyện tập').getByRole('heading', { name: 'Quà B', exact: true })).toHaveCount(0)

  await selectOption(page, page, 'Giai đoạn của Quà C', 'Xuyên suốt lộ trình')
  await expect
    .poll(
      () =>
        state.requests.find(
          (request) =>
            request.method === 'PUT' &&
            request.path === `/api/v1/admin/courses/${IDS.main}/sections/${LINKS.c}/phase`
        )?.body
    )
    .toEqual({ phaseId: null })
  await expect(
    giftGroup(page, 'Xuyên suốt lộ trình').getByRole('heading', { name: 'Quà C', exact: true })
  ).toBeVisible()
  await expect(giftGroup(page, 'Luyện tập').getByRole('heading', { name: 'Quà C', exact: true })).toHaveCount(0)
})

// The shared console SelectField currently invokes its onChange twice per choice (react-aria's
// selection callback plus its hidden select's change event), so the panel sends the mutation twice.
test('one phase choice sends one phase mutation', async ({ page }) => {
  const state = await installCrudFixture(page)
  seedGiftLinks(state)
  await page.goto('/staff/courses')
  await page.getByRole('button', { name: 'MAIN Toán', exact: true }).click()
  await page.getByRole('tab', { name: 'Khóa tặng kèm', exact: true }).click()

  await selectOption(page, page, 'Giai đoạn của Quà B', 'Nền tảng')
  await expect
    .poll(
      () =>
        state.requests.filter(
          (request) =>
            request.method === 'PUT' &&
            request.path === `/api/v1/admin/courses/${IDS.main}/sections/${LINKS.b}/phase`
        ).length
    )
    .toBeGreaterThan(0)
  expect(
    state.requests
      .filter((request) => request.method === 'PUT' && request.path.endsWith('/phase'))
      .map((request) => ({ path: request.path, body: request.body }))
  ).toEqual([
    {
      path: `/api/v1/admin/courses/${IDS.main}/sections/${LINKS.b}/phase`,
      body: { phaseId: IDS.phase1 },
    },
  ])
})

test('manager sees the gift grouping without the phase select', async ({ page }) => {
  const state = await installCrudFixture(page, 'MANAGER')
  seedGiftLinks(state)
  await page.goto('/manager/courses')
  await page.getByRole('button', { name: 'MAIN Toán', exact: true }).click()
  await page.getByRole('tab', { name: 'Khóa tặng kèm', exact: true }).click()

  await expect(giftGroup(page, 'Nền tảng').getByRole('heading', { name: 'Quà A1', exact: true })).toBeVisible()
  await expect(giftGroup(page, 'Luyện tập').getByRole('heading', { name: 'Quà C', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Giai đoạn của Quà A1', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tặng kèm khóa', exact: true })).toHaveCount(0)
  expect(state.requests.filter((request) => request.method !== 'GET')).toHaveLength(0)
})

test('public course page renders 4/6/8 gifts under their phases and the unphased gift last', async ({ page }) => {
  await installRoadmapFixture(page, {
    courses: { [ROADMAP_IDS.main]: roadmapCourse(), [ROADMAP_IDS.sparse]: sparseCourse() },
  })
  await page.goto(`/courses/${ROADMAP_IDS.main}`)
  await expect(page.getByRole('heading', { name: 'Lộ trình học', exact: true })).toBeVisible()

  const stages = page.locator('.cd-stage')
  await expect(stages).toHaveCount(4)
  await expect(stages.locator('h3')).toHaveText([
    'Giai đoạn 1',
    'Giai đoạn 2',
    'Giai đoạn 3',
    'Xuyên suốt lộ trình',
  ])
  await expect(stages.nth(0).locator('.cd-gift')).toHaveCount(4)
  await expect(stages.nth(1).locator('.cd-gift')).toHaveCount(6)
  await expect(stages.nth(2).locator('.cd-gift')).toHaveCount(8)
  await expect(stages.nth(3).locator('.cd-gift')).toHaveCount(1)
  await expect(stages.nth(3).locator('.cd-gift')).toContainText('Quà xuyên suốt')

  // The old grouping read "Khóa tặng kèm:" out of the description; the roadmap must ignore it.
  await expect(page.getByText('Khóa tặng kèm: Không có thật.')).toHaveCount(0)
  await expect(stages.nth(0).locator('.cd-stage-body > p')).toHaveCount(0)
})

test('public course page does not render an empty gift group', async ({ page }) => {
  await installRoadmapFixture(page, {
    courses: { [ROADMAP_IDS.main]: roadmapCourse(), [ROADMAP_IDS.sparse]: sparseCourse() },
  })
  await page.goto(`/courses/${ROADMAP_IDS.sparse}`)
  await expect(page.getByRole('heading', { name: 'Lộ trình học', exact: true })).toBeVisible()
  await expect(page.locator('.cd-stage')).toHaveCount(2)
  await expect(page.locator('.cd-stage h3')).toHaveText(['Giai đoạn 1', 'Giai đoạn 2'])
  await expect(page.locator('.cd-gifts')).toHaveCount(0)
  await expect(page.locator('.cd-gift')).toHaveCount(0)
  await expect(page.getByText('Khóa đi kèm', { exact: true })).toHaveCount(0)
})

test('study page shows phase percentages, gift progress and opens phase 2 at the continue lesson', async ({ page }) => {
  await installRoadmapFixture(page, {
    studies: { [ROADMAP_IDS.main]: roadmapStudy() },
    lessons: { [ROADMAP_IDS.lessonB]: roadmapLesson() },
  })
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))
  await expect(page.getByRole('heading', { name: 'MAIN Lộ trình kiểm thử', exact: true })).toBeVisible()

  await expect(page.getByRole('button', { name: /Giai đoạn 1/ })).toContainText('50%')
  await expect(page.getByRole('button', { name: /Giai đoạn 2/ })).toContainText('33%')

  // Phase 2 holds the continue lesson, so it starts open while phase 1 stays collapsed.
  const giftBHeading = page.getByRole('heading', { name: 'Quà giai đoạn 2 · B', exact: true })
  await expect(giftBHeading).toBeVisible()
  await expect(page.getByText('Phần nền tảng', { exact: true })).toHaveCount(0)

  const giftB = giftBHeading.locator('..').locator('..')
  await expect(giftB).toContainText('2/6 bài học')
  await expect(giftB).toContainText('33%')
  await expect(giftB).toHaveClass(/bg-surface-brand/)
  await expect(giftB.getByRole('link', { name: 'Vào học', exact: true })).toHaveAttribute(
    'href',
    studentRoutes.courseStudy(ROADMAP_IDS.giftB)
  )

  await expect(page.getByRole('heading', { name: 'Xuyên suốt lộ trình', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quà xuyên suốt', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Tiếp tục học/ }).click()
  await expect(page).toHaveURL(studentRoutes.lesson(ROADMAP_IDS.giftB, ROADMAP_IDS.lessonB))
  await expect(page.getByRole('heading', { name: 'Bài mở đầu của quà', exact: true })).toBeVisible()
})

test('a course with only unphased content has no "Xuyên suốt lộ trình" heading', async ({ page }) => {
  await installRoadmapFixture(page, {
    studies: { [ROADMAP_IDS.unphased]: unphasedStudy() },
  })
  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.unphased))
  await expect(page.getByRole('heading', { name: 'MAIN chỉ có nội dung chung', exact: true })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Xuyên suốt lộ trình', exact: true })).toHaveCount(0)
  await expect(page.locator('b').filter({ hasText: /^01$/ })).toHaveCount(0)
  await expect(page.getByText('Phần chung', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quà xuyên suốt', exact: true })).toBeVisible()
})

test('study and public course pages fit a 390px viewport without horizontal scroll', async ({ page }) => {
  await installRoadmapFixture(page, {
    courses: { [ROADMAP_IDS.main]: roadmapCourse() },
    studies: { [ROADMAP_IDS.main]: roadmapStudy() },
  })
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(studentRoutes.courseStudy(ROADMAP_IDS.main))
  await expect(page.getByRole('heading', { name: 'MAIN Lộ trình kiểm thử', exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)

  await page.goto(`/courses/${ROADMAP_IDS.main}`)
  await expect(page.getByRole('heading', { name: 'Lộ trình học', exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true)
})
