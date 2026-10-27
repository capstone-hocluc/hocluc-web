import type { UserRole } from '../services/userService'
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileQuestion,
  FileText,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  ListChecks,
  ListTree,
  MailQuestion,
  Settings,
  ShoppingCart,
  Sparkles,
  UserCog,
  UserRound,
  Users,
} from '../components/console/icons'
import type { NavIcon, NavSection } from '../components/console/layout/nav-types'
import { SOLUTION_QUEUE } from '../data/console-mock'
import { isFeatureEnabled, type FeatureFlag } from './feature-flags'
import { can, type Permission } from './permissions'

// The only place console menu entries are declared. Every console role builds its
// sidebar from here and the router refuses pages that are not listed for the role.
// Like permissions.ts this is display logic only: the backend's @PreAuthorize rules decide.

export type NavGroupId =
  | 'overview'
  | 'system'
  | 'academic'
  | 'content'
  | 'teaching'
  | 'operations'
  | 'business'
  | 'review'
  | 'support'

export type NavBadgeKey = 'questionReview' | 'solutionQueue' | 'mentorAsk'

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
  /** Reached through tabs on another page; keeps its own route permission. */
  tabOf?: string
  badgeKey?: NavBadgeKey
  featureFlag?: FeatureFlag
  /** Not built yet: opens the "Đang phát triển" state, and stays out of the menu while `unfinishedPages` is off. */
  soon?: boolean
}

const GROUP_LABELS: Record<NavGroupId, string> = {
  overview: 'Tổng quan',
  system: 'Hệ thống',
  academic: 'Học thuật',
  content: 'Khóa học & nội dung',
  teaching: 'Giảng dạy',
  operations: 'Vận hành lớp',
  business: 'Học viên & kinh doanh',
  review: 'Đánh giá & duyệt',
  support: 'Hỗ trợ',
}

const GROUP_ORDER: NavGroupId[] = [
  'overview',
  'system',
  'academic',
  'content',
  'teaching',
  'operations',
  'business',
  'review',
  'support',
]

