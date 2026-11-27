import { useState } from 'react'
import ConsoleDialog from '../dialog'
import Notice from '../notice'
import Button from '../button'
import SelectField from '../select-field'
import { fieldControlClass } from '../form-field'
import Skeleton from '../../ui/Skeleton'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  getLiveClassAttendances,
  saveLiveClassAttendances,
  type ConsoleLiveClass,
} from '../../../services/liveClassService'
import type { AttendanceStatus } from '../../../types/scheduling'
import { getErrorMessage } from '../../../lib/errors'

const STATUS_OPTIONS: Array<{ id: AttendanceStatus; label: string }> = [
  { id: 'PRESENT', label: 'Có mặt' },
  { id: 'LATE', label: 'Đi muộn' },
  { id: 'ABSENT', label: 'Vắng' },
  { id: 'EXCUSED', label: 'Có phép' },
]

interface Props {
  liveClass: ConsoleLiveClass
  onClose: () => void
  onSaved: () => void
}

export default function LiveClassAttendanceDialog({ liveClass, onClose, onSaved }: Props) {
  const roster = useScheduleResource(
    `live-class-attendance:${liveClass.id}`,
    () => getLiveClassAttendances(liveClass.id)
  )
  const [drafts, setDrafts] = useState<Record<string, AttendanceStatus>>({})
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const records = roster.data ?? []

  const handleSave = async () => {
    if (!records.length) return
    setBusy(true)
    setErrorMessage('')
    try {
      await saveLiveClassAttendances(liveClass.id, {
        attendances: records.map((record) => ({
          studentId: record.studentId,
          status: drafts[record.studentId] ?? record.status,
          ...(record.attendanceMinutes != null ? { attendanceMinutes: record.attendanceMinutes } : {}),
        })),
      })
      onSaved()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title={`Điểm danh · ${liveClass.title}`}
      maxWidth={580}
      footer={
        <>
          <Button type="button" appearance="outline" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="button"
            disabled={busy || roster.status !== 'ready' || records.length === 0}
            onClick={() => void handleSave()}
          >
            {busy ? 'Đang lưu…' : 'Lưu điểm danh'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {errorMessage && <Notice tone="danger">{errorMessage}</Notice>}
        {roster.status === 'loading' ? (
          <div className="space-y-2" role="status" aria-label="Đang tải danh sách điểm danh">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : roster.status === 'error' || roster.status === 'forbidden' ? (
          <Notice tone="danger">
            {roster.errorMessage || 'Không tải được danh sách điểm danh.'}
            <Button size="sm" appearance="outline" onClick={roster.reload}>
              Thử lại
            </Button>
          </Notice>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-text-tertiary">
            Chưa có học viên nào tham gia buổi học này.
          </div>
        ) : (
          <div className="divide-y divide-card-border rounded-xl border border-card-border">
            {records.map((record) => (
              <div key={record.studentId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-medium text-text-primary">{record.studentName}</p>
                  {record.studentEmail && (
                    <p className="m-0 truncate text-xs text-text-tertiary">{record.studentEmail}</p>
                  )}
                </div>
                <SelectField
                  ariaLabel={`Điểm danh ${record.studentName}`}
                  value={drafts[record.studentId] ?? record.status}
                  onChange={(value) =>
                    setDrafts((prev) => ({ ...prev, [record.studentId]: value as AttendanceStatus }))
                  }
                  disabled={busy}
                  className="sm:w-40"
                  triggerClassName={fieldControlClass}
                  options={STATUS_OPTIONS}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}
