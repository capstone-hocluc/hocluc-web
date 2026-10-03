import type { ReactNode } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import Button from './Button'

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
  /** Increase action targets on narrow screens for responsive workflows. */
  mobileTouchTargets?: boolean
  /** Add a page-scoped style boundary to the portaled content. */
  contentClassName?: string
}

// Confirmation modal on Radix AlertDialog (focus trap, ESC = cancel, aria wiring).
// Mount it only while it should be visible.
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
  contentClassName,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-90 grid place-items-center bg-[rgba(13,19,38,0.55)] p-5">
          <AlertDialog.Content className={`w-full max-w-[420px] rounded-[18px] bg-surface p-[26px] shadow-[0_30px_60px_-20px_rgba(17,24,58,0.4)] ${contentClassName ?? ''}`}>
            <AlertDialog.Title className="mb-2.5 text-[17px] font-bold text-text-heading">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-5 text-[13.5px] leading-[1.6] text-text-secondary">
              {description}
            </AlertDialog.Description>
            <div className="flex gap-2.5">
              <Button
                asChild
                appearance="outline"
                className={`${mobileTouchTargets ? 'max-[767px]:min-h-11 ' : ''}flex-1 border-border-primary bg-surface-soft text-text-heading hover:bg-surface-hover`}
              >
                <AlertDialog.Cancel disabled={busy}>{cancelLabel}</AlertDialog.Cancel>
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                className={`flex-1 ${mobileTouchTargets ? 'max-[767px]:min-h-11' : ''}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? busyLabel : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export default ConfirmDialog
