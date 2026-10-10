import { ApiError, request, type ApiResponse } from '../lib/api'

export type TeacherQuizType = 'PLACEMENT' | 'QUICK' | 'LESSON' | 'CHAPTER' | 'EXAM'
export type TeacherQuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type TeacherQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER'

export interface TeacherQuizRecord {
  id: string
  type: TeacherQuizType
  status: TeacherQuizStatus
  title: string
  description: string | null
  courseId: string | null
  courseTitle: string | null
  chapterId: string | null
  chapterTitle: string | null
  lessonId: string | null
  lessonTitle: string | null
  durationMinutes: number | null
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  availableFrom: string | null
  availableUntil: string | null
  practiceAllowed: boolean
  examFileUrl: string | null
  pageCount: number
  questionCount: number
  missingAnswerCount: number
  needsReviewCount: number
  attemptCount: number
  locked: boolean
  publishProblems: string[] | null
  createdById: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface TeacherQuizOption {
  id: string
  sequence: number
  label: string
  text: string
  correct: boolean
}

export interface TeacherQuizQuestion {
  id: string
  sequence: number
  sectionId: string | null
  groupId: string | null
  questionText: string
  questionType: TeacherQuestionType
  difficulty: string | null
  categoryId: string | null
  categoryName: string | null
  explanation: string | null
  imageUrl: string | null
  sourcePage: number | null
  marks: number | null
  needsReview: boolean
  reviewNote: string | null
  correctLabels: string
  options: TeacherQuizOption[]
}

export interface TeacherQuizSection {
  id: string
  parentId: string | null
  title: string
  sequence: number
  categoryId: string | null
  categoryName: string | null
  suggestedMinutes: number | null
  questionCount: number
  firstQuestion: number
  lastQuestion: number
  children: TeacherQuizSection[]
}

export interface TeacherQuizEditor {
  quiz: TeacherQuizRecord
  sections: TeacherQuizSection[]
  groups: Array<{
    id: string
    sectionId: string | null
    instruction: string | null
    passage: string | null
    imageUrl: string | null
    sourcePage: number | null
    sequence: number
    firstQuestion: number
    lastQuestion: number
    questionIds: string[]
  }>
  questions: TeacherQuizQuestion[]
  pages: Array<{ pageNumber: number; url: string; width: number | null; height: number | null }>
  latestJob: unknown | null
}

export interface CreateTeacherQuizRequest {
  type: TeacherQuizType
  courseId?: string
  chapterId?: string
  lessonId?: string
  title: string
  description?: string
  durationMinutes?: number
  maxAttempts?: number
  passingPercentage?: number
  showAnswers?: boolean
  availableFrom?: string
  availableUntil?: string
  practiceAllowed?: boolean
  examFileUrl?: string
}

export interface UpdateTeacherQuizRequest {
  title?: string
  description?: string
  durationMinutes?: number
  maxAttempts?: number
  passingPercentage?: number
  showAnswers?: boolean
  availableFrom?: string
  availableUntil?: string
  practiceAllowed?: boolean
  examFileUrl?: string
}

export interface SaveTeacherQuestionRequest {
  questionText: string
  questionType?: TeacherQuestionType
  explanation?: string
  imageUrl?: string
  categoryId?: string
  difficulty?: string
  sectionId?: string
  groupId?: string
  sourcePage?: number
  marks?: number
  needsReview?: boolean
  reviewNote?: string
  options?: Array<{ text: string; correct: boolean }>
}

export interface TeacherQuizSectionSpec {
  title: string
  categoryId?: string
  suggestedMinutes?: number
  fromQuestion?: number
  toQuestion?: number
  children?: TeacherQuizSectionSpec[]
}

export class AmbiguousTeacherQuestionSaveError extends Error {
  constructor() {
    super('Không xác định được máy chủ đã lưu câu hỏi hay chưa.')
    this.name = 'AmbiguousTeacherQuestionSaveError'
  }
}

function isDefiniteTeacherQuestionWriteRejection(error: unknown) {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408
}

const QUESTION_TYPES = new Set<TeacherQuestionType>([
  'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER',
])

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isNullableNumber(value: unknown) {
  return value === null || typeof value === 'number'
}

function isTeacherQuizQuestion(value: unknown): value is TeacherQuizQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as Record<string, unknown>
  return typeof question.id === 'string' && Boolean(question.id.trim()) &&
    typeof question.sequence === 'number' &&
    isNullableString(question.sectionId) && isNullableString(question.groupId) &&
    typeof question.questionText === 'string' &&
    typeof question.questionType === 'string' && QUESTION_TYPES.has(question.questionType as TeacherQuestionType) &&
    isNullableString(question.difficulty) && isNullableString(question.categoryId) &&
    isNullableString(question.categoryName) && isNullableString(question.explanation) &&
    isNullableString(question.imageUrl) && isNullableNumber(question.sourcePage) &&
    isNullableNumber(question.marks) && typeof question.needsReview === 'boolean' &&
    isNullableString(question.reviewNote) && typeof question.correctLabels === 'string' &&
    Array.isArray(question.options) && question.options.every((option) => {
      if (!option || typeof option !== 'object') return false
      const item = option as Record<string, unknown>
      return typeof item.id === 'string' && Boolean(item.id.trim()) &&
        typeof item.sequence === 'number' && typeof item.label === 'string' &&
        typeof item.text === 'string' && typeof item.correct === 'boolean'
    })
}

