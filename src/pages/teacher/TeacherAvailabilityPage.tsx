import { useRef, useState, type FormEvent } from 'react'
import { CalendarPlus, Clock3, Trash2 } from 'lucide-react'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getMyAvailability,
  replaceMyAvailability,
} from '../../services/teacherAvailabilityService'
import type { AvailabilityExceptionResponse, AvailabilitySlot, DayOfWeek } from '../../types/scheduling'
import { getErrorMessage } from '../../lib/errors'
import { localDateLabel } from '../../lib/scheduling'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Notice from '../../components/ui/Notice'
import TeacherPageHeader from '../../components/teacher/TeacherPageHeader'
import ScheduleResourceState from '../../components/scheduling/ScheduleResourceState'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'

const weekdays: Array<{ value: DayOfWeek; label: string }> = [
  { value: 'MONDAY', label: 'Thứ Hai' },
  { value: 'TUESDAY', label: 'Thứ Ba' },
  { value: 'WEDNESDAY', label: 'Thứ Tư' },
  { value: 'THURSDAY', label: 'Thứ Năm' },
  { value: 'FRIDAY', label: 'Thứ Sáu' },
  { value: 'SATURDAY', label: 'Thứ Bảy' },
  { value: 'SUNDAY', label: 'Chủ Nhật' },
]

const fieldClass =
  'h-10 max-[767px]:h-11 min-w-0 rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

export default function TeacherAvailabilityPage() {
  const resource = useScheduleResource('teacher-my-availability', getMyAvailability)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [availabilityDirty, setAvailabilityDirty] = useState(false)
  const [exceptionDirty, setExceptionDirty] = useState(false)
  const [exceptionToDelete, setExceptionToDelete] = useState<AvailabilityExceptionResponse | null>(null)
  const exceptionFormRef = useRef<HTMLFormElement>(null)
  const unsavedGuard = useUnsavedActionGuard(availabilityDirty || exceptionDirty, busy)

  const requestReload = () => unsavedGuard.requestAction(() => {
    setAvailabilityDirty(false)
    setExceptionDirty(false)
    exceptionFormRef.current?.reset()
    resource.reload()
  })

  const saveSlots = async (slots: AvailabilitySlot[]) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await replaceMyAvailability({ slots })
      setAvailabilityDirty(false)
      setNotice('Đã lưu giờ rảnh. Đang tải lại dữ liệu đã lưu.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const addException = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (availabilityDirty) {
      setError('Lưu khung giờ tuần hoặc tải lại để bỏ thay đổi trước khi thêm ngoại lệ.')
      return
    }
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const exceptionDate = String(form.get('exceptionDate') || '')
    const startTime = String(form.get('startTime') || '')
    const endTime = String(form.get('endTime') || '')
    if (!exceptionDate) {
      setError('Chọn ngày ngoại lệ.')
      return
    }
    if ((startTime || endTime) && (!startTime || !endTime || startTime >= endTime)) {
      setError('Ngoại lệ có khung giờ cần đủ giờ bắt đầu và kết thúc hợp lệ.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await createAvailabilityException({
        exceptionDate,
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        isAvailable: form.get('isAvailable') === 'on',
        reason: String(form.get('reason') || ''),
      })
      formElement.reset()
      setExceptionDirty(false)
      setNotice('Đã thêm ngoại lệ. Đang tải lại dữ liệu đã lưu.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const removeException = async () => {
    if (!exceptionToDelete || availabilityDirty || exceptionDirty) return
    setBusy(true)
    setError('')
    try {
      await deleteAvailabilityException(exceptionToDelete.id)
      setExceptionToDelete(null)
      setNotice('Đã xóa ngoại lệ.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hl-scheduling space-y-5">
      <TeacherPageHeader
        eyebrow="GIẢNG DẠY"
        title="Giờ rảnh"
        description="Cập nhật khung giờ lặp hằng tuần và ngoại lệ theo ngày."
        actions={<Button appearance="outline" className="max-[767px]:min-h-11" disabled={busy} onClick={requestReload}><Clock3 size={16} />Tải lại</Button>}
      />
      {busy && <Notice tone="info">Đang lưu giờ rảnh. Hãy đợi hoàn tất trước khi rời trang.</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}

      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        <Card as="section" padding="lg" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-heading">Khung giờ hằng tuần</h2>
            <p className="mt-1 text-sm text-text-muted">Lưu sẽ thay thế toàn bộ danh sách slot hiện tại.</p>
          </div>
          <WeeklyAvailabilityEditor
            key={JSON.stringify(resource.data?.recurringSlots ?? [])}
            slots={resource.data?.recurringSlots ?? []}
            busy={busy}
            onDirtyChange={setAvailabilityDirty}
            onSave={saveSlots}
          />
        </Card>
      </ScheduleResourceState>

      <Card as="section" padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Ngoại lệ</h2>
          <p className="mt-1 text-sm text-text-muted">Đánh dấu ngày bận hoặc thêm một khung giờ rảnh bổ sung.</p>
        </div>
        {availabilityDirty && (
          <Notice tone="info">Lưu khung giờ tuần hoặc tải lại để bỏ thay đổi trước khi thêm hay xóa ngoại lệ.</Notice>
        )}
        {!availabilityDirty && exceptionDirty && (
          <Notice tone="info">Gửi ngoại lệ đang nhập trước khi xóa một ngoại lệ đã lưu.</Notice>
        )}
        <form
          ref={exceptionFormRef}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={addException}
          onChange={(event) => {
            const form = new FormData(event.currentTarget)
            setExceptionDirty(
              ['exceptionDate', 'startTime', 'endTime', 'reason', 'isAvailable'].some((name) =>
                String(form.get(name) ?? '').trim() !== ''
              )
            )
          }}
        >
          <label className="text-sm font-medium text-text-heading">
            Ngày
            <input name="exceptionDate" autoComplete="off" type="date" required disabled={busy} className={fieldClass + ' mt-1 w-full'} />
          </label>
          <label className="text-sm font-medium text-text-heading">
            Bắt đầu
            <input name="startTime" autoComplete="off" type="time" disabled={busy} className={fieldClass + ' mt-1 w-full'} />
          </label>
          <label className="text-sm font-medium text-text-heading">
            Kết thúc
            <input name="endTime" autoComplete="off" type="time" disabled={busy} className={fieldClass + ' mt-1 w-full'} />
          </label>
          <label className="text-sm font-medium text-text-heading">
            Ghi chú
            <input name="reason" autoComplete="off" disabled={busy} className={fieldClass + ' mt-1 w-full'} />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex max-[767px]:min-h-11 items-center gap-2 text-sm text-text-body">
            <input name="isAvailable" autoComplete="off" type="checkbox" disabled={busy} className="size-5 accent-primary" />
              Tôi rảnh thêm giờ này
            </label>
            <Button type="submit" className="max-[767px]:min-h-11" disabled={busy || availabilityDirty || resource.status !== 'ready'}><CalendarPlus size={15} />Thêm ngoại lệ</Button>
          </div>
        </form>
        <div className="space-y-2 border-t border-border-subtle pt-4">
          {(resource.data?.exceptions ?? []).length ? (resource.data?.exceptions ?? []).map((exception) => (
            <ExceptionRow
              key={exception.id}
              exception={exception}
              disabled={busy || availabilityDirty || exceptionDirty}
              disabledReason={availabilityDirty || exceptionDirty ? 'Lưu hoặc tải lại để bỏ thay đổi chưa lưu trước khi xóa ngoại lệ.' : undefined}
              onDelete={() => setExceptionToDelete(exception)}
            />
          )) : <p className="text-sm text-text-muted">Chưa có ngoại lệ.</p>}
        </div>
      </Card>

      {exceptionToDelete && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Xóa ngoại lệ?"
          description="Ngoại lệ này sẽ bị xóa khỏi lịch rảnh của bạn."
          cancelLabel="Quay lại"
          confirmLabel="Xóa ngoại lệ"
          variant="danger"
          mobileTouchTargets
          busy={busy}
          onCancel={() => setExceptionToDelete(null)}
          onConfirm={removeException}
        />
      )}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi giờ rảnh chưa lưu?"
          description="Các chỉnh sửa khung giờ hoặc ngoại lệ chưa được gửi lên máy chủ. Nếu tiếp tục, những thay đổi này sẽ bị bỏ."
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          mobileTouchTargets
          onCancel={unsavedGuard.cancelDiscard}
          onConfirm={unsavedGuard.confirmDiscard}
        />
      )}
    </div>
  )
}

