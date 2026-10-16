import type { CourseReviewState, CourseStatus } from '../../../services/courseAdminService'
import type { StatusTone } from '../../console/status'
export const REVIEW_STATE_LABELS: Record<CourseReviewState, string> = {
  NONE: 'Chưa gửi duyệt',
  PENDING: 'Chờ duyệt',
  REJECTED: 'Bị trả lại',
}
export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
}
// Draft and archived are quiet (grey); waiting for review is the attention state (yellow).
export const COURSE_STATUS_TONES: Record<CourseStatus, StatusTone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
}
export const REVIEW_STATE_TONES: Record<CourseReviewState, StatusTone> = {
  NONE: 'neutral',
  PENDING: 'warning',
  REJECTED: 'danger',
}
/** One status for people: a draft that went through review shows its review state instead of "Nháp". */
export function courseDisplayStatus(course: {
  status: CourseStatus
  reviewState: CourseReviewState
}): { label: string; tone: StatusTone } {
  if (course.status === 'DRAFT' && course.reviewState !== 'NONE') {
    return {
      label: REVIEW_STATE_LABELS[course.reviewState],
      tone: REVIEW_STATE_TONES[course.reviewState],
    }
  }
  return { label: COURSE_STATUS_LABELS[course.status], tone: COURSE_STATUS_TONES[course.status] }
}
export function movedIds(ids: string[], index: number, direction: -1 | 1): string[] {
  const next = [...ids]
  const target = index + direction
  if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]
  return next
}
export type CourseMutation = (
  resource: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
) => Promise<boolean>
export type CourseRemoval = (resource: string, label: string) => void
