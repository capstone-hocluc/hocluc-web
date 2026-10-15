import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

// Shimmer placeholder. Size it with className (h-*, w-*).
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-2xl bg-[length:200%_100%] bg-[linear-gradient(100deg,var(--color-border-subtle)_30%,#f4f6fb_50%,var(--color-border-subtle)_70%)]',
        className
      )}
      {...props}
    />
  )
}

export default Skeleton
