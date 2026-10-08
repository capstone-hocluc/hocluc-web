import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'

// Pill-ish 38px button of the learning-activity screens. No hover colour
// change (the screens never had one), only the tone/weight differ.
const activityButton = cva(
  'h-auto min-h-[38px] gap-[7px] rounded-xl px-3.5 text-[12px] whitespace-normal [&>svg]:size-[15px]',
  {
    variants: {
      tone: {
        outline: 'border-line text-primary hover:bg-surface',
        soft: 'border-line-brand bg-surface-brand text-primary hover:bg-surface-brand',
        primary: 'border-primary hover:bg-primary',
      },
      weight: {
        bold: 'font-bold',
        extrabold: 'font-extrabold',
      },
      block: {
        true: 'max-[760px]:w-full',
        false: '',
      },
    },
    defaultVariants: { tone: 'outline', weight: 'bold', block: false },
  }
)

type ActivityButtonProps = Omit<ComponentProps<typeof Button>, 'appearance'> &
  VariantProps<typeof activityButton>

function ActivityButton({ tone, weight, block, className, ...props }: ActivityButtonProps) {
  return (
    <Button
      appearance={tone === 'primary' ? 'fill' : 'outline'}
      className={cn(activityButton({ tone, weight, block }), className)}
      {...props}
    />
  )
}

export default ActivityButton
