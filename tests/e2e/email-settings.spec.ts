import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('admin checks and saves SMTP settings', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let fail = false
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/v1/admin/system-settings/email**', async route => {
    const req = route.request()
    const response = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
    if (req.url().endsWith('/test')) return response({ ok: !fail, message: fail ? 'Không gửi được email thử.' : 'Đã gửi email thử đến email của bạn' })
    if (req.method() === 'PUT') saved = req.postDataJSON() as Record<string, unknown>
    return response({ host: 'smtp.example.com', port: 587, username: 'admin@example.com', maskedPassword: '••••1234', tls: true, ssl: false, from: 'admin@example.com', fromName: 'HocLuc', source: 'database', encryptionAvailable: true })
  })
  await page.goto('/console/admin/email-settings')
  await expect(page.getByRole('heading', { name: 'Email', exact: true })).toBeVisible()
  await expect(page.getByLabel('Mật khẩu SMTP')).toHaveAttribute('placeholder', '••••1234')
  await page.getByRole('button', { name: 'Gửi email thử' }).click()
  await expect(page.getByText('Đã gửi email thử đến email của bạn')).toBeVisible()
  fail = true
  await page.getByRole('button', { name: 'Gửi email thử' }).click()
  await expect(page.getByText('Không gửi được email thử.')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình.')).toBeVisible()
  expect(saved).toMatchObject({ host: 'smtp.example.com', password: '' })
})

test('staff cannot open email settings', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/email-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
})
