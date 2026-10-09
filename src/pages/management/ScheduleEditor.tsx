import { useState, type FormEvent } from 'react'
import { localDateTimeToInstant, instantToLocalDateTimeInput, SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type { CreateScheduleRequest, DeliveryMode, ScheduleResponse, UpdateScheduleRequest } from '../../types/scheduling'
import type { UserSummary } from '../../services/userService'
import Button from '../../components/console/button'
import ConfirmDialog from '../../components/console/confirm-dialog'
import SelectField from '../../components/console/select-field'
import Notice from '../../components/console/notice'
import ConsoleSheet from '../../components/console/sheet'
import Field, { fieldControlClass, textareaControlClass } from '../../components/console/form-field'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

function teacherName(teacher: UserSummary) {
  return teacher.displayName || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.email
}

interface Props {
  initial?: ScheduleResponse
  courseName?: string
  teachers: UserSummary[]
  teachersLoading?: boolean
  teachersError?: string
  busy?: boolean
  errorMessage?: string
  onClose: () => void
  onSave: (payload: CreateScheduleRequest | UpdateScheduleRequest) => void
}

export default function ScheduleEditor({
  initial,
  courseName,
  teachers,
  teachersLoading = false,
  teachersError,
  busy = false,
  errorMessage,
  onClose,
  onSave,
}: Props) {
  const timezone = initial?.timezone || SCHEDULING_TIMEZONE
  const baseline = {
    title: initial?.title ?? '',
    startDateTime: initial ? instantToLocalDateTimeInput(initial.startTime, timezone) : '',
    endDateTime: initial ? instantToLocalDateTimeInput(initial.endTime, timezone) : '',
    deliveryMode: initial?.deliveryMode ?? 'PHYSICAL',
    location: initial?.location ?? '',
    description: initial?.description ?? '',
  }
  const [teacherId, setTeacherId] = useState(initial?.instructorId ?? '')
  const [startDateTime, setStartDateTime] = useState(baseline.startDateTime)
  const [endDateTime, setEndDateTime] = useState(baseline.endDateTime)
  const [fieldsDirty, setFieldsDirty] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const isDirty = fieldsDirty || teacherId !== (initial?.instructorId ?? '')
  const unsavedGuard = useUnsavedActionGuard(isDirty, busy)
  const requestClose = () => unsavedGuard.requestAction(onClose)
  const updateFieldDraft = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    setFieldsDirty(
      (['title', 'startDateTime', 'endDateTime', 'deliveryMode', 'location', 'description'] as const)
        .some((name) => String(form.get(name) ?? '') !== baseline[name])
    )
  }
  const teacherOptions = [
    ...teachers.map((teacher) => ({ id: teacher.id, label: teacherName(teacher) })),
    ...(initial && !teachers.some((teacher) => teacher.id === initial.instructorId)
      ? [{ id: initial.instructorId, label: initial.instructorName }]
      : []),
  ]

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || teachersError || (!initial && teachers.length === 0)) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    const start = new Date(startDateTime)
    const end = new Date(endDateTime)
    const reject = (message: string, selector: string) => {
      setValidationMessage(message)
      event.currentTarget.querySelector<HTMLElement>(selector)?.focus()
    }
    if (!title) return reject('Nhập tên buổi học.', '[name="title"]')
    if (!startDateTime || !endDateTime || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return reject(
        'Chọn thời gian bắt đầu và kết thúc hợp lệ.',
        !startDateTime ? '[name="startDateTime"]' : '[name="endDateTime"]'
      )
    }
    if (end <= start) return reject('Thời gian kết thúc phải sau thời gian bắt đầu.', '[name="endDateTime"]')
    const startTime = localDateTimeToInstant(startDateTime.slice(0, 10), Number(startDateTime.slice(11, 13)), Number(startDateTime.slice(14, 16)), timezone)
    const endTime = localDateTimeToInstant(endDateTime.slice(0, 10), Number(endDateTime.slice(11, 13)), Number(endDateTime.slice(14, 16)), timezone)
    if (!initial && Date.parse(startTime) <= Date.now()) {
      return reject('Lịch mới phải bắt đầu trong tương lai.', '[name="startDateTime"]')
    }
    if (!initial && !teacherId) return reject('Chọn giáo viên phụ trách.', '[aria-label="Chọn giáo viên"]')

    const payload: UpdateScheduleRequest = {
      ...(teacherId ? { instructorId: teacherId } : {}),
      title,
      description: String(form.get('description') || ''),
      startTime,
      endTime,
      timezone,
      deliveryMode: String(form.get('deliveryMode') || 'PHYSICAL') as DeliveryMode,
      location: String(form.get('location') || ''),
    }
    setValidationMessage('')
    if (initial) {
      onSave(payload)
    } else {
      onSave({ ...payload, instructorId: teacherId } as CreateScheduleRequest)
    }
  }

  return (
    <>
      <ConsoleSheet open onClose={requestClose} closeDisabled={busy} title={initial ? 'Chỉnh sửa lịch học' : 'Tạo lịch học'}>
        <form className="flex flex-col gap-4" onSubmit={submit} onChange={updateFieldDraft}>
          {courseName && <Notice tone="info">Khóa: {courseName}</Notice>}
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
          {validationMessage && <p className="text-sm text-badge-error-text" role="alert">{validationMessage}</p>}
          <Field label="Tên buổi học">
            <input name="title" autoComplete="off" required disabled={busy} defaultValue={initial?.title ?? ''} className={fieldControlClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bắt đầu">
              <input
                name="startDateTime"
                autoComplete="off"
                type="datetime-local"
                required
                disabled={busy}
                value={startDateTime}
                onChange={(event) => setStartDateTime(event.target.value)}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Kết thúc">
              <input
                name="endDateTime"
                autoComplete="off"
                type="datetime-local"
                required
                disabled={busy}
                value={endDateTime}
                onChange={(event) => setEndDateTime(event.target.value)}
                className={fieldControlClass}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Giáo viên</span>
            <SelectField
              ariaLabel="Chọn giáo viên"
              options={teacherOptions}
              value={teacherId}
              onChange={setTeacherId}
              disabled={busy || teachersLoading || Boolean(teachersError)}
              placeholder={teachersLoading ? 'Đang tải…' : 'Chọn giáo viên'}
              className="w-full"
              triggerClassName="w-full"
            />
            {teachersError && <p className="text-xs text-badge-error-text">{teachersError}</p>}
            {!teachersError && !teachersLoading && !initial && teachers.length === 0 && (
              <p className="text-xs text-text-tertiary">Chưa có giáo viên phù hợp.</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hình thức">
              <select name="deliveryMode" disabled={busy} defaultValue={initial?.deliveryMode ?? 'PHYSICAL'} className={fieldControlClass}>
                <option value="PHYSICAL">Trực tiếp</option>
                <option value="ONLINE">Trực tuyến</option>
                <option value="HYBRID">Kết hợp</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </Field>
            <Field label="Phòng / địa điểm">
              <input name="location" autoComplete="off" disabled={busy} defaultValue={initial?.location ?? ''} className={fieldControlClass} />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea name="description" autoComplete="off" rows={3} disabled={busy} defaultValue={initial?.description ?? ''} className={textareaControlClass} />
          </Field>
          <p className="text-xs text-text-tertiary">Múi giờ: {timezone}</p>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <Button type="button" appearance="outline" disabled={busy} onClick={requestClose}>Đóng</Button>
            <Button type="submit" disabled={busy || Boolean(teachersError) || (!initial && teachers.length === 0)}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </form>
      </ConsoleSheet>
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Các chỉnh sửa chưa được gửi sẽ bị bỏ."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </>
  )
}
