import { RotateCcw } from '../../console/icons'
import { cva } from 'class-variance-authority'
import StatusBadge from '../../ui/StatusBadge'
import ActivityButton from './ActivityButton'
import { ActivityCard } from './ActivityCard'
import type { ActivityAttempt } from './types'

export type ScoreTone = 'success' | 'blue' | 'warning' | 'danger'

// Colour of the big "best score" number.
const scoreNumber = cva('text-[48px] leading-none font-black max-[760px]:text-[38px]', {
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

const metaValue = 'font-black'

// Result hero: attempt facts + actions on the left, Nam celebrating the best score on the right.
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
        <h1 className="text-[26px] leading-[1.25] font-black tracking-[-0.3px] text-text-heading max-[760px]:text-[22px]">
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

      <div className="relative z-1 flex min-h-[178px] items-end justify-center pl-[30px] text-center max-[760px]:min-h-[172px] max-[760px]:pl-0">
        <div className="absolute top-2.5 left-0 z-1 max-w-[160px] rounded-2xl border-[1.5px] border-live-line bg-live-tint px-3 py-2.5 text-left text-xs leading-[1.35] font-bold text-text-heading shadow-card-soft after:absolute after:top-[38px] after:-right-[7px] after:size-3 after:rotate-45 after:border-t after:border-r after:border-live-line after:bg-live-tint after:content-[''] max-[760px]:top-2 max-[760px]:left-1/2 max-[760px]:max-w-[142px] max-[760px]:-translate-x-[116%] max-[760px]:after:top-[34px]">
          Điểm được cập nhật
          <br />
          theo kết quả cao nhất
        </div>
        <img
          src="/landing-v2/assets/nam-avatar-interaction.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[-12px] left-[calc(50%+56px)] z-1 size-28 -translate-x-1/2 object-contain drop-shadow-[0_12px_18px_rgba(28, 176, 246,0.14)] max-[760px]:top-[-6px] max-[760px]:left-[calc(50%+48px)] max-[760px]:size-[92px]"
        />
        <div className="relative z-2 grid w-[min(250px,100%)] justify-items-center gap-2.5 rounded-2xl border-[1.5px] border-line-card bg-surface px-5 pt-[15px] pb-6 shadow-card max-[760px]:w-[min(230px,100%)] max-[760px]:pt-[18px]">
          <span className="text-xs font-black tracking-[0.06em] text-text-secondary uppercase">
            Điểm cao nhất
          </span>
          <h2 className={scoreNumber({ tone: scoreTone })}>
            <b>{bestScore}</b>{' '}
            <small className="text-xl font-extrabold text-text-secondary">/ {bestTotal}</small>
          </h2>
        </div>
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
      <h2 className="text-xl font-black text-text-heading">Lịch sử làm bài</h2>
      <div className="grid gap-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_86px_150px_auto] items-center gap-3 rounded-2xl border-[1.5px] border-line-card bg-surface p-3.5 shadow-card-soft max-[760px]:grid-cols-1"
          >
            <div className="grid gap-[3px]">
              <strong className="text-base font-extrabold text-text-heading">
                Lần {item.attemptNumber}
              </strong>
              <span className="text-sm font-semibold text-text-secondary">
                {item.score}/{item.totalQuestions} · {item.percentage}%
              </span>
            </div>
            <span className="text-sm font-semibold text-text-secondary">{item.duration}</span>
            <time className="text-sm font-semibold text-text-secondary">
              {item.submittedLabel}
            </time>
            <ActivityButton weight="extrabold" block onClick={() => onOpen(item)}>
              Xem lại
            </ActivityButton>
          </article>
        ))}
      </div>
    </section>
  )
}
