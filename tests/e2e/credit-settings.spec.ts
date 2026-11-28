import { expect, test } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

test('admin loads and saves prices and rewards', async ({ page }) => {
  await installQuizFixture(page, 'ADMINISTRATOR')
  let saved: Record<string, unknown> | undefined
  const values = { mentorQuestionPrice: 10, liveClassPrice: 2, defaultHoldTtlSeconds: 86400, holdSweepMs: 300000, holdSweepBatch: 200, mentorReplyWindowSeconds: 86400, dailyReward: 1, milestones: { 7: 5 }, monthlyCap: 60, bonusTtlSeconds: 7776000, freezePrice: 10, maxFreezes: 2, practicePassPercentage: 50, aiSolvePrice: 2, maxImageBytes: 5242880, aiSolveHoldTtlSeconds: 7200 }
  await page.route('**/api/v1/admin/system-settings/credits', async route => {
    if (route.request().method() === 'PUT') saved = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { source: 'database', values: saved ?? values } }) })
  })
  await page.goto('/console/admin/credit-settings')
  await expect(page.getByRole('heading', { name: 'Giá và Sao' })).toBeVisible()
  await page.getByLabel('Hỏi Mentor (sao)').fill('25')
  await page.getByLabel('Mốc thưởng (ngày:sao)').fill('7:5, 30:20')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText('Đã lưu cấu hình.')).toBeVisible()
  expect(saved).toMatchObject({ mentorQuestionPrice: 25, milestones: { 7: 5, 30: 20 } })
  await page.getByLabel('Mốc thưởng (ngày:sao)').fill('wrong')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(page.getByText(/Mốc thưởng phải có dạng/)).toBeVisible()
})

test('staff cannot open credit settings', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.goto('/console/staff/credit-settings')
  await expect(page.getByRole('heading', { name: '403 · Không có quyền truy cập' })).toBeVisible()
})
