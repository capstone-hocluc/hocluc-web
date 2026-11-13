import type { ComponentProps } from 'react'
import { cn } from '../../../lib/cn'
import './elements.css'

/** Words that shimmer while what they tell goes on (assistant-ui Elements' `ShimmerLabel`). */
export function ShimmerLabel({ active = true, className, ...props }: ComponentProps<'span'> & { active?: boolean }) {
  return <span className={cn(active && 'aui-shimmer', className)} {...props} />
}
