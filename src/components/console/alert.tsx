import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from './icons'

// Block alert on the card surface: the tone lives in the icon colour, so title and detail
// keep the page's own text colours. Notice stays the one-line tinted banner.
export type AlertTone = 'default' | 'info' | 'success' | 'warning' | 'danger'

const ICON_COLOR: Record<AlertTone, string> = {
  default: 'text-text-secondary',
  info: 'text-badge-blue-icon-color',
  success: 'text-badge-success-icon-color',
  warning: 'text-badge-warning-icon-color',
  danger: 'text-badge-error-icon-color',
}

const ICON: Record<AlertTone, LucideIcon> = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
}

/** Card surface shared with Notice. */
export const alertSurface =
  'relative flex items-start gap-3 rounded-xl border border-card-border bg-card-background p-4 text-sm'

/** The tone's glyph in its colour, sized for one 20px text line. */
export function AlertIcon({
  tone,
  icon: Icon = ICON[tone],
}: {
  tone: AlertTone
  icon?: LucideIcon
}) {
  return <Icon size={18} aria-hidden className={cn('mt-px shrink-0', ICON_COLOR[tone])} />
}

type AlertProps = Omit<ComponentProps<'div'>, 'title'> & {
  tone?: AlertTone
  title: ReactNode
  /** Replaces the tone's glyph; `false` drops the icon. */
  icon?: LucideIcon | false
  /** Usually one or two small console Buttons under the text. */
  action?: ReactNode
  onDismiss?: () => void
}

function Alert({
  tone = 'default',
  title,
  icon,
  action,
  onDismiss,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(alertSurface, onDismiss && 'pr-12', className)}
      {...props}
    >
      {icon !== false && <AlertIcon tone={tone} icon={icon} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="leading-5 font-semibold text-text-primary">{title}</p>
        {children && <div className="leading-5 text-text-secondary">{children}</div>}
        {action && <div className="mt-2 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Đóng thông báo"
          onClick={onDismiss}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg text-text-tertiary transition hover:bg-background-gray-secondary hover:text-text-primary"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default Alert
