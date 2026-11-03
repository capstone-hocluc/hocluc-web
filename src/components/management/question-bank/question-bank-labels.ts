import type { StatusTone } from '../../console/status'
import type { BankAnswerSource, BankLabel, BankQuestionStatus, BankDifficulty, BankOrigin } from '../../../services/questionBankService'

/** The five parts of the exam, as the master data prefixes its codes. */
export const PART_LABELS: Record<string, string> = {
  TV: 'Tiếng Việt',
  EN: 'Tiếng Anh',
  MA: 'Toán học',
  LR: 'Logic & số liệu',
  SR: 'Suy luận khoa học',
}

export const ANSWER_SOURCE_LABELS: Record<BankAnswerSource, string> = {
  PUBLISHED_KEY: 'Chính thức',
  REFERENCE_KEY: 'Tham khảo',
  NONE: 'Chưa có đáp án',
}

export const ANSWER_SOURCE_TONES: Record<BankAnswerSource, StatusTone> = {
  PUBLISHED_KEY: 'success',
  REFERENCE_KEY: 'warning',
  NONE: 'danger',
}

export const partLabel = (code: string | null | undefined) => (code ? (PART_LABELS[code] ?? code) : '—')

/** "0.93" for a model's label; a person's label has no confidence. */
export function confidenceText(label: BankLabel | null): string {
  if (!label) return '—'
  return label.confidence === null ? 'Thủ công' : label.confidence.toFixed(2)
}

export const examName = (row: { year: number | null; sourceTitle: string | null; sourceNumber: number | null }) =>
  row.sourceNumber == null ? (row.sourceTitle ?? 'Câu hỏi') : `${row.year ?? row.sourceTitle ?? 'Đề'} · câu ${row.sourceNumber}`

/** A failure as people read it; papers that failed before the server said it this way still hold the technical text. */
export const failureText = (error: string | null) =>
  error && error.includes('valid JSON')
    ? 'AI trả về dữ liệu hỏng khi đọc một phần của đề. Bấm "Nạp lại" để đọc lại.'
    : error

export const BANK_STATUS_LABELS: Record<BankQuestionStatus, string> = { DRAFT: 'Nháp', IN_REVIEW: 'Chờ duyệt', CHANGES_REQUESTED: 'Cần sửa', APPROVED: 'Đã duyệt', RETIRED: 'Ngừng dùng' }
export const BANK_STATUS_TONES: Record<BankQuestionStatus, StatusTone> = { DRAFT: 'neutral', IN_REVIEW: 'warning', CHANGES_REQUESTED: 'danger', APPROVED: 'success', RETIRED: 'neutral' }
export const BANK_DIFFICULTY_LABELS: Record<BankDifficulty, string> = { DE: 'Dễ', TB: 'Trung bình', KHO: 'Khó' }
export const BANK_ORIGIN_LABELS: Record<BankOrigin, string> = { INGEST: 'Nạp đề', QUIZ: 'Từ quiz', MANUAL: 'Tự soạn', AI: 'AI' }
