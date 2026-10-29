import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

async function install(page: Page, role: 'STAFF' | 'TEACHER') {
  const state = await installQuizFixture(page, role)
  const calls: Array<{ path: string; method: string; body: unknown; search: string }> = []
  const statuses: Record<string, string> = {
    'q-1': 'IN_REVIEW',
    'q-2': 'IN_REVIEW',
    'q-3': 'APPROVED',
    'q-4': 'RETIRED',
  }
  const detail = (id: string) => ({
    id,
    sourceCode: id,
    sourceTitle: id,
    sourceNumber: null,
    year: null,
    round: null,
    text: `Nội dung ${id}`,
    passage: null,
    explanation: null,
    imageUrl: null,
    passageImageUrl: null,
    hasFigure: false,
    hasFormula: false,
    answerSource: 'NONE',
    reviewNeeded: false,
    reviewNotes: null,
    extractConfidence: null,
    label: null,
    reviewStatus: null,
    status: statuses[id],
    origin: 'MANUAL',
    difficulty: 'TB',
    questionType: 'SINGLE_CHOICE',
    categoryId: 'category-1',
    categoryName: 'Toán học',
    headVersionNo: 2,
    approvedVersionNo: 1,
    createdByName: 'QA',
    canEdit: false,
    canReview: statuses[id] === 'IN_REVIEW',
    canRetire: statuses[id] === 'APPROVED',
    canRestore: statuses[id] === 'RETIRED',
    options: [{ label: 'A', text: 'Một', correct: true }],
  })
  await page.route('**/api/v1/question-bank/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const body = method === 'POST' ? request.postDataJSON() : null
    calls.push({ path, method, body, search: url.search })
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data } })
    if (path.endsWith('/me/scopes'))
      return ok({
        administrator: false,
        authorSubjectIds: ['category-1'],
        reviewerSubjectIds: role === 'STAFF' ? ['category-1'] : [],
      })
    if (path.endsWith('/stats'))
      return ok({
        total: 4,
        needsReview: 2,
        unlabelled: 4,
        byPart: {},
        byYear: {},
        byAnswerSource: {},
        bySubject: [{ id: 'category-1', name: 'Toán học', count: 4 }],
      })
    if (path.endsWith('/labelling')) return ok({ ready: true, reason: null })
    if (path.endsWith('/patterns') || path.endsWith('/sources')) return ok([])
    if (path.endsWith('/versions'))
      return ok([
        {
          versionNo: 1,
          current: false,
          approved: true,
          text: 'Nội dung cũ',
          passage: null,
          explanation: null,
          options: [{ label: 'A', text: 'Cũ', correct: true }],
          createdByName: 'QA',
          changeNote: null,
          createdAt: '',
        },
        {
          versionNo: 2,
          current: true,
          approved: false,
          text: 'Nội dung mới',
          passage: null,
          explanation: 'Lời giải mới',
          options: [{ label: 'A', text: 'Mới', correct: true }],
          createdByName: 'QA',
          changeNote: null,
          createdAt: '',
        },
      ])
    if (path.endsWith('/bulk-approve'))
      return ok({ approved: ['q-1'], skipped: [{ id: 'q-2', reason: 'Không còn đủ điều kiện' }] })
    if (path.endsWith('/questions')) {
      const ids =
        url.searchParams.get('reviewable') === 'true'
          ? ['q-1', 'q-2']
          : ['q-1', 'q-2', 'q-3', 'q-4']
      return ok({
        content: ids.map(detail),
        pageNumber: 0,
        pageSize: 20,
        totalElements: ids.length,
        totalPages: 1,
        last: true,
      })
    }
    const match = path.match(/\/questions\/(q-\d)(?:\/(request-changes|retire))?$/)
    if (match) {
      if (match[2] === 'retire') statuses[match[1]] = 'RETIRED'
      if (match[2] === 'request-changes') statuses[match[1]] = 'CHANGES_REQUESTED'
      return ok(detail(match[1]))
    }
    state.unmatched.push(`${method} ${path}`)
    return route.fulfill({
      status: 404,
      json: { success: false, status: 404, message: 'unmatched' },
    })
  })
  return { state, calls }
}

