import ConsoleDialog from '../console/dialog'
import Button from '../console/button'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import {
  canTeacherStartOrJoin,
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../lib/liveScheduleFormat'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  busy: boolean
  onClose: () => void
  onStart: () => void
  onEnd: () => void
  onOpenContent: () => void
  onOpenAttendance: () => void
}

export default function TeacherClassDetailDialog({
  liveClass,
  nowMs,
  busy,
  onClose,
  onStart,
  onEnd,
  onOpenContent,
  onOpenAttendance,
}: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const canStart = canTeacherStartOrJoin(liveClass.startTime, liveClass.endTime, liveClass.status, nowMs)
  const isLive = liveClass.status === 'LIVE'
  const isOver = liveClass.status === 'COMPLETED'

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title={liveClass.title}
      maxWidth={500}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {!isOver && liveClass.status !== 'CANCELLED' && (
            <Button type="button" appearance="outline" disabled={busy} onClick={onOpenContent}>
              Nội dung buổi
            </Button>
          )}
          <Button type="button" appearance="outline" disabled={busy} onClick={onOpenAttendance}>
            Điểm danh
          </Button>
          {isLive && (
            <Button type="button" variant="danger" appearance="outline" disabled={busy} onClick={onEnd}>
              Kết thúc buổi
            </Button>
          )}
          {!isOver && liveClass.status !== 'CANCELLED' && (
            <Button type="button" disabled={busy || !canStart} onClick={onStart}>
              Vào dạy
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <dl className="m-0 grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-[#526984]">Thời gian</dt>
          <dd className="m-0 text-text-primary">
            {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)} ·{' '}
            {formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)}
          </dd>
          <dt className="text-[#526984]">Khóa học</dt>
          <dd className="m-0 text-text-primary">{liveClass.courseTitle || '—'}</dd>
          <dt className="text-[#526984]">Giữ chỗ</dt>
          <dd className="m-0 text-text-primary">
            {liveClass.capacity
              ? `${liveClass.bookedCount ?? 0} / ${liveClass.capacity}`
              : `${liveClass.bookedCount ?? 0}`}
          </dd>
          {liveClass.description && (
            <>
              <dt className="text-[#526984]">Nội dung</dt>
              <dd className="m-0 whitespace-pre-wrap text-text-primary">{liveClass.description}</dd>
            </>
          )}
        </dl>
        {liveClass.needsAttention && liveClass.attentionReason && (
          <div className="rounded-xl border border-[#f3c58b] bg-[#fff6ea] p-3 text-[13px] text-[#7a3d00]">
            {liveClass.attentionReason}
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}
