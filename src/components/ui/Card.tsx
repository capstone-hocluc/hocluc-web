import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// The white bordered surface used across Student screens. `live` is the
// amber-tinted variant for live-class content.
const card = cva('min-w-0 border', {
  variants: {
    variant: {
      default: 'border-line bg-surface',
      elevated: 'border-line-card bg-surface shadow-card-soft',
      panel: 'border-line-card bg-surface shadow-card',
      live: 'border-live-line bg-live-tint',
    },
    padding: {
      none: '',
      md: 'px-5 py-[18px]',
      lg: 'p-5',
    },
    radius: {
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-2xl',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md', radius: 'md' },
})

type CardProps = ComponentProps<'div'> &
  VariantProps<typeof card> & {
    /** Element to render; use `section` / `article` for semantic cards. */
    as?: 'div' | 'section' | 'article' | 'nav' | 'aside' | 'header'
  }

function Card({ as: Tag = 'div', variant, padding, radius, className, ...props }: CardProps) {
  return <Tag className={cn(card({ variant, padding, radius }), className)} {...props} />
}

export default Card

// Small uppercase label above a card's content.
export function CardEyebrow({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'mb-1.5 block text-xs font-semibold tracking-[0.08em] text-text-secondary uppercase',
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'mb-2 text-[17px] font-semibold tracking-[-0.2px] text-text-heading',
        className
      )}
      {...props}
    />
  )
}
