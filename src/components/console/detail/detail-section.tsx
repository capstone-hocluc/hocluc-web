import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { ChevronDown } from '../icons'

interface DetailSectionProps {
  title: ReactNode
  children: ReactNode
  collapsible?: boolean
  /** Only meaningful with `collapsible`. */
  defaultOpen?: boolean
  className?: string
}

// A titled block of a detail view. Collapsed content stays mounted (hidden), so a panel that
// reports unsaved state to its parent keeps doing so while folded.
export default function DetailSection({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()
  const expanded = !collapsible || open
  return (
    <section className={cn('border-t border-card-border pt-4', className)}>
      {collapsible ? (
        <h3 className="text-sm font-medium text-text-primary">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-2 rounded-md text-left"
          >
            <span>{title}</span>
            <ChevronDown
              size={16}
              aria-hidden
              className={cn('shrink-0 text-icon-tertiary transition-transform duration-200', !expanded && '-rotate-90')}
            />
          </button>
        </h3>
      ) : (
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      )}
      <div id={contentId} hidden={!expanded} className="mt-3 flex flex-col gap-3">
        {children}
      </div>
    </section>
  )
}
