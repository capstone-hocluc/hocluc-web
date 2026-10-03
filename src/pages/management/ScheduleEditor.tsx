import { useState, type FormEvent } from 'react'
import { localDateTimeToInstant, instantToLocalDateTimeInput, SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type { CreateScheduleRequest, DeliveryMode, ScheduleResponse, UpdateScheduleRequest } from '../../types/scheduling'
import type { UserSummary } from '../../services/userService'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DropdownField from '../../components/ui/DropdownField'
import Notice from '../../components/ui/Notice'
import { Sheet, SheetBody } from '../../components/ui/Sheet'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

const fieldClass =
  'mt-1 h-10 max-[767px]:h-11 w-full rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

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
      <Sheet open onClose={requestClose} closeDisabled={busy} className="hl-scheduling" closeButtonClassName="max-[767px]:size-11" title={initial ? 'Chỉnh sửa lịch học' : 'Tạo lịch học'}>
        <SheetBody className="p-4">
        <form className="space-y-4" onSubmit={submit} onChange={updateFieldDraft}>
          {courseName && <Notice tone="info">Tạo lịch đơn cho khóa: {courseName}</Notice>}
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
          {validationMessage && <p className="text-sm text-danger" role="alert">{validationMessage}</p>}
          <label className="block text-sm font-medium text-text-heading">
            Tên buổi học
            <input name="title" autoComplete="off" required disabled={busy} defaultValue={initial?.title ?? ''} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Bắt đầu
              <input
                name="startDateTime"
                autoComplete="off"
                type="datetime-local"
                required
                disabled={busy}
                value={startDateTime}
                onChange={(event) => setStartDateTime(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Kết thúc
              <input
                name="endDateTime"
                autoComplete="off"
                type="datetime-local"
                required
                disabled={busy}
                value={endDateTime}
                onChange={(event) => setEndDateTime(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-text-heading">
            Giáo viên
            <DropdownField
              contentClassName="hl-scheduling"
              ariaLabel="Chọn giáo viên"
              options={teacherOptions}
              value={teacherId || null}
              mobileTouchTargets
              onChange={(value) => setTeacherId(value ?? '')}
              isDisabled={busy}
              isSearchable
              searchPlaceholder="Tìm giáo viên…"
              isLoading={teachersLoading}
              isError={Boolean(teachersError)}
              errorMessage={teachersError || 'Không thể tải danh sách giáo viên.'}
              emptyMessage="Không có giáo viên phù hợp trong danh sách đã tải."
              placeholder="Chọn giáo viên"
            />
            {!initial && <p className="mt-1 text-xs text-text-muted">Danh sách gồm giáo viên đang hoạt động. Giáo viên cần được phân công cho khóa này trước khi tạo lịch.</p>}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Hình thức
              <select name="deliveryMode" disabled={busy} defaultValue={initial?.deliveryMode ?? 'PHYSICAL'} className={fieldClass}>
                <option value="PHYSICAL">Trực tiếp</option>
                <option value="ONLINE">Trực tuyến</option>
                <option value="HYBRID">Kết hợp</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Phòng / địa điểm
              <input name="location" autoComplete="off" disabled={busy} defaultValue={initial?.location ?? ''} className={fieldClass} />
            </label>
          </div>
          <label className="block text-sm font-medium text-text-heading">
            Mô tả
            <textarea name="description" autoComplete="off" rows={3} disabled={busy} defaultValue={initial?.description ?? ''} className={fieldClass + ' h-auto max-[767px]:h-auto min-h-24 py-2'} />
          </label>
          <p className="text-xs text-text-muted">Múi giờ lịch: {timezone}. Đường dẫn phòng chỉ hiển thị khi hệ thống đã cung cấp.</p>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button appearance="outline" className="max-[767px]:min-h-11" disabled={busy} onClick={requestClose}>Đóng</Button>
            <Button type="submit" className="max-[767px]:min-h-11" disabled={busy || Boolean(teachersError) || (!initial && teachers.length === 0)}>
              {busy ? 'Đang lưu…' : 'Lưu lịch'}
            </Button>
          </div>
        </form>
        </SheetBody>
      </Sheet>
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi lịch học chưa lưu?"
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
