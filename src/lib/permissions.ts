import type { UserRole } from '../services/userService'

// Console permissions; quiz read/write is aligned with the current BE controller/service.
// Other modules retain their existing permission decisions.
// This only decides what the UI shows. The backend's @PreAuthorize rules are the
// source of truth: hiding a button here never grants or removes access to an API.

export type Permission =
  | 'COURSE_READ'
  | 'COURSE_WRITE'
  | 'CONTENT_WRITE'
  | 'QUIZ_READ'
  | 'QUIZ_WRITE'
  | 'BANK_AUTHOR'
  | 'BANK_REVIEW'
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
  | 'AUDIT_READ'
  | 'SUPPORT_HANDLE'
  | 'SUPPORT_MONITOR'

const ALL_PERMISSIONS: Permission[] = [
  'COURSE_READ',
  'COURSE_WRITE',
  'CONTENT_WRITE',
  'QUIZ_READ',
  'QUIZ_WRITE',
  'BANK_AUTHOR',
  'BANK_REVIEW',
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
  'AUDIT_READ',
  'SUPPORT_HANDLE',
  'SUPPORT_MONITOR',
]

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  STUDENT: [],
  MENTOR: ['SOLUTION_APPROVE', 'REVIEW_QUEUE_HANDLE', 'SUPPORT_HANDLE'],
  TEACHER: [
    'BANK_AUTHOR',
    'COURSE_READ',
    'QUIZ_READ',
    'CONTENT_WRITE',
    'SOLUTION_APPROVE',
    'REVIEW_QUEUE_HANDLE',
    'TAXONOMY_WRITE',
    'ATTENDANCE_WRITE',
  ],
  STAFF: [
    'BANK_AUTHOR',
    'BANK_REVIEW',
    'COURSE_READ',
    'QUIZ_READ',
    'QUIZ_WRITE',
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
  // Other modules retain the Manager read-only policy; quiz is the verified BE exception.
  MANAGER: [
    'BANK_AUTHOR',
    'BANK_REVIEW',
    'COURSE_READ',
    // Quiz authoring is explicitly allowed by TeacherQuizController + Actor.isStaff.
    // This does not grant writes to courses, taxonomy or other subject capabilities.
    'QUIZ_READ',
    'QUIZ_WRITE',
    'SCHEDULE_READ',
    'USER_READ',
    'ORDER_READ',
    'ENROLLMENT_READ',
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
