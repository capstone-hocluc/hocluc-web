import type { FormEvent, ReactNode } from 'react'
import { Form } from 'react-aria-components'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../tailgrids/core/dialog'
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
  /** Action buttons, rendered in the bordered footer. */
  footer?: ReactNode
  /** Makes the dialog a form: header, body and footer share one submit. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}

// NextAdmin dialog (the "Update Password" pattern): bordered header, scrollable
// body, bordered footer with the actions.
function ConsoleDialog({
  open,
  onClose,
  title,
  description,
  maxWidth = 560,
  dismissable = true,
  footer,
  onSubmit,
  children,
}: ConsoleDialogProps) {
  const content = (
    <>
      <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
        <DialogTitle className="text-xl leading-7">{title}</DialogTitle>
        {description && <DialogDescription className="text-text-tertiary">{description}</DialogDescription>}
      </DialogHeader>
      <DialogBody className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</DialogBody>
      {footer && <DialogFooter className="border-t border-card-border px-5 py-4">{footer}</DialogFooter>}
    </>
  )

  return (
    <OverlayWrapper isOpen={open} onOpenChange={(next) => !next && onClose()}>
      <Backdrop isDismissable={dismissable} isKeyboardDismissDisabled={!dismissable}>
        <Dialog
          className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0"
          style={{ maxWidth: `min(${maxWidth}px, calc(100% - 2rem))` }}
          showCloseButton={dismissable}
        >
          {onSubmit ? (
            <Form
              className="flex max-h-[calc(100dvh-2rem)] flex-col"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmit(event)
              }}
            >
              {content}
            </Form>
          ) : (
            <div className="flex max-h-[calc(100dvh-2rem)] flex-col">{content}</div>
          )}
        </Dialog>
      </Backdrop>
    </OverlayWrapper>
  )
}

export default ConsoleDialog
