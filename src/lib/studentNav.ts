import type { ComponentType } from 'react'
import {
  Bot,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  ListTree,
  MailQuestion,
  Search,
  ShoppingBag,
  UserRound,
} from '../components/console/icons'
import { parseStudentRoute, studentRoutes, type StudentRoute } from './studentRoutes'

export type StudentNavKey =
  | 'dashboard'
  | 'roadmap'
  | 'courses'
  | 'schedule'
  | 'tutor'
  | 'chat'
  | 'assessments'
  | 'learning-profile'
  | 'orders'
  | 'catalog'

export interface StudentNavItem {
  key: StudentNavKey
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  path: string
}

export interface StudentNavGroup {
  label: string
  items: StudentNavItem[]
}

// Rendered by StudentSidebar; the only place the sidebar entries are declared.
// "Lộ trình" and "Gia sư AI" open their "Đang phát triển" page until they are built.
export const studentNavGroups: StudentNavGroup[] = [
  {
    label: 'Học tập',
    items: [
      { key: 'dashboard', label: 'Tổng quan', icon: Home, path: studentRoutes.dashboard() },
      { key: 'roadmap', label: 'Lộ trình của tôi', icon: ListTree, path: studentRoutes.roadmap() },
      { key: 'courses', label: 'Khóa học của tôi', icon: BookOpen, path: studentRoutes.courses() },
      { key: 'schedule', label: 'Lịch học', icon: CalendarDays, path: studentRoutes.schedule() },
    ],
  },
  {
    label: 'Luyện tập',
    items: [
      { key: 'tutor', label: 'Gia sư AI', icon: Bot, path: studentRoutes.tutor() },
      { key: 'chat', label: 'Hỏi Mentor', icon: MailQuestion, path: studentRoutes.chat() },
      { key: 'assessments', label: 'Bài kiểm tra / thi thử', icon: ClipboardCheck, path: studentRoutes.placement() },
      { key: 'learning-profile', label: 'Hồ sơ năng lực', icon: UserRound, path: studentRoutes.learningProfile() },
    ],
  },
  {
    label: 'Khác',
    items: [
      // Both live outside the student area (public catalog, order history).
      { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag, path: '/orders' },
      { key: 'catalog', label: 'Khám phá khóa học', icon: Search, path: '/courses' },
    ],
  },
]

// Which sidebar entry a route belongs to. Everything reached from a course
// (study, lesson, video, activity, quiz, attempt, result, review) stays under
// "Khóa học của tôi"; the placement test is the learner's test entry.
export function getStudentNavKey(route: StudentRoute | null): StudentNavKey | null {
  switch (route?.name) {
    case 'dashboard':
      return 'dashboard'
    case 'roadmap':
      return 'roadmap'
    case 'tutor':
      return 'tutor'
    case 'chat':
      return 'chat'
    case 'schedule':
      return 'schedule'
    case 'learning-profile':
      return 'learning-profile'
    case 'placement':
    case 'placement-result':
    case 'placement-attempt':
    case 'placement-review':
      return 'assessments'
    case 'courses':
    case 'course-detail':
    case 'course-study':
    case 'lesson':
    case 'activity':
    case 'quiz':
    case 'quiz-attempt':
    case 'attempt-review':
      return 'courses'
    default:
      return null
  }
}

export function getStudentNavKeyForPath(path: string) {
  return getStudentNavKey(parseStudentRoute(path))
}
