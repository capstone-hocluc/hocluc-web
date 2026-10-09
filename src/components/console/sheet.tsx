import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetOverlay, SheetTitle } from '../tailgrids/core/sheet'

interface ConsoleSheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Block overlay click / ESC while a request is running. */
  closeDisabled?: boolean
  children: ReactNode
}

// NextAdmin side drawer: title header, scrollable body. Footer buttons go inside
// children so each form owns its submit.
function ConsoleSheet({ open, onClose, title, closeDisabled = false, children }: ConsoleSheetProps) {
  return (
    <Sheet isOpen={open} onOpenChange={(next) => !next && !closeDisabled && onClose()}>
      <SheetOverlay isDismissable={!closeDisabled} isKeyboardDismissDisabled={closeDisabled}>
        <SheetContent side="right" showCloseButton={!closeDisabled} className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-card-border py-4 pr-14 pl-5">
            <SheetTitle className="text-xl leading-7 font-medium text-text-primary">{title}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </SheetContent>
      </SheetOverlay>
    </Sheet>
  )
}

export default ConsoleSheet
