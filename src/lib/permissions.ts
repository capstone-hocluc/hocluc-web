import type { UserRole } from '../services/userService'

// Permission table for the console, taken from docs/06 §2.2 (decision of 09/10/2026).
// This only decides what the UI shows. The backend's @PreAuthorize rules are the
// source of truth: hiding a button here never grants or removes access to an API.

export type Permission =
  | 'COURSE_READ'
  | 'COURSE_WRITE'
  | 'CONTENT_WRITE'
  | 'QUESTION_APPROVE'
  | 'SOLUTION_APPROVE'
  | 'REVIEW_QUEUE_HANDLE'
  | 'TAXONOMY_WRITE'
  | 'SCHEDULE_READ'
  | 'SCHEDULE_WRITE'
  | 'ATTENDANCE_WRITE'
  | 'USER_MANAGE'
  | 'USER_READ'
  | 'ORDER_READ'
  | 'ORDER_WRITE'
  | 'ENROLLMENT_READ'
  | 'ENROLLMENT_WRITE'
  | 'REPORT_READ'
  | 'AUDIT_READ'
  | 'SETTINGS_MANAGE'
  | 'SUPPORT_HANDLE'
  | 'SUPPORT_MONITOR'

const ALL_PERMISSIONS: Permission[] = [
  'COURSE_READ',
  'COURSE_WRITE',
  'CONTENT_WRITE',
  'QUESTION_APPROVE',
  'SOLUTION_APPROVE',
  'REVIEW_QUEUE_HANDLE',
  'TAXONOMY_WRITE',
  'SCHEDULE_READ',
  'SCHEDULE_WRITE',
  'ATTENDANCE_WRITE',
  'USER_MANAGE',
  'USER_READ',
  'ORDER_READ',
  'ORDER_WRITE',
  'ENROLLMENT_READ',
  'ENROLLMENT_WRITE',
  'REPORT_READ',
  'AUDIT_READ',
  'SETTINGS_MANAGE',
  'SUPPORT_HANDLE',
  'SUPPORT_MONITOR',
]

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  STUDENT: [],
  MENTOR: ['SOLUTION_APPROVE', 'REVIEW_QUEUE_HANDLE', 'SUPPORT_HANDLE'],
  TEACHER: [
    'COURSE_READ',
    'CONTENT_WRITE',
    'QUESTION_APPROVE',
    'SOLUTION_APPROVE',
    'REVIEW_QUEUE_HANDLE',
    'TAXONOMY_WRITE',
    'ATTENDANCE_WRITE',
  ],
  STAFF: [
    'COURSE_READ',
    'COURSE_WRITE',
    'CONTENT_WRITE',
    'QUESTION_APPROVE',
    'TAXONOMY_WRITE',
    'SCHEDULE_READ',
    'SCHEDULE_WRITE',
    'ATTENDANCE_WRITE',
    'USER_READ',
    'ORDER_READ',
    'ORDER_WRITE',
    'ENROLLMENT_READ',
    'ENROLLMENT_WRITE',
    'SUPPORT_HANDLE',
  ],
  // D14: the manager watches and reports; no write permission until an exception is agreed.
  MANAGER: [
    'COURSE_READ',
    'SCHEDULE_READ',
    'USER_READ',
    'ORDER_READ',
    'ENROLLMENT_READ',
    'REPORT_READ',
    'AUDIT_READ',
    'SUPPORT_MONITOR',
  ],
  ADMINISTRATOR: ALL_PERMISSIONS,
}

export function can(role: UserRole, permission: Permission | readonly Permission[]) {
  const granted = ROLE_PERMISSIONS[role]
  return typeof permission === 'string'
    ? granted.includes(permission)
    : permission.some((item) => granted.includes(item))
}
