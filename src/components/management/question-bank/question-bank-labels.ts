import type { StatusTone } from '../../console/status'
import type { BankAnswerSource, BankLabel } from '../../../services/questionBankService'

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

export const examName = (row: { year: number | null; sourceTitle: string; sourceNumber: number }) =>
  `${row.year ?? row.sourceTitle} · câu ${row.sourceNumber}`

/** A failure as people read it; papers that failed before the server said it this way still hold the technical text. */
export const failureText = (error: string | null) =>
  error && error.includes('valid JSON')
    ? 'AI trả về dữ liệu hỏng khi đọc một phần của đề. Bấm "Nạp lại" để đọc lại.'
    : error
