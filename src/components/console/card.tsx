import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// NextAdmin card surface for console screens; `padding` and `as` match ui/Card call sites.
const card = cva('min-w-0 rounded-xl border border-card-border bg-card-background', {
  variants: {
    padding: { none: '', md: 'p-4', lg: 'p-5' },
  },
  defaultVariants: { padding: 'lg' },
})

type CardProps = ComponentProps<'div'> &
  VariantProps<typeof card> & {
    as?: 'div' | 'section' | 'article' | 'nav' | 'aside' | 'header'
  }

function Card({ as: Tag = 'div', padding, className, ...props }: CardProps) {
  return <Tag className={cn(card({ padding }), className)} {...props} />
}

export default Card

export function CardEyebrow({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('mb-1 block text-xs text-text-tertiary', className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('mb-2 text-base font-medium text-text-primary', className)} {...props} />
}
