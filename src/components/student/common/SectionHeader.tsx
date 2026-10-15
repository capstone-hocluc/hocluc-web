import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

interface SectionHeaderProps {
  title: ReactNode
  /** Right-aligned controls (links, carousel buttons). Without them only the title renders. */
  actions?: ReactNode
  className?: string
  /** Extra classes for the h3 (e.g. a smaller size in the sidebar). */
  titleClassName?: string
}

const titleClass = 'min-w-0 text-2xl leading-[1.2] font-black tracking-[-0.3px] text-text-heading max-[760px]:text-[22px]'

// Section title (h3) with an optional row of actions on the right.
function SectionHeader({ title, actions, className, titleClassName }: SectionHeaderProps) {
  if (!actions) return <h3 className={cn(titleClass, titleClassName, className)}>{title}</h3>
  return (
    <div className={cn('flex items-center justify-between gap-4 max-[760px]:flex-wrap', className)}>
      <h3 className={cn(titleClass, titleClassName)}>{title}</h3>
      <div className="ml-auto inline-flex items-center justify-end gap-2.5 max-[760px]:w-auto max-[760px]:flex-wrap">
        {actions}
      </div>
    </div>
  )
}

export default SectionHeader
