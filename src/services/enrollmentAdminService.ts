import { request } from '../lib/api'
import type { CourseType } from './courseAdminService'

export const ENROLLMENT_STATUSES = [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'SUSPENDED',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

/** The only statuses an operator may set by hand; the backend refuses COMPLETED / EXPIRED. */
export const EDITABLE_ENROLLMENT_STATUSES = ['ACTIVE', 'SUSPENDED', 'CANCELLED'] as const
export type EditableEnrollmentStatus = (typeof EDITABLE_ENROLLMENT_STATUSES)[number]

export const ENROLLMENT_TYPES = [
  'SELF_ENROLLED',
  'ADMIN_ENROLLED',
  'MAIN_COURSE_ENROLLED',
  'PURCHASED',
] as const
export type EnrollmentType = (typeof ENROLLMENT_TYPES)[number]

export interface EnrollmentAdmin {
  id: string
  studentId: string
  studentEmail: string
  studentName: string | null
  courseId: string
  courseTitle: string
  courseType: CourseType
  /** For a SECTION enrollment granted by a MAIN purchase: that MAIN course. */
  mainCourseId: string | null
  status: EnrollmentStatus
  enrollmentType: EnrollmentType
  enrolledAt: string
  startedAt: string | null
  completedAt: string | null
  /** When access ends; null means the enrollment never expires. */
  expiresAt: string | null
  progressPercentage: number | null
  updatedAt: string
}

export interface EnrollmentAdminPage {
  content: EnrollmentAdmin[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface EnrollmentQuery {
  studentId?: string
  courseId?: string
  status?: EnrollmentStatus
  type?: EnrollmentType
  /** Only enrollments expiring within this many days. */
  expiringInDays?: number
  page?: number
  size?: number
}

export interface ManualEnrollmentRequest {
  studentId: string
  courseId: string
}

const path = (id?: string) => `/api/v1/admin/enrollments${id ? `/${encodeURIComponent(id)}` : ''}`
const requireData = <T>(response: { data?: T }): T => {
  if (!response.data) throw new Error('Không nhận được dữ liệu ghi danh.')
  return response.data
}

export async function getAdminEnrollments(
  query: EnrollmentQuery = {}
): Promise<EnrollmentAdminPage> {
  const params = new URLSearchParams()
  Object.entries({ ...query, page: query.page ?? 0, size: query.size ?? 20 }).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
  )
  return requireData(await request<EnrollmentAdminPage>(`${path()}?${params}`, { auth: true }))
}

/** Staff enrolls a student by hand; the access window comes from the course configuration. */
export async function createManualEnrollment(
  payload: ManualEnrollmentRequest
): Promise<EnrollmentAdmin> {
  return requireData(
    await request<EnrollmentAdmin>(path(), { auth: true, method: 'POST', body: payload })
  )
}

export async function changeEnrollmentStatus(
  id: string,
  status: EditableEnrollmentStatus
): Promise<EnrollmentAdmin> {
  return requireData(
    await request<EnrollmentAdmin>(`${path(id)}/status`, {
      auth: true,
      method: 'PATCH',
      body: { status },
    })
  )
}

/** A null expiresAt means the enrollment never expires; a past value cuts access immediately. */
export async function changeEnrollmentExpiry(
  id: string,
  expiresAt: string | null
): Promise<EnrollmentAdmin> {
  return requireData(
    await request<EnrollmentAdmin>(`${path(id)}/expiry`, {
      auth: true,
      method: 'PATCH',
      body: { expiresAt },
    })
  )
}
