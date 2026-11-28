import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('admin can load and save confidence thresholds', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/v1/admin/system-settings/ai-confidence', async route => {
    if (route.request().method() === 'PUT') saved = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { source: 'database', values: saved ?? { reviewBelow: 0.7, minLabelConfidence: 0.4, chatSubjectMinConfidence: 0.5 } } }) })
  })
  await page.goto('/console/admin/confidence-settings')
  await expect(page.getByRole('heading', { name: 'Ngưỡng tin cậy AI' })).toBeVisible()
  await page.getByLabel('Ngưỡng đưa câu hỏi đi duyệt').fill('0.8')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình.')).toBeVisible()
  expect(saved).toMatchObject({ reviewBelow: 0.8, minLabelConfidence: 0.4, chatSubjectMinConfidence: 0.5 })
})
test('staff cannot open confidence settings', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/confidence-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
})