const CONSOLE_NAV: ConsoleNavItem[] = [
  { page: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, group: 'overview' },
  {
    page: 'reports',
    label: 'Báo cáo',
    icon: BarChart3,
    group: 'overview',
    permission: 'REPORT_READ',
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
    page: 'settings',
    label: 'Cấu hình nghiệp vụ',
    icon: Settings,
    group: 'system',
    permission: 'SETTINGS_MANAGE',
    soon: true,
  },
  {
    page: 'audit-log',
    label: 'Nhật ký hoạt động',
    icon: ClipboardList,
    group: 'system',
    permission: 'AUDIT_READ',
  },

  {
    page: 'taxonomy',
    label: 'Phân loại kiến thức',
    icon: ListTree,
    group: 'academic',
    permission: 'TAXONOMY_WRITE',
  },
  // Exam blueprints are business configuration, so they follow the settings permission.
  {
    page: 'blueprints',
    label: 'Blueprint đề thi',
    icon: FileText,
    group: 'academic',
    permission: 'SETTINGS_MANAGE',
  },
  {
    page: 'categories',
    label: 'Môn học',
    icon: Layers3,
    group: 'academic',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
    roles: ['ADMINISTRATOR', 'STAFF', 'MANAGER'],
  },
  {
    page: 'exam-years',
    label: 'Năm thi & đợt thi',
    icon: CalendarDays,
    group: 'academic',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
    roles: ['ADMINISTRATOR', 'STAFF', 'MANAGER'],
  },

  {
    page: 'courses',
    label: 'Khóa học',
    labels: { TEACHER: 'Lớp của tôi' },
    icon: BookOpen,
    group: 'content',
    permission: 'COURSE_READ',
    writePermission: 'COURSE_WRITE',
  },
  {
    page: 'question-bank',
    label: 'Ngân hàng câu hỏi',
    icon: FileQuestion,
    group: 'content',
    permission: 'CONTENT_WRITE',
    soon: true,
  },
  {
    page: 'quizzes',
    label: 'Bài kiểm tra',
    icon: ClipboardCheck,
    group: 'content',
    permission: 'QUIZ_READ',
    writePermission: 'QUIZ_WRITE',
  },
  {
    page: 'placements',
    tabOf: 'quizzes',
    label: 'Đánh giá đầu vào',
    icon: ClipboardCheck,
    group: 'content',
    permission: 'QUIZ_WRITE',
    writePermission: 'QUIZ_WRITE',
    roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR'],
  },
  {
    page: 'question-review',
    label: 'Duyệt câu hỏi',
    labels: { TEACHER: 'Câu hỏi cần kiểm tra' },
    icon: ListChecks,
    group: 'content',
    permission: 'QUIZ_READ',
    writePermission: 'QUIZ_WRITE',
    badgeKey: 'questionReview',
  },
  // Shared quiz screens follow BE quiz rights, independently of course/taxonomy writes.
  {
    page: 'mock-exams',
    tabOf: 'quizzes',
    label: 'Bài thi thử',
    icon: ClipboardCheck,
    group: 'content',
    permission: 'QUIZ_READ',
    writePermission: 'QUIZ_WRITE',
  },

  {
    page: 'schedule',
    label: 'Lịch dạy',
    icon: CalendarDays,
    group: 'teaching',
    permission: 'COURSE_READ',
    roles: ['TEACHER'],
  },
  {
    page: 'availability',
    label: 'Giờ rảnh',
    icon: Clock3,
    group: 'teaching',
    permission: 'COURSE_READ',
    roles: ['TEACHER'],
  },

  // The teacher marks attendance inside "Lịch dạy"; the operations screens below are for staff.
  {
    page: 'schedules',
    label: 'Lịch học',
    icon: CalendarDays,
    group: 'operations',
    permission: 'SCHEDULE_READ',
    writePermission: 'SCHEDULE_WRITE',
    roles: ['STAFF', 'MANAGER'],
  },
  {
    page: 'attendance',
    label: 'Điểm danh',
    icon: ClipboardCheck,
    group: 'operations',
    permission: 'ATTENDANCE_WRITE',
    roles: ['STAFF'],
  },
  {
    page: 'groups',
    label: 'Nhóm học',
    icon: Users,
    group: 'operations',
    permission: 'ENROLLMENT_READ',
    writePermission: 'ENROLLMENT_WRITE',
    roles: ['ADMINISTRATOR', 'STAFF', 'MANAGER'],
  },
  {
    page: 'groups',
    label: 'Nhóm của tôi',
    icon: Users,
    group: 'operations',
    permission: 'REVIEW_QUEUE_HANDLE',
    roles: ['MENTOR'],
  },

  {
    page: 'students',
    label: 'Học viên',
    icon: GraduationCap,
    group: 'business',
    permission: 'REVIEW_QUEUE_HANDLE',
    roles: ['MENTOR'],
  },
  {
    page: 'learners',
    label: 'Học viên',
    icon: UserRound,
    group: 'business',
    permission: ['USER_MANAGE', 'USER_READ'],
    writePermission: 'USER_MANAGE',
  },
  {
    page: 'enrollments',
    label: 'Ghi danh',
    icon: GraduationCap,
    group: 'business',
    permission: 'ENROLLMENT_READ',
    writePermission: 'ENROLLMENT_WRITE',
  },
  {
    page: 'orders',
    label: 'Đơn hàng',
    icon: ShoppingCart,
    group: 'business',
    permission: 'ORDER_READ',
    writePermission: 'ORDER_WRITE',
  },

  {
    page: 'attempts',
    label: 'Bài làm học viên',
    icon: BookOpenCheck,
    group: 'review',
    permission: 'QUIZ_READ',
  },
  {
    page: 'solution-queue',
    label: 'Duyệt lời giải AI',
    icon: Sparkles,
    group: 'review',
    permission: 'SOLUTION_APPROVE',
    badgeKey: 'solutionQueue',
  },
  {
    page: 'solutions',
    label: 'Lời giải ngân hàng',
    icon: BadgeCheck,
    group: 'review',
    permission: 'SOLUTION_APPROVE',
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
    page: 'chat-queue',
    label: 'Phân công Mentor',
    icon: MailQuestion,
    group: 'support',
    permission: 'SUPPORT_HANDLE',
    roles: ['STAFF', 'ADMINISTRATOR'],
    featureFlag: 'mentorAsk',
  },
  {
    page: 'chat-monitoring',
    label: 'Giám sát hỗ trợ',
    icon: MailQuestion,
    group: 'support',
    permission: 'SUPPORT_MONITOR',
    roles: ['MANAGER'],
    featureFlag: 'mentorAsk',
  },
]

function allows(role: UserRole, item: ConsoleNavItem) {
  if (item.roles && !item.roles.includes(role)) return false
  return !item.permission || can(role, item.permission)
}

/** The entry a role reaches a page through, ignoring feature flags (a hidden page keeps its own gate). */
export function findNavItem(role: UserRole, page: string) {
  return CONSOLE_NAV.find((item) => item.page === page && allows(role, item))
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

export interface ConsoleNavGroup {
  id: NavGroupId
  label: string
  items: ConsoleNavItem[]
}

export function buildNav(role: UserRole): ConsoleNavGroup[] {
  const visible = CONSOLE_NAV.filter(
    (item) =>
      !item.tabOf &&
      allows(role, item) &&
      (!item.featureFlag || isFeatureEnabled(item.featureFlag)) &&
      (!item.soon || isFeatureEnabled('unfinishedPages'))
  )
  // The administrator works on the system first; for everyone else it is a side errand, so it goes last.
  const order =
    role === 'ADMINISTRATOR'
      ? GROUP_ORDER
      : [...GROUP_ORDER.filter((id) => id !== 'system'), 'system' as const]
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
  if (can(role, 'SOLUTION_APPROVE')) {
    badges.solutionQueue = SOLUTION_QUEUE.filter((item) => item.status === 'PENDING').length
  }
  return badges
}

/** buildNav in the shape ConsoleShell renders, with labels resolved for the role and badges filled in. */
export function buildNavSections(role: UserRole): NavSection[] {
  const badges = getNavBadges(role)
  return buildNav(role).map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      key: item.page,
      title: navLabel(role, item),
      icon: item.icon,
      badge: item.badgeKey ? badges[item.badgeKey] : undefined,
    })),
  }))
}
