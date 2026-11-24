import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetOverlay, SheetTitle } from '../tailgrids/core/sheet'
import { X } from './icons'

interface ConsoleSheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Block overlay click / ESC while a request is running. */
  closeDisabled?: boolean
  /**
   * A card beside the page instead of a drawer over it: placed where it is rendered, the page still usable around it
   * (an editor's settings next to its questions).
   */
  docked?: boolean
  children: ReactNode
}

// NextAdmin side drawer: title header, scrollable body. Footer buttons go inside
// children so each form owns its submit.
function ConsoleSheet({ open, onClose, title, closeDisabled = false, docked = false, children }: ConsoleSheetProps) {
  if (docked) {
    if (!open) return null
    return (
      <aside
        aria-label={typeof title === 'string' ? title : undefined}
        className="flex w-[min(460px,36vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-card-border bg-card-background shadow-xs"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-card-border py-3 pr-2 pl-5">
          <h2 className="m-0 min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Đóng"
            title="Đóng"
            className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 app-scroll overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    )
  }
  return (
    <Sheet isOpen={open} onOpenChange={(next) => !next && !closeDisabled && onClose()}>
      <SheetOverlay isDismissable={!closeDisabled} isKeyboardDismissDisabled={closeDisabled}>
        <SheetContent side="right" showCloseButton={!closeDisabled} className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-card-border py-4 pr-14 pl-5">
            <SheetTitle className="text-xl leading-7 font-medium text-text-primary">{title}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 app-scroll overflow-y-auto px-5 py-4">{children}</div>
        </SheetContent>
      </SheetOverlay>
    </Sheet>
  )
}

export default ConsoleSheet
