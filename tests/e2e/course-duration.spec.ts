import { expect, test, type Locator, type Page } from '@playwright/test'
import { fixtureProblems, installCrudFixture } from './core-crud-fixture'

async function selectOption(scope: Page | Locator, page: Page, label: string, option: string) {
  await scope.getByRole('button', { name: new RegExp(label) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.afterEach(async ({ page }) => {
  expect(fixtureProblems(page)).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

// The pricing step takes hours from a person and the API stores minutes.
test('the course editor sends 1.5 hours as 90 minutes and null once cleared', async ({ page }) => {
  const state = await installCrudFixture(page)
  await page.goto('/staff/courses')

  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click()
  await selectOption(page, page, 'Loại khóa', 'Khóa nhỏ')
  await page.getByRole('textbox', { name: 'Tên khóa học', exact: true }).fill('SECTION Thời lượng')
  // Hours are asked on the last step, with the price.
  const next = page.getByRole('button', { name: 'Tiếp tục', exact: true })
  await next.click()
  await next.click()
  await page.getByLabel('Thời lượng học (giờ)').fill('1.5')
  await page.getByRole('button', { name: 'Lưu khóa học', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'SECTION Thời lượng', exact: true })).toBeVisible()

  expect(
    state.requests.find((request) => request.method === 'POST' && request.path === '/api/v1/admin/courses')!
      .body
  ).toMatchObject({ title: 'SECTION Thời lượng', estimatedDurationMinutes: 90 })
  const created = state.courses.find((course) => course.title === 'SECTION Thời lượng')!

  await page.getByRole('button', { name: 'Sửa thông tin', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sửa khóa học', exact: true })).toBeVisible()
  await next.click()
  await next.click()
  await expect(page.getByLabel('Thời lượng học (giờ)')).toHaveValue('1.5')

  await page.getByLabel('Thời lượng học (giờ)').fill('')
  await page.getByRole('button', { name: 'Lưu khóa học', exact: true }).click()
  // Saving an edit goes back to where it was opened from.
  await expect(page.getByRole('heading', { name: 'SECTION Thời lượng', exact: true })).toBeVisible()

  expect(
    state.requests.find(
      (request) =>
        request.method === 'PUT' && request.path === `/api/v1/admin/courses/${created.id}`
    )!.body
  ).toMatchObject({ estimatedDurationMinutes: null })
})
