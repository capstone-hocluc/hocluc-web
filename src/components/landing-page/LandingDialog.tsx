import { useLayoutEffect, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import Icon from './Icon'

interface LandingDialogProps {
  id: string
  titleId: string
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  closeLabel: string
  children: ReactNode
}

// Native <dialog> opened with showModal(): focus trap, Escape and the backdrop come from the browser.
function LandingDialog({
  id,
  titleId,
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
}: LandingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Layout effect so an open/close requested inside flushSync takes effect before the caller continues.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    if (outside) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="dialog-top">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle !== undefined && <p>{subtitle}</p>}
        </div>
        <button type="button" className="close-dialog" aria-label={closeLabel} onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export default LandingDialog
