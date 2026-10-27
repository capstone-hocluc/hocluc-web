import { accessTokenRole, ApiError, request, type ApiResponse } from '../lib/api'
import type { ExtractionJob } from './aiExtractionService'
import { can, ROLE_PERMISSIONS } from '../lib/permissions'
import type { UserRole } from './userService'

export type TeacherQuizType = 'PLACEMENT' | 'QUICK' | 'LESSON' | 'CHAPTER' | 'EXAM'
export type TeacherQuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type TeacherQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER'

export interface TeacherExamFile {
  fileName: string
  contentType: string | null
  size: number | null
  pageCount: number
  uploadedAt: string | null
  url: string | null
  expiresAt: string | null
}

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
  examFile: TeacherExamFile | null
  totalMarks: number | null
  marksSum: number | null
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
  /** Legacy field; current BE TeacherQuestionResponse does not return it. */
  difficulty?: string | null
  categoryId: string | null
  categoryName: string | null
  explanation: string | null
  imageUrl: string | null
  sourcePage: number | null
  /** What the question is worth: its own marks when marksFixed, else its equal share of the quiz total. */
  marks: number | null
  marksFixed: boolean
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
  latestJob: ExtractionJob | null
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
  difficulty?: string
  questionText: string
  questionType?: TeacherQuestionType
  explanation?: string
  imageUrl?: string
  categoryId?: string
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

export function isDefiniteTeacherQuestionWriteRejection(error: unknown) {
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
    (question.difficulty === undefined || isNullableString(question.difficulty)) && isNullableString(question.categoryId) &&
    isNullableString(question.categoryName) && isNullableString(question.explanation) &&
    isNullableString(question.imageUrl) && isNullableNumber(question.sourcePage) &&
    isNullableNumber(question.marks) && typeof question.marksFixed === 'boolean' &&
    typeof question.needsReview === 'boolean' &&
    isNullableString(question.reviewNote) && typeof question.correctLabels === 'string' &&
    Array.isArray(question.options) && question.options.every((option) => {
      if (!option || typeof option !== 'object') return false
      const item = option as Record<string, unknown>
      return typeof item.id === 'string' && Boolean(item.id.trim()) &&
        typeof item.sequence === 'number' && typeof item.label === 'string' &&
        typeof item.text === 'string' && typeof item.correct === 'boolean'
    })
}

export async function requireData<T>(path: string, fallback: string, options?: Parameters<typeof request<T>>[1]): Promise<T> {
  if (options?.method && options.method !== 'GET') assertQuizWriteAccess()
  const response = await request<T>(path, { auth: true, guardIdentity: true, ...options })
  if (!response.data) throw new Error(fallback)
  return response.data
}

// Check again for every write, including later requests of a multi-step save after
// an active-role switch. No grants are inferred from the /teacher URL or scopes
// belonging to another role. BE remains authoritative for entity/state checks.
export function assertQuizWriteAccess(): void {
  const role = accessTokenRole()
  if (!role || !Object.hasOwn(ROLE_PERMISSIONS, role) || !can(role as UserRole, 'QUIZ_WRITE')) {
    throw new ApiError('Vai trò đang dùng không được quản lý bài kiểm tra.', 403)
  }
}

export const quizPath = (quizId?: string) =>
  quizId ? `/api/v1/teacher/quizzes/${encodeURIComponent(quizId)}` : '/api/v1/teacher/quizzes'

export function getTeacherQuizzes(courseId?: string): Promise<TeacherQuizRecord[]> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
  return requireData(`${quizPath()}${query}`, 'Không thể tải danh sách bài kiểm tra.')
}

export function getTeacherQuiz(quizId: string): Promise<TeacherQuizEditor> {
  return requireData(quizPath(quizId), 'Không thể tải nội dung bài kiểm tra.')
}

export interface TeacherQuizImportResult {
  sectionsAdded: number
  groupsAdded: number
  questionsAdded: number
  needsReview: number
  missingAnswers: number
  answerKeySource: string | null
  warnings: string[] | null
  totalQuestions: number
}

