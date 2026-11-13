import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { paper } from './surfaces'
import './elements.css'

/**
 * What a reply made, as a card of its own: its icon, what it is, and what can be done with it (assistant-ui Elements'
 * `ArtifactCard`, with room for the actions under it).
 */
export function ArtifactCard({
  icon,
  title,
  meta,
  children,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  icon: ReactNode
  title: string
  meta?: string
  children?: ReactNode
}) {
  return (
    <div
      data-slot="artifact-card"
      className={cn(paper, 'aui-enter flex w-full flex-col gap-3 rounded-[20px] p-3.5', className)}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-text-primary/[0.05] text-text-tertiary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-text-primary">{title}</p>
          {meta && <p className="truncate text-xs text-text-tertiary">{meta}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}
