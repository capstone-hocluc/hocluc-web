import { expect, test } from '@playwright/test'
import { installBankRoundFixture } from './bank-rounds-fixture'

test('the round choices of an imported paper include the sample paper and it is sent as DE_MAU', async ({
  page,
}) => {
  const fixture = await installBankRoundFixture(page)
  await page.goto('/console/staff/ai-assistant')
  await page.getByRole('button', { name: 'Nạp đề', exact: true }).click()
  const dialog = page.getByRole('dialog')

  await dialog
    .getByLabel('File đề (PDF)')
    .setInputFiles({ name: 'de-2021.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })

  await dialog.getByRole('button', { name: / Năm$/ }).click()
  await page.getByRole('option', { name: 'Năm thi 2021', exact: true }).click()

  const round = dialog.getByRole('button', { name: / Đợt$/ })
  await expect(round).toBeEnabled()
  await round.click()
  await expect(page.getByRole('option', { name: 'Đợt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Đợt 2', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Đề mẫu', exact: true })).toBeVisible()
  await page.getByRole('option', { name: 'Đề mẫu', exact: true }).click()
  await expect(round).toContainText('Đề mẫu')

  await dialog.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await dialog.getByRole('button', { name: 'Xác nhận nhập', exact: true }).click()
  await expect(dialog).toBeHidden()

  expect(fixture.upload()).toMatch(/name="round"\r\n\r\nDE_MAU\r\n/)
  expect(fixture.state.unmatched).toEqual([])
  expect(fixture.state.pageErrors).toEqual([])
})
