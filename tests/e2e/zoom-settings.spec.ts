import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('admin can check and save Zoom settings', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let fail = false
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/v1/admin/system-settings/zoom**', async route => {
    const req = route.request()
    const response = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
    if (req.url().endsWith('/test')) return response({ status: fail ? 'invalid' : 'valid', message: fail ? 'Client không hợp lệ' : 'Zoom đã xác thực ứng dụng OAuth' })
    if (req.method() === 'PUT') saved = req.postDataJSON() as Record<string, unknown>
    return response({ enabled: true, accountId: 'account', clientId: 'server-client', sdkKey: 'sdk-key', oauthClientId: 'oauth-client', redirectUri: 'https://example.com/callback', secrets: { oauthClientSecret: '••••1234' }, source: 'database', encryptionAvailable: true })
  })
  await page.goto('/console/admin/zoom-settings')
  await expect(page.getByRole('heading', { name: 'Zoom', exact: true })).toBeVisible()
  await expect(page.getByLabel('OAuth client secret')).toHaveAttribute('placeholder', '••••1234')
  await expect(page.getByText(/giáo viên kết nối lại Zoom/)).toBeVisible()
  await expect(page.getByText(/meeting:update:status/)).toBeVisible()
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByText('Zoom đã xác thực ứng dụng OAuth')).toBeVisible()
  fail = true
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByText('Client không hợp lệ')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình.')).toBeVisible()
  expect(saved).toMatchObject({ oauthClientId: 'oauth-client', oauthClientSecret: '' })
})

test('staff cannot open Zoom settings', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/zoom-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
})
