import type {
  EnrollmentStatus,
  EnrollmentType,
} from '../../../services/enrollmentAdminService'
import type { CourseType } from '../../../services/courseAdminService'
import type { StatusTone } from '../../console/status'

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Đang học',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  SUSPENDED: 'Tạm dừng',
}

export const ENROLLMENT_STATUS_TONES: Record<EnrollmentStatus, StatusTone> = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  CANCELLED: 'neutral',
  EXPIRED: 'danger',
  SUSPENDED: 'warning',
}

export const ENROLLMENT_TYPE_LABELS: Record<EnrollmentType, string> = {
  SELF_ENROLLED: 'Tự ghi danh',
  ADMIN_ENROLLED: 'Ghi danh thủ công',
  MAIN_COURSE_ENROLLED: 'Theo khóa trọn bộ',
  PURCHASED: 'Mua online',
}

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  MAIN: 'Trọn bộ',
  SECTION: 'Khóa nhỏ',
}
