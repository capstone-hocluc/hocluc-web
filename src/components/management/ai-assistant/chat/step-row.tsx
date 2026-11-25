import type { ComponentProps } from 'react'
import { CircleX, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/components/assistant-ui/elements/format-duration'

export type StepState = 'running' | 'done' | 'failed' | 'cancelled'

/**
 * One step of a run on one line: the icon of what it did, what it did, a short hint (which question, which file) and
 * how long it took. A step going on shimmers; one that failed shows a cross, one that was stopped is struck through.
 */
export function StepRow({
  icon: Icon,
  label,
  detail,
  duration,
  state,
  className,
  ...props
}: ComponentProps<'div'> & {
  icon: LucideIcon
  label: string
  detail?: string | undefined
  duration?: number | undefined
  state: StepState
}) {
  const Shown = state === 'failed' ? CircleX : Icon
  const running = state === 'running'
  return (
    <div
      data-slot="run-step"
      data-state={state}
      title={detail ? `${label} · ${detail}` : label}
      className={cn('flex min-w-0 items-center gap-2 py-1 text-sm text-muted-foreground', className)}
      {...props}
    >
      <Shown aria-hidden className={cn('size-4 shrink-0', state === 'failed' && 'text-destructive')} />
      <span className={cn('min-w-0 truncate', running && 'shimmer motion-reduce:animate-none', state === 'cancelled' && 'line-through')}>
        {/* A shimmer paints the whole line: a colour of its own would hide it on the label. */}
        <span className={running ? undefined : 'font-medium text-foreground'}>{label}</span>
        {detail ? ` · ${detail}` : null}
      </span>
      {duration !== undefined && (
        <span data-slot="run-step-duration" className="shrink-0 text-xs tabular-nums">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}
