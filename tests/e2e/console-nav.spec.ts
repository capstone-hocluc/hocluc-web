import { expect, test, type Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

// The console menu is declared once in src/lib/console-nav.ts. This spec pins the
// menu each role gets (groups and order), and the router's answer for pages that
// were deleted from that menu or are still marked `soon`.

type MenuRole = 'MANAGER' | 'STAFF' | 'TEACHER' | 'MENTOR' | 'ADMINISTRATOR'

interface SidebarGroup {
  /** Empty for the group that sits on top without a heading. */
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

// Most used first: the overview, then daily operations, learners and payments, training, and the system last.
const EXPECTED_MENU: Record<MenuRole, SidebarGroup[]> = {
  MANAGER: [
    { label: '', items: ['Tổng quan'] },
    { label: 'Vận hành', items: ['Lịch học', 'Giám sát hỗ trợ'] },
    { label: 'Học viên & thanh toán', items: ['Học viên', 'Thanh toán'] },
    { label: 'Đào tạo', items: ['Khóa học', 'Bài kiểm tra', 'Ngân hàng câu hỏi'] },
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
  ],
  STAFF: [
    { label: '', items: ['Tổng quan'] },
    { label: 'Vận hành', items: ['Lịch học', 'Phân công Mentor'] },
    { label: 'Học viên & thanh toán', items: ['Học viên', 'Thanh toán'] },
    { label: 'Đào tạo', items: ['Khóa học', 'Bài kiểm tra', 'Ngân hàng câu hỏi'] },
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
  ],
  TEACHER: [
    { label: '', items: ['Tổng quan'] },
    { label: 'Lớp học', items: ['Lịch dạy', 'Giờ rảnh'] },
    { label: 'Đào tạo', items: ['Lớp của tôi', 'Bài kiểm tra', 'Trợ lý AI'] },
  ],
  MENTOR: [
    { label: '', items: ['Tổng quan'] },
    { label: 'Hỗ trợ', items: ['Hỏi Mentor'] },
  ],
  // The administrator works on the system first, and owns no classes of its own.
  ADMINISTRATOR: [
    { label: '', items: ['Tổng quan'] },
    { label: 'Hệ thống', items: ['Nhân sự & phân quyền'] },
    { label: 'Vận hành', items: ['Phân công Mentor'] },
    { label: 'Học viên & thanh toán', items: ['Học viên', 'Thanh toán'] },
    { label: 'Đào tạo', items: ['Khóa học', 'Bài kiểm tra', 'Ngân hàng câu hỏi'] },
  ],
}

// Entries removed from the menu: their screens are gone and no URL should expose them.
const DELETED_PAGES = ['Báo cáo', 'Cấu hình nghiệp vụ', 'Lời giải ngân hàng']
// Entries kept with `soon: true`, hidden while the `unfinishedPages` flag is off.
const UNFINISHED_PAGES = ['Nhật ký hoạt động', 'Duyệt lời giải AI']
// Pages reached through another page's tabs or heading, never listed as their own menu entries.
const TAB_ONLY_PAGES = [
  'Môn học',
  'Đợt thi',
  'Đánh giá đầu vào',
  'Bài thi thử',
  'Bài làm học viên',
  'Khung đề thi',
  'Điểm danh',
  'Ghi danh',
  'Sao',
]
// "Học viên" is a real page for STAFF, MANAGER and ADMINISTRATOR; MENTOR's copy is unfinished.
const ALSO_HIDDEN: Partial<Record<MenuRole, string[]>> = { MENTOR: ['Học viên'] }

/** The expanded sidebar's groups, in the order the DOM renders them; a group without a heading has label ''. */
async function readSidebar(page: Page) {
  const nav = page.locator('aside nav')
  await expect(nav.locator('div[id^="nav-group-"]').first()).toBeVisible()
  return nav.evaluate((element) => Array.from(element.children).flatMap((group) => {
    const panel = group.querySelector(':scope > div[id^="nav-group-"]')
    if (!panel) return []
    const heading = group.querySelector(':scope > button[aria-controls]')
    const items = Array.from(panel.querySelectorAll(':scope > button')).map((button) => button.textContent?.trim() ?? '')
    return [{ label: heading?.textContent?.trim() ?? '', hidden: panel.hasAttribute('hidden'), items }]
  }))
}

for (const role of Object.keys(EXPECTED_MENU) as MenuRole[]) {
  test(`${role}: the sidebar lists the role's pages under the new groups, in order`, async ({ page }) => {
    await installQuizFixture(page, role)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/console/${AREA[role]}/dashboard`)

    const nav = page.locator('aside nav')
    await expect(nav.locator('button[aria-controls^="nav-group-"]')).toHaveCount(
      EXPECTED_MENU[role].filter((group) => group.label).length
    )
    const groups = await readSidebar(page)
    expect(groups.map((group) => ({ label: group.label, items: group.items }))).toEqual(EXPECTED_MENU[role])
    expect(groups.filter((group) => group.hidden).map((group) => group.label)).toEqual([])
    for (const item of EXPECTED_MENU[role].flatMap((group) => group.items)) {
      await expect(nav.getByRole('button', { name: item, exact: true })).toBeVisible()
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
