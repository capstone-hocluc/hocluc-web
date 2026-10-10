import { request } from '../lib/api'

export type CourseType = 'MAIN' | 'SECTION'
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
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
  publishedAt: string | null
  updatedAt: string
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
export interface CourseAdminSection {
  id: string
  sectionCourseId: string
  title: string
  status: CourseStatus
  phaseId: string | null
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
> & { slug?: string; expectedUpdatedAt?: string }

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
