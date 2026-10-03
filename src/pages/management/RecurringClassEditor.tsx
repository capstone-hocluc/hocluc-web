import { useState, type FormEvent } from 'react'
import { SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type { CreateRecurringClassRequest, DayOfWeek, DeliveryMode } from '../../types/scheduling'
import type { UserSummary } from '../../services/userService'
import Button from '../../components/ui/Button'
import DropdownField from '../../components/ui/DropdownField'
import Notice from '../../components/ui/Notice'
import { Sheet, SheetBody } from '../../components/ui/Sheet'

const fieldClass =
  'mt-1 h-10 max-[767px]:h-11 w-full rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

const weekdays: Array<{ id: DayOfWeek; label: string }> = [
  { id: 'MONDAY', label: 'Thứ Hai' },
  { id: 'TUESDAY', label: 'Thứ Ba' },
  { id: 'WEDNESDAY', label: 'Thứ Tư' },
  { id: 'THURSDAY', label: 'Thứ Năm' },
  { id: 'FRIDAY', label: 'Thứ Sáu' },
  { id: 'SATURDAY', label: 'Thứ Bảy' },
  { id: 'SUNDAY', label: 'Chủ Nhật' },
]

interface Props {
  teachers: UserSummary[]
  disabledReason: string
  busy?: boolean
  errorMessage?: string
  onClose: () => void
  onSave: (payload: CreateRecurringClassRequest) => void
}

export default function RecurringClassEditor({
  teachers,
  disabledReason,
  busy = false,
  errorMessage,
  onClose,
  onSave,
}: Props) {
  const [teacherId, setTeacherId] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    label: teacher.displayName || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.email,
  }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startTime = String(form.get('startTime') || '')
    const endTime = String(form.get('endTime') || '')
    const startDate = String(form.get('startDate') || '')
    const endDate = String(form.get('endDate') || '')
    const durationMinutes = Number(form.get('durationMinutes'))
    const reject = (message: string, selector: string) => {
      setValidationMessage(message)
      event.currentTarget.querySelector<HTMLElement>(selector)?.focus()
    }
    if (!teacherId) return reject('Chọn giáo viên phụ trách.', '[aria-label="Chọn giáo viên cho lớp lặp"]')
    if (startTime >= endTime) return reject('Giờ kết thúc phải sau giờ bắt đầu.', '[name="endTime"]')
    if (!startDate || !endDate || startDate > endDate) {
      return reject('Chọn khoảng ngày hợp lệ.', !startDate ? '[name="startDate"]' : '[name="endDate"]')
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      return reject('Nhập thời lượng hợp lệ.', '[name="durationMinutes"]')
    }
    setValidationMessage('')
    onSave({
      teacherId,
      title: String(form.get('title') || '').trim(),
      dayOfWeek: String(form.get('dayOfWeek') || 'MONDAY') as DayOfWeek,
      startTime,
      endTime,
      durationMinutes,
      defaultMode: String(form.get('defaultMode') || 'PHYSICAL') as DeliveryMode,
      defaultLocation: String(form.get('defaultLocation') || ''),
      startDate,
      endDate,
      timezone: SCHEDULING_TIMEZONE,
    })
  }

  return (
    <Sheet open onClose={onClose} className="hl-scheduling" closeButtonClassName="max-[767px]:size-11" title="Tạo lớp học lặp">
      <SheetBody className="p-4">
        <form className="space-y-4" onSubmit={submit}>
          <Notice tone="warning">{disabledReason}</Notice>
          {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
          {validationMessage && <p className="text-sm text-danger" role="alert">{validationMessage}</p>}
          <label className="block text-sm font-medium text-text-heading">
            Tên lớp
            <input name="title" autoComplete="off" required className={fieldClass} />
          </label>
          <label className="block text-sm font-medium text-text-heading">
            Giáo viên
            <DropdownField
              contentClassName="hl-scheduling"
              ariaLabel="Chọn giáo viên cho lớp lặp"
              options={teacherOptions}
              mobileTouchTargets
              value={teacherId || null}
              onChange={(value) => setTeacherId(value ?? '')}
              isLoading={!teachers.length}
              isError={!teachers.length}
              errorMessage="Chưa tải được danh sách giáo viên."
              emptyMessage="Không có giáo viên phù hợp."
              placeholder="Chọn giáo viên"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Ngày trong tuần
              <select name="dayOfWeek" className={fieldClass}>
                {weekdays.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Hình thức
              <select name="defaultMode" className={fieldClass}>
                <option value="PHYSICAL">Trực tiếp</option>
                <option value="ONLINE">Trực tuyến</option>
                <option value="HYBRID">Kết hợp</option>
                <option value="OFFLINE">Ngoại tuyến</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Bắt đầu
            <input name="startTime" autoComplete="off" type="time" required className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Kết thúc
            <input name="endTime" autoComplete="off" type="time" required className={fieldClass} />
            </label>
          </div>
          <label className="block text-sm font-medium text-text-heading">
            Thời lượng mỗi buổi (phút)
            <input name="durationMinutes" autoComplete="off" type="number" min="1" defaultValue="120" required className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-heading">
              Ngày bắt đầu
              <input name="startDate" autoComplete="off" type="date" required className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-text-heading">
              Ngày kết thúc
              <input name="endDate" autoComplete="off" type="date" required className={fieldClass} />
            </label>
          </div>
          <label className="block text-sm font-medium text-text-heading">
            Phòng / địa điểm
            <input name="defaultLocation" autoComplete="off" className={fieldClass} />
          </label>
          <p className="text-xs text-text-muted">Múi giờ: {SCHEDULING_TIMEZONE}. Việc tạo lịch lặp sẽ khả dụng khi danh sách lớp của khóa học được đồng bộ.</p>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button appearance="outline" className="max-[767px]:min-h-11" onClick={onClose}>Đóng</Button>
            <Button type="submit" className="max-[767px]:min-h-11" disabled={busy || Boolean(disabledReason)}>
              {busy ? 'Đang lưu…' : 'Tạo lịch lặp'}
            </Button>
          </div>
        </form>
      </SheetBody>
    </Sheet>
  )
}
