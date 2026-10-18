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
        'dashboard-stat relative block h-full rounded-2xl border border-card-border bg-card-background p-6 text-sm font-medium text-text-tertiary',
        className
      )}
    >
      {Icon && (
        <span className={cn('mb-5 grid size-10 place-items-center rounded-xl', ICON_TONES[tone])}>
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      <b className="mb-1 block text-3xl leading-10 font-bold tracking-tight tabular-nums text-text-primary">{value}</b>
      {label}
    </span>
  )
}

export default StatCard
