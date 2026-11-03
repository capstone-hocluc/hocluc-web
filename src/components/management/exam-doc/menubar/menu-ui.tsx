import type { ComponentProps, ComponentType, ReactNode } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../../../lib/cn'
import { Check, ChevronRight, type IconProps } from '../../../console/icons'

// Menu pieces with the NextAdmin dropdown look (tailgrids core/dropdown), on Radix for keyboard support.

const CONTENT_CLASS =
  'z-70 min-w-[232px] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-xl border border-card-border bg-background-white-secondary p-1.5 text-text-primary shadow-md outline-none'

const ITEM_CLASS =
  'flex h-8 w-full cursor-default items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-text-primary outline-none select-none data-[highlighted]:bg-background-gray-secondary_alt data-[disabled]:pointer-events-none data-[disabled]:opacity-45'

type MenuIcon = ComponentType<IconProps>

function IconSlot({ icon: Icon }: { icon?: MenuIcon }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center text-icon-tertiary"
    >
      {Icon && <Icon size={16} />}
    </span>
  )
}

function Shortcut({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <span aria-hidden className="ml-auto pl-6 text-xs text-text-tertiary tabular-nums">
      {children}
    </span>
  )
}

export function MenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className={cn(CONTENT_CLASS, className)}
        {...props}
      />
    </Menu.Portal>
  )
}

interface MenuItemProps extends Omit<ComponentProps<typeof Menu.Item>, 'children'> {
  label: string
  icon?: MenuIcon
  /** Shown right-aligned, e.g. "Ctrl+B". */
  shortcut?: string
  /** `aria-keyshortcuts` value, e.g. "Control+B". */
  keys?: string
}

export function MenuItem({ label, icon, shortcut, keys, className, ...props }: MenuItemProps) {
  return (
    <Menu.Item
      aria-keyshortcuts={keys}
      // A disabled item with a title keeps pointer events so the title (why it is off) shows on hover; Radix still
      // neither highlights nor selects it.
      className={cn(ITEM_CLASS, props.title && 'data-[disabled]:pointer-events-auto', className)}
      {...props}
    >
      <IconSlot icon={icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Shortcut>{shortcut}</Shortcut>
    </Menu.Item>
  )
}

interface MenuCheckboxItemProps extends Omit<ComponentProps<typeof Menu.CheckboxItem>, 'children'> {
  label: string
}

export function MenuCheckboxItem({ label, className, ...props }: MenuCheckboxItemProps) {
  return (
    <Menu.CheckboxItem className={cn(ITEM_CLASS, className)} {...props}>
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center text-primary-text"
      >
        <Menu.ItemIndicator>
          <Check size={15} />
        </Menu.ItemIndicator>
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Menu.CheckboxItem>
  )
}

interface MenuRadioItemProps extends Omit<ComponentProps<typeof Menu.RadioItem>, 'children'> {
  label: string
}

export function MenuRadioItem({ label, className, ...props }: MenuRadioItemProps) {
  return (
    <Menu.RadioItem className={cn(ITEM_CLASS, className)} {...props}>
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center text-primary-text"
      >
        <Menu.ItemIndicator>
          <Check size={15} />
        </Menu.ItemIndicator>
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Menu.RadioItem>
  )
}

export function MenuRadioGroup(props: ComponentProps<typeof Menu.RadioGroup>) {
  return <Menu.RadioGroup {...props} />
}

interface MenuSubProps {
  label: string
  icon?: MenuIcon
  /** Current value, shown greyed before the chevron (e.g. "100%"). */
  value?: string
  disabled?: boolean
  children: ReactNode
}

export function MenuSub({ label, icon, value, disabled, children }: MenuSubProps) {
  return (
    <Menu.Sub>
      <Menu.SubTrigger
        disabled={disabled}
        className={cn(ITEM_CLASS, 'data-[state=open]:bg-background-gray-secondary_alt')}
      >
        <IconSlot icon={icon} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {value && (
          <span aria-hidden className="pl-4 text-xs text-text-tertiary tabular-nums">
            {value}
          </span>
        )}
        <ChevronRight aria-hidden size={14} className="ml-1 shrink-0 text-icon-tertiary" />
      </Menu.SubTrigger>
      <Menu.Portal>
        <Menu.SubContent
          sideOffset={6}
          alignOffset={-6}
          collisionPadding={8}
          className={cn(CONTENT_CLASS, 'min-w-[180px]')}
        >
          {children}
        </Menu.SubContent>
      </Menu.Portal>
    </Menu.Sub>
  )
}

export function MenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-card-border" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Menu.Label className="px-2 pt-1.5 pb-1 text-[11px] font-semibold text-text-tertiary">
      {children}
    </Menu.Label>
  )
}
