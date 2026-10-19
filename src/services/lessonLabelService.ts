import { request } from '../lib/api'
import type {
  FindLessonsByLabelQuery,
  LessonLabelsRequest,
  LessonLabelsResponse,
  LessonMarkersRequest,
  LessonSuggestionsQuery,
  LessonSuggestionResponse,
  LessonVideoLabelsRequest,
} from '../types/lessonLabels'

const path = (lessonId: string) => `/api/v1/authoring/lessons/${encodeURIComponent(lessonId)}`

const data = <T>(response: { data?: T }): T => {
  if (response.data === undefined || response.data === null)
    throw new Error('Không nhận được dữ liệu nhãn bài học.')
  return response.data
}

// ADMINISTRATOR, STAFF, MANAGER, TEACHER; this detail read also checks course access.
export async function getLessonLabels(lessonId: string): Promise<LessonLabelsResponse> {
  return data(await request<LessonLabelsResponse>(`${path(lessonId)}/labels`, { auth: true }))
}

// Writes: ADMINISTRATOR, STAFF, MANAGER; the backend also enforces AUTHOR/course rights.
export async function replaceLessonSkills(
  lessonId: string,
  body: LessonLabelsRequest
): Promise<LessonLabelsResponse> {
  return data(await request<LessonLabelsResponse>(`${path(lessonId)}/labels`, {
    auth: true, method: 'PUT', body,
  }))
}

export async function replaceVideoMicroSkills(
  lessonId: string,
  videoId: string,
  body: LessonVideoLabelsRequest
): Promise<LessonLabelsResponse> {
  return data(await request<LessonLabelsResponse>(
    `${path(lessonId)}/videos/${encodeURIComponent(videoId)}/labels`,
    { auth: true, method: 'PUT', body }
  ))
}

export async function replaceMarkers(
  lessonId: string,
  body: LessonMarkersRequest
): Promise<LessonLabelsResponse> {
  return data(await request<LessonLabelsResponse>(`${path(lessonId)}/markers`, {
    auth: true, method: 'PUT', body,
  }))
}

function queryString(query: LessonSuggestionsQuery): string {
  const params = new URLSearchParams()
  if (query.skillCode !== undefined) params.set('skillCode', query.skillCode)
  if (query.microSkillCode !== undefined) params.set('microSkillCode', query.microSkillCode)
  return params.toString()
}

/** Authoring preview across owners, including unpublished lessons; role-gated by the backend. */
export async function findByLabel(query: FindLessonsByLabelQuery): Promise<LessonSuggestionResponse[]> {
  return data(await request<LessonSuggestionResponse[]>(
    `/api/v1/authoring/lessons/by-label?${queryString(query)}`, { auth: true }
  ))
}

/** STUDENT only: published lessons in owned courses, in the backend's relevance order. */
export async function getLessonSuggestions(
  query: LessonSuggestionsQuery
): Promise<LessonSuggestionResponse[]> {
  return data(await request<LessonSuggestionResponse[]>(
    `/api/v1/lessons/suggestions?${queryString(query)}`, { auth: true }
  ))
}
