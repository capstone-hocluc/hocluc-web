import { request, requestBlob } from '../lib/api'
import type { ExtractedGroup, ExtractedQuestion, ExtractedSection } from './aiExtractionService'
import type { BankIngestStage } from './bankReadingStream'

export const BANK_ANSWER_SOURCES = ['PUBLISHED_KEY', 'REFERENCE_KEY', 'NONE'] as const
export type BankAnswerSource = (typeof BANK_ANSWER_SOURCES)[number]
export type BankLabelSource = 'JEV' | 'MANUAL'
export type BankIngestStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export interface BankLabel {
  partCode: string | null
  domainCode: string | null
  domainNameVi: string | null
  patternCode: string | null
  patternNameVi: string | null
  primarySkillCode: string | null
  microSkillCode: string | null
  /** 0..1, null for a label a person set. */
  confidence: number | null
  needsFigure: number | null
  labelSource: BankLabelSource
}

export interface BankQuestionRow {
  id: string
  sourceCode: string
  sourceTitle: string
  year: number | null
  round: string | null
  sourceNumber: number
  text: string
  hasFigure: boolean
  hasFormula: boolean
  answerSource: BankAnswerSource
  reviewNeeded: boolean
  label: BankLabel | null
}

export interface BankOption {
  label: string
  text: string
  correct: boolean
}

export interface BankQuestionDetail {
  id: string
  sourceCode: string
  sourceTitle: string
  year: number | null
  round: string | null
  sourceNumber: number
  text: string
  passage: string | null
  explanation: string | null
  imageUrl: string | null
  passageImageUrl: string | null
  hasFigure: boolean
  hasFormula: boolean
  answerSource: BankAnswerSource
  reviewNeeded: boolean
  reviewNotes: string | null
  extractConfidence: number | null
  options: BankOption[]
  label: BankLabel | null
}

export interface BankPatternChoice {
  code: string
  nameVi: string
  domainCode: string | null
  domainNameVi: string | null
  partCode: string | null
}

export interface BankStats {
  total: number
  needsReview: number
  unlabelled: number
  byPart: Record<string, number>
  byYear: Record<string, number>
  byAnswerSource: Record<BankAnswerSource, number>
}

