import { useState, type FormEvent } from 'react'
import { instantToLocalDateTimeInput, localDateTimeToInstant, SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type { ClassSessionResponse, DeliveryMode, ScheduleStatus, UpdateClassSessionRequest } from '../../types/scheduling'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Notice from '../../components/ui/Notice'
import { Sheet, SheetBody } from '../../components/ui/Sheet'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

const fieldClass =
  'mt-1 h-10 max-[767px]:h-11 w-full rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

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
      <Sheet open onClose={requestClose} closeDisabled={busy} className="hl-scheduling" closeButtonClassName="max-[767px]:size-11" title="Chỉnh sửa buổi học">
        <SheetBody className="p-4">
        <form className="space-y-4" onSubmit={submit} onChange={updateFieldDraft}>
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
          {validationMessage && <p className="text-sm text-danger" role="alert">{validationMessage}</p>}
          <label className="block text-sm font-medium text-text-heading">
            Tên buổi
            <input name="title" autoComplete="off" required disabled={busy} defaultValue={session.title} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Bắt đầu
              <input name="startDateTime" autoComplete="off" type="datetime-local" required disabled={busy} value={start} onChange={(event) => setStart(event.target.value)} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Kết thúc
              <input name="endDateTime" autoComplete="off" type="datetime-local" required disabled={busy} value={end} onChange={(event) => setEnd(event.target.value)} className={fieldClass} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Hình thức
              <select name="mode" disabled={busy} defaultValue={session.mode} className={fieldClass}>
                <option value="PHYSICAL">Trực tiếp</option>
                <option value="ONLINE">Trực tuyến</option>
                <option value="HYBRID">Kết hợp</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Trạng thái
              <select name="status" disabled={busy} defaultValue={session.status} className={fieldClass}>
                <option value="SCHEDULED">Sắp diễn ra</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-text-heading">
            Phòng học
            <input name="classroom" autoComplete="off" disabled={busy} defaultValue={session.classroom ?? ''} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Nền tảng họp
              <select name="meetingProvider" disabled={busy} defaultValue={session.meetingProvider ?? 'ZOOM'} className={fieldClass}>
                <option value="ZOOM">Zoom</option>
                <option value="GOOGLE_MEET">Google Meet</option>
                <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                <option value="OTHER">Khác</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Link phòng
              <input name="meetingLink" autoComplete="off" type="url" disabled={busy} defaultValue={session.meetingLink ?? ''} className={fieldClass} />
            </label>
          </div>
          <p className="text-xs text-text-muted">Thời gian theo {SCHEDULING_TIMEZONE}. Thay đổi chỉ áp dụng cho buổi này, không làm đổi cả chuỗi.</p>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button appearance="outline" className="max-[767px]:min-h-11" disabled={busy} onClick={requestClose}>Đóng</Button>
            <Button type="submit" className="max-[767px]:min-h-11" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu buổi học'}</Button>
          </div>
        </form>
        </SheetBody>
      </Sheet>
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi buổi học chưa lưu?"
          description="Các trường bạn vừa chỉnh chưa được gửi lên máy chủ. Nếu tiếp tục, những thay đổi này sẽ bị bỏ."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          mobileTouchTargets
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </>
  )
}
