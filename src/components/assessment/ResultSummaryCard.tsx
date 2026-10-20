import type { ReactNode } from 'react'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'

interface ResultSummaryCardProps {
  eyebrow: string
  title: ReactNode
  correctCount: number
  totalQuestions: number
  percentage: number
  /** Extra rows under the score (placement stats, strengths...). */
  children?: ReactNode
}

// Headline of a result: kind of assessment, title, "x/y correct" and the percentage as a ring.
// Shared by the course-quiz review and the placement result.
function ResultSummaryCard({
  eyebrow,
  title,
  correctCount,
  totalQuestions,
  percentage,
  children,
}: ResultSummaryCardProps) {
  const clamped = Math.max(0, Math.min(100, percentage))

  return (
    <Card as="section" variant="panel" padding="none" radius="xl" className="p-6 max-[640px]:p-5">
      <div className="flex flex-wrap items-center gap-6 max-[640px]:flex-col max-[640px]:items-start">
        <div
          className="grid size-[132px] shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-primary) ${clamped * 3.6}deg, var(--color-line-soft) 0)`,
          }}
        >
          <div className="grid size-[104px] place-items-center rounded-full bg-surface">
            <span className="text-[32px] leading-none font-bold text-text-heading">
              {percentage}
              <span className="text-lg text-primary-text">%</span>
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <StatusBadge
            tone="assessment"
            size="sm"
            className="self-start px-3 py-1 text-xs font-semibold tracking-[0.04em] uppercase"
          >
            {eyebrow}
          </StatusBadge>
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.3px] text-text-heading max-[640px]:text-[22px]">
            {title}
          </h1>
          <p className="text-base text-text-body">
            <strong className="text-xl font-bold text-text-heading">
              {correctCount}/{totalQuestions}
            </strong>{' '}
            câu đúng
          </p>
        </div>
      </div>
      {children}
    </Card>
  )
}

export default ResultSummaryCard