function WeeklyAvailabilityEditor({
  slots,
  busy,
  onDirtyChange,
  onSave,
}: {
  slots: AvailabilitySlot[]
  busy: boolean
  onDirtyChange: (dirty: boolean) => void
  onSave: (slots: AvailabilitySlot[]) => Promise<void>
}) {
  const slotsByDay = new Map<DayOfWeek, AvailabilitySlot[]>()
  for (const slot of slots) {
    slotsByDay.set(slot.dayOfWeek, [...(slotsByDay.get(slot.dayOfWeek) ?? []), slot])
  }
  const [extraRows, setExtraRows] = useState<Record<DayOfWeek, number>>(() =>
    Object.fromEntries(weekdays.map((day) => [day.value, 1])) as Record<DayOfWeek, number>
  )
  const [validationMessage, setValidationMessage] = useState('')

  const readSlots = (form: HTMLFormElement) => {
    const formData = new FormData(form)
    const nextSlots: AvailabilitySlot[] = []
    for (const day of weekdays) {
      const currentSlots = slotsByDay.get(day.value) ?? []
      const rowCount = currentSlots.length + extraRows[day.value]
      for (let index = 0; index < rowCount; index += 1) {
        const startTime = String(formData.get('slot-' + day.value + '-' + index + '-start') || '')
        const endTime = String(formData.get('slot-' + day.value + '-' + index + '-end') || '')
        if (!startTime && !endTime) continue
        if (!startTime || !endTime || startTime >= endTime) {
          return {
            slots: nextSlots,
            validationMessage: day.label + ', khung ' + (index + 1) + ': nhập đủ giờ hợp lệ.',
            focusName: !startTime
              ? 'slot-' + day.value + '-' + index + '-start'
              : 'slot-' + day.value + '-' + index + '-end',
          }
        }
        nextSlots.push({ dayOfWeek: day.value, startTime, endTime })
      }
    }
    return { slots: nextSlots, validationMessage: '', focusName: null }
  }

  const normalizeSlots = (values: AvailabilitySlot[]) =>
    [...values]
      .map((slot) => ({ ...slot, startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5) }))
      .sort((left, right) => {
        const dayOrder = weekdays.findIndex((day) => day.value === left.dayOfWeek) -
          weekdays.findIndex((day) => day.value === right.dayOfWeek)
        return dayOrder || left.startTime.localeCompare(right.startTime) || left.endTime.localeCompare(right.endTime)
      })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = readSlots(event.currentTarget)
    if (result.validationMessage) {
      setValidationMessage(result.validationMessage)
      if (result.focusName) {
        event.currentTarget.querySelector<HTMLElement>(`[name="${result.focusName}"]`)?.focus()
      }
      return
    }
    setValidationMessage('')
    await onSave(result.slots)
  }

  return (
    <form
      className="space-y-3"
      onSubmit={submit}
      onChange={(event) => {
        const result = readSlots(event.currentTarget)
        if (validationMessage) setValidationMessage(result.validationMessage)
        onDirtyChange(
          Boolean(result.validationMessage) ||
            JSON.stringify(normalizeSlots(result.slots)) !== JSON.stringify(normalizeSlots(slots))
        )
      }}
    >
      {validationMessage && <p className="text-sm text-danger" role="alert">{validationMessage}</p>}
      {weekdays.map((day) => {
        const currentSlots = slotsByDay.get(day.value) ?? []
        const rowCount = currentSlots.length + extraRows[day.value]
        return (
          <fieldset key={day.value} className="rounded-xl border border-border-subtle p-3">
            <legend className="px-1 text-sm font-medium text-text-heading">{day.label}</legend>
            <div className="space-y-2">
              {Array.from({ length: rowCount }, (_, index) => {
                const slot = currentSlots[index]
                return (
                  <div key={index} className="grid items-center gap-2 sm:grid-cols-[5rem_1fr_1fr]">
                    <span className="text-xs text-text-muted">Khung {index + 1}</span>
                    <label>
                      <span className="sr-only">{day.label}, khung {index + 1}, bắt đầu</span>
                      <input
                        name={'slot-' + day.value + '-' + index + '-start'}
                        autoComplete="off"
                        type="time"
                        disabled={busy}
                        defaultValue={slot?.startTime.slice(0, 5) ?? ''}
                        className={fieldClass + ' w-full'}
                      />
                    </label>
                    <label>
                      <span className="sr-only">{day.label}, khung {index + 1}, kết thúc</span>
                      <input
                        name={'slot-' + day.value + '-' + index + '-end'}
                        autoComplete="off"
                        type="time"
                        disabled={busy}
                        defaultValue={slot?.endTime.slice(0, 5) ?? ''}
                        className={fieldClass + ' w-full'}
                      />
                    </label>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="max-[767px]:min-h-11"
                appearance="ghost"
                disabled={busy}
                onClick={() => setExtraRows((current) => ({
                  ...current,
                  [day.value]: current[day.value] + 1,
                }))}
              >
                Thêm khung giờ
              </Button>
            </div>
          </fieldset>
        )
      })}
      <div className="flex justify-end border-t border-border-subtle pt-4">
        <Button type="submit" className="max-[767px]:min-h-11" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu toàn bộ giờ rảnh'}</Button>
      </div>
    </form>
  )
}

function ExceptionRow({
  exception,
  onDelete,
  disabled,
  disabledReason,
}: {
  exception: AvailabilityExceptionResponse
  onDelete: () => void
  disabled: boolean
  disabledReason?: string
}) {
  const startTime = exception.startTime?.slice(0, 5)
  const endTime = exception.endTime?.slice(0, 5)
  const timeLabel = startTime && endTime
    ? startTime + '–' + endTime
    : startTime
      ? 'Từ ' + startTime + ' · chưa có giờ kết thúc'
      : endTime
        ? 'Đến ' + endTime + ' · chưa có giờ bắt đầu'
        : 'Cả ngày'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-heading">
          {localDateLabel(exception.exceptionDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-sm text-text-muted">
          {timeLabel}
          {' · '}{exception.isAvailable ? 'Rảnh thêm' : 'Bận'}
          {exception.reason ? ' · ' + exception.reason : ''}
        </p>
      </div>
      <Button size="sm" className="max-[767px]:min-h-11" variant="danger" appearance="outline" onClick={onDelete} disabled={disabled} title={disabledReason}>
        <Trash2 size={14} />
        Xóa
      </Button>
    </div>
  )
}
