import { canAccessPage } from './console-nav'
import { roleHome } from './role-home'
import { studentRoutes } from './studentRoutes'
import type { UserNotification } from '../services/notificationService'
import type { UserRole } from '../services/userService'

export type NotificationTarget = { href: string } | { switchTo: UserRole } | null

const COURSE_REVIEWERS: readonly UserRole[] = ['ADMINISTRATOR', 'MANAGER', 'STAFF']
const enc = encodeURIComponent

/**
 * Where opening a notification takes the user acting as `activeRole`. One meant for another role of theirs asks
 * them to switch first; null keeps it in the detail dialog. Never a page the role cannot open.
 */
export function notificationTarget(
  notification: Pick<UserNotification, 'entityType' | 'entityId' | 'audience'>,
  activeRole: UserRole | null,
  roles: readonly UserRole[],
): NotificationTarget {
  if (!activeRole) return null
  const { audience } = notification
  if (audience && audience !== activeRole) return roles.includes(audience) ? { switchTo: audience } : null
  const href = pageOf(notification, activeRole)
  return href ? { href } : null
}

function pageOf({ entityType, entityId }: Pick<UserNotification, 'entityType' | 'entityId'>, role: UserRole) {
  const student = role === 'STUDENT'
  switch (entityType) {
    case 'COURSE':
      if (!entityId) return null
      if (student) return `/courses/${enc(entityId)}`
      return COURSE_REVIEWERS.includes(role) && canAccessPage(role, 'courses')
        ? `${roleHome(role).replace(/\/dashboard$/, '')}/courses?courseId=${enc(entityId)}`
        : null
    case 'LIVE_CLASS':
      return student ? studentRoutes.schedule() : role === 'TEACHER' ? '/console/teacher/schedule' : null
    case 'STUDENT_SOLVE':
      return student ? studentRoutes.tutor() : null
    case 'ORDER':
      return student && entityId ? `/orders/${enc(entityId)}` : null
    default:
      return null
  }
}