export interface BankQuestionPage {
  content: BankQuestionRow[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface BankQuestionQuery {
  q?: string
  partCode?: string
  domainCode?: string
  patternCode?: string
  year?: number
  answerSource?: BankAnswerSource
  needsReview?: boolean
  unlabelled?: boolean
  page?: number
  size?: number
}

const BASE = '/api/v1/question-bank'
const requireData = <T>(response: { data?: T }): T => {
  if (response.data === undefined) throw new Error('Không nhận được dữ liệu ngân hàng câu hỏi.')
  return response.data
}

export async function getBankQuestions(query: BankQuestionQuery = {}): Promise<BankQuestionPage> {
  const params = new URLSearchParams()
  Object.entries({ ...query, page: query.page ?? 0, size: query.size ?? 20 }).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return requireData(await request<BankQuestionPage>(`${BASE}/questions?${params}`, { auth: true }))
}

export async function getBankQuestion(id: string): Promise<BankQuestionDetail> {
  return requireData(await request<BankQuestionDetail>(`${BASE}/questions/${encodeURIComponent(id)}`, { auth: true }))
}

/** Sets the question's pattern by hand; the part, domain and skills follow from it. STAFF and above. */
export async function relabelBankQuestion(id: string, patternCode: string): Promise<BankQuestionDetail> {
  return requireData(
    await request<BankQuestionDetail>(`${BASE}/questions/${encodeURIComponent(id)}/label`, {
      auth: true,
      method: 'PUT',
      body: { patternCode },
    })
  )
}

export async function getBankPatterns(): Promise<BankPatternChoice[]> {
  return requireData(await request<BankPatternChoice[]>(`${BASE}/patterns`, { auth: true }))
}

export async function getBankStats(): Promise<BankStats> {
  return requireData(await request<BankStats>(`${BASE}/stats`, { auth: true }))
}

export interface BankSource {
  id: string
  code: string
  title: string
  year: number | null
  round: string | null
  answerSource: BankAnswerSource
  status: BankIngestStatus
  progress: string | null
  error: string | null
  questionCount: number
  duplicateCount: number
  needsReviewCount: number
  unlabelledCount: number
  finishedAt: string | null
  /** Its files are kept: a failed paper can be read again without uploading them. */
  retryable: boolean
}

export interface BankPaperUpload {
  /** The paper's code; given when loading again a paper already in the list, so its row is reused. */
  code?: string
  exam: File
  key?: File | null
  title?: string
  year?: number
  round?: string
  /** Required with a key: whether the key is the official one or a reference copy. */
  answerSource?: BankAnswerSource
}

export async function getBankSources(): Promise<BankSource[]> {
  return requireData(await request<BankSource[]>(`${BASE}/sources`, { auth: true }))
}

/** A question's band on the page it starts on, top and bottom as fractions of the page height. */
export interface BankPaperRegion {
  number: number
  page: number
  top: number
  bottom: number
}

/** What the AI has read of a paper: the parts read so far while it works, all of it (key applied) once finished. */
export interface BankReading {
  sourceId: string
  status: BankIngestStatus
  /** The step it is on, or failed at; null for a paper loaded before steps were kept. */
  stage: BankIngestStage | null
  progress: string | null
  error: string | null
  finished: boolean
  /** 0 when the paper's PDF was not kept (loaded before pages were stored). */
  pageCount: number
  sections: ExtractedSection[]
  groups: ExtractedGroup[]
  questions: ExtractedQuestion[]
  /** Empty for a scan: its questions are shown by page only. */
  regions: BankPaperRegion[]
}

export async function getBankReading(sourceId: string): Promise<BankReading> {
  return requireData(await request<BankReading>(`${BASE}/sources/${encodeURIComponent(sourceId)}/reading`, { auth: true }))
}

/** One page of the paper as a PNG; the caller owns the blob. */
export function getBankPaperPage(sourceId: string, page: number): Promise<Blob> {
  return requestBlob(`${BASE}/sources/${encodeURIComponent(sourceId)}/pages/${page}`, { auth: true })
}

/** Whether Jev can label now (a key and active Master Data); `reason` says why not. */
export interface BankLabelling {
  ready: boolean
  reason: string | null
}

export async function getBankLabelling(): Promise<BankLabelling> {
  return requireData(await request<BankLabelling>(`${BASE}/labelling`, { auth: true }))
}

/** Has Jev label a finished paper's unlabelled questions (its own tokens only, the paper is not read again). */
export async function labelBankSource(sourceId: string): Promise<BankSource> {
  return requireData(
    await request<BankSource>(`${BASE}/sources/${encodeURIComponent(sourceId)}/label`, { auth: true, method: 'POST' })
  )
}

/** Reads a failed paper again from its kept files; it costs tokens for what was not read yet. STAFF and above. */
export async function retryBankSource(sourceId: string): Promise<BankSource> {
  return requireData(
    await request<BankSource>(`${BASE}/sources/${encodeURIComponent(sourceId)}/retry`, { auth: true, method: 'POST' })
  )
}

/** Queues one paper for the AI to read; it costs tokens. STAFF and above. Follow it through getBankSources. */
export async function importBankPaper(upload: BankPaperUpload): Promise<BankSource> {
  const body = new FormData()
  body.set('exam', upload.exam)
  if (upload.key) body.set('key', upload.key)
  if (upload.code) body.set('code', upload.code)
  if (upload.title) body.set('title', upload.title)
  if (upload.year !== undefined) body.set('year', String(upload.year))
  if (upload.round) body.set('round', upload.round)
  if (upload.key && upload.answerSource) body.set('answerSource', upload.answerSource)
  return requireData(await request<BankSource>(`${BASE}/sources`, { auth: true, method: 'POST', body, timeoutMs: 120_000 }))
}
