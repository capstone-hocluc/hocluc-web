import { cva } from 'class-variance-authority'
import { ClipboardCheck } from '../../console/icons'
import StatusBadge from '../../ui/StatusBadge'

// Pastel cover of the practice-test card, keyed by the mock's `tone`.
const cover = cva(
  'mb-4 flex h-[104px] w-full items-start justify-between gap-3 rounded-2xl p-4 text-left',
  {
    variants: {
      tone: {
        red: 'bg-live-soft text-live',
        pink: 'bg-[#fdebf1] text-[#b94266]',
        rose: 'bg-[#fdebf5] text-[#a8326c]',
        blue: 'bg-primary-soft text-primary-text',
        green: 'bg-practice-soft text-practice',
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

// "Luyện đề" card: pastel cover, meta, badge / score and status.
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
      className="flex min-w-0 cursor-pointer flex-col rounded-2xl border border-line-card bg-surface p-4 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      onClick={onOpen}
    >
      <div className={cover({ tone: tone as CoverTone })}>
        <small className="rounded-full bg-surface px-3 py-1 text-xs font-extrabold">
          Đánh giá năng lực
        </small>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface">
          <ClipboardCheck size={20} />
        </span>
      </div>
      <h4 className="mb-1.5 text-[17px] leading-[1.35] font-bold text-text-heading">{title}</h4>
      <p className="mb-4 text-sm text-text-body">
        {questions} · {duration}
      </p>
      <div className="mt-auto flex min-w-0 items-center justify-between gap-3">
        <StatusBadge tone="danger" size="sm" className="shrink-0 px-3 py-1 text-xs">
          {badge}
        </StatusBadge>
        <small className="min-w-0 text-right text-sm leading-[1.25] font-extrabold text-primary-text">
          {score}
        </small>
      </div>
      <small className="mt-2 block text-[13px] leading-[1.35] font-bold text-text-body">
        {status}
      </small>
    </button>
  )
}

export default PracticeTestCard
