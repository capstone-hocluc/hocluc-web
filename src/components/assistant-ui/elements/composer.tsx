import type { ComponentProps } from 'react'
import { cn } from '../../../lib/cn'
import { ArrowUp, Square } from '../../console/icons'
import { inkButton } from './surfaces'

/**
 * Sends the words, or stops the run going on (Elements' `ComposerSend`): ink once there is something to send, quiet
 * while there is not. Its props (and `ComposerPrimitive.Send`'s, through `asChild`) go to the button.
 */
export function ComposerSend({
  streaming,
  idle,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { streaming: boolean; idle: boolean }) {
  return (
    <button
      type="button"
      data-slot="composer-send"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-text-primary/25 focus-visible:ring-offset-1',
        streaming || !idle
          ? inkButton
          : 'bg-text-primary/[0.06] text-text-tertiary inset-ring inset-ring-card-border transition-colors forced-colors:border forced-colors:border-[GrayText] forced-colors:text-[GrayText] dark:bg-text-primary/[0.09]',
        className
      )}
      {...props}
    >
      {streaming ? (
        <Square aria-hidden strokeWidth={0} fill="currentColor" className="size-3" />
      ) : (
        <ArrowUp aria-hidden strokeWidth={2.2} className="size-4" />
      )}
    </button>
  )
}
