import type { ComponentProps } from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const track = cva('relative w-full overflow-hidden rounded-full bg-line-soft', {
  variants: {
    size: {
      sm: 'h-2.5',
      md: 'h-3.5',
    },
  },
  defaultVariants: { size: 'md' },
})

const indicator = cva('h-full rounded-full transition-[width] duration-300', {
  variants: {
    tone: {
      primary: 'bg-primary',
      success: 'bg-success',
    },
  },
  defaultVariants: { tone: 'primary' },
})

interface ProgressProps
  extends
    Omit<ComponentProps<typeof ProgressPrimitive.Root>, 'value'>,
    VariantProps<typeof track>,
    VariantProps<typeof indicator> {
  /** 0-100; out-of-range values are clamped. */
  value?: number
}

function Progress({ value = 0, size, tone, className, ...props }: ProgressProps) {
  const percent = Math.max(0, Math.min(100, value))
  return (
    <ProgressPrimitive.Root value={percent} className={cn(track({ size }), className)} {...props}>
      <ProgressPrimitive.Indicator
        className={indicator({ tone })}
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export default Progress
