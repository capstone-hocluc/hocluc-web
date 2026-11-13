import type { ComponentProps } from 'react'
import { cn } from '../../../lib/cn'
import { paper } from './surfaces'
import './elements.css'

// assistant-ui Elements' empty state: a greeting, and a few suggestions under it that come in one after another.

export function EmptyState({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="empty-state" className={cn('flex w-full max-w-md flex-col items-center gap-7', className)} {...props} />
  )
}

export function EmptyStateGreeting({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-state-greeting"
      className={cn(
        'aui-enter text-center text-2xl font-medium tracking-tight text-balance text-text-primary [animation-duration:500ms]',
        className
      )}
      {...props}
    />
  )
}

export function EmptyStateSuggestions({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul data-slot="empty-state-suggestions" className={cn('flex flex-wrap justify-center gap-2', className)} {...props} />
  )
}

export function EmptyStateSuggestion({
  index = 0,
  className,
  style,
  ...props
}: ComponentProps<'button'> & { index?: number }) {
  return (
    <li className="flex max-w-full">
      <button
        type="button"
        data-slot="empty-state-suggestion"
        style={{ animationDelay: `${120 + index * 70}ms`, ...style }}
        className={cn(
          paper,
          'aui-enter max-w-full rounded-full px-4 py-2 text-[13px] text-text-primary outline-none [animation-duration:500ms]',
          'transition-transform duration-500 hover:-translate-y-px focus-visible:ring-1 focus-visible:ring-text-primary/25 active:scale-[0.96]',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      />
    </li>
  )
}
