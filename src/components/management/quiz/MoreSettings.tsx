import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from '../../console/icons'
import { cn } from '../../../lib/cn'

/** Settings most quizzes keep at their defaults, folded away under one link until they are wanted. */
export default function MoreSettings({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="flex flex-col gap-4">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((current) => !current)}
        className="-ml-1 flex w-fit cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary">
        <ChevronRight size={16} aria-hidden="true" className={cn('transition-transform', open && 'rotate-90')} />
        {label}
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-4">{children}</div>
    </div>
  )
}
