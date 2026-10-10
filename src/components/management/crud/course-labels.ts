import type { CourseStatus } from '../../../services/courseAdminService'
export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
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
