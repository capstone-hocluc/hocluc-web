import { request } from '../lib/api'

export interface LessonQuiz {
  id: string
  type: string
  title: string
  questionCount: number
  durationMinutes: number | null
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  attemptsUsed: number
  bestPercentage: number | null
  passed: boolean
  locked: boolean
  lockReason: string | null
  inProgressAttemptId: string | null
}

export interface LessonProgress {
  lessonId: string
  status: string
  progressPercentage: number
  watchDurationSeconds: number
  startedAt: string | null
  completedAt: string | null
  sectionCourseId: string | null
  sectionProgressPercentage: number
  chapterCompleted: boolean
}

export interface LessonVideo {
  id: string
  lessonId: string
  title: string
  videoUrl: string | null
  durationSeconds: number | null
  sequence: number
  createdAt: string | null
}

export interface LessonVideoStreamUrl {
  streamUrl: string
  expiresInSeconds: number
}

export interface LessonDetail {
  id: string
  title: string
  description: string | null
  contentType: string
  content: string | null
  videoUrl: string | null
  durationSeconds: number | null
  sequence: number
  preview: boolean
  chapterId: string | null
  chapterTitle: string | null
  sectionCourseId: string | null
  sectionCourseTitle: string | null
  owned: boolean
  progress: LessonProgress | null
  quizzes: LessonQuiz[]
  videos?: LessonVideo[]
  previousLessonId: string | null
  nextLessonId: string | null
}

export interface UpdateLessonProgressRequest {
  completed: boolean
  watchDurationSeconds: number
}

// GET already includes `progress` - never follow this with a GET progress
// call on initial load, that would be a redundant request for data we
// already have.
export async function getLesson(lessonId: string): Promise<LessonDetail> {
  const response = await request<LessonDetail>(`/api/v1/lessons/${encodeURIComponent(lessonId)}`, {
    auth: true,
  })
  if (!response.data) throw new Error('Không thể tải bài học.')
  return response.data
}

export async function getLessonVideoStreamUrl(
  lessonId: string,
  videoId: string
): Promise<LessonVideoStreamUrl> {
  const response = await request<LessonVideoStreamUrl>(
    `/api/v1/lessons/${encodeURIComponent(lessonId)}/videos/${encodeURIComponent(videoId)}/stream-url`,
    { auth: true }
  )
  if (!response.data?.streamUrl) throw new Error('Không thể lấy liên kết phát video.')
  return response.data
}

// Kept for explicit/lightweight refresh use cases (not called on initial
// Lesson Detail load - see getLesson above).
export async function getLessonProgress(lessonId: string): Promise<LessonProgress> {
  const response = await request<LessonProgress>(
    `/api/v1/lessons/${encodeURIComponent(lessonId)}/progress`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải tiến độ bài học.')
  return response.data
}

export async function updateLessonProgress(
  lessonId: string,
  payload: UpdateLessonProgressRequest
): Promise<LessonProgress> {
  const response = await request<LessonProgress>(
    `/api/v1/lessons/${encodeURIComponent(lessonId)}/progress`,
    { method: 'PUT', body: payload, auth: true }
  )
  if (!response.data) throw new Error('Không thể cập nhật tiến độ bài học.')
  return response.data
}