export interface TeacherQuizExtractionJob {
  id: string
  quizId: string
  kind: 'EXAM_FILE' | 'GENERATE'
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'APPLIED'
  progress: string | null
  error: string | null
  questionCount: number | null
  needsReviewCount: number | null
  missingAnswerCount: number | null
  warnings: string[] | null
  result: {
    sections: Array<{ key: string; title: string }>
    groups: Array<{ key: string; instruction: string | null; passage: string | null; imageUrl: string | null }>
    questions: Array<{ number: number; text: string; options: Array<{ label: string; text: string; correct: boolean }>; explanation: string | null; imageUrl: string | null; reviewNote: string | null; sourcePage: number | null }>
    warnings: string[]
    missingQuestions: number[]
  } | null
}

export interface TeacherQuizWithFileResult {
  quiz: TeacherQuizRecord
  imported: TeacherQuizImportResult | null
  aiJob: TeacherQuizExtractionJob | null
  warnings: string[]
}

export class AmbiguousQuizFileCreateError extends Error {
  constructor(public readonly quizId: string | null = null) {
    super('Chưa xác nhận được kết quả tạo đề. Không gửi lại file; hãy kiểm tra danh sách đề trước khi tạo mới.')
    this.name = 'AmbiguousQuizFileCreateError'
  }
}

function validImportResult(result: TeacherQuizImportResult) {
  return result && [result.sectionsAdded, result.groupsAdded, result.questionsAdded,
    result.needsReview, result.missingAnswers, result.totalQuestions].every(value => Number.isInteger(value) && value >= 0) &&
    (result.warnings === null || (Array.isArray(result.warnings) && result.warnings.every(warning => typeof warning === 'string')))
}

export async function createTeacherQuizWithFile(payload: CreateTeacherQuizRequest, file: File): Promise<TeacherQuizWithFileResult> {
  assertQuizWriteAccess()
  if (!/\.(pdf|docx|txt|md)$/i.test(file.name) || !file.size) throw new ApiError('Chọn file PDF, DOCX, TXT hoặc MD có nội dung.', 400)
  const body = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) body.append(key, String(value))
  }
  body.append('file', file)
  body.append('read', 'true')
  let result: TeacherQuizWithFileResult
  try {
    result = await requireData(`${quizPath()}/with-file`, 'Không thể xác nhận kết quả tạo đề.', { method: 'POST', body, timeoutMs: 120_000 })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousQuizFileCreateError()
  }
  const quizId = typeof result.quiz?.id === 'string' && result.quiz.id.trim() ? result.quiz.id : null
  if (!quizId || result.quiz.type !== payload.type || result.quiz.status !== 'DRAFT' ||
    !Array.isArray(result.warnings) || result.warnings.some(item => typeof item !== 'string') ||
    (result.imported !== null && !validImportResult(result.imported)) ||
    (result.aiJob !== null && (!result.aiJob?.id || result.aiJob.quizId !== quizId))) {
    throw new AmbiguousQuizFileCreateError(quizId)
  }
  return result
}

export async function getTeacherQuizExtractionJob(quizId: string, jobId: string): Promise<TeacherQuizExtractionJob> {
  const job = await requireData<TeacherQuizExtractionJob>(`${quizPath(quizId)}/ai/jobs/${encodeURIComponent(jobId)}`, 'Không thể tải tiến trình đọc PDF.')
  if (job.id !== jobId || job.quizId !== quizId || !['PENDING', 'RUNNING', 'DONE', 'FAILED', 'APPLIED'].includes(job.status) ||
    (job.result && (!Array.isArray(job.result.sections) || !Array.isArray(job.result.groups) || !Array.isArray(job.result.questions) ||
      job.result.questions.some(q => typeof q.text !== 'string' || !Array.isArray(q.options) || q.options.some(o => typeof o.text !== 'string' || typeof o.correct !== 'boolean'))))) {
    throw new Error('Tiến trình đọc đề trả dữ liệu không hợp lệ.')
  }
  return job
}

