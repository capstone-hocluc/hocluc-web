import { useState, type FormEvent } from 'react'
import DateField from '../../components/console/date-field'
import Button from '../../components/console/button'
import Card from '../../components/console/card'
import Notice from '../../components/console/notice'
import SelectField from '../../components/console/select-field'
import Field, { fieldControlClass } from '../../components/console/form-field'
import { ApiError } from '../../lib/api'
import { localToday } from '../../lib/scheduling'
import type { CoursePhase } from '../../services/courseService'
import type { UserSummary } from '../../services/userService'
import {
  createLiveTimetable,
  getTeacherZoomAccount,
  MISSING_ZOOM_ACCOUNT,
  zoomErrorMessage,
  type LiveTimetableResponse,
  type LiveTimetableSlot,
} from '../../services/liveClassService'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import type { DayOfWeek } from '../../types/scheduling'

const weekdays: { id: DayOfWeek; label: string }[] = [
  { id: 'MONDAY', label: 'Thứ Hai' },
  { id: 'TUESDAY', label: 'Thứ Ba' },
  { id: 'WEDNESDAY', label: 'Thứ Tư' },
  { id: 'THURSDAY', label: 'Thứ Năm' },
  { id: 'FRIDAY', label: 'Thứ Sáu' },
  { id: 'SATURDAY', label: 'Thứ Bảy' },
  { id: 'SUNDAY', label: 'Chủ Nhật' },
]

interface Props {
  courseId: string
  phases: CoursePhase[]
  teachers: UserSummary[]
  onCreated: () => void
}

function teacherName(teacher: UserSummary) {
  return teacher.displayName || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.email
}