/** Clicks the box of a shared checkbox: the input itself sits under the drawn box. */
const tick = (scope: ReturnType<Page['getByRole']>, name: string) =>
  scope.locator(`label:has([aria-label="${name}"])`).click()

test('reviewer compares versions, requests changes and approves selected questions', async ({
  page,
}) => {
  const { state, calls } = await install(page, 'STAFF')
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  const reviewTab = page.getByRole('tabpanel', { name: 'Chờ duyệt' })
  await expect(reviewTab.getByText('Nội dung q-1')).toBeVisible()
  await expect(reviewTab.getByText('Nội dung q-2')).toBeVisible()
  expect(calls.some((call) => new URLSearchParams(call.search).get('reviewable') === 'true')).toBe(
    true
  )
  await reviewTab.getByText('Nội dung q-1').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Bản đã duyệt' })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Bản chờ duyệt' })).toBeVisible()
  const requestChanges = page.getByRole('button', { name: 'Yêu cầu sửa' })
  await expect(requestChanges).toBeDisabled()
  await page.getByLabel('Nhận xét').fill('Cần sửa đáp án')
  await requestChanges.click()
  await expect
    .poll(() => calls.find((call) => call.path.endsWith('/request-changes'))?.body)
    .toEqual({ comment: 'Cần sửa đáp án' })
  await expect(dialog.getByText('Cần sửa', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await tick(reviewTab, 'Chọn q-1')
  await tick(reviewTab, 'Chọn q-2')
  await expect(reviewTab.getByRole('checkbox', { name: 'Chọn q-1' })).toBeChecked()
  await expect(reviewTab.getByRole('checkbox', { name: 'Chọn q-2' })).toBeChecked()
  await page.getByRole('button', { name: 'Duyệt đã chọn' }).click()
  await expect(page.getByText('Đã duyệt 1 câu.')).toBeVisible()
  await expect(page.getByText(/Không còn đủ điều kiện/)).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('ticking a row and then "Chọn tất cả" gives bulk approve every selected id', async ({ page }) => {
  const { state, calls } = await install(page, 'STAFF')
  await page.goto('/console/staff/question-bank')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  const reviewTab = page.getByRole('tabpanel', { name: 'Chờ duyệt' })
  const selectAll = reviewTab.getByRole('checkbox', { name: 'Chọn tất cả' })
  const first = reviewTab.getByRole('checkbox', { name: 'Chọn q-1' })
  const second = reviewTab.getByRole('checkbox', { name: 'Chọn q-2' })
  await expect(selectAll).toBeVisible()
  await expect(selectAll).not.toBeChecked()

  await tick(reviewTab, 'Chọn q-1')
  await expect(first).toBeChecked()
  await expect(selectAll).toHaveJSProperty('indeterminate', true)
  await tick(reviewTab, 'Chọn tất cả')
  await expect(first).toBeChecked()
  await expect(second).toBeChecked()
  await expect(selectAll).toBeChecked()

  await page.getByRole('button', { name: 'Duyệt đã chọn' }).click()
  await expect
    .poll(() => calls.find((call) => call.path.endsWith('/bulk-approve'))?.body)
    .toEqual({ questionIds: ['q-1', 'q-2'], comment: null })
  await expect(page.getByText('Đã duyệt 1 câu.')).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('retire and restore use their own permissions', async ({ page }) => {
  const { state, calls } = await install(page, 'STAFF')
  await page.goto('/console/staff/question-bank')
  await page.getByText('Nội dung q-3').click()
  const dialog = page.getByRole('dialog')
  await page.getByRole('button', { name: 'Ngừng dùng' }).click()
  await expect
    .poll(() => calls.some((call) => call.path.endsWith('/q-3/retire') && call.method === 'POST'))
    .toBe(true)
  await expect(page.getByRole('button', { name: 'Khôi phục' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await page.getByText('Nội dung q-4').click()
  await expect(page.getByRole('button', { name: 'Khôi phục' })).toBeVisible()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('teacher with only author scope cannot see the review tab', async ({ page }) => {
  const { state } = await install(page, 'TEACHER')
  await page.goto('/console/teacher/question-bank')
  await expect(page.getByRole('button', { name: 'Soạn câu' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Chờ duyệt' })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
