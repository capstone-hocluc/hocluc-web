import { useState, type FormEvent } from 'react'
import { instantToLocalDateTimeInput, localDateTimeToInstant, SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type { ClassSessionResponse, DeliveryMode, ScheduleStatus, UpdateClassSessionRequest } from '../../types/scheduling'
import Button from '../../components/console/button'
import ConfirmDialog from '../../components/console/confirm-dialog'
import Notice from '../../components/console/notice'
import ConsoleSheet from '../../components/console/sheet'
import Field, { fieldControlClass } from '../../components/console/form-field'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

interface Props {
  session: ClassSessionResponse
  busy?: boolean
  errorMessage?: string
  onClose: () => void
  onSave: (payload: UpdateClassSessionRequest) => void
}

export default function ClassSessionEditor({ session, busy = false, errorMessage, onClose, onSave }: Props) {
  const baseline = {
    title: session.title,
    startDateTime: instantToLocalDateTimeInput(session.startTime),
    endDateTime: instantToLocalDateTimeInput(session.endTime),
    mode: session.mode,
    status: session.status,
    classroom: session.classroom ?? '',
    meetingProvider: session.meetingProvider ?? 'ZOOM',
    meetingLink: session.meetingLink ?? '',
  }
  const [start, setStart] = useState(baseline.startDateTime)
  const [end, setEnd] = useState(baseline.endDateTime)
  const [fieldsDirty, setFieldsDirty] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const unsavedGuard = useUnsavedActionGuard(fieldsDirty, busy)
  const requestClose = () => unsavedGuard.requestAction(onClose)
  const updateFieldDraft = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    setFieldsDirty(
      (['title', 'startDateTime', 'endDateTime', 'mode', 'status', 'classroom', 'meetingProvider', 'meetingLink'] as const)
        .some((name) => String(form.get(name) ?? '') !== baseline[name])
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startValue = new Date(start)
    const endValue = new Date(end)
    const reject = (message: string, selector: string) => {
      setValidationMessage(message)
      event.currentTarget.querySelector<HTMLElement>(selector)?.focus()
    }
    if (!start || !end || Number.isNaN(startValue.getTime()) || Number.isNaN(endValue.getTime())) {
      return reject(
        'Chọn thời gian bắt đầu và kết thúc hợp lệ.',
        !start ? '[name="startDateTime"]' : '[name="endDateTime"]'
      )
    }
    if (endValue <= startValue) {
      return reject('Thời gian kết thúc phải sau thời gian bắt đầu.', '[name="endDateTime"]')
    }
    setValidationMessage('')
    onSave({
      teacherId: session.teacherId,
      title: String(form.get('title') || '').trim(),
      sessionDate: start.slice(0, 10),
      startTime: localDateTimeToInstant(start.slice(0, 10), Number(start.slice(11, 13)), Number(start.slice(14, 16))),
      endTime: localDateTimeToInstant(end.slice(0, 10), Number(end.slice(11, 13)), Number(end.slice(14, 16))),
      mode: String(form.get('mode') || session.mode) as DeliveryMode,
      classroom: String(form.get('classroom') || ''),
      meetingProvider: String(form.get('meetingProvider') || 'ZOOM') as UpdateClassSessionRequest['meetingProvider'],
      meetingLink: String(form.get('meetingLink') || ''),
      status: String(form.get('status') || session.status) as ScheduleStatus,
    })
  }

  return (
    <>
      <ConsoleSheet open onClose={requestClose} closeDisabled={busy} title="Chỉnh sửa buổi học">
        <form className="flex flex-col gap-4" onSubmit={submit} onChange={updateFieldDraft}>
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
          {validationMessage && <p className="text-sm text-badge-error-text" role="alert">{validationMessage}</p>}
          <Field label="Tên buổi">
            <input name="title" autoComplete="off" required disabled={busy} defaultValue={session.title} className={fieldControlClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bắt đầu">
              <input name="startDateTime" autoComplete="off" type="datetime-local" required disabled={busy} value={start} onChange={(event) => setStart(event.target.value)} className={fieldControlClass} />
            </Field>
            <Field label="Kết thúc">
              <input name="endDateTime" autoComplete="off" type="datetime-local" required disabled={busy} value={end} onChange={(event) => setEnd(event.target.value)} className={fieldControlClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hình thức">
              <select name="mode" disabled={busy} defaultValue={session.mode} className={fieldControlClass}>
                <option value="PHYSICAL">Trực tiếp</option>
                <option value="ONLINE">Trực tuyến</option>
                <option value="HYBRID">Kết hợp</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </Field>
            <Field label="Trạng thái">
              <select name="status" disabled={busy} defaultValue={session.status} className={fieldControlClass}>
                <option value="SCHEDULED">Sắp diễn ra</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </Field>
          </div>
          <Field label="Phòng học">
            <input name="classroom" autoComplete="off" disabled={busy} defaultValue={session.classroom ?? ''} className={fieldControlClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nền tảng họp">
              <select name="meetingProvider" disabled={busy} defaultValue={session.meetingProvider ?? 'ZOOM'} className={fieldControlClass}>
                <option value="ZOOM">Zoom</option>
                <option value="GOOGLE_MEET">Google Meet</option>
                <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Link phòng">
              <input name="meetingLink" autoComplete="off" type="url" disabled={busy} defaultValue={session.meetingLink ?? ''} className={fieldControlClass} />
            </Field>
          </div>
          <p className="text-xs text-text-tertiary">Múi giờ: {SCHEDULING_TIMEZONE}. Chỉ áp dụng cho buổi này.</p>
          <div className="flex justify-end gap-2 border-t border-card-border pt-4">
            <Button type="button" appearance="outline" disabled={busy} onClick={requestClose}>Đóng</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
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