/** Staff generate a teacher's live classes for one subject of the course, each with its Zoom meeting. */
export default function LiveTimetablePanel({ courseId, phases, teachers, onCreated }: Props) {
  // The subjects of a main course are those of its gift courses (its own sections carry none).
  const subjects = [...new Map(
    phases.flatMap((phase) => [...(phase.gifts ?? []), ...(phase.sections ?? [])])
      .filter((part) => part.categoryId)
      .map((part) => [part.categoryId as string, part.categoryName || part.title])
  )].map(([id, label]) => ({ id, label }))
  const namedPhases = phases.filter((phase): phase is CoursePhase & { id: string } => Boolean(phase.id))

  const [teacherId, setTeacherId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(localToday())
  const [endDate, setEndDate] = useState('')
  const [slots, setSlots] = useState<LiveTimetableSlot[]>([{ dayOfWeek: 'MONDAY', startTime: '19:30', endTime: '21:30' }])
  const [phaseCounts, setPhaseCounts] = useState<Record<string, string>>({})
  const [capacity, setCapacity] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<LiveTimetableResponse | null>(null)
  const [outcomeUnknown, setOutcomeUnknown] = useState(false)
  const locked = busy || outcomeUnknown
  // with real Zoom meetings, a teacher without the Zoom user the center gives them cannot be given classes
  const teacherZoom = useScheduleResource(teacherId ? 'teacher-zoom:' + teacherId : null, () => getTeacherZoomAccount(teacherId))
  const missingZoom = teacherZoom.status === 'ready' && teacherZoom.data?.zoomEnabled && !teacherZoom.data.zoomEmail

  const updateSlot = (index: number, change: Partial<LiveTimetableSlot>) =>
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...change } : slot)))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (locked) return
    if (!teacherId || !subjectId) return setErrorMessage('Chọn giáo viên và môn học.')
    if (!startDate || !endDate || startDate > endDate) {
      return setErrorMessage('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
    }
    if (slots.some((slot) => !slot.startTime || !slot.endTime || slot.endTime <= slot.startTime)) {
      return setErrorMessage('Giờ kết thúc của mỗi khung phải sau giờ bắt đầu.')
    }
    const phaseSessions = namedPhases
      .map((phase) => ({ phaseId: phase.id, sessionCount: Number(phaseCounts[phase.id] || 0) }))
      .filter((item) => item.sessionCount > 0)
    setBusy(true)
    setErrorMessage('')
    setResult(null)
    try {
      const created = await createLiveTimetable(courseId, {
        teacherId,
        subjectId,
        title: title.trim(),
        startDate,
        endDate,
        slots,
        ...(phaseSessions.length ? { phaseSessions } : {}),
        ...(capacity ? { capacity: Number(capacity) } : {}),
      })
      setResult(created)
      onCreated()
    } catch (error) {
      // One request makes many classes and Zoom meetings: when the outcome is unknown, never invite a resend.
      if (!(error instanceof ApiError) || error.status === 408 || error.status >= 500) {
        setOutcomeUnknown(true)
        onCreated()
      } else {
        setErrorMessage(zoomErrorMessage(error, 'Không tạo được thời khóa biểu trực tuyến.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" padding="lg" className="space-y-4">
      <h2 className="text-base font-medium text-text-primary">Thời khóa biểu trực tuyến</h2>
      {outcomeUnknown && (
        <Notice tone="warning">Chưa rõ máy chủ đã tạo lớp hay chưa. Đừng gửi lại; hãy tải lại trang và kiểm tra lịch trước khi tạo tiếp.</Notice>
      )}
      {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
      {result && (
        <Notice tone={result.warnings.length || result.missingSessions ? 'warning' : 'info'}>
          <p className="m-0">Đã tạo {result.sessions.length} lớp trực tuyến.</p>
          {result.missingSessions > 0 && (
            <p className="m-0">{result.missingSessions} lớp không xếp được trước ngày kết thúc.</p>
          )}
          {result.warnings.map((warning) => <p key={warning} className="m-0">{warning}</p>)}
        </Notice>
      )}

      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Field label="Tên thời khóa biểu">
          <input name="liveTimetableTitle" autoComplete="off" required maxLength={400} disabled={locked}
            value={title} onChange={(event) => setTitle(event.target.value)} className={fieldControlClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Giáo viên">
            <SelectField ariaLabel="Giáo viên" value={teacherId} onChange={setTeacherId} disabled={locked || !teachers.length}
              placeholder={teachers.length ? 'Chọn giáo viên' : 'Chưa có giáo viên'} triggerClassName={fieldControlClass}
              options={teachers.map((teacher) => ({ id: teacher.id, label: teacherName(teacher) }))} />
            {missingZoom && <p role="alert" className="m-0 text-xs text-badge-warning-text">{MISSING_ZOOM_ACCOUNT}</p>}
          </Field>
          <Field label="Môn học">
            <SelectField ariaLabel="Môn học" value={subjectId} onChange={setSubjectId} disabled={locked || !subjects.length}
              placeholder={subjects.length ? 'Chọn môn học' : 'Khóa học chưa có môn'} triggerClassName={fieldControlClass}
              options={subjects} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DateField label="Từ ngày" name="liveStartDate" value={startDate} onChange={setStartDate} disabled={locked} required />
          <DateField label="Đến ngày" name="liveEndDate" value={endDate} onChange={setEndDate} min={startDate} disabled={locked} required />
          <Field label="Số chỗ mỗi lớp">
            <input name="liveCapacity" type="number" min="1" step="1" autoComplete="off" disabled={locked}
              placeholder="Không giới hạn" value={capacity} onChange={(event) => setCapacity(event.target.value)}
              className={fieldControlClass} />
          </Field>
        </div>

        <fieldset className="space-y-2" disabled={locked}>
          <legend className="text-sm font-medium text-text-primary">Khung giờ hằng tuần</legend>
          {slots.map((slot, index) => (
            <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <SelectField ariaLabel={`Thứ của khung ${index + 1}`} value={slot.dayOfWeek} triggerClassName={fieldControlClass}
                onChange={(value) => updateSlot(index, { dayOfWeek: value as DayOfWeek })} options={weekdays} />
              <input aria-label={`Bắt đầu khung ${index + 1}`} type="time" required value={slot.startTime}
                onChange={(event) => updateSlot(index, { startTime: event.target.value })} className={fieldControlClass} />
              <input aria-label={`Kết thúc khung ${index + 1}`} type="time" required value={slot.endTime}
                onChange={(event) => updateSlot(index, { endTime: event.target.value })} className={fieldControlClass} />
              <Button type="button" size="sm" appearance="ghost" disabled={slots.length === 1}
                onClick={() => setSlots((current) => current.filter((_, i) => i !== index))}>
                Xóa
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" appearance="outline"
            onClick={() => setSlots((current) => [...current, { ...current[current.length - 1] }])}>
            Thêm khung giờ
          </Button>
        </fieldset>

        {namedPhases.length > 0 && (
          <fieldset className="space-y-2" disabled={locked}>
            <legend className="text-sm font-medium text-text-primary">Số lớp mỗi giai đoạn</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {namedPhases.map((phase) => (
                <Field key={phase.id} label={phase.name || 'Giai đoạn'}>
                  <input type="number" min="0" step="1" autoComplete="off" placeholder="Theo khung giờ"
                    value={phaseCounts[phase.id] ?? ''} className={fieldControlClass}
                    onChange={(event) => setPhaseCounts((current) => ({ ...current, [phase.id]: event.target.value }))} />
                </Field>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={locked || missingZoom || !teachers.length || !subjects.length}>
            {busy ? 'Đang tạo…' : 'Tạo lớp trực tuyến'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
