import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { CircleAlert, RefreshCw } from '../../console/icons'
import './elements.css'

/**
 * A reply that failed: what went wrong, and a way to try again when there is one (assistant-ui Elements'
 * `ErrorState`). The detail is the reply's own words.
 */
export function ErrorState({
  title,
  children,
  onRetry,
  retryLabel = 'Thử lại',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'role' | 'title'> & {
  title: string
  children: ReactNode
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        'aui-fade flex w-full items-start gap-2.5 rounded-2xl bg-badge-error-background/70 px-4 py-3 text-sm',
        className
      )}
      {...props}
    >
      <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-badge-error-text/80" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-badge-error-text">{title}</p>
        <div className="mt-0.5 text-[13px] leading-snug text-badge-error-text/75">{children}</div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-badge-error-text transition-colors hover:bg-badge-error-text/10 focus-visible:ring-1 focus-visible:ring-badge-error-text/40"
        >
          <RefreshCw size={12} aria-hidden />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
