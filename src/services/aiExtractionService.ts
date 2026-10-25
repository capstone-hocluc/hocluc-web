import { ApiError } from '../lib/api'
import {
  AmbiguousQuizImportError,
  assertQuizWriteAccess,
  isDefiniteTeacherQuestionWriteRejection,
  quizPath,
  requireData,
  type CreateTeacherQuizRequest,
  type TeacherQuizImportResult,
  type TeacherQuizRecord,
} from './teacherQuizService'

export type ExtractionKind = 'EXAM_FILE' | 'GENERATE'
export type ExtractionStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'APPLIED'
export type ExtractedFigureSource = 'IMAGE' | 'DRAWING' | 'ESTIMATE'
export type ApplyMode = 'REPLACE' | 'APPEND'

export interface ExtractedSection {
  key: string
  parentKey: string | null
  title: string
  subject: string | null
  suggestedMinutes: number | null
  fromQuestion: number | null
  toQuestion: number | null
}

export interface ExtractedGroup {
  key: string
  sectionKey: string | null
  instruction: string | null
  passage: string | null
  sourcePage: number | null
  hasFigure: boolean
  figureIds: string[]
  imageUrl: string | null
  fromQuestion: number | null
  toQuestion: number | null
}

export interface ExtractedOption {
  label: string
  text: string
  correct: boolean
}

export interface ExtractedQuestion {
  number: number
  sectionKey: string | null
  groupKey: string | null
  text: string
  options: ExtractedOption[]
  explanation: string | null
  subject: string | null
  sourcePage: number | null
  hasFigure: boolean
  figureIds: string[]
  imageUrl: string | null
  hasFormula: boolean
  /** 0..1: how sure the reading is that text and options are complete and right. */
  confidence: number | null
  reviewNote: string | null
}

/** Left/top/width/height are fractions (0..1) of the page, measured from its top-left corner. */
export interface ExtractedFigure {
  id: string
  page: number
  left: number
  top: number
  width: number
  height: number
  source: ExtractedFigureSource
}

export interface ExtractedExam {
  sections: ExtractedSection[]
  groups: ExtractedGroup[]
  questions: ExtractedQuestion[]
  figures: ExtractedFigure[]
  warnings: string[]
  /** Printed question numbers the reading should hold but does not. */
  missingQuestions: number[]
  answerKeySource: string | null
  pageCount: number | null
}

export interface ExtractionJob {
  id: string
  quizId: string
  kind: ExtractionKind
  status: ExtractionStatus
  provider: string | null
  model: string | null
  progress: string | null
  error: string | null
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
  /** Only present once DONE; an APPLIED job no longer carries it. */
  result: ExtractedExam | null
  questionCount: number | null
  needsReviewCount: number | null
  missingAnswerCount: number | null
  warnings: string[] | null
}

export interface ExtractExamOptions {
  fromPage?: number
  toPage?: number
  hints?: string
}

const EXTRACTION_KINDS = new Set<string>(['EXAM_FILE', 'GENERATE'])
const EXTRACTION_STATUSES = new Set<string>(['PENDING', 'RUNNING', 'DONE', 'FAILED', 'APPLIED'])
const EXAM_FILE_EXTENSIONS = /\.(pdf|docx|txt)$/i
const AI_DISABLED_MESSAGE = 'AI chưa được bật trên máy chủ này.'

const jobPath = (quizId: string, jobId?: string) =>
  `${quizPath(quizId)}/ai/jobs${jobId ? `/${encodeURIComponent(jobId)}` : ''}`

/** A job that will not change any more: poll until this is true. */
export function isTerminalExtractionStatus(status: ExtractionStatus): boolean {
  return status === 'DONE' || status === 'FAILED' || status === 'APPLIED'
}

/** The server answers 503 AI_NOT_CONFIGURED on every /ai/* call when AI_PROVIDER is none or has no credentials. */
export function isAiDisabledError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'AI_NOT_CONFIGURED' || error.status === 503)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNullableNumber(value: unknown) {
  return value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value))
}

