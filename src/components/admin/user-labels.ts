import type { UserRole, UserStatus, UserSummary } from '../../services/userService'

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Học viên',
  MENTOR: 'Mentor',
  TEACHER: 'Giáo viên',
  STAFF: 'Nhân viên',
  MANAGER: 'Quản lý',
  ADMINISTRATOR: 'Quản trị viên',
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  SUSPENDED: 'Tạm khóa',
  PENDING: 'Chờ xác minh',
}

// Only these roles can be granted together and switched between; students never can.
export const SWITCHABLE_ROLES: UserRole[] = ['ADMINISTRATOR', 'STAFF', 'MENTOR']

export function getStatusTone(status: UserStatus) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'SUSPENDED') return 'danger' as const
  if (status === 'PENDING') return 'warning' as const
  return 'neutral' as const
}

type UserNameSource = Pick<UserSummary, 'displayName' | 'email'> &
  Partial<Pick<UserSummary, 'firstName' | 'lastName'>>

export function getUserName(user: UserNameSource) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return user.displayName || fullName || user.email
}

export function getInitials(user: Pick<UserSummary, 'firstName' | 'lastName' | 'email'>) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim()
  return initials || user.email.slice(0, 2).toUpperCase()
}

export function formatDate(value?: string, emptyLabel = 'Chưa cập nhật') {
  if (!value) return emptyLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
