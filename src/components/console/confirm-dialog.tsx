import type { ReactNode } from 'react'
import Button from './button'
import ConsoleDialog from './dialog'

interface ConfirmDialogProps {
  title: string
  description: ReactNode
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  /** Disables both buttons while the confirmed action runs. */
  busy?: boolean
  /** Confirm-button text while busy. */
  busyLabel?: string
  /** Destructive confirmations use the danger colour. */
  variant?: 'primary' | 'danger'
  /** Larger touch targets on narrow screens. */
  mobileTouchTargets?: boolean
}

// Confirmation on the NextAdmin dialog. Mount it only while it should be visible.
function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
  busyLabel = 'Đang xử lý...',
  variant = 'primary',
  mobileTouchTargets = false,
}: ConfirmDialogProps) {
  const touch = mobileTouchTargets ? 'max-[767px]:min-h-11' : undefined
  return (
    <ConsoleDialog
      open
      onClose={onCancel}
      title={title}
      maxWidth={440}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" className={touch} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} className={touch} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-tertiary">{description}</p>
    </ConsoleDialog>
  )
}

export default ConfirmDialog
