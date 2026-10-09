import type { ReactNode } from 'react'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle } from '../tailgrids/core/dialog'
import { Backdrop, OverlayWrapper } from '../tailgrids/core/overlay'

interface ConsoleDialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Max width in px; the dialog shrinks on narrow screens. */
  maxWidth?: number
  /** Block backdrop click / ESC while a request is running. */
  dismissable?: boolean
  children: ReactNode
}

// NextAdmin dialog: bordered header, scrollable body. Footer buttons go inside
// children so each form owns its submit.
function ConsoleDialog({
  open,
  onClose,
  title,
  description,
  maxWidth = 560,
  dismissable = true,
  children,
}: ConsoleDialogProps) {
  return (
    <OverlayWrapper isOpen={open} onOpenChange={(next) => !next && onClose()}>
      <Backdrop isDismissable={dismissable} isKeyboardDismissDisabled={!dismissable}>
        <Dialog
          className="flex max-h-[calc(100dvh-2rem)] flex-col p-0"
          style={{ maxWidth: `min(${maxWidth}px, calc(100% - 2rem))` }}
          showCloseButton={dismissable}
        >
          <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
            <DialogTitle className="text-xl leading-7 font-medium">{title}</DialogTitle>
            {description && <DialogDescription className="text-text-tertiary">{description}</DialogDescription>}
          </DialogHeader>
          <DialogBody className="overflow-y-auto px-5 py-4">{children}</DialogBody>
        </Dialog>
      </Backdrop>
    </OverlayWrapper>
  )
}

export default ConsoleDialog
