import { useEffect, useState } from 'react'
import { Check, ClipboardCheck } from 'lucide-react'
import { getScheduleAttendances, saveScheduleAttendances } from '../../services/attendanceService'
import type { AttendanceResponse, AttendanceStatus, BatchAttendanceRequest } from '../../types/scheduling'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getErrorMessage } from '../../lib/errors'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import ScheduleResourceState from './ScheduleResourceState'

const statuses: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Đi muộn' },
  { value: 'ABSENT', label: 'Vắng' },
  { value: 'EXCUSED', label: 'Có phép' },
]

export default function ScheduleAttendancePanel({
  scheduleId,
  onStateChange,
}: {
  scheduleId: string
  onStateChange?: (state: { dirty: boolean; busy: boolean }) => void
}) {
  const resource = useScheduleResource(
    'schedule-attendance:' + scheduleId,
    () => getScheduleAttendances(scheduleId)
  )
  const [drafts, setDrafts] = useState<Record<string, AttendanceStatus>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const records = resource.data ?? []
  const dirty = records.some((record) => drafts[record.studentId] !== undefined)

  useEffect(() => {
    onStateChange?.({ dirty, busy })
    return () => onStateChange?.({ dirty: false, busy: false })
  }, [busy, dirty, onStateChange])

  const save = async () => {
    if (!dirty) return
    const payload: BatchAttendanceRequest = {
      attendances: records.map((record) => ({
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
      await saveScheduleAttendances(scheduleId, payload)
      setDrafts({})
      setNotice('Đã lưu điểm danh cho lịch này.')
      resource.reload()
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 border-t border-border-subtle pt-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={17} className="text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-heading">Điểm danh</h3>
        <span className="text-xs text-text-muted">Mã lịch</span>
      </div>
      <p className="text-xs text-text-muted">Điểm danh chỉ áp dụng cho lịch đơn, không áp dụng cho buổi thuộc chuỗi.</p>
      <Notice tone="warning">
        Danh sách hiện chưa phân biệt “Chưa điểm danh” với “Vắng”. Hãy xác nhận trạng thái của từng học viên trước khi lưu để tránh ghi nhận nhầm.
      </Notice>
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}
      {busy && <Notice tone="info">Đang lưu điểm danh. Vui lòng đợi trước khi rời buổi học.</Notice>}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!records.length}
        emptyMessage="Chưa có danh sách điểm danh cho lịch này."
        onRetry={resource.reload}
      >
        <div className="space-y-2">
          {records.map((record) => (
            <AttendanceRow
              key={record.studentId}
              record={record}
              value={drafts[record.studentId] ?? record.status}
              onChange={(status) => setDrafts((current) => ({ ...current, [record.studentId]: status }))}
              disabled={busy}
            />
          ))}
          <div className="flex justify-end pt-1">
            <Button size="sm" className="max-[767px]:min-h-11" disabled={busy || !dirty} onClick={save}>
              <Check size={14} />
              {busy ? 'Đang lưu…' : 'Lưu điểm danh'}
            </Button>
          </div>
        </div>
      </ScheduleResourceState>
    </section>
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
    <label className="hl-scheduling-roster-row flex flex-col gap-2 rounded-xl border border-border-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-text-heading">{record.studentName}</span>
        <span className="block truncate text-xs text-text-muted">{record.studentEmail}</span>
      </span>
      <select
        name="attendanceStatus"
        autoComplete="off"
        aria-label={'Điểm danh ' + record.studentName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as AttendanceStatus)}
        className="h-10 max-[767px]:h-11 rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
    </label>
  )
}
