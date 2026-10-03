import { useState } from 'react'
import { Check, ClipboardCheck, RefreshCw } from 'lucide-react'
import { getMainCourses, type Course } from '../../services/courseService'
import { getCourseSchedules } from '../../services/scheduleService'
import {
  getScheduleAttendances,
  saveScheduleAttendances,
} from '../../services/attendanceService'
import type { AttendanceResponse, AttendanceStatus, BatchAttendanceRequest } from '../../types/scheduling'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DropdownField from '../../components/ui/DropdownField'
import Notice from '../../components/ui/Notice'
import PageHeading from '../../components/ui/PageHeading'
import ScheduleResourceState from '../../components/scheduling/ScheduleResourceState'
import { getErrorMessage } from '../../lib/errors'

const statuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Đi muộn' },
  { value: 'ABSENT', label: 'Vắng' },
  { value: 'EXCUSED', label: 'Có phép' },
]

type AttendanceNavigationAction =
  | { kind: 'course'; value: string }
  | { kind: 'schedule'; value: string }
  | { kind: 'reload' }

function requireData<T>(response: { data?: T }, message: string): T {
  if (response.data === undefined || response.data === null) throw new Error(message)
  return response.data
}

export default function AttendanceManagementPage() {
  const [courseId, setCourseId] = useState('')
  const [scheduleId, setScheduleId] = useState('')
  const [drafts, setDrafts] = useState<Record<string, AttendanceStatus>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const courses = useScheduleResource('staff-attendance-courses', async () =>
    requireData<Course[]>(await getMainCourses(), 'Không thể tải danh mục khóa học.')
  )
  const activeCourseId = courseId || courses.data?.[0]?.id || ''
  const schedules = useScheduleResource(
    activeCourseId ? 'staff-attendance-schedules:' + activeCourseId : null,
    () => getCourseSchedules(activeCourseId)
  )
  const selectedScheduleId =
    scheduleId && schedules.data?.some((item) => item.id === scheduleId)
      ? scheduleId
      : schedules.data?.[0]?.id ?? ''
  const attendance = useScheduleResource(
    selectedScheduleId ? 'staff-attendance:' + selectedScheduleId : null,
    () => getScheduleAttendances(selectedScheduleId)
  )
  const courseOptions = (courses.data ?? []).map((course) => ({ id: course.id, label: course.title }))
  const dirty = (attendance.data ?? []).some((record) => drafts[record.studentId] !== undefined)
  const unsavedGuard = useUnsavedActionGuard(dirty, busy)

  const applyNavigation = (action: AttendanceNavigationAction) => {
    setDrafts({})
    setError('')
    setNotice('')
    if (action.kind === 'course') {
      setCourseId(action.value)
      setScheduleId('')
    } else if (action.kind === 'schedule') {
      setScheduleId(action.value)
    } else if (selectedScheduleId) {
      attendance.reload()
    } else if (activeCourseId) {
      schedules.reload()
    } else {
      courses.reload()
    }
  }

  const requestNavigation = (action: AttendanceNavigationAction) => {
    unsavedGuard.requestAction(() => applyNavigation(action))
  }

  const save = async () => {
    if (!attendance.data || !selectedScheduleId) return
    const payload: BatchAttendanceRequest = {
      attendances: attendance.data.map((record) => ({
        studentId: record.studentId,
        status: drafts[record.studentId] ?? record.status,
        ...(record.attendanceMinutes !== null && record.attendanceMinutes !== undefined
          ? { attendanceMinutes: record.attendanceMinutes }
          : {}),
      })),
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await saveScheduleAttendances(selectedScheduleId, payload)
      setDrafts({})
      setNotice('Đã lưu điểm danh. Đang tải lại dữ liệu từ máy chủ.')
      attendance.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hl-scheduling space-y-5">
      <PageHeading
        eyebrow="NHÂN SỰ VẬN HÀNH"
        title="Điểm danh"
        subtitle="Điểm danh áp dụng cho lịch đơn; các buổi thuộc chuỗi không thể điểm danh tại đây."
        action={
          <>
            <RefreshCw size={16} />
            Tải lại
          </>
        }
        onAction={() => requestNavigation({ kind: 'reload' })}
        actionDisabled={busy}
      />

      {busy && <Notice tone="info">Đang lưu điểm danh. Hãy đợi hoàn tất trước khi rời trang.</Notice>}
      <Notice tone="warning">
        Danh sách chỉ gồm các khóa học đang công khai và mở. Khóa chưa mở hoặc đã kết thúc có thể không xuất hiện; chỉ lịch của các khóa trong danh sách mới được hiển thị.
      </Notice>
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}
      {(courses.status === 'error' || courses.status === 'forbidden') && (
        <Notice tone={courses.status === 'forbidden' ? 'warning' : 'danger'}>
          Không tải được danh sách khóa học.
          <Button size="sm" appearance="outline" className="max-[767px]:min-h-11" onClick={courses.reload}>Thử lại</Button>
        </Notice>
      )}
      <Notice tone="warning">
        Danh sách hiện chưa phân biệt “Chưa điểm danh” với “Vắng”. Hãy xác nhận trạng thái của từng học viên trước khi lưu để tránh ghi nhận nhầm.
      </Notice>

      <Card as="section" padding="lg" className="space-y-4">
        <label className="block max-w-xl text-sm font-medium text-text-heading">
          Khóa học
          <div className="mt-2">
            <DropdownField
              contentClassName="hl-scheduling"
              ariaLabel="Chọn khóa học để điểm danh"
              options={courseOptions}
              mobileTouchTargets
              value={activeCourseId || null}
              onChange={(value) => requestNavigation({ kind: 'course', value: value ?? '' })}
              isSearchable
              searchPlaceholder="Tìm khóa học…"
              isDisabled={busy}
              isLoading={courses.status === 'loading'}
              isError={courses.status === 'error' || courses.status === 'forbidden'}
              errorMessage="Không thể tải danh sách khóa học."
              emptyMessage="Danh mục chưa có khóa học."
              placeholder="Chọn khóa học"
            />
          </div>
        </label>
        <ScheduleResourceState
          status={schedules.status}
          errorMessage={schedules.errorMessage}
          empty={!schedules.data?.length}
          emptyMessage="Khóa học chưa có lịch đơn để điểm danh."
          onRetry={schedules.reload}
        >
          <div className="space-y-2">
            {(schedules.data ?? []).map((schedule) => (
              <button
                type="button"
                key={schedule.id}
                aria-pressed={selectedScheduleId === schedule.id}
                disabled={busy}
                onClick={() => requestNavigation({ kind: 'schedule', value: schedule.id })}
                className={
                  'w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring ' +
                  (selectedScheduleId === schedule.id
                    ? 'border-primary bg-surface-hover'
                    : 'border-border-subtle bg-surface hover:bg-surface-soft')
                }
              >
                <span className="block text-sm font-semibold text-text-heading">{schedule.title}</span>
                <span className="mt-1 block text-xs text-text-muted">
                  {schedule.instructorName} · {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: schedule.timezone || 'Asia/Ho_Chi_Minh' }).format(new Date(schedule.startTime))}
                </span>
              </button>
            ))}
          </div>
        </ScheduleResourceState>
      </Card>

      {selectedScheduleId && (
        <Card as="section" padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={19} className="text-primary" aria-hidden="true" />
              <h2 className="font-semibold text-text-heading">Danh sách điểm danh</h2>
              <span className="text-xs text-text-muted">Mã lịch</span>
            </div>
            <Button className="max-[767px]:min-h-11" onClick={save} disabled={busy || !dirty || !attendance.data?.length}>
              <Check size={16} />
              {busy ? 'Đang lưu…' : 'Lưu điểm danh'}
            </Button>
          </div>
          <ScheduleResourceState
            status={attendance.status}
            errorMessage={attendance.errorMessage}
            empty={!attendance.data?.length}
            emptyMessage="Chưa có danh sách điểm danh cho lịch này."
            onRetry={attendance.reload}
          >
            <div className="divide-y divide-border-subtle">
              {(attendance.data ?? []).map((record) => (
                <AttendanceRow
                  key={record.studentId}
                  record={record}
                  value={drafts[record.studentId] ?? record.status}
                  onChange={(status) => setDrafts((current) => ({ ...current, [record.studentId]: status }))}
                  disabled={busy}
                />
              ))}
            </div>
          </ScheduleResourceState>
        </Card>
      )}
      {unsavedGuard.hasPendingAction && (
        <ConfirmDialog
          contentClassName="hl-scheduling"
          title="Bỏ thay đổi điểm danh chưa lưu?"
          description="Các trạng thái bạn vừa chỉnh chưa được gửi lên máy chủ. Nếu tiếp tục, những thay đổi này sẽ bị bỏ."
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

function AttendanceRow({
  record,
  value,
  onChange,
  disabled,
}: {
  record: AttendanceResponse
  value: AttendanceStatus
  onChange: (status: AttendanceStatus) => void
  disabled: boolean
}) {
  return (
    <div className="hl-scheduling-roster-row flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-heading">{record.studentName}</p>
        <p className="truncate text-xs text-text-muted">{record.studentEmail}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-text-muted">
          <span>Trạng thái</span>
        <select
          name="attendanceStatus"
          autoComplete="off"
          aria-label={'Điểm danh ' + record.studentName}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as AttendanceStatus)}
          className="h-10 max-[767px]:h-11 min-w-36 rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </label>
    </div>
  )
}
