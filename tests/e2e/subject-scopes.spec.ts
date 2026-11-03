import { expect, test, type Page } from '@playwright/test'
import { fixtureProblems, IDS, installCrudFixture } from './core-crud-fixture'

const ADMIN_USER = '40000000-0000-0000-0000-000000000099'
const adminSummary = {
  id: ADMIN_USER,
  email: 'admin@example.invalid',
  firstName: 'Quản trị',
  lastName: 'QA',
  displayName: 'Quản trị QA',
  status: 'ACTIVE',
  role: 'ADMINISTRATOR',
  roles: ['ADMINISTRATOR'],
  emailVerified: true,
}

interface Grant {
  categoryId: string
  capability: string
}

/** The subject rights of the accounts the spec opens, plus the PUT bodies they were replaced with. */
async function installScopes(page: Page, initial: Record<string, Grant[]>) {
  const grants = { ...initial }
  const written: Array<{ scopes: Grant[] }> = []
  await page.route(
    (url) => url.pathname.startsWith('/api/v1/admin/users/') && url.pathname.endsWith('/scopes'),
    async (route) => {
      const request = route.request()
      const userId = new URL(request.url()).pathname.split('/')[5]
      if (request.method() === 'PUT') {
        const body = request.postDataJSON() as { scopes: Grant[] }
        written.push(body)
        grants[userId] = body.scopes
      }
      const scopes = (grants[userId] ?? []).map((grant, index) => ({
        id: `scope-${index}`,
        categoryId: grant.categoryId,
        categoryName: grant.categoryId === IDS.root ? 'Toán' : 'Đại số',
        capability: grant.capability,
        coveredCategoryNames: [grant.categoryId === IDS.root ? 'Toán' : 'Đại số'],
      }))
      await route.fulfill({
        json: { success: true, status: 200, message: 'OK', data: { userId, scopes } },
      })
    }
  )
  return { written }
}

async function openSubjectTab(page: Page, rowName: RegExp) {
  await page.getByRole('row', { name: rowName }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi tiết tài khoản', exact: true })
  await dialog.getByRole('tab', { name: 'Quyền theo môn', exact: true }).click()
  return dialog
}

test.afterEach(async ({ page }) => {
  expect(fixtureProblems(page)).toMatchObject({
    unmatchedRequests: [],
    pageErrors: [],
    consoleErrors: [],
  })
})

test('a subject right is saved as the whole set and Hủy thay đổi restores the stored ones', async ({
  page,
}) => {
  await installCrudFixture(page, 'ADMINISTRATOR')
  const { written } = await installScopes(page, {
    [IDS.teacher]: [{ categoryId: IDS.root, capability: 'AUTHOR' }],
  })
  await page.goto('/admin/users')
  const dialog = await openSubjectTab(page, /Giáo viên QA/)

  const author = dialog.getByRole('checkbox', { name: 'Soạn nhãn · Toán', exact: true })
  const teach = dialog.getByRole('checkbox', { name: 'Giảng dạy · Toán', exact: true })
  const algebra = dialog.getByRole('checkbox', { name: 'Soạn nhãn · Đại số', exact: true })
  const save = dialog.getByRole('button', { name: 'Lưu quyền', exact: true })
  const reset = dialog.getByRole('button', { name: 'Hủy thay đổi', exact: true })

  await expect(author).toBeChecked()
  await expect(teach).not.toBeChecked()
  await expect(algebra).not.toBeChecked()
  await expect(save).toBeDisabled()
  await expect(reset).toBeDisabled()

  // The box drawn over the input is what a person clicks; the input itself sits under it.
  await teach.check({ force: true })
  await expect(save).toBeEnabled()
  await reset.click()
  await expect(teach).not.toBeChecked()
  await expect(save).toBeDisabled()
  expect(written).toEqual([])

  await teach.check({ force: true })
  await save.click()
  await expect.poll(() => written).toEqual([
    {
      scopes: [
        { categoryId: IDS.root, capability: 'AUTHOR' },
        { categoryId: IDS.root, capability: 'TEACH' },
      ],
    },
  ])
  await expect(teach).toBeChecked()
  await expect(save).toBeDisabled()
})

test('an administrator account is told it already has every right in every subject', async ({
  page,
}) => {
  await installCrudFixture(page, 'ADMINISTRATOR')
  await installScopes(page, { [ADMIN_USER]: [] })
  await page.route(
    (url) => url.pathname === '/api/v1/users',
    async (route) => {
      await route.fulfill({
        json: {
          success: true,
          status: 200,
          message: 'OK',
          data: {
            content: [adminSummary],
            pageNumber: 0,
            pageSize: 20,
            totalElements: 1,
            totalPages: 1,
            last: true,
          },
        },
      })
    }
  )
  await page.route(
    (url) => url.pathname === `/api/v1/users/${ADMIN_USER}`,
    async (route) => {
      await route.fulfill({
        json: { success: true, status: 200, message: 'OK', data: adminSummary },
      })
    }
  )
  await page.goto('/admin/users')
  const dialog = await openSubjectTab(page, /Quản trị QA/)

  await expect(dialog.getByText('Quản trị viên có mọi quyền ở mọi môn.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
})

test('the subject rights table fits a 390px viewport without scrolling the page sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installCrudFixture(page, 'ADMINISTRATOR')
  await installScopes(page, {
    [IDS.teacher]: [{ categoryId: IDS.root, capability: 'AUTHOR' }],
  })
  await page.goto('/admin/users')
  const dialog = await openSubjectTab(page, /Giáo viên QA/)
  await expect(dialog.getByRole('checkbox', { name: 'Soạn nhãn · Toán', exact: true })).toBeChecked()

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})
