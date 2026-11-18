import type { ComponentType } from 'react'
import {
  BookOpen,
  ClipboardCheck,
  MailQuestion,
  BarChart3,
  User,
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
  | 'wallet'
  | 'catalog'
  | 'profile'

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
// Overview, roadmap, schedule and AI tutor entries are temporarily hidden;
// their routes remain available through existing links.
export const studentNavGroups: StudentNavGroup[] = [
  {
    label: 'Học tập',
    items: [
      { key: 'learning-profile', label: 'Hồ sơ năng lực', icon: BarChart3, path: studentRoutes.learningProfile() },
      { key: 'courses', label: 'Khóa học', icon: BookOpen, path: studentRoutes.courses() },
    ],
  },
  {
    label: 'Luyện tập',
    items: [
      { key: 'assessments', label: 'Luyện đề', icon: ClipboardCheck, path: studentRoutes.assessments() },
      { key: 'chat', label: 'Hỏi Mentor', icon: MailQuestion, path: studentRoutes.chat() },
    ],
  },
  {
    label: 'Khác',
    items: [
      { key: 'profile', label: 'Tài khoản', icon: User, path: studentRoutes.profile() },
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
      return 'courses'
    case 'wallet':
    case 'profile':
      return 'profile'
    case 'chat':
      return 'chat'
    case 'schedule':
      return 'schedule'
    case 'learning-profile':
      return 'learning-profile'
    case 'assessments':
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
