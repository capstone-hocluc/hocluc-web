import { useState, type FormEvent } from 'react'
import ConsoleDialog from '../dialog'
import SelectField from '../select-field'
import Notice from '../notice'
import Button from '../button'
import { fieldControlClass } from '../form-field'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import type { UserSummary } from '../../../services/userService'

interface Props {
  liveClass: ConsoleLiveClass
  teachers: UserSummary[]
  busy: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (teacherId: string) => void
}

function teacherLabel(t: UserSummary) {
  return t.displayName || [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email
}

export default function ChangeTeacherDialog({
  liveClass,
  teachers,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [teacherId, setTeacherId] = useState(liveClass.teacherId ?? '')
  const [localError, setLocalError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!teacherId) {
      setLocalError('Vui lòng chọn giảng viên.')
      return
    }
    setLocalError('')
    onSubmit(teacherId)
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title="Đổi giảng viên"
      maxWidth={480}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy || !teacherId}>
            {busy ? 'Đang lưu…' : 'Xác nhận đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(localError || errorMessage) && <Notice tone="danger">{localError || errorMessage}</Notice>}
        <p className="m-0 text-sm font-medium text-text-primary">{liveClass.title}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Giảng viên dạy thay
          <SelectField
            ariaLabel="Giảng viên dạy thay"
            value={teacherId}
            onChange={setTeacherId}
            disabled={busy || !teachers.length}
            placeholder="Chọn giảng viên"
            triggerClassName={fieldControlClass}
            options={teachers.map((t) => ({ id: t.id, label: teacherLabel(t) }))}
          />
        </label>
      </div>
    </ConsoleDialog>
  )
}
