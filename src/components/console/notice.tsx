import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// Inline banner: a short message (+ optional action) on a tinted background.
const notice = cva('flex flex-wrap items-center gap-2.5 rounded-lg px-4 py-3 text-sm', {
  variants: {
    tone: {
      danger: 'bg-badge-error-background text-badge-error-text',
      warning: 'bg-badge-warning-background text-badge-warning-text',
      info: 'bg-badge-blue-background text-badge-blue-text',
    },
  },
  defaultVariants: { tone: 'info' },
})

type NoticeProps = ComponentProps<'div'> & VariantProps<typeof notice>

function Notice({ tone, className, ...props }: NoticeProps) {
  return <div role="status" className={cn(notice({ tone }), className)} {...props} />
}

export default Notice
