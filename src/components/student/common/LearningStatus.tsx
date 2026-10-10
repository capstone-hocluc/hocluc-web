import type { ReactNode } from 'react'
import { CheckCircle2, Lock } from '../../console/icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

// Inline status label for a lesson / quiz row. Icons are implied by status.
const status = cva('inline-flex items-center gap-[5px] text-[11.5px] whitespace-nowrap', {
  variants: {
    status: {
      completed: 'font-semibold text-practice',
      current: 'font-extrabold text-primary',
      action: 'font-extrabold text-primary',
      locked: 'font-semibold text-lock',
      idle: 'font-semibold text-text-secondary',
    },
  },
  defaultVariants: { status: 'idle' },
})

export type LearningStatusKind = NonNullable<VariantProps<typeof status>['status']>

interface LearningStatusProps {
  status: LearningStatusKind
  children: ReactNode
  className?: string
}

function LearningStatus({ status: kind, children, className }: LearningStatusProps) {
  return (
    <span className={cn(status({ status: kind }), className)}>
      {kind === 'completed' && <CheckCircle2 size={14} />}
      {kind === 'locked' && <Lock size={13} />}
      {children}
    </span>
  )
}

export default LearningStatus
