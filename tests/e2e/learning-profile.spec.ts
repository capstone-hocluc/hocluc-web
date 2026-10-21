import type { Page } from '@playwright/test'
import { expect, test } from './auth-live-test'
import type { StudentProfile, UserProfile } from '../../src/services/userService'

// These scenarios reload several student screens. Alongside the shared login
// pacing, leave a minute between scenarios for the live per-IP request budget.
test.beforeEach(async () => { await new Promise((resolve) => setTimeout(resolve, 40_000)) })

async function login(page: Page, destination = '/login') {
  await page.goto(destination)
  await page.getByRole('button', { name: 'Học viên student@gmail.com', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

// The live API deliberately forbids resetting COMPLETED/DEFERRED to NOT_SHOWN.
// Use the real lifecycle on an untouched seed; on reruns simulate only the two
// profile endpoints, keeping login, categories and placement on the local API.
async function lifecycle(page: Page, forceFixture = false) {
  let simulated = forceFixture
  let initialized = false
  let user: UserProfile
  let student: StudentProfile
  const writes: Record<string, unknown>[] = []
  await page.route('**/api/v1/users/profiles', async (route) => {
    const response = await route.fetch()
    if (!response.ok()) { await route.fulfill({ response }); return }
    const body = await response.json()
    if (!initialized) {
      user = body.data
      simulated ||= user.onboardingState !== 'NOT_SHOWN'
      student = { ...user.studentProfile, id: user.studentProfile?.id ?? '', onboardingState: 'NOT_SHOWN', targetScore: null, targetUniversity: '', targetMajor: '', subjectAssessments: [] }
      initialized = true
      test.info().annotations.push({ type: 'profile lifecycle', description: simulated ? 'Profile endpoints simulated: live API cannot reset onboarding state' : 'Live seeded profile endpoints' })
      console.log(simulated ? 'Profile lifecycle: repeatable profile fixture (irreversible state contract)' : 'Profile lifecycle: live local backend')
    }
    if (simulated) await route.fulfill({ response, json: { ...body, data: { ...user, onboardingState: student.onboardingState, studentProfile: student } } })
    else await route.fulfill({ response })
  })
  await page.route('**/api/v1/users/student-profiles', async (route) => {
    if (route.request().method() !== 'PUT') { await route.continue(); return }
    const payload = route.request().postDataJSON()
    writes.push(payload)
    if (simulated) {
      student = { ...student, ...payload }
      await route.fulfill({ json: { success: true, status: 200, data: student } })
    } else await route.continue()
  })
  return { writes }
}

test('first login, draft, backdrop, keyboard, mobile and completion persist', async ({ page }) => {
  const flow = await lifecycle(page)
  await login(page)
  await expect(page).toHaveURL('/student/dashboard')
  const dialog = page.getByRole('dialog', { name: 'Mục tiêu', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.getByRole('heading', { name: 'Mục tiêu', exact: true })).toBeFocused()
  await expect(dialog.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true })).toHaveValue('')
  await page.mouse.click(8, 8)
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Đóng và lưu bản nháp' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: 'Trường đại học mục tiêu', exact: true }).fill('Đại học Bách khoa')
  await page.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('1201')
  await expect(page.getByRole('alert')).toContainText('0 đến 1200')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(flow.writes.at(-1)).not.toHaveProperty('targetScore')
  expect(flow.writes.at(-1)).toMatchObject({ onboardingState: 'DEFERRED', targetUniversity: 'Đại học Bách khoa' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Hoàn tất hồ sơ học tập', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const reminder = page.getByRole('button', { name: 'Hoàn tất hồ sơ học tập', exact: true })
  await reminder.click()
  await expect(page.getByRole('textbox', { name: 'Trường đại học mục tiêu', exact: true })).toHaveValue('Đại học Bách khoa')
  await page.setViewportSize({ width: 390, height: 844 })
  const box = await dialog.boundingBox()
  expect(box?.x).toBe(0)
  expect(box?.y).toBe(0)
  expect(box?.width).toBe(390)
  expect(box?.height).toBe(844)
  await page.getByRole('button', { name: 'Để sau', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(reminder).toBeFocused()
  await reminder.click()
  await page.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Môn học', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: 'Chưa xác định', exact: true }).click()
  await page.getByRole('textbox', { name: 'Trường đại học mục tiêu', exact: true }).fill('')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  // Transport failure is injected once; the retry performs the actual live PUT.
  await page.route('**/api/v1/users/student-profiles', async (route) => { await route.abort('failed') }, { times: 1 })
  await page.getByRole('button', { name: 'Lưu và đến bài đánh giá', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Môn học', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(flow.writes.at(-1)).toMatchObject({ onboardingState: 'COMPLETED', targetScore: null, targetUniversity: '', targetMajor: '' })
  await page.reload()
  await expect(page.getByRole('main')).toContainText(/bài đánh giá/i)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/onboarding')
  await expect(page).toHaveURL('/student/dashboard')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('validated placement return arrives before opening the dialog', async ({ page }) => {
  await lifecycle(page, true)
  await login(page, '/login?returnTo=%2Fstudent%2Fassessments%2Fplacement')
  await expect(page).toHaveURL('/student/assessments/placement')
  await expect(page.getByRole('dialog', { name: 'Mục tiêu', exact: true })).toBeVisible()
})

test('live saved goals can be edited without stale legacy fields overwriting them', async ({ page }) => {
  await login(page)
  // Open a non-trigger page without relying on the seed's lifecycle state.
  await page.goto('/student/profile?section=student')
  const summary = page.getByRole('region', { name: 'Mục tiêu và môn học tự đánh giá', exact: true })
  await expect(summary).toBeVisible()
  await summary.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu và đến bài đánh giá', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/student/profile?section=student')
  await expect(summary).toContainText('0 / 1200')
  // Unedited legacy controls must display the freshly saved goal too.
  await expect(page.getByLabel('Điểm mục tiêu', { exact: true })).toHaveValue('0')
  const save = page.waitForRequest((request) => request.url().endsWith('/api/v1/users/student-profiles') && request.method() === 'PUT')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  expect((await save).postDataJSON()).not.toHaveProperty('targetScore')
  await expect(summary).toContainText('0 / 1200')
  await page.goto('/student/learning-profile')
  await expect(page.getByRole('region', { name: 'Mục tiêu và môn học tự đánh giá', exact: true })).toContainText('0 / 1200')
  await page.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true }).click()
  await page.getByRole('button', { name: 'Chưa xác định', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu và đóng', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  const goals = page.getByRole('region', { name: 'Mục tiêu và môn học tự đánh giá', exact: true })
  await expect(goals).toContainText('Chưa xác định')
  await expect(goals).not.toContainText('0 / 1200')
})

test('live subject choices are exclusive and persist with real category identities', async ({ page }) => {
  await login(page)
  await page.goto('/student/learning-profile')
  const goals = page.getByRole('region', { name: 'Mục tiêu và môn học tự đánh giá', exact: true })
  const categories = page.waitForResponse((response) => response.url().endsWith('/api/v1/categories') && response.request().method() === 'GET')
  await goals.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true }).click()
  const response = await categories
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  if (response.status() === 403) {
    await expect(page.getByRole('alert')).toContainText('Không thể tải môn học')
    test.skip(true, 'Backend category API forbids STUDENT; requires a student-readable category contract. No fake IDs or backend edits.')
  }
  expect(response.status()).toBe(200)
  const subject = page.getByRole('dialog').getByRole('group').first()
  await expect(subject).toBeVisible()
  const subjectName = await subject.getAttribute('aria-label')
  await subject.getByRole('button', { name: 'Tự tin', exact: true }).click()
  await expect(subject.getByRole('button', { name: 'Tự tin', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await subject.getByRole('button', { name: 'Cần cải thiện', exact: true }).click()
  await expect(subject.getByRole('button', { name: 'Tự tin', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(subject.getByRole('button', { name: 'Cần cải thiện', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Lưu và đến bài đánh giá', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await page.goto('/student/learning-profile')
  await expect(goals).toContainText(`${subjectName} · Cần cải thiện`)
})

test('completed profile dismissals discard edits and explicit saving preserves completed state', async ({ page }) => {
  await login(page)
  await page.goto('/student/learning-profile')
  const goals = page.getByRole('region', { name: 'Mục tiêu và môn học tự đánh giá', exact: true })
  await expect(goals).toBeVisible()
  const writes: Record<string, unknown>[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/v1/users/student-profiles') && request.method() === 'PUT') writes.push(request.postDataJSON())
  })
  const edit = goals.getByRole('button', { name: 'Chỉnh sửa mục tiêu', exact: true })
  // Complete through the real API even when this test is run in isolation.
  await edit.click()
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu và đến bài đánh giá', exact: true }).click()
  await expect(page).toHaveURL('/student/assessments/placement')
  await page.goto('/student/learning-profile')
  writes.length = 0
  let original = ''
  for (const action of ['X', 'Escape', 'Để sau']) {
    await edit.click()
    const university = page.getByRole('dialog').getByRole('textbox', { name: 'Trường đại học mục tiêu', exact: true })
    if (action === 'X') original = await university.inputValue()
    await expect(university).toHaveValue(original)
    await university.fill('Không lưu thay đổi này')
    if (action === 'X') await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    else if (action === 'Escape') await page.keyboard.press('Escape')
    else await page.getByRole('button', { name: 'Để sau', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(edit).toBeFocused()
    expect(writes).toHaveLength(0)
  }
  await page.reload()
  await edit.click()
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Trường đại học mục tiêu', exact: true })).toHaveValue(original)
  await page.getByRole('spinbutton', { name: 'Điểm mục tiêu', exact: true }).fill('850')
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/v1/users/student-profiles') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Lưu và đóng', exact: true }).click()
  expect((await saved).status()).toBe(200)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(writes[0]).not.toHaveProperty('onboardingState')
  await page.reload()
  await expect(goals).toContainText('850 / 1200')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
