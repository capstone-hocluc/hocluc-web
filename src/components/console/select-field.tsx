import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../tailgrids/core/select'
import { cn } from '../../lib/cn'

export interface SelectOption {
  id: string
  label: string
}

interface SelectFieldProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
}

// NextAdmin single select over a plain option list.
export default function SelectField({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  placeholder,
  className,
  triggerClassName,
}: SelectFieldProps) {
  return (
    <Select
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value || null}
      isDisabled={disabled}
      onChange={(key) => {
        if (key !== null && key !== undefined) onChange(String(key))
      }}
      className={cn('w-auto', className)}
    >
      <SelectTrigger size="sm" className={cn('h-10 min-w-40', triggerClassName)}>
        <SelectValue />
        <SelectIndicator />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} id={option.id} textValue={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
