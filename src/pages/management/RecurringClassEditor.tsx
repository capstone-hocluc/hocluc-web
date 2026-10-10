import { useState, type FormEvent } from 'react'
import { SCHEDULING_TIMEZONE } from '../../lib/scheduling'
import type {
  CreateRecurringClassRequest,
  DayOfWeek,
  DeliveryMode,
  RecurringClassResponse,
  UpdateRecurringClassRequest,
} from '../../types/scheduling'
import type { UserSummary } from '../../services/userService'
import type { CourseSection } from '../../services/courseService'
import Button from '../../components/console/button'
import SelectField from '../../components/console/select-field'
import Notice from '../../components/console/notice'
import ConsoleSheet from '../../components/console/sheet'
import Field, { fieldControlClass } from '../../components/console/form-field'

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
  /** Present when editing an existing series; the section is fixed and only shown read-only. */
  initial?: RecurringClassResponse
  teachers: UserSummary[]
  sections: CourseSection[]
  sectionsLoading?: boolean
  outcomeUnknown?: boolean
  disabledReason: string
  busy?: boolean
  errorMessage?: string
  onClose: () => void
  onSave: (payload: CreateRecurringClassRequest | UpdateRecurringClassRequest) => void
}

export default function RecurringClassEditor({
  initial,
  teachers,
  sections,
  sectionsLoading = false,
  outcomeUnknown = false,
  disabledReason,
  busy = false,
  errorMessage,
  onClose,
  onSave,
}: Props) {
  const editing = Boolean(initial)
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? '')
  const [sectionId, setSectionId] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    label: teacher.displayName || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.email,
  }))
  const sectionOptions = sections.map((section) => ({
    id: section.sectionCourseId,
    label: section.title,
  }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const startTime = String(form.get('startTime') || '')
    const endTime = String(form.get('endTime') || '')
    const startDate = String(form.get('startDate') || '')
    const endDate = String(form.get('endDate') || '')
    const durationMinutes = Number(form.get('durationMinutes'))
    const title = String(form.get('title') || '').trim()
    const reject = (message: string, selector: string) => {
      setValidationMessage(message)
      event.currentTarget.querySelector<HTMLElement>(selector)?.focus()
    }
    if (!title) return reject('Nhập tên lớp.', '[name="title"]')
    if (!teacherId) return reject('Chọn giáo viên phụ trách.', '[aria-label="Chọn giáo viên cho lớp lặp"]')
    if (!editing && !sectionId) return reject('Chọn môn học thuộc khóa.', '[aria-label="Chọn môn cho lớp lặp"]')
    if (startTime >= endTime) return reject('Giờ kết thúc phải sau giờ bắt đầu.', '[name="endTime"]')
    if (!startDate || !endDate || startDate > endDate) {
      return reject('Chọn khoảng ngày hợp lệ.', !startDate ? '[name="startDate"]' : '[name="endDate"]')
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
      return reject('Nhập thời lượng hợp lệ.', '[name="durationMinutes"]')
    }
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    const timeRangeMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
    if (durationMinutes !== timeRangeMinutes) {
      return reject('Thời lượng phải khớp với giờ bắt đầu và kết thúc.', '[name="durationMinutes"]')
    }
    setValidationMessage('')
    const shared = {
      teacherId,
      title,
      dayOfWeek: String(form.get('dayOfWeek') || 'MONDAY') as DayOfWeek,
      startTime,
      endTime,
      durationMinutes,
      defaultMode: String(form.get('defaultMode') || 'PHYSICAL') as DeliveryMode,
      defaultLocation: String(form.get('defaultLocation') || ''),
      startDate,
      endDate,
      timezone: SCHEDULING_TIMEZONE,
    }
    onSave(editing ? shared : { ...shared, sectionId })
  }

  return (
    <ConsoleSheet open onClose={onClose} title={editing ? 'Chỉnh sửa lớp học lặp' : 'Tạo lớp học lặp'}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {!editing && disabledReason && <Notice tone="warning">{disabledReason}</Notice>}
        {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
        {!editing && outcomeUnknown && (
          <Notice tone="warning">Kết quả tạo chưa rõ. Đừng gửi lại; hãy đóng và kiểm tra lịch đã tạo.</Notice>
        )}
        {editing && (
          <Notice tone="info">
            Các buổi chưa diễn ra sẽ được sinh lại theo lịch mới; buổi đã sửa riêng hoặc đã bắt đầu được giữ nguyên.
          </Notice>
        )}
        {validationMessage && <p className="text-sm text-badge-error-text" role="alert">{validationMessage}</p>}
        {editing ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">Môn học</span>
            <p className="text-sm text-text-tertiary">{initial?.sectionTitle ?? 'Toàn khóa'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Môn học</span>
            <SelectField
              ariaLabel="Chọn môn cho lớp lặp"
              options={sectionOptions}
              value={sectionId}
              onChange={setSectionId}
              disabled={sectionsLoading || sectionOptions.length === 0}
              placeholder={sectionsLoading ? 'Đang tải…' : 'Chọn môn học'}
              className="w-full"
              triggerClassName="w-full"
            />
            {!sectionsLoading && sectionOptions.length === 0 && (
              <p className="text-xs text-text-tertiary">Khóa học chưa có môn để xếp lịch.</p>
            )}
          </div>
        )}
        <Field label="Tên lớp">
          <input name="title" autoComplete="off" required defaultValue={initial?.title} className={fieldControlClass} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">Giáo viên</span>
          <SelectField
            ariaLabel="Chọn giáo viên cho lớp lặp"
            options={teacherOptions}
            value={teacherId}
            onChange={setTeacherId}
            disabled={!teachers.length}
            placeholder={teachers.length ? 'Chọn giáo viên' : 'Chưa có giáo viên'}
            className="w-full"
            triggerClassName="w-full"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày trong tuần">
            <select name="dayOfWeek" defaultValue={initial?.dayOfWeek ?? 'MONDAY'} className={fieldControlClass}>
              {weekdays.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
            </select>
          </Field>
          <Field label="Hình thức">
            <select name="defaultMode" defaultValue={initial?.defaultMode ?? 'PHYSICAL'} className={fieldControlClass}>
              <option value="PHYSICAL">Trực tiếp</option>
              <option value="ONLINE">Trực tuyến</option>
              <option value="HYBRID">Kết hợp</option>
              <option value="OFFLINE">Ngoại tuyến</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bắt đầu">
            <input name="startTime" autoComplete="off" type="time" required defaultValue={initial?.startTime?.slice(0, 5)} className={fieldControlClass} />
          </Field>
          <Field label="Kết thúc">
            <input name="endTime" autoComplete="off" type="time" required defaultValue={initial?.endTime?.slice(0, 5)} className={fieldControlClass} />
          </Field>
        </div>
        <Field label="Thời lượng mỗi buổi (phút)">
          <input name="durationMinutes" autoComplete="off" type="number" min="1" defaultValue={initial?.durationMinutes ?? 120} required className={fieldControlClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày bắt đầu">
            <input name="startDate" autoComplete="off" type="date" required defaultValue={initial?.startDate} className={fieldControlClass} />
          </Field>
          <Field label="Ngày kết thúc">
            <input name="endDate" autoComplete="off" type="date" required defaultValue={initial?.endDate} className={fieldControlClass} />
          </Field>
        </div>
        <Field label="Phòng / địa điểm">
          <input name="defaultLocation" autoComplete="off" defaultValue={initial?.defaultLocation ?? ''} className={fieldControlClass} />
        </Field>
        <p className="text-xs text-text-tertiary">Múi giờ: {SCHEDULING_TIMEZONE}</p>
        <div className="flex justify-end gap-2 border-t border-card-border pt-4">
          <Button type="button" appearance="outline" onClick={onClose}>Đóng</Button>
          <Button type="submit" disabled={busy || (!editing && (outcomeUnknown || Boolean(disabledReason)))}>
            {busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo lịch lặp'}
          </Button>
        </div>
      </form>
    </ConsoleSheet>
  )
}
