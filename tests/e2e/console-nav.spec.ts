import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

// The console menu is declared once in src/lib/console-nav.ts. This spec pins the
// menu each role gets (groups and order), and the router's answer for pages that
// were deleted from that menu or are still marked `soon`.

type MenuRole = 'MANAGER' | 'STAFF' | 'TEACHER' | 'MENTOR' | 'ADMINISTRATOR'

interface SidebarGroup {
  label: string
  items: string[]
}

const AREA: Record<MenuRole, string> = {
  MANAGER: 'manager',
  STAFF: 'staff',
  TEACHER: 'teacher',
  MENTOR: 'mentor',
  ADMINISTRATOR: 'admin',
}

const EXPECTED_MENU: Record<MenuRole, SidebarGroup[]> = {
  MANAGER: [
    { label: 'Tổng quan', items: ['Tổng quan'] },
    { label: 'Đào tạo', items: ['Môn học', 'Năm thi & đợt thi', 'Khóa học', 'Ngân hàng câu hỏi', 'Bài kiểm tra', 'Bài làm học viên'] },
    { label: 'Lớp học', items: ['Lịch học'] },
    { label: 'Học viên & đơn hàng', items: ['Học viên', 'Ghi danh', 'Đơn hàng'] },
    { label: 'Hỗ trợ', items: ['Giám sát hỗ trợ'] },
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
  ],
  STAFF: [
    { label: 'Tổng quan', items: ['Tổng quan'] },
    { label: 'Đào tạo', items: ['Môn học', 'Master data', 'Năm thi & đợt thi', 'Khóa học', 'Ngân hàng câu hỏi', 'Bài kiểm tra', 'Bài làm học viên'] },
    { label: 'Lớp học', items: ['Lịch học', 'Điểm danh'] },
    { label: 'Học viên & đơn hàng', items: ['Học viên', 'Ghi danh', 'Đơn hàng'] },
    { label: 'Hỗ trợ', items: ['Phân công Mentor'] },
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
  ],
  TEACHER: [
    { label: 'Tổng quan', items: ['Tổng quan'] },
    { label: 'Đào tạo', items: ['Master data', 'Lớp của tôi', 'Ngân hàng câu hỏi', 'Bài kiểm tra', 'Bài làm học viên'] },
    { label: 'Lớp học', items: ['Lịch dạy', 'Giờ rảnh'] },
  ],
  MENTOR: [
    { label: 'Tổng quan', items: ['Tổng quan'] },
    { label: 'Hỗ trợ', items: ['Hỏi Mentor'] },
  ],
  // The administrator works on the system first, and owns no classes of its own.
  ADMINISTRATOR: [
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
    { label: 'Tổng quan', items: ['Tổng quan'] },
    { label: 'Đào tạo', items: ['Môn học', 'Master data', 'Năm thi & đợt thi', 'Khóa học', 'Ngân hàng câu hỏi', 'Bài kiểm tra', 'Bài làm học viên'] },
    { label: 'Học viên & đơn hàng', items: ['Học viên', 'Ghi danh', 'Đơn hàng'] },
    { label: 'Hỗ trợ', items: ['Phân công Mentor'] },
  ],
}

// Entries removed from the menu: their screens are gone and no URL should expose them.
const DELETED_PAGES = ['Báo cáo', 'Cấu hình nghiệp vụ', 'Lời giải ngân hàng']
// Entries kept with `soon: true`, hidden while the `unfinishedPages` flag is off.
const UNFINISHED_PAGES = ['Nhật ký hoạt động', 'Duyệt lời giải AI']
// Pages reached through the quizzes tabs, never listed as their own menu entries.
const TAB_ONLY_PAGES = ['Đánh giá đầu vào', 'Bài thi thử']
// "Học viên" is a real page for STAFF, MANAGER and ADMINISTRATOR; MENTOR's copy is unfinished.
const ALSO_HIDDEN: Partial<Record<MenuRole, string[]>> = { MENTOR: ['Học viên'] }

/** The expanded sidebar's groups, in the order the DOM renders them. */
async function readSidebar(page: Page) {
  const nav = page.locator('aside nav')
  await expect(nav.locator('button[aria-controls^="nav-group-"]').first()).toBeVisible()
  return nav.evaluate((element) => Array.from(element.children).flatMap((group) => {
    const heading = group.querySelector(':scope > button[aria-controls]')
    if (!heading) return []
    const panelId = heading.getAttribute('aria-controls')
    const panel = panelId ? group.querySelector(`:scope > div[id="${CSS.escape(panelId)}"]`) : null
    const items = panel
      ? Array.from(panel.querySelectorAll(':scope > button')).map((button) => button.textContent?.trim() ?? '')
      : []
    return [{ label: heading.textContent?.trim() ?? '', hidden: !panel || panel.hasAttribute('hidden'), items }]
  }))
}

for (const role of Object.keys(EXPECTED_MENU) as MenuRole[]) {
  test(`${role}: the sidebar lists the role's pages under the new groups, in order`, async ({ page }) => {
    await installQuizFixture(page, role)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/console/${AREA[role]}/dashboard`)

    const nav = page.locator('aside nav')
    await expect(nav.locator('button[aria-controls^="nav-group-"]')).toHaveCount(EXPECTED_MENU[role].length)
    const groups = await readSidebar(page)
    expect(groups.map((group) => ({ label: group.label, items: group.items }))).toEqual(EXPECTED_MENU[role])
    expect(groups.filter((group) => group.hidden).map((group) => group.label)).toEqual([])
    for (const group of EXPECTED_MENU[role]) {
      const panel = nav.locator(`div[id="nav-group-${group.label}"]`)
      for (const item of group.items) {
        await expect(panel.getByRole('button', { name: item, exact: true })).toBeVisible()
      }
    }

    for (const title of [...DELETED_PAGES, ...UNFINISHED_PAGES, ...TAB_ONLY_PAGES, ...(ALSO_HIDDEN[role] ?? [])]) {
      await expect(nav.getByRole('button', { name: title, exact: true })).toHaveCount(0)
    }
  })
}

test('a page deleted from the menu opens the 404 screen in place', async ({ page }) => {
  await installQuizFixture(page, 'STAFF')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/staff/reports')

  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '404 · Không tìm thấy trang', exact: true })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/console/staff/reports')
})

for (const [role, pageKey, title] of [
  ['ADMINISTRATOR', 'audit-log', 'Nhật ký hoạt động'],
  ['MENTOR', 'students', 'Học viên'],
  ['TEACHER', 'solution-queue', 'Duyệt lời giải AI'],
] as const) {
  test(`${role}: unfinished ${pageKey} stays out of the menu but opens "Đang phát triển"`, async ({ page }) => {
    await installQuizFixture(page, role)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/console/${AREA[role]}/${pageKey}`)

    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Đang phát triển', exact: true })).toBeVisible()
    await expect(page.getByText('Màn hình này đã có trong kế hoạch nhưng chưa được xây dựng.', { exact: true })).toBeVisible()
    const groups = await readSidebar(page)
    expect(groups.flatMap((group) => group.items)).not.toContain(title)
  })
}
