import { expect, test } from '@playwright/test'
import { fixtureProblems, installCrudFixture, STAMP } from './core-crud-fixture'
import type { Category } from '../../src/services/categoryService'

const categories: Category[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Toán',
    slug: 'toan',
    parentId: null,
    active: true,
    sortOrder: 2,
    description: null,
    imageUrl: null,
    updatedAt: STAMP,
  },
  {
    id: '20000000-0000-0000-0000-000000000011',
    name: 'Đại số',
    slug: 'dai-so',
    parentId: '20000000-0000-0000-0000-000000000001',
    active: true,
    sortOrder: 1,
    description: null,
    imageUrl: null,
    updatedAt: STAMP,
  },
  {
    id: '20000000-0000-0000-0000-000000000012',
    name: 'Hình học cũ',
    slug: 'hinh-hoc-cu',
    parentId: '20000000-0000-0000-0000-000000000001',
    active: false,
    sortOrder: 0,
    description: null,
    imageUrl: null,
    updatedAt: STAMP,
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    name: 'Lý',
    slug: 'ly',
    parentId: null,
    active: true,
    sortOrder: 1,
    description: null,
    imageUrl: null,
    updatedAt: STAMP,
  },
]

test.afterEach(async ({ page }) => {
  expect(fixtureProblems(page)).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

// Each sub-subject sits directly under its parent, and an inactive sibling goes last.
test('the subjects list puts each child right under its parent and inactive siblings last', async ({
  page,
}) => {
  await installCrudFixture(page)
  await page.route(
    (url) => url.pathname === '/api/v1/categories',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 200, message: 'OK', data: categories }),
      })
  )
  await page.goto('/staff/categories')

  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(4)
  await expect(rows.nth(0)).toContainText('Lý')
  await expect(rows.nth(1)).toContainText('Toán')
  await expect(rows.nth(2)).toContainText('Đại số')
  await expect(rows.nth(2)).toContainText('└')
  await expect(rows.nth(3)).toContainText('Hình học cũ')
  await expect(rows.nth(3)).toContainText('└')
})
