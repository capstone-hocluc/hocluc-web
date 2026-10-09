import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/cn'
import { buttonStyles } from '../tailgrids/core/button'

// Management-area button: NextAdmin (tailgrids) styling behind the same props
// as ui/Button, so call sites keep onClick/disabled/asChild unchanged.
type ConsoleButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ConsoleButtonProps extends Omit<ComponentProps<'button'>, 'color'> {
  variant?: 'primary' | 'danger' | 'success'
  appearance?: 'fill' | 'outline' | 'ghost'
  size?: ConsoleButtonSize
  shape?: 'default' | 'pill'
  /** Render the child element (e.g. an <a>) with the button styles instead of a <button>. */
  asChild?: boolean
}

const SIZE_PADDING: Record<ConsoleButtonSize, string> = {
  sm: 'h-8.5 gap-1.5 px-3',
  md: 'h-10 gap-2 px-4',
  lg: 'h-11 gap-2 px-5',
  icon: 'size-9 p-0',
}

function Button({
  variant = 'primary',
  appearance = 'fill',
  size = 'md',
  shape = 'default',
  className,
  type = 'button',
  asChild = false,
  children,
  ...props
}: ConsoleButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      {...(asChild ? {} : { type })}
      className={cn(
        buttonStyles({ variant, appearance, size: size === 'icon' ? 'md' : size }),
        'whitespace-nowrap',
        SIZE_PADDING[size],
        shape === 'pill' && 'rounded-full',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export default Button
