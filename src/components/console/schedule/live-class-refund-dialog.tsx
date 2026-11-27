import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../dialog'
import Notice from '../notice'
import Button from '../button'
import Field, { textareaControlClass } from '../form-field'
import type { ConsoleLiveClass } from '../../../services/liveClassService'

interface Props {
  liveClass: ConsoleLiveClass
  busy: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (reason: string) => void
}

export default function LiveClassRefundDialog({
  liveClass,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setLocalError('Vui lòng nhập lý do hoàn Sao.')
      return
    }
    setLocalError('')
    onSubmit(trimmed)
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title="Hoàn Sao buổi học"
      maxWidth={480}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {busy ? 'Đang hoàn Sao…' : 'Hoàn Sao'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(localError || errorMessage) && <Notice tone="danger">{localError || errorMessage}</Notice>}
        <p className="m-0 text-sm font-medium text-text-primary">{liveClass.title}</p>
        <Field label="Lý do hoàn Sao" required>
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            disabled={busy}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={textareaControlClass}
          />
        </Field>
      </div>
    </ConsoleDialog>
  )
}
