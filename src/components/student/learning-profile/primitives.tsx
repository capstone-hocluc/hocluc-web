import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import Progress from '../../ui/Progress'

// The white bordered surface of every Learning Profile block. Padding is set
// by each block (the profile has several).
export function ProfileCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      padding="none"
      className={cn('rounded-2xl border-line-card bg-white/92 shadow-card', className)}
      {...props}
    />
  )
}

interface ProfileHeadingProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  onAction?: () => void
  className?: string
  titleClassName?: string
}

// Dashboard-style heading with an optional action button - distinct from the
// centered landing-page heading at components/common/SectionHeading.jsx.
export function ProfileHeading({
  title,
  subtitle,
  action,
  onAction,
  className,
  titleClassName,
}: ProfileHeadingProps) {
  return (
    <div
      className={cn(
        'mb-3.5 flex items-start justify-between gap-3.5 max-[760px]:flex-col',
        className
      )}
    >
      <div>
        <h2 className={cn('text-[17px] leading-[1.25] font-black text-text-dark', titleClassName)}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-[5px] text-[13px] leading-[1.5] text-text-faint">{subtitle}</p>
        )}
      </div>
      {action && (
        <Button
          appearance="outline"
          className="h-auto min-h-[34px] rounded-[10px] border-line-brand px-3 text-[12px] font-black transition hover:-translate-y-px hover:border-primary hover:bg-surface-brand"
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  )
}

// Small text-style action ("Xem lại phân tích cũ", "Thu gọn").
export function TextButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      appearance="ghost"
      className={cn('h-auto border-0 p-0 text-[12px] font-black hover:bg-transparent', className)}
      {...props}
    />
  )
}

export function ProfileProgress({ value, max = 100 }: { value: number; max?: number }) {
  return <Progress value={Math.round((value / max) * 100)} className="bg-line" />
}

export function TrendBadge({
  value,
  label = 'so với tuần trước',
}: {
  value: number
  label?: ReactNode
}) {
  const positive = value >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] text-[12px] font-extrabold',
        positive ? 'text-success' : 'text-danger'
      )}
    >
      <Icon size={14} />
      {positive ? '+' : ''}
      {value}% {label}
    </span>
  )
}

// Rounded square holding an icon; the tone follows the data's accent.
const tile = cva('grid shrink-0 place-items-center', {
  variants: {
    tone: {
      blue: 'bg-primary-soft text-primary',
      amber: 'bg-badge-warning-bg text-warning',
      green: 'bg-practice-soft text-success',
      violet: 'bg-assess-soft text-violet',
      trophyGreen: 'bg-practice-soft text-success',
      trophyAmber: 'bg-live-tint text-streak',
    },
    size: {
      sm: 'size-9 rounded-xl',
      md: 'size-[38px] rounded-[13px]',
      lg: 'size-[38px] rounded-xl',
      xl: 'size-[42px] rounded-[14px]',
    },
  },
  defaultVariants: { tone: 'blue', size: 'sm' },
})

type TileTone = NonNullable<VariantProps<typeof tile>['tone']>

const knownTones = ['blue', 'amber', 'green', 'violet', 'trophyGreen', 'trophyAmber']

// The mock data names tones as plain strings ("amber", "green"...).
function toTileTone(tone?: string): TileTone {
  return knownTones.includes(tone ?? '') ? (tone as TileTone) : 'blue'
}

export function IconTile({
  tone,
  size,
  className,
  children,
}: Pick<VariantProps<typeof tile>, 'size'> & {
  tone?: string
  className?: string
  children: ReactNode
}) {
  return <span className={cn(tile({ tone: toTileTone(tone), size }), className)}>{children}</span>
}

const metricBase =
  'flex min-h-[102px] min-w-0 flex-col justify-center gap-1.5 rounded-[14px] border border-line-shell bg-surface p-4'
const metricLabel = 'text-[12px] leading-[1.35] font-extrabold text-text-secondary'
const metricValue = 'text-[21px] leading-[1.1] font-black text-text-heading'

interface MetricCardProps {
  icon?: ComponentType<{ size?: number }>
  label: ReactNode
  value: ReactNode
  note?: ReactNode
}

// Plain metric under the score chart.
export function MetricCard({ icon: Icon, label, value, note }: MetricCardProps) {
  return (
    <div className={metricBase}>
      {Icon && <Icon size={18} />}
      <span className={metricLabel}>{label}</span>
      <strong className={metricValue}>{value}</strong>
      {note && <small className={metricLabel}>{note}</small>}
    </div>
  )
}

interface IconMetricCardProps {
  icon: ComponentType<{ size?: number }>
  tone?: string
  label: ReactNode
  value: ReactNode
}

// Metric card with a coloured icon tile (Learning and Practice tabs).
export function IconMetricCard({ icon: Icon, tone, label, value }: IconMetricCardProps) {
  return (
    <div
      className={cn(
        metricBase,
        'min-h-[132px] items-start justify-between gap-[9px] text-left shadow-[0_12px_28px_rgba(17,24,58,0.055)]'
      )}
    >
      <IconTile tone={tone} size="md">
        <Icon size={18} />
      </IconTile>
      <span className={cn(metricLabel, 'min-h-8')}>{label}</span>
      <strong className={metricValue}>{value}</strong>
    </div>
  )
}

// 2 columns (4 with `four`, 2 below 1180px), 1 column on phones.
export function MetricGrid({ four = false, children }: { four?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1',
        four && 'grid-cols-4 max-[1181px]:grid-cols-2 max-[760px]:grid-cols-1'
      )}
    >
      {children}
    </div>
  )
}
