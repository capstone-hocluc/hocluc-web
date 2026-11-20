import type { ReactNode } from 'react'

// Native controls keep FormData-driven forms simple; these classes give them the NextAdmin look.
export const fieldControlClass =
  'h-10 w-full rounded-lg border border-card-border bg-input-background px-4 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-input-primary-focus-border disabled:cursor-not-allowed disabled:border-input-disabled-border disabled:bg-input-disabled-background disabled:text-input-disabled-text'

export const textareaControlClass = `${fieldControlClass} h-auto min-h-24 py-2.5`

/** The red star after a label whose field must be filled. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-danger">
      *
    </span>
  )
}

interface FieldProps {
  label: string
  hint?: ReactNode
  /** Shows the star; the control itself decides whether the browser enforces it. */
  required?: boolean
  children: ReactNode
}

function Field({ label, hint, required, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
      <span>
        {label}
        {required && <RequiredMark />}
      </span>
      {children}
      {hint && <span className="text-xs font-normal text-text-tertiary">{hint}</span>}
    </label>
  )
}

export default Field
