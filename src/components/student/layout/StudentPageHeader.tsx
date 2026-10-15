import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

interface StudentPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Right-aligned actions (buttons); wraps under the title on small screens. */
  actions?: ReactNode
  className?: string
}

function StudentPageHeader({ title, description, actions, className }: StudentPageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="mb-1.5 text-[32px] leading-[1.18] font-black tracking-[-0.8px] text-balance text-text-heading max-[560px]:text-[25px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-base leading-[1.55] text-text-body">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}

export default StudentPageHeader
