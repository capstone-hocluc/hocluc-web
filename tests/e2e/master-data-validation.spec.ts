import { expect, test, type Page } from '@playwright/test'
import { installMasterData, issue, report } from './master-data-fixture'

const workbook = {
  name: 'toan.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('PK'),
}

/** The shared report table, told apart from the other tables by its "Nội dung" column. */
const reportTable = (page: Page) =>
  page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Nội dung' }) })

const activateButton = (page: Page) =>
  page.getByRole('button', { name: 'Kích hoạt', exact: true })

test('a valid draft without warnings can be activated', async ({ page }) => {
  const { state, calls } = await installMasterData(page)
  await page.goto('/console/staff/taxonomy')

  await expect(page.getByText('Hợp lệ', { exact: true })).toBeVisible()
  const activate = activateButton(page)
  await expect(activate).toBeEnabled()

  await activate.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Kích hoạt', exact: true }).click()
  await expect(page.getByText(/Đã kích hoạt phiên bản 1\.0\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tạo bản nháp để chỉnh sửa' })).toBeVisible()

  expect(calls).toContain('POST /api/v1/admin/master-data/versions/v-1/activate')
  expect(calls.filter((call) => call.endsWith('/validation'))).toHaveLength(1)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a valid draft with warnings hides them until asked and mentions them in the confirm dialog', async ({
  page,
}) => {
  const { state, calls } = await installMasterData(page, {
    validations: [
      report(
        [],
        [
          issue('Question_Types', 'Dạng câu chưa có kỹ năng chính'),
          issue('Mappings', 'Mapping chưa có micro-skill', { rowNumber: 4, columnName: 'micro_skill_code' }),
        ]
      ),
    ],
  })
  await page.goto('/console/staff/taxonomy')

  await expect(page.getByText('Hợp lệ · 2 cảnh báo', { exact: true })).toBeVisible()
  await expect(reportTable(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Xem cảnh báo' }).click()
  const table = reportTable(page)
  await expect(table).toBeVisible()
  await expect(table.getByRole('cell', { name: 'Question_Types' })).toBeVisible()
  await expect(table.getByRole('cell', { name: 'Mappings' })).toBeVisible()

  await activateButton(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Bản nháp còn 2 cảnh báo.')
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  expect(calls.some((call) => call.endsWith('/activate'))).toBe(false)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('an invalid draft lists errors before warnings and blocks activation', async ({ page }) => {
  const { state, calls } = await installMasterData(page, {
    validations: [
      report(
        [
          issue('Question_Types', 'Mã bị trùng', { rowNumber: 7, columnName: 'code' }),
          issue('Domains', 'Thiếu tên domain', { rowNumber: 3, columnName: 'name_vi' }),
        ],
        [issue('Skills', 'Kỹ năng chưa có domain', { rowNumber: 5, columnName: 'domain_codes' })]
      ),
    ],
  })
  await page.goto('/console/staff/taxonomy')

  await expect(
    page.getByText('Chưa kích hoạt được: 2 lỗi, 1 cảnh báo', { exact: true })
  ).toBeVisible()
  const rows = reportTable(page).locator('tbody tr')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Question_Types')
  await expect(rows.nth(0).locator('svg[aria-label="Lỗi"]')).toBeVisible()
  await expect(rows.nth(1)).toContainText('Domains')
  await expect(rows.nth(2)).toContainText('Skills')
  await expect(rows.nth(2).locator('svg[aria-label="Cảnh báo"]')).toBeVisible()
  await expect(rows.nth(2).getByText('Kỹ năng chưa có domain')).toBeVisible()

  const holder = page.locator('span[title="Còn lỗi, sửa trước khi kích hoạt"]')
  await expect(holder).toBeVisible()
  await expect(holder.getByRole('button', { name: 'Kích hoạt', exact: true })).toBeDisabled()

  expect(calls.some((call) => call.endsWith('/activate'))).toBe(false)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('clicking a report row opens its data tab, a README row does not', async ({ page }) => {
  const { state } = await installMasterData(page, {
    validations: [
      report([
        issue('Mappings', 'Mapping trỏ tới dạng câu đã xóa', { rowNumber: 4 }),
        issue('README', 'Sheet ghi chú không được nhập', { rowNumber: 1, columnName: null }),
      ]),
    ],
  })
  await page.goto('/console/staff/taxonomy')

  const table = reportTable(page)
  await expect(page.getByRole('tab', { name: 'Cấu trúc' })).toHaveAttribute('aria-selected', 'true')
  await table.getByRole('row', { name: /Mappings/ }).click()
  await expect(page.getByRole('tab', { name: 'Mapping' })).toHaveAttribute('aria-selected', 'true')

  await table.getByRole('row', { name: /README/ }).click()
  await expect(page.getByRole('tab', { name: 'Mapping' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Cấu trúc' })).toHaveAttribute('aria-selected', 'false')

  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('Kiểm tra lại asks for a new report and shows its result', async ({ page }) => {
  const { state, calls, validationRequests } = await installMasterData(page, {
    validations: [
      report([issue('Domains', 'Mã domain bị trùng', { rowNumber: 2 })]),
      report(),
    ],
  })
  await page.goto('/console/staff/taxonomy')

  await expect(
    page.getByText('Chưa kích hoạt được: 1 lỗi, 0 cảnh báo', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Kiểm tra lại' }).click()

  await expect(page.getByText('Hợp lệ', { exact: true })).toBeVisible()
  await expect(activateButton(page)).toBeEnabled()
  await expect(reportTable(page)).toHaveCount(0)
  expect(validationRequests).toHaveLength(2)
  expect(calls.filter((call) => call.endsWith('/validation'))).toHaveLength(2)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a failed validation shows a retry notice and blocks activation until it recovers', async ({
  page,
}) => {
  const { state, calls } = await installMasterData(page, {
    validations: ['fail', report()],
  })
  await page.goto('/console/staff/taxonomy')

  await expect(page.getByText('Có lỗi từ hệ thống, vui lòng thử lại sau.')).toBeVisible()
  const retry = page.getByRole('button', { name: 'Thử lại' })
  await expect(retry).toBeVisible()

  const holder = page.locator('span[title="Chưa kiểm tra được bản nháp"]')
  await expect(holder).toBeVisible()
  await expect(holder.getByRole('button', { name: 'Kích hoạt', exact: true })).toBeDisabled()

  await retry.click()
  await expect(page.getByText('Hợp lệ', { exact: true })).toBeVisible()
  await expect(activateButton(page)).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Thử lại' })).toHaveCount(0)

  expect(calls.filter((call) => call.endsWith('/validation'))).toHaveLength(2)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a validation report returned by activate replaces the card', async ({ page }) => {
  const rejection = report([
    issue('Mappings', 'Mapping trỏ tới dạng câu đã xóa', { rowNumber: 4, columnName: 'question_type_code' }),
  ])
  const { state, calls } = await installMasterData(page, {
    activateRejection: { status: 400, report: rejection },
  })
  await page.goto('/console/staff/taxonomy')

  await expect(page.getByText('Hợp lệ', { exact: true })).toBeVisible()
  await activateButton(page).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Kích hoạt', exact: true }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByText('Chưa kích hoạt được: 1 lỗi, 0 cảnh báo', { exact: true })
  ).toBeVisible()
  await expect(reportTable(page).getByRole('cell', { name: 'Mappings' })).toBeVisible()
  await expect(activateButton(page)).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)

  expect(calls).toContain('POST /api/v1/admin/master-data/versions/v-1/activate')
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('an active version is not validated', async ({ page }) => {
  const { state, calls, validationRequests } = await installMasterData(page, {
    versions: ['ACTIVE'],
  })
  await page.goto('/console/staff/taxonomy')

  await expect(page.getByRole('button', { name: 'Tạo bản nháp để chỉnh sửa' })).toBeVisible()
  await expect(page.getByText('Hợp lệ', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Kiểm tra lại' })).toHaveCount(0)
  expect(validationRequests).toHaveLength(0)
  expect(calls.some((call) => call.endsWith('/validation'))).toBe(false)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

// A TEACHER authors master data (imports, edits drafts) but is not a reviewer, so the draft is
// validated while "Kích hoạt" stays hidden (TAXONOMY_ACTIVATE is not granted to TEACHER).
test('a teacher sees the validation card but not the activate button', async ({ page }) => {
  const { state, calls, validationRequests } = await installMasterData(page, { role: 'TEACHER' })
  await page.goto('/console/teacher/taxonomy')

  await expect(page.getByRole('heading', { name: 'Master data' })).toBeVisible()
  await expect(page.getByText('Hợp lệ', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kiểm tra lại' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'So sánh' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xóa nháp' })).toBeVisible()
  await expect(activateButton(page)).toHaveCount(0)

  expect(validationRequests).toHaveLength(1)
  expect(calls.some((call) => call.endsWith('/activate'))).toBe(false)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a staff member sees the activate button on the same draft', async ({ page }) => {
  const { state } = await installMasterData(page)
  await page.goto('/console/staff/taxonomy')

  await expect(activateButton(page)).toBeEnabled()
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a rejected workbook still shows its report in the import dialog', async ({ page }) => {
  const { state } = await installMasterData(page, { importAnswer: 'invalid' })
  await page.goto('/console/staff/taxonomy')

  await page.getByRole('button', { name: 'Nhập file Excel' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('File Excel').setInputFiles(workbook)
  await dialog.getByRole('button', { name: 'Nhập file', exact: true }).click()

  await expect(
    dialog.getByText('File chưa được nhập: 1 lỗi. Sửa trong Excel rồi nhập lại.')
  ).toBeVisible()
  const table = dialog.getByRole('table')
  await expect(table.getByRole('cell', { name: 'Patterns' })).toBeVisible()
  await expect(table.getByRole('cell', { name: '7', exact: true })).toBeVisible()
  await expect(table.getByRole('cell', { name: 'code', exact: true })).toBeVisible()
  await expect(table.getByRole('cell', { name: 'Mã bị trùng' })).toBeVisible()

  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})
