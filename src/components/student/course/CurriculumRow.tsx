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
    'flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border-[1.5px] p-3 text-left transition duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#174fbd]',
    current
      ? 'border-transparent bg-surface-brand'
      : locked
        ? 'border-line bg-surface-soft'
        : 'border-line bg-surface',
    locked
      ? 'cursor-default'
      : 'cursor-pointer hover:border-[#84d8ff] hover:bg-surface-brand active:translate-y-0.5'
  )

  const content = (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-extrabold tracking-[0.04em] text-text-secondary uppercase">{kind}</span>
        <span
          className={cn(
            'flex flex-wrap items-center gap-1.5 text-[15px] leading-[1.35] font-extrabold',
            locked ? 'text-text-secondary' : 'text-text-heading'
          )}
        >
          {title}
        </span>
        {meta && <span className="text-[13px] font-semibold text-text-secondary">{meta}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3 text-[13px] font-bold text-text-secondary [&>span]:whitespace-nowrap max-[640px]:basis-full max-[640px]:justify-between max-[640px]:pl-[52px]">
        {side}
        {!locked && <ChevronRight size={18} className="text-lock/70" />}
      </span>
      {locked && lockNote && (
        <span className="basis-full pl-[52px] text-[13px] font-semibold text-text-secondary">{lockNote}</span>
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
