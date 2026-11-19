import type { UserRole } from '../services/userService'
import {
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileQuestion,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  ListTree,
  MailQuestion,
  ShoppingCart,
  Sparkles,
  UserCog,
  UserRound,
} from '../components/console/icons'
import type { NavEntry, NavIcon, NavSection } from '../components/console/layout/nav-types'
import { SOLUTION_QUEUE } from '../data/console-mock'
import { quizMenuPage } from './console-routes'
import { isFeatureEnabled, type FeatureFlag } from './feature-flags'
import { can, type Permission } from './permissions'

// The only place console menu entries are declared. Every console role builds its
// sidebar from here and the router refuses pages that are not listed for the role.
// Like permissions.ts this is display logic only: the backend's @PreAuthorize rules decide.

export type NavGroupId = 'overview' | 'operations' | 'classes' | 'learners' | 'training' | 'support' | 'system'

export type NavBadgeKey = 'solutionQueue' | 'mentorAsk'

export interface ConsoleNavItem {
  /** URL segment after /console/{area}/ and the key ManagementDashboard / TeacherDashboard render. */
  page: string
  label: string
  /** Same page, different name for one role (e.g. a teacher's courses are "Lớp của tôi"). */
  labels?: Partial<Record<UserRole, string>>
  icon: NavIcon
  group: NavGroupId
  /** Any one of these lets the role open the page. Omitted = every console role. */
  permission?: Permission | Permission[]
  /** Without it the page opens read-only. */
  writePermission?: Permission
  /** Limits a page to the roles that have a screen for it, on top of the permission check. */
  roles?: UserRole[]
  /** Reached from another page (a tab, a button, or the same screen); keeps its own route permission. */
  tabOf?: string
  /**
   * Name in the tab row that a page and its `tabOf` pages share; the heading shows the host's name.
   * Pages without one are reached another way and get no tab.
   */
  tabLabel?: string
  badgeKey?: NavBadgeKey
  featureFlag?: FeatureFlag
  /** Not built yet: opens the "Đang phát triển" state, and stays out of the menu while `unfinishedPages` is off. */
  soon?: boolean
}

const GROUP_LABELS: Record<NavGroupId, string | null> = {
  // Its one entry has the group's name, so it sits on top without a heading.
  overview: null,
  operations: 'Vận hành',
  classes: 'Lớp học',
  learners: 'Học viên & thanh toán',
  training: 'Đào tạo',
  support: 'Hỗ trợ',
  system: 'Hệ thống',
}

// From the work a role does every day down to what it opens now and then.
const GROUP_ORDER: NavGroupId[] = [
  'overview',
  'operations',
  'classes',
  'learners',
  'training',
  'support',
  'system',
]

