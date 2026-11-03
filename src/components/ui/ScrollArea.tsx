import type { ComponentProps, ElementType } from 'react'
import { cn } from '../../lib/cn'

/** Class for scroll regions that cannot render `ScrollArea` (e.g. a cmdk list). */
export const scrollAreaClass = 'app-scroll overflow-y-auto'

type ScrollAreaProps = ComponentProps<'div'> & {
  as?: ElementType
  /** Scroll horizontally instead of vertically. */
  horizontal?: boolean
}

/** Scrollable region with the app's themed scrollbar, so no panel falls back to the browser's grey bar. */
export default function ScrollArea({ as: Tag = 'div', horizontal = false, className, ...props }: ScrollAreaProps) {
  return <Tag className={cn('app-scroll', horizontal ? 'overflow-x-auto' : 'overflow-y-auto', className)} {...props} />
}
