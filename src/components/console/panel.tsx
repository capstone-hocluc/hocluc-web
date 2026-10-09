import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PanelProps {
  title?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}

// NextAdmin card: bordered surface with an optional heading row.
export default function Panel({ title, action, className, children }: PanelProps) {
  return (
    <section className={cn('rounded-xl border border-card-border bg-card-background', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
          {title && <h2 className="text-lg leading-7 font-medium text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
