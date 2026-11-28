import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('admin can check and save SePay settings', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let fail = false
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/v1/admin/system-settings/sepay**', async route => {
    const req = route.request()
    const response = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
    if (req.url().endsWith('/test')) return response({ ok: !fail, message: fail ? 'Số tài khoản không hợp lệ' : 'Cấu hình hợp lệ; chưa kết nối SePay' })
    if (req.method() === 'PUT') saved = req.postDataJSON() as Record<string, unknown>
    return response({ enabled: true, bankCode: 'MBBank', accountNumber: '12345678', accountName: 'TEST', maskedWebhookSecret: '••••1234', webhookMaxAgeSeconds: 300, paymentExpireMinutes: 15, source: 'database', encryptionAvailable: true })
  })
  await page.goto('/console/admin/sepay-settings')
  await expect(page.getByRole('heading', { name: 'Thanh toán SePay' })).toBeVisible()
  await expect(page.getByLabel('Khóa webhook')).toHaveAttribute('placeholder', '••••1234')
  await expect(page.getByLabel('URL webhook')).toHaveValue(/\/api\/v1\/payments\/webhook\/sepay$/)
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByText('Cấu hình hợp lệ; chưa kết nối SePay')).toBeVisible()
  fail = true
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByText('Số tài khoản không hợp lệ')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình.')).toBeVisible()
  expect(saved).toMatchObject({ bankCode: 'MBBank', webhookSecret: '' })
})

test('staff cannot open settings', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/sepay-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
})
