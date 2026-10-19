import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// Inline banner: a short message (+ optional action) on a tinted background.
const notice = cva(
  'flex flex-wrap items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-bold',
  {
    variants: {
      tone: {
        danger: 'border-danger-line bg-badge-danger-bg text-badge-danger-text',
        warning: 'border-live-line bg-badge-warning-bg text-badge-warning-text',
        info: 'border-line-brand bg-badge-info-bg text-badge-info-text',
      },
    },
    defaultVariants: { tone: 'info' },
  }
)

type NoticeProps = ComponentProps<'div'> & VariantProps<typeof notice>

function Notice({ tone, className, ...props }: NoticeProps) {
  return <div role="status" className={cn(notice({ tone }), className)} {...props} />
}

export default Notice
