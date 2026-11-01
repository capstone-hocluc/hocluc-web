import { useRef, type ReactNode } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../../../lib/cn'
import { ChevronDown } from './toolbar-icons'
import type { ToolbarOption } from './toolbar-options'
import { MenuContent, MenuRadioList } from './ToolbarMenu'
import { controlClass, textTriggerClass } from './toolbar-styles'

interface ToolbarSelectProps {
  /** Name of the setting ("Phông chữ"); the trigger is announced as "Phông chữ: Arial". */
  label: string
  value: string | null
  options: readonly ToolbarOption[]
  onChange: (value: string) => void
  /** Runs after a choice closed the menu (gives the caret back to the editor). */
  onDone: () => void
  disabled?: boolean
  /** Text shown when the value is not one of the options (a font from an imported file). */
  fallbackLabel?: string
  /** Trigger content instead of the current label (the alignment icon). */
  display?: ReactNode
  className?: string
  contentClassName?: string
}

/** A dropdown on the toolbar pill that shows its current value and lists the choices as radio rows. */
export function ToolbarSelect({
  label,
  value,
  options,
  onChange,
  onDone,
  disabled,
  fallbackLabel,
  display,
  className,
  contentClassName,
}: ToolbarSelectProps) {
  const chose = useRef(false)
  const current = options.find((option) => option.value === value)?.label ?? fallbackLabel ?? ''

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={current ? `${label}: ${current}` : label}
          title={label}
          className={cn(controlClass, display ? 'gap-0.5 px-1.5' : textTriggerClass, className)}
        >
          {display ?? <span className="min-w-0 flex-1 truncate text-left">{current}</span>}
          <ChevronDown
            size={14}
            strokeWidth={2}
            aria-hidden
            className="shrink-0 text-icon-tertiary"
          />
        </button>
      </Menu.Trigger>
      <MenuContent
        className={contentClassName}
        onCloseAutoFocus={(event) => {
          if (!chose.current) return
          chose.current = false
          event.preventDefault()
          onDone()
        }}
      >
        <MenuRadioList
          value={value}
          options={options}
          onChange={(next) => {
            chose.current = true
            onChange(next)
          }}
        />
      </MenuContent>
    </Menu.Root>
  )
}
