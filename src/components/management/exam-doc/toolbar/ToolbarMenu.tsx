import type { ComponentProps, ReactNode } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../../../lib/cn'
import { Check, ChevronRight, type LucideIcon } from './toolbar-icons'
import type { ToolbarOption } from './toolbar-options'
import { menuItemClass, menuSlotClass, surfaceClass } from './toolbar-styles'

// Radix dropdown pieces styled for the editor: compact 32px rows, icon left, shortcut or value right,
// check mark / submenu chevron in a fixed right slot.

export function MenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        align="start"
        collisionPadding={8}
        className={cn(
          surfaceClass,
          'max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[200px] overflow-y-auto',
          className
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

interface RowProps {
  icon?: LucideIcon
  children: ReactNode
  /** Right-aligned grey text: a shortcut or the current value. */
  hint?: string
}

function RowBody({ icon: Icon, children, hint }: RowProps) {
  return (
    <>
      {Icon && (
        <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-icon-tertiary" />
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 pl-4 text-xs text-text-tertiary">{hint}</span>}
    </>
  )
}

type MenuItemProps = RowProps & Omit<ComponentProps<typeof Menu.Item>, 'children'>

export function MenuItem({ icon, hint, children, className, ...props }: MenuItemProps) {
  return (
    <Menu.Item className={cn(menuItemClass, className)} {...props}>
      <RowBody icon={icon} hint={hint}>
        {children}
      </RowBody>
    </Menu.Item>
  )
}

type MenuCheckItemProps = RowProps & Omit<ComponentProps<typeof Menu.CheckboxItem>, 'children'>

export function MenuCheckItem({ icon, hint, children, className, ...props }: MenuCheckItemProps) {
  return (
    <Menu.CheckboxItem className={cn(menuItemClass, className)} {...props}>
      <RowBody icon={icon} hint={hint}>
        {children}
      </RowBody>
      <Menu.ItemIndicator className={menuSlotClass}>
        <Check size={14} strokeWidth={2.25} aria-hidden />
      </Menu.ItemIndicator>
    </Menu.CheckboxItem>
  )
}

type MenuRadioItemProps = RowProps & Omit<ComponentProps<typeof Menu.RadioItem>, 'children'>

export function MenuRadioItem({ icon, hint, children, className, ...props }: MenuRadioItemProps) {
  return (
    <Menu.RadioItem className={cn(menuItemClass, className)} {...props}>
      <RowBody icon={icon} hint={hint}>
        {children}
      </RowBody>
      <Menu.ItemIndicator className={menuSlotClass}>
        <Check size={14} strokeWidth={2.25} aria-hidden />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  )
}

export function MenuSeparator() {
  return <Menu.Separator className="-mx-1.5 my-1 h-px bg-card-border" />
}

interface MenuRadioListProps {
  value: string | null
  options: readonly ToolbarOption[]
  onChange: (value: string) => void
}

/** The options of a toolbar select as radio rows (fonts drawn in their own typeface). */
export function MenuRadioList({ value, options, onChange }: MenuRadioListProps) {
  return (
    <Menu.RadioGroup value={value ?? ''} onValueChange={onChange}>
      {options.map((option) => (
        <MenuRadioItem
          key={option.value}
          value={option.value}
          icon={option.icon}
          style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
          className={option.previewClass ? 'h-auto min-h-8 py-2' : undefined}
        >
          {option.previewClass ? <span className={option.previewClass}>{option.label}</span> : option.label}
        </MenuRadioItem>
      ))}
    </Menu.RadioGroup>
  )
}

interface MenuSubProps {
  icon?: LucideIcon
  label: string
  /** Current value, shown in grey next to the label. */
  hint?: string
  disabled?: boolean
  contentClassName?: string
  children: ReactNode
}

export function MenuSub({ icon, label, hint, disabled, contentClassName, children }: MenuSubProps) {
  return (
    <Menu.Sub>
      <Menu.SubTrigger className={menuItemClass} disabled={disabled}>
        <RowBody icon={icon} hint={hint}>
          {label}
        </RowBody>
        <span className={cn(menuSlotClass, 'text-icon-tertiary')}>
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </Menu.SubTrigger>
      <Menu.Portal>
        <Menu.SubContent
          sideOffset={4}
          collisionPadding={8}
          className={cn(surfaceClass, 'min-w-[180px]', contentClassName)}
        >
          {children}
        </Menu.SubContent>
      </Menu.Portal>
    </Menu.Sub>
  )
}
