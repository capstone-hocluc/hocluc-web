import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'
import {
  changeEnrollmentStatus,
  EDITABLE_ENROLLMENT_STATUSES,
  type EditableEnrollmentStatus,
  type EnrollmentAdmin,
  type EnrollmentStatus,
} from '../../../services/enrollmentAdminService'
import { crudError } from './crud-errors'
import { ENROLLMENT_STATUS_LABELS } from './enrollment-labels'

/** The backend edits only ACTIVE / SUSPENDED / CANCELLED; COMPLETED and EXPIRED are derived. */
function editableStatus(status: EnrollmentStatus): EditableEnrollmentStatus | null {
  return EDITABLE_ENROLLMENT_STATUSES.includes(status as EditableEnrollmentStatus)
    ? (status as EditableEnrollmentStatus)
    : null
}

function Picker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-text-primary">
      <span>{label}</span>
      {children}
    </div>
  )
}

export default function EnrollmentStatusDialog({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: EnrollmentAdmin
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<EditableEnrollmentStatus>(
    editableStatus(enrollment.status) ?? 'ACTIVE'
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await changeEnrollmentStatus(enrollment.id, status)
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
      title="Đổi trạng thái ghi danh"
      description={`${enrollment.courseTitle} · ${enrollment.studentName ?? enrollment.studentEmail}`}
      maxWidth={480}
      dismissable={!busy}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu trạng thái'}
          </Button>
        </>
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <Picker label="Trạng thái">
          <SelectField
            ariaLabel="Trạng thái ghi danh"
            value={status}
            onChange={(value) => setStatus(value as EditableEnrollmentStatus)}
            disabled={busy}
            triggerClassName="w-full"
            options={EDITABLE_ENROLLMENT_STATUSES.map((id) => ({
              id,
              label: ENROLLMENT_STATUS_LABELS[id],
            }))}
          />
        </Picker>
        <p className="text-sm text-text-tertiary">
          Tạm dừng giữ nguyên tiến độ; hủy thì học viên mất quyền học. Hoàn thành và hết hạn do hệ thống
          tự đặt.
        </p>
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
      </div>
    </ConsoleDialog>
  )
}
