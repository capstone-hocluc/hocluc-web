import type { StatusTone } from '../../console/status'
import type {
  ExamSession,
  ExamSessionSummary,
  ExamYearStatus,
} from '../../../services/examYearService'
import { EMPTY } from './crud-format'

export const EXAM_YEAR_STATUS_LABELS: Record<ExamYearStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Năm hiện tại',
  CLOSED: 'Đã đóng',
}

export const EXAM_YEAR_STATUS_TONES: Record<ExamYearStatus, StatusTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  CLOSED: 'warning',
}

/** A yyyy-MM-dd date as 30/03/2027, read as written (no time-zone shift). */
export function formatExamDate(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : EMPTY
}

/** "30/03/2027" or "30/03/2027 – 31/03/2027" for a sitting over several days. */
export function examDateRange(session: Pick<ExamSession, 'examStartDate' | 'examEndDate'>): string {
  const start = formatExamDate(session.examStartDate)
  if (!session.examEndDate || session.examEndDate === session.examStartDate) return start
  return `${start} – ${formatExamDate(session.examEndDate)}`
}

export function registrationRange(session: ExamSession): string {
  if (!session.registrationOpenDate && !session.registrationCloseDate) return EMPTY
  return `${formatExamDate(session.registrationOpenDate)} – ${formatExamDate(session.registrationCloseDate)}`
}

/** "Năm thi 2026-2027 · Đợt 1 · 30/03/2027 (dự kiến)" for pickers and course pages. */
export function examSessionLabel(session: ExamSessionSummary): string {
  return `${session.examYearName} · ${session.name} · ${examDateRange(session)}${session.dateConfirmed ? '' : ' (dự kiến)'}`
}
