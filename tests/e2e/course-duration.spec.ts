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
  const create = page.getByRole('dialog', { name: 'Tạo khóa học', exact: true })
  await selectOption(create, page, 'Loại khóa', 'Khóa nhỏ')
  await create.getByLabel('Tên khóa học', { exact: true }).fill('SECTION Thời lượng')
  await create.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await create.getByLabel('Thời lượng dự kiến (giờ)').fill('1.5')
  await create.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await create.getByRole('button', { name: 'Lưu khóa học', exact: true }).click()
  await expect(create).toBeHidden()

  expect(
    state.requests.find((request) => request.method === 'POST' && request.path === '/api/v1/admin/courses')!
      .body
  ).toMatchObject({ title: 'SECTION Thời lượng', estimatedDurationMinutes: 90 })
  const created = state.courses.find((course) => course.title === 'SECTION Thời lượng')!

  await page
    .getByRole('row', { name: /SECTION Thời lượng/ })
    .getByRole('button', { name: 'Thao tác khác với SECTION Thời lượng', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Sửa thông tin', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Sửa khóa học', exact: true })
  await edit.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(edit.getByLabel('Thời lượng dự kiến (giờ)')).toHaveValue('1.5')

  await edit.getByLabel('Thời lượng dự kiến (giờ)').fill('')
  await edit.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await edit.getByRole('button', { name: 'Lưu khóa học', exact: true }).click()
  await expect(edit).toBeHidden()

  expect(
    state.requests.find(
      (request) =>
        request.method === 'PUT' && request.path === `/api/v1/admin/courses/${created.id}`
    )!.body
  ).toMatchObject({ estimatedDurationMinutes: null })
})