// Within a group, entries keep this order: the most used first. A host precedes its tabs.
const CONSOLE_NAV: ConsoleNavItem[] = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, group: 'overview' },
  {
    page: 'schedules',
    label: 'Lịch học',
    tabLabel: 'Lịch học',
    icon: CalendarDays,
    group: 'operations',
    permission: 'SCHEDULE_READ',
    writePermission: 'SCHEDULE_WRITE',
    roles: ['STAFF', 'MANAGER'],
  },
  {
    page: 'attendance',
    tabOf: 'schedules',
    label: 'Điểm danh',
    tabLabel: 'Điểm danh',
    icon: ClipboardCheck,
    group: 'operations',
    permission: 'ATTENDANCE_WRITE',
    roles: ['STAFF'],
  },
  {
    page: 'chat-queue',
    label: 'Phân công Mentor',
    icon: MailQuestion,
    group: 'operations',
    permission: 'SUPPORT_HANDLE',
    roles: ['STAFF', 'ADMINISTRATOR'],
    featureFlag: 'mentorAsk',
  },
  {
    page: 'chat-monitoring',
    label: 'Giám sát hỗ trợ',
    icon: MailQuestion,
    group: 'operations',
    permission: 'SUPPORT_MONITOR',
    roles: ['MANAGER'],
    featureFlag: 'mentorAsk',
  },
  {
    page: 'schedule',
    label: 'Lịch dạy',
    icon: CalendarDays,
    group: 'classes',
    permission: 'COURSE_READ',
    roles: ['TEACHER'],
  },
  {
    page: 'availability',
    label: 'Giờ rảnh',
    icon: Clock3,
    group: 'classes',
    permission: 'COURSE_READ',
    roles: ['TEACHER'],
  },
  {
    page: 'learners',
    label: 'Học viên',
    tabLabel: 'Học viên',
    icon: UserRound,
    group: 'learners',
    permission: ['USER_MANAGE', 'USER_READ'],
    writePermission: 'USER_MANAGE',
  },
  {
    page: 'enrollments',
    tabOf: 'learners',
    label: 'Ghi danh',
    tabLabel: 'Ghi danh',
    icon: GraduationCap,
    group: 'learners',
    permission: 'ENROLLMENT_READ',
    writePermission: 'ENROLLMENT_WRITE',
  },
  {
    page: 'orders',
    label: 'Thanh toán',
    tabLabel: 'Đơn hàng',
    icon: ShoppingCart,
    group: 'learners',
    permission: 'ORDER_READ',
    writePermission: 'ORDER_WRITE',
  },
  {
    page: 'credits',
    tabOf: 'orders',
    label: 'Sao',
    tabLabel: 'Sao',
    icon: Sparkles,
    group: 'learners',
    permission: 'ORDER_READ',
    roles: ['ADMINISTRATOR', 'MANAGER', 'STAFF'],
  },
  {
    page: 'courses',
    label: 'Khóa học',
    labels: { TEACHER: 'Lớp của tôi' },
    tabLabel: 'Khóa học',
    icon: BookOpen,
    group: 'training',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
  },
  {
    // The old subject page is the merged course screen itself, so it has no tab of its own.
    page: 'categories',
    tabOf: 'courses',
    label: 'Môn học',
    icon: Layers3,
    group: 'training',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
    roles: ['ADMINISTRATOR', 'STAFF', 'MANAGER'],
  },
  {
    page: 'exam-years',
    tabOf: 'courses',
    label: 'Đợt thi',
    tabLabel: 'Đợt thi',
    icon: CalendarDays,
    group: 'training',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
    roles: ['ADMINISTRATOR', 'STAFF', 'MANAGER'],
  },
  {
    page: 'quizzes',
    label: 'Bài kiểm tra',
    tabLabel: 'Bài học / chương',
    icon: ClipboardCheck,
    group: 'training',
    permission: 'QUIZ_READ',
    writePermission: 'QUIZ_WRITE',
  },
  {
    page: 'placements',
    tabOf: 'quizzes',
    label: 'Đánh giá đầu vào',
    tabLabel: 'Đánh giá đầu vào',
    icon: ClipboardCheck,
    group: 'training',
    permission: 'QUIZ_WRITE',
    writePermission: 'QUIZ_WRITE',
    roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR'],
  },
  {
    page: 'mock-exams',
    tabOf: 'quizzes',
    label: 'Bài thi thử',
    tabLabel: 'Thi thử',
    icon: ClipboardCheck,
    group: 'training',
    permission: 'QUIZ_READ',
    writePermission: 'QUIZ_WRITE',
  },
  {
    page: 'attempts',
    tabOf: 'quizzes',
    label: 'Bài làm học viên',
    tabLabel: 'Bài làm học viên',
    icon: BookOpenCheck,
    group: 'training',
    permission: 'QUIZ_READ',
  },
  {
    page: 'question-bank',
    label: 'Ngân hàng câu hỏi',
    icon: FileQuestion,
    group: 'training',
    permission: ['CONTENT_WRITE', 'QUIZ_READ'],
    writePermission: 'BANK_AUTHOR',
    roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR'],
  },
  {
    // Opened from the bank's heading: a full-screen workspace, not a tab.
    page: 'ai-assistant',
    tabOf: 'question-bank',
    label: 'Trợ lý AI',
    icon: Sparkles,
    group: 'training',
    permission: ['CONTENT_WRITE', 'QUIZ_READ'],
    roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR'],
  },
  {
    // Opened from the bank's heading, since the bank's questions are labelled by it.
    page: 'taxonomy',
    tabOf: 'question-bank',
    label: 'Khung đề thi',
    icon: ListTree,
    group: 'training',
    permission: 'TAXONOMY_WRITE',
    // A teacher teaches: the exam framework and the bank are kept by staff.
    roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR'],
  },
  {
    // A teacher has no bank page to reach the assistant through, so it is a menu entry of its own.
    page: 'ai-assistant',
    label: 'Trợ lý AI',
    icon: Sparkles,
    group: 'training',
    permission: ['CONTENT_WRITE', 'QUIZ_READ'],
    roles: ['TEACHER'],
  },
  {
    page: 'solution-queue',
    label: 'Duyệt lời giải AI',
    icon: Sparkles,
    group: 'training',
    permission: 'SOLUTION_APPROVE',
    badgeKey: 'solutionQueue',
    soon: true,
  },
  {
    page: 'chat',
    label: 'Hỏi Mentor',
    icon: MailQuestion,
    group: 'support',
    permission: 'SUPPORT_HANDLE',
    roles: ['MENTOR'],
    badgeKey: 'mentorAsk',
    featureFlag: 'mentorAsk',
  },
  {
    page: 'students',
    label: 'Học viên',
    icon: GraduationCap,
    group: 'support',
    permission: 'REVIEW_QUEUE_HANDLE',
    roles: ['MENTOR'],
    soon: true,
  },
  {
    page: 'users',
    label: 'Nhân sự & phân quyền',
    icon: UserCog,
    group: 'system',
    permission: ['USER_MANAGE', 'USER_READ'],
    writePermission: 'USER_MANAGE',
  },
  {
    page: 'audit-log',
    label: 'Nhật ký hoạt động',
    icon: ClipboardList,
    group: 'system',
    permission: 'AUDIT_READ',
    soon: true,
  },
]

