import type { ComponentProps } from 'react'
import { cn } from '../../../lib/cn'
import { Check, Copy } from '../../console/icons'
import { ghostButton, iconSwap, iconSwapIn, iconSwapOut } from './surfaces'

// assistant-ui Elements' message actions: small round ghost buttons under a turn, the copy one swapping to a check.

/** One action under a turn; its props (and an action bar primitive's, through `asChild`) go to the button. */
export function MessageAction({ label, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(ghostButton, 'size-7 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5', className)}
      {...props}
    />
  )
}

/** The copy icon, swapped for a check once the words are copied. */
export function CopySwap({ copied }: { copied: boolean }) {
  return (
    <span className={cn('grid place-items-center', copied && 'text-badge-success-text')}>
      <Copy aria-hidden className={cn(iconSwap, copied ? iconSwapOut : iconSwapIn)} />
      <Check aria-hidden className={cn(iconSwap, copied ? iconSwapIn : iconSwapOut)} />
    </span>
  )
}
