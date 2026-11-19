import { canAccessPage } from './console-nav'
import { roleHome } from './role-home'
import { studentRoutes } from './studentRoutes'
import type { UserNotification } from '../services/notificationService'
import type { UserRole } from '../services/userService'


const COURSE_REVIEWERS: readonly UserRole[] = ['ADMINISTRATOR', 'MANAGER', 'STAFF']
const enc = encodeURIComponent

/**
 * The page opening a notification takes the user to, or null to show it in the detail dialog. Each account has one
 * role, so a notification addressed to another role (sent before the account changed role) stays in the dialog.
 * Never a page the role cannot open.
 */
export function notificationTarget(
  notification: Pick<UserNotification, 'entityType' | 'entityId' | 'audience'>,
  role: UserRole | null,
): string | null {
  if (!role || (notification.audience && notification.audience !== role)) return null
  return pageOf(notification, role)
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
    case 'CHAT_CONVERSATION':
      // A mentor question: assigned to the mentor who answers it.
      return role === 'MENTOR' && entityId ? `/console/mentor/chat?conversationId=${enc(entityId)}` : null
    case 'ORDER':
      return student && entityId ? `/orders/${enc(entityId)}` : null
    default:
      return null
  }
}
