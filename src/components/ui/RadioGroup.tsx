import type { ComponentProps } from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '../../lib/cn'

// Radix RadioGroup with "card" options: keyboard arrows, roving focus and
// aria-checked come from the library.
function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('flex flex-col gap-2.5', className)} {...props} />
}

function RadioGroupItem({
  className,
  children,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-[13px] text-left text-sm text-text-body transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-75 data-[state=checked]:border-primary data-[state=checked]:bg-badge-info-bg data-[state=checked]:font-semibold data-[state=checked]:text-text-heading',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="grid size-[18px] shrink-0 place-items-center rounded-full border border-border-primary group-data-[state=checked]:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
