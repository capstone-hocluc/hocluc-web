import { request } from '../lib/api'

export interface QuizOption {
  id: string
  optionText: string
  sequence: number
}

export interface QuizQuestion {
  id: string
  questionText: string
  questionType: string
  sequence: number
  imageUrl: string | null
  categoryId: string | null
  categoryName: string | null
  options: QuizOption[]
}

export interface QuizAttemptSummary {
  attemptId: string
  attemptNumber: number
  status: string
  startedAt: string
  submittedAt: string | null
  autoSubmitted: boolean
  score: number
  percentage: number
  passed: boolean
  timeSpentSeconds: number
}

export interface QuizDetail {
  id: string
  type: string
  title: string
  description: string | null
  durationMinutes: number | null
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  questionCount: number
  sectionCourseId: string | null
  sectionCourseTitle: string | null
  chapterId: string | null
  chapterTitle: string | null
  lessonId: string | null
  lessonTitle: string | null
  attemptsUsed: number
  bestPercentage: number | null
  passed: boolean
  locked: boolean
  lockReason: string | null
  inProgressAttemptId: string | null
  questions: QuizQuestion[]
  attempts: QuizAttemptSummary[]
}

export interface StartAttemptResult {
  attemptId: string
  quizId: string
  attemptNumber: number
  startedAt: string
  deadlineAt: string
  remainingSeconds: number
  resumed: boolean
}

export interface SavedAttemptAnswer {
  questionId: string
  selectedOptionId: string
}

export interface QuizAttemptDetail {
  attemptId: string
  quizId: string
  quizType: string
  quizTitle: string
  status: string
  attemptNumber: number
  startedAt: string
  deadlineAt: string
  remainingSeconds: number
  submittedAt: string | null
  autoSubmitted: boolean
  durationMinutes: number
  totalQuestions: number
  answeredCount: number
  answers: SavedAttemptAnswer[]
}

export interface SaveQuizAnswerRequest {
  questionId: string
  selectedOptionId: string
}

export interface QuizReviewOption {
  optionId: string
  optionText: string
  correct: boolean
  sequence: number
}

export interface QuizReviewQuestion {
  questionId: string
  sequence: number
  questionText: string
  imageUrl: string | null
  categoryId: string | null
  categoryName: string | null
  explanation: string | null
  options: QuizReviewOption[]
  selectedOptionId: string | null
  answered: boolean
  correct: boolean
}

export interface QuizReview {
  attemptId: string
  quizId: string
  quizTitle: string
  totalQuestions: number
  correctCount: number
  overallPercentage: number
  questions: QuizReviewQuestion[]
}

export async function getQuiz(quizId: string): Promise<QuizDetail> {
  const response = await request<QuizDetail>(
    `/api/v1/assessments/quizzes/${encodeURIComponent(quizId)}`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải bài kiểm tra.')
  return response.data
}

// No request body - the backend decides start-vs-resume and returns
// `resumed` accordingly. Never call this again once inProgressAttemptId
// already exists; navigate straight to that attempt instead.
export async function startQuizAttempt(quizId: string): Promise<StartAttemptResult> {
  const response = await request<StartAttemptResult>(
    `/api/v1/assessments/quizzes/${encodeURIComponent(quizId)}/attempts`,
    { method: 'POST', auth: true }
  )
  if (!response.data) throw new Error('Không thể bắt đầu bài kiểm tra.')
  return response.data
}

export async function getAttempt(attemptId: string): Promise<QuizAttemptDetail> {
  const response = await request<QuizAttemptDetail>(
    `/api/v1/assessments/attempts/${encodeURIComponent(attemptId)}`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải bài làm.')
  return response.data
}

// Response data is an opaque string per the confirmed contract - callers
// must not derive meaning from it, only from success/failure of the call.
export async function saveAnswer(
  attemptId: string,
  payload: SaveQuizAnswerRequest
): Promise<void> {
  await request<string>(
    `/api/v1/assessments/attempts/${encodeURIComponent(attemptId)}/answers`,
    { method: 'POST', body: payload, auth: true }
  )
}

// No request body, no result payload to trust - navigate to the review
// endpoint afterwards for the authoritative outcome.
export async function submitAttempt(attemptId: string): Promise<void> {
  await request<string>(
    `/api/v1/assessments/attempts/${encodeURIComponent(attemptId)}/submit`,
    { method: 'POST', auth: true }
  )
}

export async function getAttemptReview(attemptId: string): Promise<QuizReview> {
  const response = await request<QuizReview>(
    `/api/v1/assessments/attempts/${encodeURIComponent(attemptId)}/review`,
    { auth: true }
  )
  if (!response.data) throw new Error('Không thể tải kết quả bài kiểm tra.')
  return response.data
}

// ==================================================
// Placement assessment
//
// A placement attempt is still just an "attempt" in the same backend
// resource space as a course quiz attempt - GET/save-answer/submit/review
// all go through the exact same generic endpoints and types above
// (getAttempt, saveAnswer, submitAttempt, getAttemptReview, QuizAttemptDetail,
// QuizReview). Only the test definition and the start/history/result
// endpoints are placement-specific, so that's all that's added below.
// ==================================================

// Same question/option shape as a course quiz (QuizQuestion) - reused as-is.
export interface PlacementTest {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  examFileUrl: string | null
  questions: QuizQuestion[]
}

export async function getPlacementTest(): Promise<PlacementTest> {
  const response = await request<PlacementTest>('/api/v1/assessments/placement', { auth: true })
  if (!response.data) throw new Error('Không thể tải bài kiểm tra đầu vào.')
  return response.data
}

// No request body - same start-or-resume contract as startQuizAttempt.
export async function startPlacementAttempt(): Promise<StartAttemptResult> {
  const response = await request<StartAttemptResult>('/api/v1/assessments/placement/attempts', {
    method: 'POST',
    auth: true,
  })
  if (!response.data) throw new Error('Không thể bắt đầu bài kiểm tra đầu vào.')
  return response.data
}

// Same summary shape as a course quiz's embedded attempts[] (QuizAttemptSummary)
// - reused as-is. Placement's test definition has no embedded attempt
// history/inProgressAttemptId of its own, so this endpoint is how the intro
// screen detects a resumable attempt.
export async function getPlacementAttemptHistory(): Promise<QuizAttemptSummary[]> {
  const response = await request<QuizAttemptSummary[]>(
    '/api/v1/assessments/placement/attempts/me',
    { auth: true }
  )
  return response.data || []
}

export interface PlacementCategoryResult {
  categoryId: string
  categoryName: string
  correctCount: number
  wrongCount: number
  totalCount: number
  score: number
  percentage: number
}

export interface PlacementResult {
  id: string
  totalQuestions: number
  correctCount: number
  wrongCount: number
  score: number
  overallPercentage: number
  timeSpentSeconds: number
  level: string
  weakCategoryId: string | null
  weakCategoryName: string | null
  strongCategoryId: string | null
  strongCategoryName: string | null
  categories: PlacementCategoryResult[]
}

export async function getPlacementResult(): Promise<PlacementResult> {
  const response = await request<PlacementResult>('/api/v1/assessments/results/me', {
    auth: true,
  })
  if (!response.data) throw new Error('Không thể tải kết quả bài kiểm tra đầu vào.')
  return response.data
}
