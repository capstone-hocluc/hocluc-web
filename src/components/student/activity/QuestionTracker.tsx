import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { ActivityCard, ActivityCardTitle } from './ActivityCard'

// Number and action buttons inside the tracker share one look; `state` recolours them.
const trackerButton = cva(
  'min-h-10 cursor-pointer rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  {
    variants: {
      state: {
        idle: 'border-line bg-surface text-text-secondary hover:bg-surface-brand',
        active: 'border-primary-bright bg-primary-soft text-primary-text',
        answered: 'border-line-practice bg-practice-soft text-practice',
        answeredActive: 'border-primary bg-primary text-white',
        reviewCorrect: 'border-line-practice bg-practice-soft text-practice',
        reviewIncorrect: 'border-danger-line bg-danger-soft text-danger',
        reviewUnanswered: 'border-line bg-lock-soft text-text-secondary',
      },
    },
    defaultVariants: { state: 'idle' },
  }
)

export type TrackerButtonState = NonNullable<Parameters<typeof trackerButton>[0]>['state']

const legendDot = {
  none: 'border-line bg-surface-tint',
  answered: 'border-success bg-success',
  correct: 'border-success bg-success',
  incorrect: 'border-danger bg-danger',
  unanswered: 'border-line bg-line',
}

interface QuestionTrackerProps {
  title: string
  stats: { label: string; value: ReactNode }[]
  numbers: { number: number; state: TrackerButtonState; onClick: () => void }[]
  legend: { label: string; dot?: keyof typeof legendDot }[]
  actionLabel: string
  onAction: () => void
}

// Sticky sidebar of a test: stats, question-number grid, legend and the main action.
function QuestionTracker({
  title,
  stats,
  numbers,
  legend,
  actionLabel,
  onAction,
}: QuestionTrackerProps) {
  return (
    <ActivityCard as="aside" className="sticky top-3.5 grid gap-3.5 self-start max-[760px]:static">
      <ActivityCardTitle className="mb-0">{title}</ActivityCardTitle>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <p key={stat.label} className="rounded-xl bg-surface-brand p-3">
            <span className="block text-xs font-semibold tracking-[0.04em] text-text-secondary uppercase">
              {stat.label}
            </span>
            <strong className="mt-1 block text-lg font-bold text-text-heading">{stat.value}</strong>
          </p>
        ))}
      </div>
      <div className="grid max-h-[min(420px,52vh)] grid-cols-6 gap-2 app-scroll overflow-y-auto p-0.5">
        {numbers.map((item) => (
          <button
            key={item.number}
            type="button"
            className={trackerButton({ state: item.state })}
            onClick={item.onClick}
          >
            {item.number}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-bold text-text-secondary">
        {legend.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <i className={`size-3 rounded-full border ${legendDot[item.dot ?? 'none']}`} />{' '}
            {item.label}
          </span>
        ))}
      </div>
      <button type="button" className={trackerButton()} onClick={onAction}>
        {actionLabel}
      </button>
    </ActivityCard>
  )
}

export default QuestionTracker
