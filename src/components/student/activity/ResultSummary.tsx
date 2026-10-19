import { RotateCcw } from '../../console/icons'
import { cva } from 'class-variance-authority'
import StatusBadge from '../../ui/StatusBadge'
import ActivityButton from './ActivityButton'
import { ActivityCard } from './ActivityCard'
import type { ActivityAttempt } from './types'

export type ScoreTone = 'success' | 'blue' | 'warning' | 'danger'

// Colour of the big "best score" number.
const scoreNumber = cva('text-[48px] leading-none font-bold max-[760px]:text-[38px]', {
  variants: {
    tone: {
      success: 'text-success',
      blue: 'text-primary-text',
      warning: 'text-warning',
      danger: 'text-danger',
    },
  },
})

interface ResultSummaryCardProps {
  label: string
  title: string
  meta?: string
  attempt: ActivityAttempt
  bestScore: number
  bestTotal: number
  scoreTone: ScoreTone
  submittedDate: string
  onReview: () => void
  onRetry: () => void
}

const metaValue = 'font-bold'

// Result summary keeps attempt facts and the best score clearly separated.
function ResultSummaryCard({
  label,
  title,
  meta,
  attempt,
  bestScore,
  bestTotal,
  scoreTone,
  submittedDate,
  onReview,
  onRetry,
}: ResultSummaryCardProps) {
  return (
    <ActivityCard className="relative grid grid-cols-[minmax(0,1fr)_280px] items-center gap-[34px] overflow-hidden bg-surface-brand px-8 py-8 max-[760px]:grid-cols-1 max-[760px]:gap-5 max-[760px]:px-5 max-[760px]:py-6">
      <div className="relative z-1 grid min-w-0 justify-items-start gap-2.5">
        <StatusBadge tone="primary" size="sm" className="bg-surface px-3 py-1 text-xs uppercase">
          {label}
        </StatusBadge>
        <h1 className="text-[26px] leading-[1.25] font-bold tracking-[-0.3px] text-text-heading max-[760px]:text-[22px]">
          {label} · {title}
        </h1>
        {meta && <p className="text-sm font-semibold text-text-secondary">{meta}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-bold text-text-body">
          <span>
            Lần làm <b className={`${metaValue} text-primary-text`}>{attempt.attemptNumber}</b>
          </span>
          <i className="size-1 rounded-full bg-line" />
          <span>
            Thời gian <b className={`${metaValue} text-assess`}>{attempt.duration}</b>
          </span>
          <i className="size-1 rounded-full bg-line" />
          <span>
            Ngày nộp <b className={`${metaValue} text-practice`}>{submittedDate}</b>
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap justify-start gap-2 max-[760px]:w-full max-[760px]:flex-col max-[760px]:items-stretch">
          <ActivityButton tone="primary" block onClick={onReview}>
            Xem lại bài làm
          </ActivityButton>
          <ActivityButton tone="soft" block onClick={onRetry}>
            <RotateCcw size={16} />
            Làm lại
          </ActivityButton>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-6 text-center">
        <span className="text-sm font-semibold text-text-body">Điểm cao nhất</span>
        <h2 className={`${scoreNumber({ tone: scoreTone })} mt-4 tabular-nums`}>
          <b>{bestScore}</b>{' '}
          <small className="text-xl font-semibold text-text-secondary">/ {bestTotal}</small>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Điểm được cập nhật theo kết quả cao nhất.
        </p>
      </div>
    </ActivityCard>
  )
}

export default ResultSummaryCard

interface AttemptHistoryProps {
  items: (ActivityAttempt & { submittedLabel: string })[]
  onOpen: (attempt: ActivityAttempt) => void
}

// "Lịch sử làm bài": one row per attempt.
export function AttemptHistory({ items, onOpen }: AttemptHistoryProps) {
  return (
    <section className="grid gap-2.5">
      <h2 className="text-xl font-bold text-text-heading">Lịch sử làm bài</h2>
      <div className="grid gap-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_86px_150px_auto] items-center gap-3 rounded-xl border border-line-card bg-surface p-3.5 shadow-card-soft max-[760px]:grid-cols-1"
          >
            <div className="grid gap-[3px]">
              <strong className="text-base font-semibold text-text-heading">
                Lần {item.attemptNumber}
              </strong>
              <span className="text-sm font-semibold text-text-secondary">
                {item.score}/{item.totalQuestions} · {item.percentage}%
              </span>
            </div>
            <span className="text-sm font-semibold text-text-secondary">{item.duration}</span>
            <time className="text-sm font-semibold text-text-secondary">{item.submittedLabel}</time>
            <ActivityButton weight="extrabold" block onClick={() => onOpen(item)}>
              Xem lại
            </ActivityButton>
          </article>
        ))}
      </div>
    </section>
  )
}
