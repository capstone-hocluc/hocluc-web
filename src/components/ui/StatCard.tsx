import type { LucideIcon } from '../console/icons'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Summary tile used across admin and operations screens: optional icon tile,
// big number, then label. Tailwind utilities only.
type StatTone = 'info' | 'success' | 'warning' | 'danger'

const ICON_TONES: Record<StatTone, string> = {
  info: 'bg-badge-info-bg text-badge-info-text',
  success: 'bg-badge-success-bg text-badge-success-text',
  warning: 'bg-badge-warning-bg text-badge-warning-text',
  danger: 'bg-badge-danger-bg text-badge-danger-text',
}

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
  tone?: StatTone
  className?: string
}

function StatCard({ label, value, icon: Icon, tone = 'info', className }: StatCardProps) {
  return (
    <span
      className={cn(
        'dashboard-stat relative flex h-full items-center gap-3 rounded-2xl border border-card-border bg-card-background p-4 text-sm font-medium text-text-tertiary',
        className
      )}
    >
      {Icon && (
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', ICON_TONES[tone])}>
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <b className="block text-2xl leading-8 font-bold tracking-tight tabular-nums text-text-primary">{value}</b>
        {label}
      </span>
    </span>
  )
}

export default StatCard
