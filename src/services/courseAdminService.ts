import { request } from '../lib/api'
import type { ExamSessionSummary } from './examYearService'

export type CourseType = 'MAIN' | 'SECTION'
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AccessMode = 'FIXED_END_DATE' | 'DAYS_FROM_PURCHASE'
/** NONE: not sent. PENDING: waiting for a reviewer. REJECTED: sent back, `reviewNote` says why. */
export type CourseReviewState = 'NONE' | 'PENDING' | 'REJECTED'
export interface CourseAdmin {
  id: string
  courseType: CourseType
  title: string
  slug: string
  description: string | null
  shortIntroduction: string | null
  imageUrl: string | null
  videoUrl: string | null
  categoryId: string | null
  categoryName: string | null
  status: CourseStatus
  paid: boolean
  price: number | null
  track: string | null
  startDate: string | null
  endDate: string | null
  targetExam: string | null
  examSessionDate: string | null
  /** The exam sitting a MAIN course prepares for (absent on older backends). */
  examSession?: ExamSessionSummary | null
  accessMode: AccessMode | null
  accessDays: number | null
  publishedAt: string | null
  updatedAt: string
  reviewState: CourseReviewState
  reviewNote: string | null
  reviewRequestedByName: string | null
  reviewRequestedAt: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  /** True when the signed-in user may approve and put the course on sale (absent on older backends). */
  canReview?: boolean
  phases: CourseAdminPhase[]
  sections: CourseAdminSection[]
  instructors: CourseAdminInstructor[]
}
export interface CourseAdminPhase {
  id: string
  name: string
  description: string | null
  sequence: number
  updatedAt: string
}
/** A course that comes with this one (a gift). */
export interface CourseAdminSection {
  id: string
  sectionCourseId: string
  title: string
  status: CourseStatus
  sequence: number
}
export interface CourseAdminInstructor {
  id: string
  instructorId: string
  name: string
  primaryInstructor: boolean
  displayOrder: number
}
export interface CourseAdminPage {
  content: CourseAdmin[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}
export interface CourseQuery {
  query?: string
  type?: CourseType
  status?: CourseStatus
  categoryId?: string
  reviewState?: CourseReviewState
  page?: number
  size?: number
}
export type SaveCourseRequest = Pick<
  CourseAdmin,
  | 'courseType'
  | 'title'
  | 'description'
  | 'shortIntroduction'
  | 'imageUrl'
  | 'videoUrl'
  | 'categoryId'
  | 'paid'
  | 'price'
  | 'track'
  | 'startDate'
  | 'endDate'
  | 'targetExam'
  | 'examSessionDate'
  | 'accessMode'
  | 'accessDays'
> & {
  slug?: string
  /** MAIN only: the sitting the course prepares for; the exam date then comes from it. */
  examSessionId?: string | null
  expectedUpdatedAt?: string
}

const path = (id?: string) => `/api/v1/admin/courses${id ? `/${encodeURIComponent(id)}` : ''}`
const requireData = <T>(response: { data?: T }): T => {
  if (!response.data) throw new Error('Không nhận được dữ liệu khóa học.')
  return response.data
}
export async function getAdminCourses(query: CourseQuery = {}): Promise<CourseAdminPage> {
  const params = new URLSearchParams()
  Object.entries({ ...query, page: query.page ?? 0, size: query.size ?? 20 }).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
  )
  return requireData(await request<CourseAdminPage>(`${path()}?${params}`, { auth: true }))
}
export async function getAdminCourse(id: string): Promise<CourseAdmin> {
  return requireData(await request<CourseAdmin>(path(id), { auth: true }))
}
export async function saveAdminCourse(
  id: string | null,
  body: SaveCourseRequest
): Promise<CourseAdmin> {
  return requireData(
    await request<CourseAdmin>(path(id ?? undefined), {
      auth: true,
      method: id ? 'PUT' : 'POST',
      body,
    })
  )
}
export async function changeCourseStatus(
  course: CourseAdmin,
  status: CourseStatus
): Promise<CourseAdmin> {
  return mutateCourse(course.id, 'status', 'PATCH', { status, expectedUpdatedAt: course.updatedAt })
}
/** Staff sends the course to a reviewer; it must already be ready to go on sale. */
export function submitCourseReview(course: CourseAdmin): Promise<CourseAdmin> {
  return mutateCourse(course.id, 'review', 'POST', { expectedUpdatedAt: course.updatedAt })
}
/** A reviewer approves the pending course; it goes on sale. */
export function approveCourseReview(course: CourseAdmin): Promise<CourseAdmin> {
  return mutateCourse(course.id, 'review/approve', 'POST', { expectedUpdatedAt: course.updatedAt })
}
/** A reviewer sends the pending course back; the note is what its author reads. */
export function rejectCourseReview(course: CourseAdmin, note: string): Promise<CourseAdmin> {
  return mutateCourse(course.id, 'review/reject', 'POST', {
    note: note.trim(),
    expectedUpdatedAt: course.updatedAt,
  })
}
export async function deleteAdminCourse(id: string): Promise<void> {
  await request<void>(path(id), { auth: true, method: 'DELETE' })
}
export async function mutateCourse(
  id: string,
  resource: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<CourseAdmin> {
  return requireData(
    await request<CourseAdmin>(`${path(id)}/${resource}`, { auth: true, method, body })
  )
}
