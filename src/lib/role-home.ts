import type { UserRole } from '../services/userService'

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Học viên',
  MENTOR: 'Mentor',
  TEACHER: 'Giáo viên',
  STAFF: 'Nhân viên',
  MANAGER: 'Quản lý',
  ADMINISTRATOR: 'Quản trị viên',
}

const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: '/student/dashboard',
  MENTOR: '/mentor/dashboard',
  TEACHER: '/teacher/dashboard',
  STAFF: '/staff/dashboard',
  MANAGER: '/manager/dashboard',
  ADMINISTRATOR: '/admin/dashboard',
}

export function roleHome(role: UserRole) {
  return ROLE_HOME[role]
}
