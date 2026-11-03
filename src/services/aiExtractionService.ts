import { ApiError } from '../lib/api'
import { assertQuizWriteAccess, requireData } from './teacherQuizService'
export type ExtractedFigureSource = 'IMAGE' | 'DRAWING' | 'ESTIMATE'

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
  /** The question bank's check of the reading by a second model. */
  review?: QuestionReview | null
}

export type QuestionReviewStatus = 'PENDING' | 'AGREED' | 'REREAD' | 'ACCEPTED' | 'NEEDS_HUMAN' | 'SKIPPED'

export interface QuestionReview {
  status: QuestionReviewStatus
  /** Readings again so far. */
  rereads: number
  /** Why a person has to look, or why it was kept anyway. */
  note: string | null
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
