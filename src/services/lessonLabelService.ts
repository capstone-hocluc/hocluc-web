import { request } from '../lib/api'
import type {
  AcceptSkillSuggestionsResult,
  CourseSkillSuggestions,
  FindLessonsByLabelQuery,
  LessonLabelsRequest,
  LessonLabelsResponse,
  LessonMarkersRequest,
  LessonSkillSuggestion,
  LessonSuggestionsQuery,
  LessonSuggestionResponse,
  LessonVideoLabelsRequest,
  SkillSuggestionRun,
  SkillSuggestionStatus,
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

const courseSuggestions = (courseId: string) =>
  `/api/v1/authoring/courses/${encodeURIComponent(courseId)}/skill-suggestions`
const suggestion = (suggestionId: string) =>
  `/api/v1/authoring/skill-suggestions/${encodeURIComponent(suggestionId)}`

// Skill suggestions are authoring work, never a teacher's: reading as for the labels but only for ADMINISTRATOR,
// STAFF and MANAGER; the rest needs AUTHOR on the subject too. Starting answers 503 when the server has neither Jev nor a model.
export async function getSkillSuggestions(
  courseId: string,
  status?: SkillSuggestionStatus
): Promise<CourseSkillSuggestions> {
  const query = status ? `?status=${status}` : ''
  return data(await request<CourseSkillSuggestions>(`${courseSuggestions(courseId)}${query}`, { auth: true }))
}

/** Queues a run over every lesson of the course; while one is queued or running, returns that one. */
export async function startSkillSuggestions(courseId: string): Promise<SkillSuggestionRun> {
  return data(await request<SkillSuggestionRun>(`${courseSuggestions(courseId)}/run`, {
    auth: true, method: 'POST',
  }))
}

/** One lesson at once (a single AI call); returns its pending suggestions. */
export async function startLessonSkillSuggestions(lessonId: string): Promise<LessonSkillSuggestion[]> {
  return data(await request<LessonSkillSuggestion[]>(`${path(lessonId)}/skill-suggestions/run`, {
    auth: true, method: 'POST',
  }))
}

/** Adds the skill to the lesson's skills, keeping the others and the main one. */
export async function acceptSkillSuggestion(suggestionId: string): Promise<LessonSkillSuggestion> {
  return data(await request<LessonSkillSuggestion>(`${suggestion(suggestionId)}/accept`, {
    auth: true, method: 'POST',
  }))
}

export async function rejectSkillSuggestion(suggestionId: string): Promise<LessonSkillSuggestion> {
  return data(await request<LessonSkillSuggestion>(`${suggestion(suggestionId)}/reject`, {
    auth: true, method: 'POST',
  }))
}

/** Accepts every pending suggestion of the course at least `minConfidence` (0..1) likely. */
export async function acceptSkillSuggestionsAbove(
  courseId: string,
  minConfidence: number
): Promise<AcceptSkillSuggestionsResult> {
  return data(await request<AcceptSkillSuggestionsResult>(`${courseSuggestions(courseId)}/accept`, {
    auth: true, method: 'POST', body: { minConfidence },
  }))
}