function isExtractedExam(value: unknown): value is ExtractedExam {
  if (!value || typeof value !== 'object') return false
  const exam = value as Record<string, unknown>
  return Array.isArray(exam.sections) && Array.isArray(exam.groups) && Array.isArray(exam.questions) &&
    Array.isArray(exam.figures) && isStringArray(exam.warnings) && Array.isArray(exam.missingQuestions) &&
    (exam.questions as unknown[]).every(question => {
      const item = question as Record<string, unknown> | null
      return !!item && typeof item.number === 'number' && typeof item.text === 'string' && Array.isArray(item.options)
    })
}

function isExtractionJob(value: unknown): value is ExtractionJob {
  if (!value || typeof value !== 'object') return false
  const job = value as Record<string, unknown>
  return typeof job.id === 'string' && typeof job.quizId === 'string' &&
    EXTRACTION_KINDS.has(job.kind as string) && EXTRACTION_STATUSES.has(job.status as string) &&
    isNullableNumber(job.questionCount) && isNullableNumber(job.needsReviewCount) &&
    isNullableNumber(job.missingAnswerCount) &&
    (job.warnings === null || job.warnings === undefined || isStringArray(job.warnings)) &&
    (job.result === null || job.result === undefined || isExtractedExam(job.result))
}

function toJob(value: unknown): ExtractionJob {
  if (!isExtractionJob(value)) throw new Error('Máy chủ trả về kết quả đọc đề không đúng định dạng.')
  return { ...value, result: value.result ?? null, warnings: value.warnings ?? null }
}

function describeAiError(error: unknown): never {
  if (isAiDisabledError(error)) throw new ApiError(AI_DISABLED_MESSAGE, 503, undefined, 'AI_NOT_CONFIGURED')
  throw error
}

/** Stores the paper (PDF / DOCX / TXT); the AI reads a PDF. Replaces the file the quiz had. */
export async function uploadExamFile(quizId: string, file: File): Promise<TeacherQuizRecord> {
  assertQuizWriteAccess()
  if (!EXAM_FILE_EXTENSIONS.test(file.name) || file.size === 0) {
    throw new ApiError('Chọn file đề .pdf, .docx hoặc .txt có nội dung.', 400)
  }
  const body = new FormData()
  body.append('file', file)
  return requireData(`${quizPath(quizId)}/exam-file`, 'Không thể tải file đề lên.', {
    method: 'POST', body, timeoutMs: 120_000,
  })
}

export interface CreateWithFileResult {
  quiz: TeacherQuizRecord
  /** The AI job reading the PDF; null when it was only stored (reading off, or AI not configured). */
  aiJob: ExtractionJob | null
  warnings: string[]
}

/** Creates the draft and stores its PDF in one request, optionally handing it to the AI; a bad file leaves no draft behind. */
export async function createTeacherQuizWithFile(
  payload: CreateTeacherQuizRequest,
  file: File,
  options: ExtractExamOptions & { read: boolean },
): Promise<CreateWithFileResult> {
  assertQuizWriteAccess()
  if (!/\.pdf$/i.test(file.name) || file.size === 0) throw new ApiError('Chọn file đề .pdf có nội dung.', 400)
  const { fromPage, toPage } = options
  if (fromPage !== undefined && toPage !== undefined && fromPage > toPage) {
    throw new ApiError('Trang bắt đầu phải nhỏ hơn hoặc bằng trang kết thúc.', 400)
  }
  const body = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') body.append(key, String(value))
  }
  body.append('file', file)
  body.append('read', String(options.read))
  if (options.read) {
    if (fromPage !== undefined) body.append('fromPage', String(fromPage))
    if (toPage !== undefined) body.append('toPage', String(toPage))
    if (options.hints?.trim()) body.append('hints', options.hints.trim())
  }
  const result = await requireData<{ quiz?: TeacherQuizRecord; aiJob?: unknown; warnings?: unknown }>(
    `${quizPath()}/with-file`, 'Không thể tạo đề cùng file.', { method: 'POST', body, timeoutMs: 120_000 },
  )
  if (!result.quiz || typeof result.quiz.id !== 'string') throw new Error('Máy chủ trả về đề vừa tạo không đúng định dạng.')
  return {
    quiz: result.quiz,
    aiJob: result.aiJob ? toJob(result.aiJob) : null,
    warnings: Array.isArray(result.warnings) ? result.warnings.filter((warning): warning is string => typeof warning === 'string') : [],
  }
}

