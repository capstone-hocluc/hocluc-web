import { request } from '../lib/api'

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

export function setTeacherQuizLayout(quizId: string, sections: TeacherQuizSectionSpec[]): Promise<TeacherQuizSection[]> {
  return requireData(`${quizPath(quizId)}/sections`, 'Không thể lưu cấu trúc đề thi.', {
    method: 'PUT',
    body: { sections },
  })
}

export function addTeacherQuizQuestions(quizId: string, questions: SaveTeacherQuestionRequest[]): Promise<TeacherQuizQuestion[]> {
  return requireData(`${quizPath(quizId)}/questions`, 'Không thể thêm câu hỏi.', {
    method: 'POST',
    body: { questions },
  })
}

export function reorderTeacherQuizQuestions(quizId: string, questionIds: string[]): Promise<TeacherQuizQuestion[]> {
  return requireData(`${quizPath(quizId)}/questions/order`, 'Không thể sắp xếp câu hỏi.', {
    method: 'PUT',
    body: { questionIds },
  })
}

export function updateTeacherQuizQuestion(questionId: string, payload: SaveTeacherQuestionRequest): Promise<TeacherQuizQuestion> {
  return requireData(`/api/v1/teacher/questions/${encodeURIComponent(questionId)}`, 'Không thể lưu câu hỏi.', {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteTeacherQuizQuestion(questionId: string): Promise<void> {
  await request(`/api/v1/teacher/questions/${encodeURIComponent(questionId)}`, {
    method: 'DELETE',
    auth: true,
  })
}
