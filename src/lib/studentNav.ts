import type { ComponentType } from 'react'
import { BarChart3, BookOpen, CalendarDays, Home, UserRound } from '../components/console/icons'
import { parseStudentRoute, studentRoutes, type StudentRoute } from './studentRoutes'

export type StudentNavKey = 'dashboard' | 'schedule' | 'learning-profile' | 'courses' | 'progress'

export interface StudentNavItem {
  key: StudentNavKey
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  /** Omitted for items that are not built yet. */
  path?: string
}

// Rendered by StudentSidebar; the only place the sidebar entries are declared.
export const studentNavItems: StudentNavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: Home, path: studentRoutes.dashboard() },
  { key: 'schedule', label: 'Lịch học', icon: CalendarDays, path: studentRoutes.schedule() },
  {
    key: 'learning-profile',
    label: 'Hồ sơ năng lực',
    icon: UserRound,
    path: studentRoutes.learningProfile(),
  },
  { key: 'courses', label: 'Khóa học', icon: BookOpen, path: studentRoutes.courses() },
  { key: 'progress', label: 'Tiến độ', icon: BarChart3 },
]

// Which sidebar entry a route belongs to. Everything reached from a course
// (study, lesson, video, activity, quiz, attempt, result, review) stays under
// "Khóa học"; the placement test lives with the competency profile.
export function getStudentNavKey(route: StudentRoute | null): StudentNavKey | null {
  switch (route?.name) {
    case 'dashboard':
      return 'dashboard'
    case 'schedule':
      return 'schedule'
    case 'learning-profile':
    case 'placement':
    case 'placement-result':
    case 'placement-attempt':
    case 'placement-review':
      return 'learning-profile'
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