async function requireData<T>(path: string, fallback: string, options?: Parameters<typeof request<T>>[1]): Promise<T> {
  const response = await request<T>(path, { auth: true, ...options })
  if (!response.data) throw new Error(fallback)
  return response.data
}

const quizPath = (quizId?: string) =>
  quizId ? `/api/v1/teacher/quizzes/${encodeURIComponent(quizId)}` : '/api/v1/teacher/quizzes'

export function getTeacherQuizzes(courseId?: string): Promise<TeacherQuizRecord[]> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
  return requireData(`${quizPath()}${query}`, 'Không thể tải danh sách bài kiểm tra.')
}

export function getTeacherQuiz(quizId: string): Promise<TeacherQuizEditor> {
  return requireData(quizPath(quizId), 'Không thể tải nội dung bài kiểm tra.')
}

export function createTeacherQuiz(payload: CreateTeacherQuizRequest): Promise<TeacherQuizRecord> {
  return requireData(quizPath(), 'Không thể tạo bài kiểm tra.', { method: 'POST', body: payload })
}

export function updateTeacherQuiz(quizId: string, payload: UpdateTeacherQuizRequest): Promise<TeacherQuizRecord> {
  return requireData(quizPath(quizId), 'Không thể lưu thông tin bài kiểm tra.', { method: 'PUT', body: payload })
}

export async function deleteTeacherQuiz(quizId: string): Promise<void> {
  await request(quizPath(quizId), { method: 'DELETE', auth: true })
}

export function publishTeacherQuiz(quizId: string): Promise<TeacherQuizRecord> {
  return requireData(`${quizPath(quizId)}/publish`, 'Không thể xuất bản bài kiểm tra.', { method: 'POST' })
}

export function unpublishTeacherQuiz(quizId: string): Promise<TeacherQuizRecord> {
  return requireData(`${quizPath(quizId)}/unpublish`, 'Không thể ẩn bài kiểm tra.', { method: 'POST' })
}

export function duplicateTeacherQuiz(quizId: string): Promise<TeacherQuizRecord> {
  return requireData(`${quizPath(quizId)}/duplicate`, 'Không thể sao chép bài kiểm tra.', { method: 'POST' })
}