function allows(role: UserRole, item: ConsoleNavItem) {
  if (item.roles && !item.roles.includes(role)) return false
  return !item.permission || can(role, item.permission)
}

/** Feature flags and unfinished pages decide what is offered; a hidden page keeps its own gate. */
function isOffered(item: ConsoleNavItem) {
  return (!item.featureFlag || isFeatureEnabled(item.featureFlag)) && (!item.soon || isFeatureEnabled('unfinishedPages'))
}

/** The entry a role reaches a page through, ignoring feature flags (a hidden page keeps its own gate). */
export function findNavItem(role: UserRole, page: string) {
  return CONSOLE_NAV.find((item) => item.page === page && allows(role, item))
}

/** True when some role has a menu entry for the page, so a miss for one role is 403 and a miss for all is 404. */
export function isKnownPage(page: string) {
  return CONSOLE_NAV.some((item) => item.page === page)
}

export function canAccessPage(role: UserRole, page: string) {
  return !!findNavItem(role, page)
}

/** False when the role may open the page but only to look: screens hide their create/edit/delete actions. */
export function canWrite(role: UserRole, page: string) {
  const item = findNavItem(role, page)
  return !!item && (!item.writePermission || can(role, item.writePermission))
}

export function navLabel(role: UserRole, item: ConsoleNavItem) {
  return item.labels?.[role] ?? item.label
}

/** The sidebar entry that stays lit on a page: a page reached from another one lights its host. */
export function sidebarPage(role: UserRole, page: string) {
  const menu = quizMenuPage(page)
  return findNavItem(role, menu)?.tabOf ?? menu
}

export interface PageTab {
  page: string
  label: string
}

/**
 * The tab row of the page's group, holding the tabs this role may open, host first.
 * Empty when fewer than two are left: one page needs no tabs.
 */
export function pageTabs(role: UserRole, page: string): PageTab[] {
  const host = sidebarPage(role, page)
  const tabs = CONSOLE_NAV.filter(
    (item) => (item.page === host || item.tabOf === host) && item.tabLabel && allows(role, item) && isOffered(item)
  )
  return tabs.length > 1 ? tabs.map((item) => ({ page: item.page, label: item.tabLabel! })) : []
}

/** A page as a shortcut elsewhere (the dashboard), also when the sidebar reaches it through a tab. */
export function findNavEntry(role: UserRole, page: string): NavEntry | null {
  const item = findNavItem(role, page)
  return item && isOffered(item) ? { key: item.page, title: navLabel(role, item), icon: item.icon } : null
}

export interface ConsoleNavGroup {
  id: NavGroupId
  label: string | null
  items: ConsoleNavItem[]
}

export function buildNav(role: UserRole): ConsoleNavGroup[] {
  const visible = CONSOLE_NAV.filter((item) => !item.tabOf && allows(role, item) && isOffered(item))
  // The administrator works on the system first, right under the overview; for everyone else it is a side
  // errand, so it goes last.
  const order: NavGroupId[] =
    role === 'ADMINISTRATOR'
      ? ['overview', 'system', ...GROUP_ORDER.filter((id) => id !== 'overview' && id !== 'system')]
      : GROUP_ORDER
  return order
    .map((id) => ({
      id,
      label: GROUP_LABELS[id],
      items: visible.filter((item) => item.group === id),
    }))
    .filter((group) => group.items.length > 0)
}

/** Pending counts shown next to menu entries. Only queues that have data behind them get a number. */
export function getNavBadges(role: UserRole): Partial<Record<NavBadgeKey, number>> {
  const badges: Partial<Record<NavBadgeKey, number>> = {}
  if (buildNav(role).some((group) => group.items.some((item) => item.page === 'solution-queue'))) {
    badges.solutionQueue = SOLUTION_QUEUE.filter((item) => item.status === 'PENDING').length
  }
  return badges
}

/** buildNav in the shape ConsoleShell renders, with labels resolved for the role and badges filled in. */
export function buildNavSections(role: UserRole): NavSection[] {
  const badges = getNavBadges(role)
  return buildNav(role).map((group) => ({
    id: group.id,
    label: group.label ?? undefined,
    items: group.items.map((item) => ({
      key: item.page,
      title: navLabel(role, item),
      icon: item.icon,
      badge: item.badgeKey ? badges[item.badgeKey] : undefined,
    })),
  }))
}
