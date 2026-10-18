import { useCallback, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectErrorMessage,
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
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  ariaLabel: string
  ariaDescribedBy?: string
  id?: string
  name?: string
  required?: boolean
  invalid?: boolean
  autoComplete?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
}

// NextAdmin single select over a plain option list.
export default function SelectField({
  options,
  value,
  defaultValue,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  id,
  name,
  required,
  invalid,
  autoComplete,
  disabled,
  placeholder,
  className,
  triggerClassName,
}: SelectFieldProps) {
  const [portalContainer, setPortalContainer] = useState<Element>()
  const captureTrigger = useCallback((trigger: HTMLButtonElement | null) => {
    if (trigger) {
      // Native dialogs live in the browser's top layer; Radix traps focus inside its content.
      // Keep their menus inside that boundary, rather than portaling behind the dialog.
      setPortalContainer(trigger.closest('dialog, [data-select-portal]') ?? undefined)
    }
  }, [])

  return (
    <Select
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      name={name}
      autoComplete={autoComplete}
      isRequired={required}
      isInvalid={invalid}
      validationBehavior="native"
      placeholder={placeholder}
      value={value}
      defaultSelectedKey={defaultValue ?? options[0]?.id ?? null}
      isDisabled={disabled}
      onChange={(key) => {
        if (key !== null && key !== undefined) onChange?.(String(key))
      }}
      className={cn('w-full min-w-0', className)}
    >
      <SelectTrigger
        ref={captureTrigger}
        id={id}
        size="sm"
        className={cn('h-10 w-full min-w-0 text-left font-normal shadow-none', triggerClassName)}
      >
        <SelectValue />
        <SelectIndicator />
      </SelectTrigger>
      <SelectContent
        data-hocluc-select-menu=""
        UNSTABLE_portalContainer={portalContainer}
        className="z-[100] max-h-72 shadow-lg"
      >
        {options.map((option) => (
          <SelectItem
            key={option.id}
            id={option.id}
            textValue={option.label}
            className="min-h-10 px-3 py-2 pr-8"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
      {required && <SelectErrorMessage>Vui lòng chọn một giá trị.</SelectErrorMessage>}
    </Select>
  )
}
