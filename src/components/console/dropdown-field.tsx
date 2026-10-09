import type { ReactNode } from 'react'
import SelectField, { type SelectOption } from './select-field'

interface DropdownFieldProps {
  options: readonly SelectOption[]
  value?: string | null
  onChange: (value: string | null) => void
  ariaLabel: string
  placeholder?: string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: ReactNode
  emptyMessage?: ReactNode
  isDisabled?: boolean
  isInvalid?: boolean
  ariaDescribedBy?: string
  className?: string
  triggerClassName?: string
  /** Accepted so call sites move over unchanged; the NextAdmin select has no search box. */
  isSearchable?: boolean
  searchPlaceholder?: string
  mobileTouchTargets?: boolean
  isRequired?: boolean
}

// Form select with loading / error / empty hints under the control.
function DropdownField({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder,
  isLoading,
  isError,
  errorMessage,
  emptyMessage,
  isDisabled,
  isInvalid,
  ariaDescribedBy,
  className,
  triggerClassName,
}: DropdownFieldProps) {
  const hint = isLoading ? 'Đang tải…' : isError ? errorMessage : options.length === 0 ? emptyMessage : null
  return (
    <div className="flex flex-col gap-1.5" aria-describedby={ariaDescribedBy}>
      <SelectField
        ariaLabel={ariaLabel}
        options={[...options]}
        value={value ?? ''}
        onChange={(next) => onChange(next)}
        disabled={isDisabled || isLoading || (options.length === 0 && !value)}
        placeholder={placeholder}
        className={className ?? 'w-full'}
        triggerClassName={`${isInvalid ? 'border-input-error-focus-border ' : ''}${triggerClassName ?? 'w-full'}`}
      />
      {hint && <p className={`text-xs font-normal ${isError ? 'text-badge-error-text' : 'text-text-tertiary'}`}>{hint}</p>}
    </div>
  )
}

export default DropdownField
