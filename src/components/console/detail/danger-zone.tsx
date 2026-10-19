import { useState, type ReactNode } from 'react'
import Button from '../button'
import ConfirmDialog from '../confirm-dialog'

export interface DangerAction {
  id: string
  /** Button text, e.g. "Hủy đơn". */
  label: string
  /** One line on what it does. */
  hint?: ReactNode
  disabled?: boolean
  busy?: boolean
  confirm: {
    title: string
    description: ReactNode
    confirmLabel: string
    cancelLabel?: string
  }
  /** Runs when the confirmation opens, e.g. to clear an earlier error. */
  onOpen?: () => void
  /** Return false to keep the confirmation open (e.g. the request failed and the error is shown in it). */
  onConfirm: () => Promise<boolean | void> | boolean | void
}

// Lock / cancel / delete actions, last in the view. Every one goes through a confirmation dialog.
export default function DangerZone({ actions }: { actions: DangerAction[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pending = actions.find((action) => action.id === pendingId)
  if (!actions.length) return null

  const confirm = async () => {
    if (!pending) return
    const keepOpen = (await pending.onConfirm()) === false
    if (!keepOpen) setPendingId(null)
  }

  return (
    <section className="rounded-lg border border-badge-error-text/30 p-4">
      <h3 className="text-sm font-medium text-badge-error-text">Vùng nguy hiểm</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {actions.map((action) => (
          <li key={action.id} className="flex flex-wrap items-center justify-between gap-3">
            {action.hint && <p className="min-w-0 flex-1 basis-48 text-sm text-text-tertiary">{action.hint}</p>}
            <Button
              variant="danger"
              appearance="outline"
              disabled={action.disabled || action.busy}
              onClick={() => {
                action.onOpen?.()
                setPendingId(action.id)
              }}
            >
              {action.label}
            </Button>
          </li>
        ))}
      </ul>
      {pending && (
        <ConfirmDialog
          title={pending.confirm.title}
          description={pending.confirm.description}
          cancelLabel={pending.confirm.cancelLabel ?? 'Quay lại'}
          confirmLabel={pending.confirm.confirmLabel}
          variant="danger"
          busy={pending.busy}
          onCancel={() => setPendingId(null)}
          onConfirm={() => void confirm()}
        />
      )}
    </section>
  )
}
