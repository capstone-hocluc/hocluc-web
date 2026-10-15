import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import Button from '../../ui/Button'

// Button of the learning-activity screens: the shared ledge Button, with a
// softer "soft" tone and a full-width option on phones.
const activityButton = cva(
  'h-auto min-h-11 gap-2 px-4 text-sm whitespace-normal [&>svg]:size-4',
  {
    variants: {
      tone: {
        outline: '',
        soft: 'border-[#84d8ff] bg-surface-brand text-primary-text hover:bg-surface-brand',
        primary: '',
      },
      weight: {
        bold: 'font-extrabold',
        extrabold: 'font-black',
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
