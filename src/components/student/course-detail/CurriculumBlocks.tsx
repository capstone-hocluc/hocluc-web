import type { ReactNode } from 'react'
import { ChevronDown } from '../../console/icons'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import Card from '../../ui/Card'
import Progress from '../../ui/Progress'

// Top-level curriculum card (a part, the full mock tests, a supplementary chapter).
export function CurriculumCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <Card
      as="article"
      padding="none"
      radius="xl"
      className={cn(
        'bg-surface p-5 max-[760px]:rounded-3xl max-[760px]:p-3.5',
        className
      )}
    >
      {children}
    </Card>
  )
}

// Nested block: a group inside a part, or a chapter. `bare` drops the frame (used
// when the chapter already sits inside a CurriculumCard).
export function CurriculumBlock({
  tone = 'group',
  bare = false,
  children,
}: {
  tone?: 'group' | 'chapter'
  bare?: boolean
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        'rounded-[20px] border-[1.5px] border-line p-3.5',
        tone === 'chapter' ? 'bg-surface' : 'bg-surface-tint',
        bare && 'rounded-none border-0 bg-transparent p-0'
      )}
    >
      {children}
    </article>
  )
}

const title = cva('inline-flex items-center gap-2 text-text-heading', {
  variants: {
    level: {
      section: 'text-xl font-black tracking-[-0.3px]',
      group: 'text-[17px] font-extrabold',
      chapter: 'text-base font-extrabold',
    },
  },
})

const count = cva('text-sm font-black whitespace-nowrap', {
  variants: {
    level: {
      section: 'text-primary-text',
      group: 'text-primary-text',
      chapter: 'text-text-secondary',
    },
  },
})

interface CurriculumHeadProps {
  level: 'section' | 'group' | 'chapter'
  expanded: boolean
  onToggle: () => void
  /** Text after the chevron. */
  label: ReactNode
  /** Small line under the label. */
  caption?: ReactNode
  /** Right-hand value (progress %, done/total). */
  value: ReactNode
}

// Expand/collapse header of a curriculum level. Keeps `aria-expanded`; the
// chevron turns when collapsed.
export function CurriculumHead({
  level,
  expanded,
  onToggle,
  label,
  caption,
  value,
}: CurriculumHeadProps) {
  return (
    <button
      type="button"
      className="group flex w-full cursor-pointer items-center justify-between gap-3 p-0 text-left max-[760px]:flex-col max-[760px]:items-start"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <div className="grid gap-1">
        <span className={title({ level })}>
          <ChevronDown
            size={level === 'section' ? 20 : 18}
            className="group-aria-[expanded=false]:-rotate-90"
          />
          {label}
        </span>
        {caption && (
          <small className="text-[13px] font-semibold text-text-secondary">{caption}</small>
        )}
      </div>
      <strong className={count({ level })}>{value}</strong>
    </button>
  )
}

// Numbered square in a part's title ("01").
export function CurriculumIndex({ children }: { children: ReactNode }) {
  return (
    <b className="inline-grid size-9 place-items-center rounded-xl bg-primary-soft text-sm font-black text-primary-text">
      {children}
    </b>
  )
}

// Thin progress bar under a curriculum header.
export function CurriculumProgress({ value, className }: { value: number; className?: string }) {
  return <Progress value={value} className={cn('mt-3.5', className)} />
}

// Bordered list of ActivityRow.
export function ActivityList({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3.5 flex flex-col gap-2">
      {children}
    </div>
  )
}

// Vertical stack of nested blocks under an expanded header.
export function BlockList({ children }: { children: ReactNode }) {
  return <div className="mt-3.5 flex flex-col gap-3">{children}</div>
}
