import type { ComponentProps } from 'react'
import { cn } from '../../../lib/cn'
import { ShimmerLabel } from './shimmer-label'

/**
 * A run going on: a pulsing dot and what it does, shimmering (assistant-ui Elements' `ThinkingIndicator`). A span, so
 * it can head a button (a run's folded steps).
 */
export function ThinkingIndicator({
  label,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & { label: string }) {
  return (
    <span
      data-slot="thinking-indicator"
      className={cn('flex min-w-0 items-center gap-2.5 text-sm text-text-tertiary', className)}
      {...props}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary-text motion-reduce:animate-none"
      />
      <ShimmerLabel key={label} className="aui-enter relative inline-block min-w-0 truncate leading-tight">
        {label}
      </ShimmerLabel>
    </span>
  )
}
