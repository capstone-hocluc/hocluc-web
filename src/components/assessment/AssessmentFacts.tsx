import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type FactTone = 'primary' | 'assessment' | 'practice' | 'live' | 'danger'

const toneClass: Record<FactTone, string> = {
  primary: 'bg-primary-soft text-primary-text',
  assessment: 'bg-assess-soft text-assess',
  practice: 'bg-practice-soft text-practice',
  live: 'bg-live-soft text-live',
  danger: 'bg-badge-danger-bg text-badge-danger-text',
}

export interface AssessmentFact {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  value: ReactNode
  tone: FactTone
}

// Row of compact fact tiles (icon, label, value) under an assessment title: question count,
// duration, pass mark, attempts. Same pastel tile language as the landing score table.
function AssessmentFacts({ facts, className }: { facts: AssessmentFact[]; className?: string }) {
  return (
    <ul className={cn('grid w-full grid-cols-2 gap-3', className)}>
      {facts.map(({ icon: Icon, label, value, tone }) => (
        <li
          key={label}
          className="flex min-w-0 items-center gap-3 rounded-xl border border-line-card bg-surface px-3.5 py-3 shadow-card-soft"
        >
          <span
            className={cn('grid size-10 shrink-0 place-items-center rounded-xl', toneClass[tone])}
          >
            <Icon size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-bold text-text-secondary">{label}</span>
            <strong className="text-lg leading-tight font-bold text-text-heading">{value}</strong>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default AssessmentFacts
