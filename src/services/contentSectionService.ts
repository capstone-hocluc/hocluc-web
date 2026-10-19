import { request } from '../lib/api'

/** A group of chapters inside a course, optionally placed in one of its phases. */
export interface ContentSection {
  id: string
  courseId: string
  phaseId: string | null
  phaseName: string | null
  title: string
  description: string | null
  sequence: number
  chapterCount: number
  updatedAt: string
}
export interface SaveContentSectionRequest {
  title: string
  description: string | null
  /** A phase of the same course, or null for no phase. */
  phaseId: string | null
}

const path = (courseId: string, sectionId?: string) =>
  `/api/v1/courses/${encodeURIComponent(courseId)}/content-sections${sectionId ? `/${encodeURIComponent(sectionId)}` : ''}`
const data = <T>(response: { data?: T }): T => {
  if (response.data === undefined || response.data === null)
    throw new Error('Không nhận được dữ liệu phần học.')
  return response.data
}
export async function getContentSections(courseId: string): Promise<ContentSection[]> {
  return data(await request<ContentSection[]>(path(courseId), { auth: true }))
}
export async function saveContentSection(
  courseId: string,
  section: ContentSection | null,
  body: SaveContentSectionRequest
): Promise<ContentSection> {
  return data(
    await request<ContentSection>(path(courseId, section?.id), {
      auth: true,
      method: section ? 'PUT' : 'POST',
      // Concurrency timestamps are opaque; never convert through Date/dayjs.
      body: { ...body, expectedUpdatedAt: section?.updatedAt },
    })
  )
}
export async function deleteContentSection(courseId: string, sectionId: string): Promise<void> {
  await request<void>(path(courseId, sectionId), { auth: true, method: 'DELETE' })
}
export async function orderContentSections(
  courseId: string,
  ids: string[]
): Promise<ContentSection[]> {
  return data(
    await request<ContentSection[]>(`${path(courseId)}/order`, {
      auth: true,
      method: 'PUT',
      body: { ids },
    })
  )
}
