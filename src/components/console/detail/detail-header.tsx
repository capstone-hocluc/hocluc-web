import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

interface DetailHeaderProps {
  /** Avatar or icon. */
  media?: ReactNode
  /** Omit when the dialog title already carries the name, so it is not shown twice. */
  title?: ReactNode
  /** Email, code, course... one line under the title. */
  subtitle?: ReactNode
  /** Status and role chips. */
  chips?: ReactNode
  /** The primary action(s), on the right; wraps under the identity on narrow screens. */
  actions?: ReactNode
  className?: string
}

// First block of every detail view: who/what this is, its state, and the one thing to do next.
export default function DetailHeader({ media, title, subtitle, chips, actions, className }: DetailHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        {media && <div className="shrink-0">{media}</div>}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {title && <h3 className="text-lg leading-6 font-medium break-words text-text-primary">{title}</h3>}
          {subtitle && <p className="text-sm break-words text-text-tertiary">{subtitle}</p>}
          {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </div>
  )
}
