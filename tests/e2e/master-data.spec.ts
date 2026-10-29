import { expect, test, type Locator, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

const version = (status: string) => ({
  id: 'v-1', categoryId: 'category-1', categoryName: 'Toán', version: '1.0', codePrefix: 'MA', status,
  importedAt: '2026-10-20T08:00:00Z', sourceFilename: 'toan.xlsx', activatedAt: null,
})

async function install(page: Page, importAnswer: 'ok' | 'invalid') {
  const state = await installQuizFixture(page, 'STAFF')
  let versions = [] as ReturnType<typeof version>[]
  const calls: string[] = []
  await page.route('**/api/v1/admin/master-data/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    calls.push(`${request.method()} ${url.pathname}${url.search}`)
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data } })
    if (url.pathname.endsWith('/import')) {
      if (importAnswer === 'invalid') {
        return route.fulfill({
          status: 400,
          json: {
            success: false, status: 400, message: 'File Master Data không hợp lệ.',
            data: { valid: false, warnings: [], errors: [{ sheetName: 'Patterns', rowNumber: 7, columnName: 'code', message: 'Mã bị trùng' }] },
          },
        })
      }
      versions = [version('DRAFT')]
      return ok({ versionId: 'v-1', version: '1.0', status: 'DRAFT', summary: { patterns: 20 }, warnings: [] })
    }
    if (url.pathname.endsWith('/validation'))
      return ok({ valid: true, errors: [], warnings: [], sheetRowCounts: {} })
    if (url.pathname.endsWith('/activate')) {
      versions = [version('ACTIVE')]
      return ok(versions[0])
    }
    if (url.pathname.endsWith('/versions')) return ok(versions)
    return route.fulfill({ status: 404, json: { success: false, status: 404, message: 'unmatched' } })
  })
  return { state, calls }
}

const workbook = { name: 'toan.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('PK') }

/** The version bar; its status badge is the only visible "Bản nháp"/"Đang dùng" on the page. */
const versionBar = (page: Page) => page.locator('section').filter({ hasText: 'v1.0 · ' })

/** The shared report table, told apart from other tables by its "Nội dung" column. */
const reportTable = (scope: Page | Locator) =>
  scope.getByRole('table').filter({ hasText: 'Nội dung' })

test('staff import a workbook as a draft and activate it', async ({ page }) => {
  const { state, calls } = await install(page, 'ok')
  await page.goto('/console/staff/taxonomy')
  await expect(page.getByText('Môn này chưa có master data', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Nhập file Excel' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('File Excel').setInputFiles(workbook)
  await dialog.getByRole('button', { name: 'Nhập file', exact: true }).click()
  await dialog.getByRole('button', { name: 'Xem bản nháp' }).click()
  await expect(dialog).toBeHidden()
  await expect(versionBar(page).getByText('Bản nháp', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Kích hoạt' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Kích hoạt' }).click()
  await expect(versionBar(page).getByText('Đang dùng', { exact: true })).toBeVisible()
  expect(calls).toContain('POST /api/v1/admin/master-data/versions/v-1/activate')
  expect(calls.some(call => call.includes('categoryId=category-1'))).toBe(true)
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})

test('a rejected workbook shows where each error is', async ({ page }) => {
  const { state } = await install(page, 'invalid')
  await page.goto('/console/staff/taxonomy')

  await page.getByRole('button', { name: 'Nhập file Excel' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('File Excel').setInputFiles(workbook)
  await dialog.getByRole('button', { name: 'Nhập file', exact: true }).click()
  await expect(
    dialog.getByText('File chưa được nhập: 1 lỗi. Sửa trong Excel rồi nhập lại.')
  ).toBeVisible()
  const row = reportTable(dialog).getByRole('row', { name: /Patterns/ })
  await expect(row.getByRole('cell', { name: 'Patterns' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '7', exact: true })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'code', exact: true })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Mã bị trùng' })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
