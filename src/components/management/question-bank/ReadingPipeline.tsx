import type { ReactNode } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Clock } from '../../console/icons'
import { cn } from '../../../lib/cn'
import type { BankIngestStage, BankStreamPart } from '../../../services/bankReadingStream'
import { STAGE_LABELS, partName, type LiveReading } from './live-reading'

type StepState = 'waiting' | 'active' | 'done' | 'failed' | 'skipped'
const ORDER: BankIngestStage[] = ['QUEUED', 'STRUCTURE', 'QUESTIONS', 'REVIEW', 'FIGURES', 'KEY', 'STORE', 'LABEL', 'DONE']
const STATE_LABEL: Record<StepState, string> = { waiting: 'Chờ', active: 'Đang làm', done: 'Xong', failed: 'Lỗi', skipped: 'Chưa gán nhãn' }
// one word each, so the nine steps fit on one line above the paper; the full name is the tooltip
const SHORT_LABELS: Partial<Record<BankIngestStage, string>> = { QUEUED: 'Chờ', STRUCTURE: 'Cấu trúc', QUESTIONS: 'Câu hỏi', REVIEW: 'Soát', FIGURES: 'Hình', KEY: 'Đáp án', STORE: 'Lưu', LABEL: 'Gán nhãn', DONE: 'Xong' }

function stageState(stage: BankIngestStage, reading: LiveReading): StepState {
  if (reading.status === 'DONE') return 'done'
  const at = reading.stage === 'KEY_TABLE' ? ORDER.indexOf('QUESTIONS') : reading.stage ? ORDER.indexOf(reading.stage) : -1
  const mine = ORDER.indexOf(stage)
  if (at < 0) return 'waiting'
  if (mine < at) return 'done'
  if (mine > at) return 'waiting'
  return reading.status === 'FAILED' ? 'failed' : 'active'
}

function partDetail(part: BankStreamPart) {
  const pages = part.firstPage === part.lastPage ? `trang ${part.firstPage}` : `trang ${part.firstPage}–${part.lastPage}`
  if (part.status === 'DONE') return `${pages} · ${part.questions} câu`
  if (part.status === 'READING') return `${pages} · ${part.text.length.toLocaleString('vi-VN')} ký tự${part.attempt > 1 ? ` · lần ${part.attempt}` : ''}`
  return pages
}

/** The ingest steps in one compact row: a thin bar per step, its state and, where it has one, a count. */
export function ReadingSteps({ reading, questionCount, unlabelledCount }: {
  reading: LiveReading
  questionCount: number
  unlabelledCount: number
}) {
  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-x-2 gap-y-2 p-0 sm:grid-cols-9" aria-label="Các bước nạp đề">
      {ORDER.map(stage => {
        const state = stage === 'LABEL' && reading.status === 'DONE' && unlabelledCount > 0 ? 'skipped' : stageState(stage, reading)
        const share = state === 'done' ? 100 : stage === 'LABEL' && reading.labelTotal > 0 ? Math.min(100, reading.labelled / reading.labelTotal * 100) : 0
        const Icon = state === 'done' ? CheckCircle2 : state === 'failed' ? AlertCircle : state === 'active' ? Loader2 : Clock
        const count = stage === 'LABEL' && reading.labelTotal > 0 ? `${reading.labelled}/${reading.labelTotal}`
          : stage === 'REVIEW' && reading.reviewTotal > 0 ? `${reading.reviewed}/${reading.reviewTotal}`
            : stage === 'QUESTIONS' && questionCount > 0 ? `${questionCount}` : ''
        return (
          <li key={stage} className="min-w-0" title={`${STAGE_LABELS[stage]} · ${STATE_LABEL[state]}`}>
            <div className="h-1 overflow-hidden rounded-full bg-text-tertiary/20">
              <div className={cn('h-full rounded-full transition-all', state === 'done' && 'bg-emerald-500', state === 'active' && 'bg-sky-400', state === 'failed' && 'bg-badge-error-text', state === 'active' && share === 0 && 'animate-pulse')} style={{ width: state === 'failed' ? '100%' : state === 'active' && share === 0 ? '33%' : `${share}%` }} />
            </div>
            <div className="mt-1 flex items-center gap-1">
              <Icon aria-hidden="true" size={13} className={cn('shrink-0', state === 'done' && 'text-emerald-500', state === 'active' && 'animate-spin text-sky-500', state === 'failed' && 'text-badge-error-text', (state === 'waiting' || state === 'skipped') && 'text-text-tertiary')} />
              <span className="min-w-0 truncate text-xs text-text-primary">{SHORT_LABELS[stage]}</span>
              {count && <span className="shrink-0 text-xs text-text-tertiary tabular-nums">{count}</span>}
              <span className="sr-only">{STATE_LABEL[state]}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The parts the AI reads in parallel, then whatever the screen adds below (progress, errors, the log). */
export default function ReadingPipeline({ reading, followedId, onFollowPart, children }: {
  reading: LiveReading
  followedId: string | null
  onFollowPart: (partId: string) => void
  children?: ReactNode
}) {
  return (
    <div aria-label="Pipeline nạp đề">
      {reading.parts.length > 0 && (
        <details open className="rounded-xl border border-card-border bg-card-background p-3">
          <summary className="cursor-pointer text-sm font-medium text-text-primary">Các phần đọc lần lượt ({reading.parts.length})</summary>
          <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {reading.parts.map(part => (
              <li key={part.id}>
                <button type="button" aria-pressed={part.id === followedId} onClick={() => onFollowPart(part.id)} className={cn('w-full cursor-pointer rounded-lg border p-2 text-left text-xs', part.id === followedId ? 'border-brand-500 bg-badge-blue-background' : 'border-card-border bg-transparent hover:border-brand-500')}>
                  <span className="block font-medium text-text-primary">{partName(part)}</span>
                  <span className="mt-1 block text-text-secondary">{partDetail(part)} · {part.status === 'DONE' ? 'Xong' : part.status === 'READING' ? reading.status === 'FAILED' ? 'Lỗi' : 'Đang đọc' : 'Chờ'}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {children}
    </div>
  )
}
