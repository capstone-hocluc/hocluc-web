import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Button from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tailgrids/core/tooltip'

interface IconActionProps {
  /** Accessible name and tooltip text, e.g. "Sửa". */
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger'
}

// One row action in a table: an icon button whose name stays readable for assistive tech and tooltips.
export function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = 'primary',
}: IconActionProps) {
  return (
    <Tooltip placement="top">
      <TooltipTrigger asChild>
        <Button
          size="icon"
          appearance="ghost"
          variant={variant}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'size-8',
            variant === 'primary' && 'text-icon-tertiary hover:text-icon-primary'
          )}
        >
          <Icon size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/** Right-aligned strip that keeps a column's icon actions in a fixed spot whatever the row allows. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  )
}
