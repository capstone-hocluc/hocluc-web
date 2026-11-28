import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('administrator loads, switches, tests and saves provider settings', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let active = 'openai'
  let shouldFail = false
  let saved: Record<string, unknown> | null = null
  await page.route('**/api/v1/admin/ai-settings**', async (route) => {
    const request = route.request(), url = new URL(request.url())
    const selected = url.searchParams.get('provider') ?? active
    const response = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 200, data }) })
    if (url.pathname.endsWith('/test')) return response(shouldFail
      ? { ok: false, model: 'fake-model', error: 'Không thể kết nối.' }
      : { ok: true, model: 'fake-model', latencyMs: 42 })
    if (request.method() === 'PUT') {
      saved = request.postDataJSON() as Record<string, unknown>
      active = String(saved.provider)
      return response({ ...saved, provider: active, source: 'database', secretSavingAvailable: true, secrets: { apiKey: '••••5678' } })
    }
    return response({ provider: active, selectedProvider: selected, source: 'database', secretSavingAvailable: true,
      model: selected === 'openai' ? 'saved-model' : '', secrets: selected === 'openai' ? { apiKey: '••••1234' } : {} })
  })
  await page.goto('/console/admin/ai-settings')
  await expect(page.getByRole('heading', { name: 'Cấu hình AI' })).toBeVisible()
  await expect(page.getByLabel('Khóa API')).toHaveAttribute('placeholder', 'Đã lưu ••••1234')
  await expect(page.getByRole('radio', { name: /OpenAI/ }).first()).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Cloudflare Workers AI' }).click()
  await page.getByLabel('Account ID').fill('fake-account')
  await page.getByLabel('Khóa API').fill('fake-token-5678')
  await page.getByLabel('Model', { exact: true }).fill('fake-model')
  await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click()
  await expect(page.getByText('Kết nối thành công · fake-model · 42 ms')).toBeVisible()
  shouldFail = true
  await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click()
  await expect(page.getByText('Không thể kết nối.')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình AI.')).toBeVisible()
  expect(saved).toMatchObject({ provider: 'cloudflare', accountId: 'fake-account', apiKey: 'fake-token-5678', model: 'fake-model' })
  await expect(page.getByRole('radio', { name: /Cloudflare Workers AI/ })).toContainText('Đang hoạt động')
  await expect(page.getByLabel('Khóa API')).toHaveValue('')
})

test('staff cannot open the page or see its menu entry', async ({ page }) => {
  const fixture = await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/ai-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  await expect(page.locator('aside nav').getByRole('button', { name: 'Cấu hình AI' })).toHaveCount(0)
  expect(fixture.requests.filter((entry) => entry.path.startsWith('/api/v1/admin/ai-settings'))).toHaveLength(0)
})
