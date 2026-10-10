import { request } from '../lib/api'

export interface ChapterAdmin {
  id: string
  courseId: string
  title: string
  description: string | null
  sequence: number
  published: boolean
  updatedAt: string
}
export interface SaveChapterRequest {
  title: string
  description: string | null
  expectedUpdatedAt?: string
}
const path = (courseId: string, chapterId?: string) =>
  `/api/v1/courses/${encodeURIComponent(courseId)}/chapters${chapterId ? `/${encodeURIComponent(chapterId)}` : ''}`
const data = <T>(response: { data?: T }): T => {
  if (response.data === undefined || response.data === null)
    throw new Error('Không nhận được dữ liệu chương học.')
  return response.data
}
export async function getAdminChapters(courseId: string): Promise<ChapterAdmin[]> {
  return data(await request<ChapterAdmin[]>(path(courseId), { auth: true }))
}
export async function saveAdminChapter(
  courseId: string,
  chapter: ChapterAdmin | null,
  body: SaveChapterRequest
): Promise<ChapterAdmin> {
  return data(
    await request<ChapterAdmin>(path(courseId, chapter?.id), {
      auth: true,
      method: chapter ? 'PUT' : 'POST',
      // Concurrency timestamps are opaque; never convert through Date/dayjs.
      body: { ...body, expectedUpdatedAt: chapter?.updatedAt },
    })
  )
}
export async function publishAdminChapter(
  chapter: ChapterAdmin,
  published: boolean
): Promise<ChapterAdmin> {
  return data(
    await request<ChapterAdmin>(`${path(chapter.courseId, chapter.id)}/published`, {
      auth: true,
      method: 'PATCH',
      body: { published, expectedUpdatedAt: chapter.updatedAt },
    })
  )
}
export async function orderAdminChapters(
  courseId: string,
  ids: string[]
): Promise<ChapterAdmin[]> {
  return data(
    await request<ChapterAdmin[]>(`${path(courseId)}/order`, {
      auth: true,
      method: 'PUT',
      body: { ids },
    })
  )
}
export async function deleteAdminChapter(courseId: string, chapterId: string): Promise<void> {
  await request<void>(path(courseId, chapterId), { auth: true, method: 'DELETE' })
}
