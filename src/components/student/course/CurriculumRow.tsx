import type { ReactNode } from 'react'
import { ChevronRight } from '../../console/icons'
import { cn } from '../../../lib/cn'

interface CurriculumRowProps {
  /** Leading <LearningTypeIcon />. */
  icon: ReactNode
  /** Small caption above the title ("Video", "Mini Test"...). */
  kind: ReactNode
  title: ReactNode
  meta?: ReactNode
  /** Right-hand status / score / attempts. */
  side?: ReactNode
  current?: boolean
  locked?: boolean
  /** Explains why a locked row can't be opened. */
  lockNote?: ReactNode
  onClick?: () => void
}

// Shared shell for a lesson or quiz line in the curriculum: icon tile, text
// block, status on the right. Renders a button, or a static row when locked.
function CurriculumRow({
  icon,
  kind,
  title,
  meta,
  side,
  current = false,
  locked = false,
  lockNote,
  onClick,
}: CurriculumRowProps) {
  const className = cn(
    'flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-[13px] border bg-surface-tint p-2.5 text-left transition-colors',
    current ? 'border-line-brand bg-surface-brand' : 'border-line',
    locked ? 'cursor-default' : 'cursor-pointer hover:border-line-brand hover:bg-surface-brand'
  )

  const content = (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-bold text-text-secondary">{kind}</span>
        <span
          className={cn(
            'flex flex-wrap items-center gap-1.5 text-[13.5px] leading-[1.35] font-extrabold',
            locked ? 'text-text-secondary' : 'text-text-heading'
          )}
        >
          {title}
        </span>
        {meta && <span className="text-[11.5px] font-medium text-text-secondary">{meta}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3 text-[11.5px] font-semibold text-text-secondary max-[640px]:basis-full max-[640px]:justify-between max-[640px]:pl-11">
        {side}
        {!locked && <ChevronRight size={16} className="text-lock/70" />}
      </span>
      {locked && lockNote && (
        <span className="basis-full pl-11 text-[11.5px] text-text-secondary">{lockNote}</span>
      )}
    </>
  )

  if (locked) {
    return (
      <div className={className} title={typeof lockNote === 'string' ? lockNote : undefined}>
        {content}
      </div>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  )
}

export default CurriculumRow
