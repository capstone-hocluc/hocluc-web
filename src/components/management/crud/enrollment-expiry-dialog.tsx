import { useState, type FormEvent } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import {
  changeEnrollmentExpiry,
  type EnrollmentAdmin,
} from '../../../services/enrollmentAdminService'
import { crudError } from './crud-errors'
import { endOfDayInstant, formatDateTime, toDateInput } from './crud-format'

/** Operator sets the access window; a date already passed cuts access immediately. */
export default function EnrollmentExpiryDialog({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: EnrollmentAdmin
  onClose: () => void
  onSaved: () => void
}) {
  const [unlimited, setUnlimited] = useState(!enrollment.expiresAt)
  const [date, setDate] = useState(toDateInput(enrollment.expiresAt))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!unlimited && !date) {
      setError('Chọn ngày hết hạn hoặc bật không giới hạn.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await changeEnrollmentExpiry(enrollment.id, unlimited ? null : endOfDayInstant(date))
      onSaved()
    } catch (err) {
      setError(crudError(err))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Sửa hạn truy cập"
      description={`${enrollment.courseTitle} · ${enrollment.studentName ?? enrollment.studentEmail}`}
      maxWidth={480}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu hạn dùng'}
          </Button>
        </>
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-tertiary">
          Hiện tại: {enrollment.expiresAt ? formatDateTime(enrollment.expiresAt) : 'Không giới hạn'}
        </p>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            className="size-4 rounded border-card-border"
            checked={unlimited}
            onChange={(event) => setUnlimited(event.target.checked)}
            disabled={busy}
          />
          Không giới hạn
        </label>
        {!unlimited && (
          <Field label="Hết hạn ngày" hint="Hết ngày đã chọn theo giờ Việt Nam.">
            <input
              type="date"
              className={fieldControlClass}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={busy}
            />
          </Field>
        )}
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
      </div>
    </ConsoleDialog>
  )
}
