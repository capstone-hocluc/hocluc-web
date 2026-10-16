import type { ReactNode } from 'react'
import { Search } from './icons'
import SelectField, { type SelectOption } from './select-field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../tailgrids/core/input-group'
import { cn } from '../../lib/cn'

// Toolbar above a console table, as in the CRM dashboard: search on the left, filters and actions
// on the right, every filter visible, one divider under the row.
export function FilterToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel?: string
  maxLength?: number
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxLength,
  className,
}: SearchInputProps) {
  return (
    <InputGroup className={cn('h-9 w-full sm:max-w-md', className)}>
      <InputGroupAddon align="inline-start" className="pr-0 text-icon-tertiary">
        <Search size={17} aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={ariaLabel ?? placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-2 text-sm"
      />
    </InputGroup>
  )
}

interface FilterSelectProps {
  ariaLabel: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function FilterSelect({
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
  className,
}: FilterSelectProps) {
  return (
    <SelectField
      ariaLabel={ariaLabel}
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={cn('min-w-0 sm:w-48', className)}
      triggerClassName="h-9 w-full min-w-0"
    />
  )
}

/** Filters laid out together on the right of the search box. */
export function FilterGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{children}</div>
}
