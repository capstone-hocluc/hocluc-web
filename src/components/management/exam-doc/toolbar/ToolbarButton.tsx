import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/cn'
import { controlClass } from './toolbar-styles'
import type { LucideIcon } from './toolbar-icons'

interface ToolbarButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  label: string
  icon: LucideIcon
  /** Shown in the tooltip, e.g. "Ctrl+B". */
  shortcut?: string
  /** Toggle state; leave undefined for plain actions. */
  pressed?: boolean
}

/** 32px icon button on the toolbar pill. It never takes focus from the editor on click, so the selection stays. */
export function ToolbarButton({
  label,
  icon: Icon,
  shortcut,
  pressed,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-keyshortcuts={shortcut?.replace('Ctrl', 'Control')}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(controlClass, 'w-7 justify-center', className)}
      {...props}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

export function ToolbarSeparator() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-card-border" />
}
