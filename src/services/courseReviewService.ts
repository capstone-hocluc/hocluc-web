import { request } from '../lib/api'

/** Whether the caller may write a review, and if not, what is missing. */
export type ReviewEligibility = 'CAN_REVIEW' | 'GUEST' | 'NOT_OWNED' | 'NO_LESSON_COMPLETED'

export interface MyCourseReview {
  id: string
  rating: number
  comment: string | null
  /** Staff hid it: it stays visible to its author, with the reason. */
  hidden: boolean
  hiddenReason: string | null
  updatedAt: string
}

export interface CourseReviewSummary {
  /** One decimal; null while the course has no visible review. */
  averageRating: number | null
  reviewCount: number
  /** Visible reviews per star value: index 0 is 1 star, index 4 is 5 stars. */
  distribution: number[]
  eligibility: ReviewEligibility
  mine: MyCourseReview | null
}

export interface CourseReview {
  id: string
  authorName: string
  authorAvatarUrl: string | null
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface CourseReviewAdmin {
  id: string
  studentId: string
  authorName: string
  authorEmail: string
  rating: number
  comment: string | null
  hidden: boolean
  hiddenReason: string | null
  hiddenByName: string | null
  hiddenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewPage<T> {
  content: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last?: boolean
}

const coursePath = (courseId: string) => `/api/v1/courses/${encodeURIComponent(courseId)}/reviews`

function requireData<T>(data: T | undefined, message: string): T {
  if (data == null) throw new Error(message)
  return data
}

// Public, with the token attached when there is one so the answer includes the caller's own review.
export async function getReviewSummary(courseId: string): Promise<CourseReviewSummary> {
  const response = await request<CourseReviewSummary>(`${coursePath(courseId)}/summary`, { optionalAuth: true })
  const data = response.data
  if (!data || typeof data.reviewCount !== 'number' || !Array.isArray(data.distribution) || data.distribution.length !== 5) {
    throw new Error('Không tải được đánh giá khóa học.')
  }
  return data
}

export async function getReviews(courseId: string, page = 0, size = 10): Promise<ReviewPage<CourseReview>> {
  const response = await request<ReviewPage<CourseReview>>(`${coursePath(courseId)}?page=${page}&size=${size}`)
  const data = response.data
  if (!data || !Array.isArray(data.content)) throw new Error('Không tải được đánh giá khóa học.')
  return data
}

export async function saveMyReview(courseId: string, rating: number, comment: string): Promise<MyCourseReview> {
  const response = await request<MyCourseReview>(`${coursePath(courseId)}/mine`, {
    auth: true,
    method: 'PUT',
    body: { rating, comment },
  })
  return requireData(response.data, 'Không lưu được đánh giá.')
}

export async function deleteMyReview(courseId: string): Promise<void> {
  await request(`${coursePath(courseId)}/mine`, { auth: true, method: 'DELETE' })
}

export interface AdminReviewFilter {
  rating?: number
  hidden?: boolean
}

export async function getAdminReviews(courseId: string, filter: AdminReviewFilter = {}, page = 0, size = 20) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (filter.rating) params.set('rating', String(filter.rating))
  if (filter.hidden !== undefined) params.set('hidden', String(filter.hidden))
  const response = await request<ReviewPage<CourseReviewAdmin>>(
    `/api/v1/admin/courses/${encodeURIComponent(courseId)}/reviews?${params}`,
    { auth: true, guardIdentity: true }
  )
  return requireData(response.data, 'Không tải được danh sách đánh giá.')
}

export async function setReviewVisibility(reviewId: string, hidden: boolean, reason?: string) {
  const response = await request<CourseReviewAdmin>(
    `/api/v1/admin/course-reviews/${encodeURIComponent(reviewId)}/visibility`,
    { auth: true, guardIdentity: true, method: 'PATCH', body: { hidden, reason } }
  )
  return requireData(response.data, 'Không cập nhật được đánh giá.')
}
