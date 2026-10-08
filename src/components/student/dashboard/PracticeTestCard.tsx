import { cva } from 'class-variance-authority'
import StatusBadge from '../../ui/StatusBadge'

// Gradient of the practice-test cover, keyed by the mock's `tone`.
const cover = cva(
  'mb-3.5 flex h-[116px] w-full flex-col justify-start gap-2.5 rounded-lg p-3.5 text-center text-surface',
  {
    variants: {
      tone: {
        red: 'bg-[linear-gradient(160deg,#111,var(--color-streak)_70%,var(--color-streak))]',
        pink: 'bg-[linear-gradient(160deg,var(--color-ink),var(--color-rose)_70%,var(--color-rose))]',
        rose: 'bg-[linear-gradient(160deg,var(--color-ink),var(--color-rose-dark)_70%,var(--color-rose-bright))]',
        blue: 'bg-[linear-gradient(160deg,var(--color-primary-dark),var(--color-link)_72%,var(--color-primary-bright))]',
        green: 'bg-[linear-gradient(160deg,var(--color-ink),var(--color-practice)_72%,var(--color-success))]',
      },
    },
    defaultVariants: { tone: 'red' },
  }
)

type CoverTone = 'red' | 'pink' | 'rose' | 'blue' | 'green'

interface PracticeTestCardProps {
  title: string
  tone: string
  questions: string
  duration: string
  badge: string
  score: string
  status: string
  onOpen: () => void
}

// "Luyện đề" card: coloured cover, meta, badge / score and status.
function PracticeTestCard({
  title,
  tone,
  questions,
  duration,
  badge,
  score,
  status,
  onOpen,
}: PracticeTestCardProps) {
  return (
    <button
      type="button"
      className="flex min-w-0 cursor-pointer flex-col rounded-[14px] border border-line-card bg-white/86 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-line-brand hover:shadow-card-hover"
      onClick={onOpen}
    >
      <div className={cover({ tone: tone as CoverTone })}>
        <small className="font-extrabold">Đánh giá năng lực</small>
        <strong className="mt-1 text-[15px] leading-[1.2]">{title}</strong>
      </div>
      <h4 className="mb-2 text-[15px] leading-[1.35] font-extrabold text-text-dark">{title}</h4>
      <p className="mb-3.5 text-[13px] text-text-body">
        {questions} · {duration}
      </p>
      <div className="mt-auto flex min-w-0 items-center justify-between gap-3">
        <StatusBadge
          tone="danger"
          size="sm"
          className="shrink-0 bg-danger-soft px-3 py-[5px] leading-[1.1] font-extrabold text-danger"
        >
          {badge}
        </StatusBadge>
        <small className="min-w-0 text-right text-[13px] leading-[1.25] font-extrabold text-primary">
          {score}
        </small>
      </div>
      <small className="mt-2 block text-xs leading-[1.35] font-bold text-text-body">{status}</small>
    </button>
  )
}

export default PracticeTestCard
