import { AlertTriangle, Video } from '../console/icons'
import Button from '../console/button'
import Card from '../console/card'
import Status from '../console/status'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import {
  canTeacherStartOrJoin,
  dateKeyOfInstant,
  formatDdMm,
  formatStartsIn,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../lib/liveScheduleFormat'
import { localToday } from '../../lib/scheduling'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  busy: boolean
  zoomMissing?: boolean
  onOpenContent: () => void
  onStart: () => void
  onEnd: () => void
}

export default function TeacherNextClassCard({
  liveClass,
  nowMs,
  busy,
  zoomMissing = false,
  onOpenContent,
  onStart,
  onEnd,
}: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const dayText = `${relativeDayLabel(dateKey, localToday())}, ${formatDdMm(dateKey)}`
  const timeText = formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)
  const seatsText = liveClass.capacity
    ? `${liveClass.bookedCount ?? 0}/${liveClass.capacity} học viên giữ chỗ`
    : `${liveClass.bookedCount ?? 0} học viên giữ chỗ`
  const canStart = canTeacherStartOrJoin(liveClass.startTime, liveClass.endTime, liveClass.status, nowMs)
  const isLive = liveClass.status === 'LIVE'

  return (
    <Card as="section" aria-label="Buổi tiếp theo" className="flex flex-wrap items-center gap-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
        <Video size={22} aria-hidden="true" />
      </span>
      <div className="flex min-w-64 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <Status tone="success">Đang dạy</Status>
          ) : (
            <Status tone="info">Buổi tiếp theo · {formatStartsIn(liveClass.startTime, nowMs)}</Status>
          )}
          {liveClass.needsAttention && <Status tone="warning">Ngoài giờ rảnh bạn đã khai</Status>}
        </div>
        <h2 className="text-lg leading-7 font-medium text-text-primary">{liveClass.title}</h2>
        <p className="text-sm text-text-tertiary">
          {dayText} · {timeText} · {seatsText}
        </p>
        {zoomMissing && (
          <a
            href="#teacher-zoom-card"
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-danger underline-offset-2 hover:underline"
          >
            <AlertTriangle size={14} aria-hidden="true" />
            Chưa kết nối Zoom — Kết nối ngay
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button appearance="outline" disabled={busy} onClick={onOpenContent}>
          Nội dung buổi
        </Button>
        {isLive && (
          <Button variant="danger" appearance="outline" disabled={busy} onClick={onEnd}>
            Kết thúc buổi
          </Button>
        )}
        <Button
          disabled={busy || !canStart}
          onClick={onStart}
          title={!canStart ? 'Mở trước giờ bắt đầu 15 phút' : undefined}
        >
          <Video size={18} aria-hidden="true" />
          Vào dạy
        </Button>
      </div>
    </Card>
  )
}