export async function applyTeacherQuizExtraction(quizId: string, jobId: string): Promise<TeacherQuizImportResult> {
  assertQuizWriteAccess()
  const [{ quiz }, job] = await Promise.all([getTeacherQuiz(quizId), getTeacherQuizExtractionJob(quizId, jobId)])
  if (quiz.status !== 'DRAFT' || quiz.locked || quiz.attemptCount > 0 || job.status !== 'DONE') {
    throw new ApiError('Chỉ áp dụng kết quả chưa dùng vào bản nháp chưa có lượt làm. Hãy tải lại để kiểm tra.', 409)
  }
  if (!job.result?.questions.length || job.result.questions.some(q => q.options.length < 2 || q.options.filter(o => o.correct).length > 1)) {
    throw new ApiError('Kết quả có câu hỏi ngoài dạng trắc nghiệm một đáp án. Chưa thể áp dụng trong luồng này.', 400)
  }
  try {
    // Preserve existing questions; never rely on the BE's REPLACE default.
    const result = await requireData<TeacherQuizImportResult>(`${quizPath(quizId)}/ai/jobs/${encodeURIComponent(jobId)}/apply`, 'Không thể xác nhận kết quả áp dụng.', {
      method: 'POST', body: { mode: quiz.questionCount > 0 ? 'APPEND' : 'REPLACE' }, timeoutMs: 120_000,
    })
    if (!validImportResult(result)) throw new AmbiguousQuizImportError()
    return result
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousQuizImportError()
  }
}

export class AmbiguousQuizImportError extends Error {
  constructor() {
    super('Chưa xác nhận được kết quả nhập. Hãy tải lại bài để kiểm tra trước khi nhập thêm; không gửi lại file ngay.')
    this.name = 'AmbiguousQuizImportError'
  }
}

export async function importTeacherQuizFile(quizId: string, file: File): Promise<TeacherQuizImportResult> {
  assertQuizWriteAccess()
  if (!/\.(docx|txt|md)$/i.test(file.name) || file.size === 0) {
    throw new ApiError('Chọn file .docx, .txt hoặc .md có nội dung câu hỏi.', 400)
  }
  // Recheck state on the server: another user may have published the draft or started an attempt.
  const { quiz } = await getTeacherQuiz(quizId)
  if (quiz.status !== 'DRAFT' || quiz.locked || quiz.attemptCount > 0) {
    throw new ApiError('Chỉ nhập câu hỏi vào bản nháp chưa có lượt làm. Hãy tải lại bài để kiểm tra trạng thái.', 409)
  }
  const body = new FormData()
  body.append('file', file)
  let result: TeacherQuizImportResult
  try {
    result = await requireData(`${quizPath(quizId)}/import/file?mode=APPEND`, 'Không thể xác nhận kết quả nhập.', {
      method: 'POST', body, timeoutMs: 120_000,
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) throw error
    throw new AmbiguousQuizImportError()
  }
  if (!validImportResult(result)) {
    throw new AmbiguousQuizImportError()
  }
  return result
}

export function createTeacherQuiz(payload: CreateTeacherQuizRequest): Promise<TeacherQuizRecord> {
  return requireData(quizPath(), 'Không thể tạo bài kiểm tra.', { method: 'POST', body: payload })
}

export function updateTeacherQuiz(quizId: string, payload: UpdateTeacherQuizRequest): Promise<TeacherQuizRecord> {
  return requireData(quizPath(quizId), 'Không thể lưu thông tin bài kiểm tra.', { method: 'PUT', body: payload })
}

export async function deleteTeacherQuiz(quizId: string): Promise<void> {
  assertQuizWriteAccess()
  await request(quizPath(quizId), { method: 'DELETE', auth: true, guardIdentity: true })
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
  assertQuizWriteAccess()
  let response: ApiResponse<unknown>
  try {
    response = await request(`/api/v1/teacher/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      auth: true,
      guardIdentity: true,
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

export interface TeacherAttemptReviewOption {
  optionId: string
  optionText: string
  correct: boolean
  sequence: number
}

export interface TeacherAttemptReviewQuestion {
  questionId: string
  sequence: number
  questionText: string
  imageUrl: string | null
  categoryName: string | null
  explanation: string | null
  options: TeacherAttemptReviewOption[]
  selectedOptionId: string | null
  answered: boolean
  correct: boolean
}

export interface TeacherAttemptReview {
  attemptId: string
  quizId: string
  quizTitle: string
  totalQuestions: number
  correctCount: number
  overallPercentage: number
  questions: TeacherAttemptReviewQuestion[]
}

export function getTeacherAttemptReview(attemptId: string): Promise<TeacherAttemptReview> {
  return requireData(
    `/api/v1/teacher/attempts/${encodeURIComponent(attemptId)}`,
    'Không thể tải chi tiết bài làm.'
  )
}
