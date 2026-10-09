import { useEffect, useState } from 'react'
import { Check } from '../icons'
import { getScheduleAttendances, saveScheduleAttendances } from '../../../services/attendanceService'
import type { AttendanceResponse, AttendanceStatus, BatchAttendanceRequest } from '../../../types/scheduling'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getErrorMessage } from '../../../lib/errors'
import Button from '../button'
import Notice from '../notice'
import { fieldControlClass } from '../form-field'
import ScheduleResourceState from './schedule-resource-state'

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
    <section className="flex flex-col gap-3 border-t border-card-border pt-4">
      <h3 className="text-sm font-medium text-text-primary">Điểm danh</h3>
      <Notice tone="warning">Kiểm tra trạng thái từng học viên trước khi lưu. Danh sách chưa phân biệt “Chưa điểm danh” với “Vắng”.</Notice>
      {error && <Notice tone="danger">{error}</Notice>}
      {notice && <Notice tone="info">{notice}</Notice>}
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        empty={!records.length}
        emptyMessage="Chưa có danh sách điểm danh."
        onRetry={resource.reload}
      >
        <div className="flex flex-col gap-2">
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
            <Button size="sm" disabled={busy || !dirty} onClick={save}>
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
    <label className="flex flex-col gap-2 rounded-lg border border-card-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text-primary">{record.studentName}</span>
        <span className="block truncate text-xs text-text-tertiary">{record.studentEmail}</span>
      </span>
      <select
        name="attendanceStatus"
        autoComplete="off"
        aria-label={'Điểm danh ' + record.studentName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as AttendanceStatus)}
        className={`${fieldControlClass} sm:w-40`}
      >
        {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
    </label>
  )
}