import type { ComponentProps, ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from '../console/icons'
import { cn } from '../../lib/cn'
import Button from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Accessible label of the close button. */
  closeLabel?: string
  /** Prevent closing while a submitted change is still pending. */
  closeDisabled?: boolean
  /** Optional responsive sizing for the close action. */
  closeButtonClassName?: string
  className?: string
  children: ReactNode
}

// Side drawer on Radix Dialog (focus trap, ESC, overlay click, aria wiring).
// Slides in from the left edge; the header carries the title + close button.
export function Sheet({
  open,
  onClose,
  title,
  closeLabel = 'Đóng',
  closeDisabled = false,
  closeButtonClassName,
  className,
  children,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !closeDisabled && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-[rgba(5,8,18,0.52)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-80 flex w-[min(420px,92vw)] flex-col bg-surface shadow-[24px_0_60px_rgba(0,0,0,0.22)] outline-none max-[760px]:w-[min(100vw,440px)]',
            className
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-4">
            <Dialog.Title className="text-lg font-bold text-text-heading">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button
                appearance="outline"
                size="icon"
                className={cn('border-line-blue', closeButtonClassName)}
                aria-label={closeLabel}
                disabled={closeDisabled}
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export type SheetBodyProps = ComponentProps<'div'>

// Scrollable content area under the sheet header.
export function SheetBody({ className, ...props }: SheetBodyProps) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />
}
