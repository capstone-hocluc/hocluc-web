import { request } from '../lib/api'

export type LessonContentType =
  | 'TEXT'
  | 'VIDEO'
  | 'ARTICLE'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'SCORM'
  | 'LIVE'
  | 'PROGRAMMING'

export const LESSON_CONTENT_TYPES: { id: LessonContentType; label: string }[] = [
  { id: 'TEXT', label: 'Văn bản' },
  { id: 'VIDEO', label: 'Video' },
  { id: 'ARTICLE', label: 'Bài viết' },
  { id: 'QUIZ', label: 'Trắc nghiệm' },
  { id: 'ASSIGNMENT', label: 'Bài tập' },
  { id: 'SCORM', label: 'SCORM' },
  { id: 'LIVE', label: 'Lớp trực tiếp' },
  { id: 'PROGRAMMING', label: 'Lập trình' },
]

export interface LessonAdmin {
  id: string
  chapterId: string
  title: string
  description: string | null
  contentType: LessonContentType
  content: string | null
  videoUrl: string | null
  durationSeconds: number | null
  sequence: number
  published: boolean
  preview: boolean
  instructorContent: string | null
  instructorNotes: string | null
  updatedAt: string
}

export interface SaveLessonRequest {
  title: string
  description: string | null
  contentType: LessonContentType
  content: string | null
  videoUrl: string | null
  durationSeconds: number | null
  instructorContent: string | null
  instructorNotes: string | null
  expectedUpdatedAt?: string
}

const path = (chapterId: string, lessonId?: string) =>
  `/api/v1/chapters/${encodeURIComponent(chapterId)}/lessons${lessonId ? `/${encodeURIComponent(lessonId)}` : ''}`

const data = <T>(response: { data?: T }): T => {
  if (response.data === undefined || response.data === null)
    throw new Error('Không nhận được dữ liệu bài học.')
  return response.data
}

export async function getAdminLessons(chapterId: string): Promise<LessonAdmin[]> {
  return data(await request<LessonAdmin[]>(path(chapterId), { auth: true }))
}

export async function saveAdminLesson(
  chapterId: string,
  lesson: LessonAdmin | null,
  body: SaveLessonRequest
): Promise<LessonAdmin> {
  return data(
    await request<LessonAdmin>(path(chapterId, lesson?.id), {
      auth: true,
      method: lesson ? 'PUT' : 'POST',
      // Concurrency timestamps are opaque; never convert through Date/dayjs.
      body: { ...body, expectedUpdatedAt: lesson?.updatedAt },
    })
  )
}

export async function setAdminLessonState(
  lesson: LessonAdmin,
  state: { published: boolean; preview: boolean }
): Promise<LessonAdmin> {
  return data(
    await request<LessonAdmin>(`${path(lesson.chapterId, lesson.id)}/published`, {
      auth: true,
      method: 'PATCH',
      body: { ...state, expectedUpdatedAt: lesson.updatedAt },
    })
  )
}

export async function orderAdminLessons(chapterId: string, ids: string[]): Promise<LessonAdmin[]> {
  return data(
    await request<LessonAdmin[]>(`${path(chapterId)}/order`, {
      auth: true,
      method: 'PUT',
      body: { ids },
    })
  )
}

export async function deleteAdminLesson(chapterId: string, lessonId: string): Promise<void> {
  await request<void>(path(chapterId, lessonId), { auth: true, method: 'DELETE' })
}
