import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('administrator loads, switches, tests and saves provider settings', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let active = 'openai'
  let shouldFail = false
  let saved: Record<string, unknown> | null = null
  let jevSaved: Record<string, unknown> | null = null
  let composeSaved: Record<string, unknown> | null = null
  await page.route('**/api/v1/admin/ai-settings**', async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    const selected = url.searchParams.get('provider') ?? active
    const response = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 200, data }),
      })
    if (url.pathname.endsWith('/compose')) {
      if (request.method() === 'PUT') composeSaved = request.postDataJSON() as Record<string, unknown>
      return response({ source: 'database', values: composeSaved ?? { reuseRatio: 0.2, maxCellsPerCall: 30, minHardShare: 0.2, maxRepairAttempts: 1, maxAnswerRewrites: 1, consecutiveFailureLimit: 3, similarityThreshold: 0.7, parallelism: 3, maxTokensPerJob: 3000000, mathSandboxUrl: '' } })
    }
    if (url.pathname.endsWith('/jev/test'))
      return response({ ok: true, model: 'jev-test', latencyMs: 18 })
    if (url.pathname.endsWith('/jev')) {
      if (request.method() === 'PUT') jevSaved = request.postDataJSON() as Record<string, unknown>
      return response({
        baseUrl: 'https://example.invalid',
        model: 'jev-test',
        maskedApiKey: '••••9999',
        secretSavingAvailable: true,
        source: 'database',
      })
    }
    if (url.pathname.endsWith('/test'))
      return response(
        shouldFail
          ? { ok: false, model: 'fake-model', error: 'Không thể kết nối.' }
          : { ok: true, model: 'fake-model', latencyMs: 42 }
      )
    if (request.method() === 'PUT') {
      saved = request.postDataJSON() as Record<string, unknown>
      active = String(saved.provider)
      return response({
        ...saved,
        provider: active,
        source: 'database',
        secretSavingAvailable: true,
        secrets: { apiKey: '••••5678' },
      })
    }
    return response({
      provider: active,
      selectedProvider: selected,
      source: 'database',
      secretSavingAvailable: true,
      model: selected === 'openai' ? 'saved-model' : '',
      secrets: selected === 'openai' ? { apiKey: '••••1234' } : {},
    })
  })
  await page.goto('/console/admin/ai-settings')
  await expect(page.getByRole('heading', { name: 'Cấu hình AI' })).toBeVisible()
  await expect(page.getByLabel('Khóa API', { exact: true })).toHaveAttribute(
    'placeholder',
    'Đã lưu ••••1234'
  )
  await expect(page.getByRole('radio', { name: /OpenAI/ }).first()).toBeChecked()
  await page.getByText('Cloudflare Workers AI', { exact: true }).click()
  await page.getByLabel('Account ID').fill('fake-account')
  await page.getByLabel('Khóa API', { exact: true }).fill('fake-token-5678')
  await page.getByLabel('Model', { exact: true }).fill('fake-model')
  await page.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click()
  await expect(page.getByText('Kết nối thành công · fake-model · 42 ms')).toBeVisible()
  shouldFail = true
  await page.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click()
  await expect(page.getByText('Không thể kết nối.')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình AI.')).toBeVisible()
  expect(saved).toMatchObject({
    provider: 'cloudflare',
    accountId: 'fake-account',
    apiKey: 'fake-token-5678',
    model: 'fake-model',
  })
  await expect(
    page.getByRole('radio', { name: /Cloudflare Workers AI/ }).locator('..')
  ).toContainText('Đang hoạt động')
  await expect(page.getByLabel('Khóa API', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Khóa API Jev')).toHaveAttribute('placeholder', 'Đã lưu ••••9999')
  await page.getByRole('button', { name: 'Kiểm tra kết nối Jev' }).click()
  await expect(page.getByText('Kết nối Jev thành công · jev-test · 18 ms')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu Jev' }).click()
  await expect(page.getByText('Đã lưu cấu hình gán nhãn.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thông số soạn đề' })).toBeVisible()
  await page.getByLabel('Số phần chạy song song (1–20)').fill('5')
  await page.getByRole('button', { name: 'Lưu thông số' }).click()
  await expect(page.getByText('Đã lưu thông số soạn đề.')).toBeVisible()
  expect(composeSaved).toMatchObject({ parallelism: 5 })
  expect(jevSaved).toMatchObject({
    baseUrl: 'https://example.invalid',
    model: 'jev-test',
    apiKey: '',
  })
})

test('staff cannot open the page or see its menu entry', async ({ page }) => {
  const fixture = await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/ai-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
  await expect(page.locator('aside nav').getByRole('button', { name: 'Cấu hình AI' })).toHaveCount(
    0
  )
  expect(
    fixture.requests.filter((entry) => entry.path.startsWith('/api/v1/admin/ai-settings'))
  ).toHaveLength(0)
})