/** Starts reading the uploaded paper in the background; poll {@link getExtractionJob} until it is terminal. */
export async function startExamExtraction(quizId: string, options: ExtractExamOptions = {}): Promise<ExtractionJob> {
  const { fromPage, toPage } = options
  const hints = options.hints?.trim()
  for (const page of [fromPage, toPage]) {
    if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
      throw new ApiError('Số trang phải là số nguyên từ 1 trở lên.', 400)
    }
  }
  if (fromPage !== undefined && toPage !== undefined && fromPage > toPage) {
    throw new ApiError('Trang bắt đầu phải nhỏ hơn hoặc bằng trang kết thúc.', 400)
  }
  try {
    const job = await requireData<unknown>(`${quizPath(quizId)}/ai/extract`, 'Không thể bắt đầu đọc đề.', {
      method: 'POST', body: { fromPage, toPage, hints: hints || undefined },
    })
    return toJob(job)
  } catch (error) {
    return describeAiError(error)
  }
}

export async function listExtractionJobs(quizId: string): Promise<ExtractionJob[]> {
  const jobs = await requireData<unknown>(jobPath(quizId), 'Không thể tải các lần đọc đề.')
  if (!Array.isArray(jobs)) throw new Error('Máy chủ trả về danh sách lần đọc đề không đúng định dạng.')
  return jobs.map(toJob)
}

export async function getExtractionJob(quizId: string, jobId: string): Promise<ExtractionJob> {
  try {
    return toJob(await requireData<unknown>(jobPath(quizId, jobId), 'Không thể tải trạng thái đọc đề.'))
  } catch (error) {
    return describeAiError(error)
  }
}

/**
 * Turns a DONE job's preview into real sections, groups and questions. REPLACE wipes what the quiz holds first, so
 * a reply that never arrived is not retried blindly: the caller must reload the quiz to see whether it landed.
 */
export async function applyExtractionJob(
  quizId: string,
  jobId: string,
  mode: ApplyMode = 'REPLACE',
): Promise<TeacherQuizImportResult> {
  let result: TeacherQuizImportResult
  try {
    result = await requireData(`${jobPath(quizId, jobId)}/apply`, 'Không thể xác nhận kết quả áp dụng.', {
      method: 'POST', body: { mode }, timeoutMs: 120_000,
    })
  } catch (error) {
    if (isDefiniteTeacherQuestionWriteRejection(error)) return describeAiError(error)
    throw new AmbiguousQuizImportError()
  }
  const counts = [result.sectionsAdded, result.groupsAdded, result.questionsAdded,
    result.needsReview, result.missingAnswers, result.totalQuestions]
  if (counts.some(value => !Number.isInteger(value) || value < 0)) throw new AmbiguousQuizImportError()
  return result
}

/** The figure a passage's questions share (PNG / JPG / WEBP), in place of the one it had. */
export async function uploadGroupImage(groupId: string, file: File): Promise<void> {
  assertQuizWriteAccess()
  if (!/\.(png|jpe?g|webp)$/i.test(file.name) || file.size === 0) {
    throw new ApiError('Chọn ảnh .png, .jpg hoặc .webp.', 400)
  }
  const body = new FormData()
  body.append('file', file)
  await requireData(`/api/v1/teacher/groups/${encodeURIComponent(groupId)}/image`, 'Không thể tải ảnh lên.', {
    method: 'POST', body, timeoutMs: 60_000,
  })
}