export async function setTeacherQuizLayout(quizId: string, sections: TeacherQuizSectionSpec[]): Promise<TeacherQuizSection[]> {
  let savedSections: TeacherQuizSection[]
  try {
    savedSections = await requireData(`${quizPath(quizId)}/sections`, 'Không thể lưu cấu trúc đề thi.', {
      method: 'PUT',
      body: { sections },
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousTeacherQuestionSaveError()
  }

  const savedIds = Array.isArray(savedSections) ? savedSections.map((section) => section?.id) : []
  if (!Array.isArray(savedSections) || savedSections.length !== sections.length ||
      savedSections.some((section) => !section || typeof section.id !== 'string' || !section.id.trim() ||
        typeof section.title !== 'string' || typeof section.sequence !== 'number') ||
      new Set(savedIds).size !== sections.length) {
    throw new AmbiguousTeacherQuestionSaveError()
  }

  return savedSections
}

export async function addTeacherQuizQuestions(quizId: string, questions: SaveTeacherQuestionRequest[]): Promise<TeacherQuizQuestion[]> {
  let savedQuestions: TeacherQuizQuestion[]
  try {
    savedQuestions = await requireData(`${quizPath(quizId)}/questions`, 'Không thể thêm câu hỏi.', {
      method: 'POST',
      body: { questions },
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousTeacherQuestionSaveError()
  }

  const savedIds = Array.isArray(savedQuestions) ? savedQuestions.map((question) => question?.id) : []
  if (!Array.isArray(savedQuestions) || savedQuestions.length !== questions.length ||
      savedQuestions.some((question) => !isTeacherQuizQuestion(question)) ||
      new Set(savedIds).size !== questions.length) {
    throw new AmbiguousTeacherQuestionSaveError()
  }

  return savedQuestions
}

export async function reorderTeacherQuizQuestions(quizId: string, questionIds: string[]): Promise<TeacherQuizQuestion[]> {
  let savedQuestions: TeacherQuizQuestion[]
  try {
    savedQuestions = await requireData(`${quizPath(quizId)}/questions/order`, 'Không thể sắp xếp câu hỏi.', {
      method: 'PUT',
      body: { questionIds },
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousTeacherQuestionSaveError()
  }

  const savedIds = Array.isArray(savedQuestions) ? savedQuestions.map((question) => question?.id) : []
  const requestedIds = new Set(questionIds)
  if (!Array.isArray(savedQuestions) || savedQuestions.length !== questionIds.length ||
      savedQuestions.some((question, index) => !isTeacherQuizQuestion(question) || question.id !== questionIds[index]) ||
      new Set(savedIds).size !== questionIds.length || requestedIds.size !== questionIds.length ||
      savedIds.some((id) => typeof id !== 'string' || !requestedIds.has(id))) {
    throw new AmbiguousTeacherQuestionSaveError()
  }

  return savedQuestions
}

export async function updateTeacherQuizQuestion(questionId: string, payload: SaveTeacherQuestionRequest): Promise<TeacherQuizQuestion> {
  let savedQuestion: TeacherQuizQuestion
  try {
    savedQuestion = await requireData(`/api/v1/teacher/questions/${encodeURIComponent(questionId)}`, 'Không thể lưu câu hỏi.', {
      method: 'PUT',
      body: payload,
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousTeacherQuestionSaveError()
  }

  if (!isTeacherQuizQuestion(savedQuestion) || savedQuestion.id !== questionId) {
    throw new AmbiguousTeacherQuestionSaveError()
  }
  return savedQuestion
}

export async function deleteTeacherQuizQuestion(questionId: string): Promise<void> {
  let response: ApiResponse<unknown>
  try {
    response = await request(`/api/v1/teacher/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      auth: true,
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousTeacherQuestionSaveError()
  }

  if (!response || response.success !== true) throw new AmbiguousTeacherQuestionSaveError()
}

export interface TeacherAttemptRecord {
  attemptId: string
  studentId: string
  studentName: string | null
  studentEmail: string | null
  mode: string
  status: string
  attemptNumber: number
  startedAt: string | null
  submittedAt: string | null
  autoSubmitted: boolean
  percentage: number | null
  correctCount: number | null
  totalQuestions: number | null
  passed: boolean
  timeSpentSeconds: number | null
}

export interface TeacherQuizStats {
  quizId: string
  gradedAttempts: number
  inProgressAttempts: number
  practiceAttempts: number
  averagePercentage: number | null
  passRate: number | null
}

export function getTeacherQuizAttempts(quizId: string): Promise<TeacherAttemptRecord[]> {
  return requireData(`${quizPath(quizId)}/attempts`, 'Không thể tải danh sách bài làm.')
}

export function getTeacherQuizStats(quizId: string): Promise<TeacherQuizStats> {
  return requireData(`${quizPath(quizId)}/stats`, 'Không thể tải thống kê bài kiểm tra.')
}

// Marks the given questions as reviewed (clears their needs-review flag).
export async function markTeacherQuestionsReviewed(quizId: string, questionIds: string[]): Promise<void> {
  await requireData(`${quizPath(quizId)}/questions/reviewed`, 'Không thể cập nhật trạng thái duyệt.', {
    method: 'POST',
    body: { questionIds },
  })
}
