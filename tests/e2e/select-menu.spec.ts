import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

const menus = (page: Page) => page.locator('[data-hocluc-select-menu]')

async function openMenu(page: Page, label: string) {
  await page.locator('main').getByRole('button', { name: new RegExp(`${label}$`) }).click()
}

// A menu closed by a choice fades out. Opening the next menu straight away, before it has faded, must not leave the
// first one stuck on the page over the content.
test('a select menu closed by a choice leaves the page even when the next menu opens at once', async ({ page }) => {
  await installQuizFixture(page, 'TEACHER')
  await page.goto('/console/teacher/quizzes')
  const types = ['Kiểm tra cuối bài', 'Quiz nhanh']
  const statuses = ['Bản nháp', 'Đã xuất bản']
  for (let round = 0; round < 6; round++) {
    await openMenu(page, 'Lọc loại bài kiểm tra')
    await page.getByRole('option', { name: types[round % 2], exact: true }).click()
    await openMenu(page, 'Lọc trạng thái')
    await page.getByRole('option', { name: statuses[round % 2], exact: true }).click()
    await expect(menus(page)).toHaveCount(0, { timeout: 2_000 })
  }
})
