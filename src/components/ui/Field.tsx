import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Form primitives: <Field> = label + control + error/helper, <Input> and
// <Textarea> = the bordered controls. Used by the Student account forms.
const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] font-semibold text-text-heading outline-none transition-colors placeholder:font-normal placeholder:text-text-faint focus:border-primary focus:ring-3 focus:ring-focus-ring/15 read-only:bg-surface-soft disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-muted'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y py-2.5', className)} {...props} />
}

interface FieldProps {
  label: ReactNode
  error?: string
  helper?: ReactNode
  /** Span both columns of a two-column form grid. */
  full?: boolean
  children: ReactNode
}

export function Field({ label, error, helper, full = false, children }: FieldProps) {
  return (
    <label
      className={cn(
        'flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-text-label',
        full && 'col-span-full'
      )}
    >
      {label}
      {children}
      {error && <small className="text-[13px] font-semibold text-badge-danger-text">{error}</small>}
      {!error && helper && <small className="text-xs font-normal text-text-muted">{helper}</small>}
    </label>
  )
}
