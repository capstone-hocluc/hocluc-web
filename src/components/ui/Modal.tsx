import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

// Radix Dialog gives every modal in the app real accessibility for free
// (focus trap, ESC to close, click-outside to close, ARIA wiring) instead of
// each screen hand-rolling its own backdrop + close-button + focus handling.
// Tailwind only; colors are tokens, so dark mode needs no extra rules. Plain
// h2 / p / label / input children get dialog form styling via descendant variants.
interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  description?: ReactNode
  maxWidth?: number
  className?: string
  children?: ReactNode
}

function Modal({ open, onClose, title, description, maxWidth = 480, className = '', children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 grid place-items-center bg-surface-overlay p-5 backdrop-blur-[5px]">
          <Dialog.Content
            className={cn(
              'relative grid w-full gap-3 rounded-[18px] border border-border-primary bg-surface-elevated p-[25px] text-text-heading shadow-[0_28px_70px_rgba(10,16,35,0.25)]',
              '[&_h2]:m-0 [&_h2]:text-xl [&>p]:-mt-1.5 [&>p]:mb-1 [&>p]:text-[13px] [&>p]:text-text-muted',
              '[&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-text-heading-soft',
              '[&_input]:h-[42px] [&_input]:rounded-[9px] [&_input]:border [&_input]:border-border-primary [&_input]:bg-surface-input [&_input]:px-[11px] [&_input]:text-sm [&_input]:text-text-strong [&_input]:outline-0 [&_input]:focus:border-primary [&_input]:focus:ring-[3px] [&_input]:focus:ring-primary/10',
              '[&_[data-dropdown-trigger]]:h-[42px] [&_[data-dropdown-trigger]]:rounded-[9px] [&_[data-dropdown-trigger]]:border [&_[data-dropdown-trigger]]:border-border-primary [&_[data-dropdown-trigger]]:bg-surface-input [&_[data-dropdown-trigger]]:px-[11px] [&_[data-dropdown-trigger]]:text-sm [&_[data-dropdown-trigger]]:text-text-strong',
              className
            )}
            style={{ width: `min(${maxWidth}px, 100%)` }}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Dialog.Close className="absolute top-[15px] right-[15px] grid cursor-pointer place-items-center border-0 bg-transparent text-text-subtle" aria-label="Đóng">
              <X size={19} />
            </Dialog.Close>
            {title && (
              <Dialog.Title asChild>
                {/* asChild clones this exact element to inject aria props - must be a single
                    real element, never a Fragment, which only accepts key/children. */}
                {typeof title === 'string' ? <h2>{title}</h2> : <div>{title}</div>}
              </Dialog.Title>
            )}
            {description && (
              <Dialog.Description asChild>
                {typeof description === 'string' ? <p>{description}</p> : <div>{description}</div>}
              </Dialog.Description>
            )}
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Modal
