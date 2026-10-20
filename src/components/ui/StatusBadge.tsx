import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// Every staff table (invoice/payment/tuition/enrollment/fee...) renders the
// same "colored pill" for its own status vocabulary. Centralizing the 5
// tones here means each screen only has to map ITS OWN status strings to a
// tone, instead of re-declaring the whole badge markup + palette per screen.
// Tailwind utility classes only - no index.css rule, mirrors the reference
// CRM's Badge (tailgrids/core/badge.tsx).
const badge = cva(
  'inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full font-semibold',
  {
    variants: {
      tone: {
        success: 'bg-badge-success-bg text-badge-success-text',
        warning: 'bg-badge-warning-bg text-badge-warning-text',
        danger: 'bg-badge-danger-bg text-badge-danger-text',
        info: 'bg-badge-info-bg text-badge-info-text',
        neutral: 'bg-badge-neutral-bg text-badge-neutral-text',
        // Student learning semantics (see tokens.css)
        primary: 'bg-primary-soft text-primary-text',
        practice: 'bg-practice-soft text-practice',
        assessment: 'bg-assess-soft text-assess',
        live: 'bg-live-soft text-live',
        locked: 'bg-lock-soft text-lock',
      },
      size: {
        md: 'px-3 py-1 text-[13px]',
        sm: 'px-2.5 py-0.5 text-[11px]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  }
)

type StatusBadgeProps = ComponentProps<'span'> & VariantProps<typeof badge>

function StatusBadge({ tone, size, className, children }: StatusBadgeProps) {
  return <span className={cn(badge({ tone, size }), className)}>{children}</span>
}

export default StatusBadge
