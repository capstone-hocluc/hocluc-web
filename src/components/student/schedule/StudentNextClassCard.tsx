import { Video } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import StatusBadge from '../../ui/StatusBadge'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMm,
  formatStartsIn,
  formatTimeRangeFromInstants,
  relativeDayLabel,
} from '../../../lib/liveScheduleFormat'
import { localToday } from '../../../lib/scheduling'

interface Props {
  liveClass: ConsoleLiveClass
  nowMs: number
  canJoin: boolean
  joinUrl: string | null
  bookingBusy: boolean
  onBook: () => void
}

export default function StudentNextClassCard({ liveClass, nowMs, canJoin, joinUrl, bookingBusy, onBook }: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const dayText = `${relativeDayLabel(dateKey, localToday())}, ${formatDdMm(dateKey)}`
  const timeText = formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)

  return (
    <Card as="section" variant="live" padding="lg" aria-label="Buổi tiếp theo" className="flex flex-wrap items-center gap-4">
      <div className="flex min-w-64 flex-1 flex-col gap-1.5">
        <StatusBadge tone="live" size="sm">
          Buổi tiếp theo · {formatStartsIn(liveClass.startTime, nowMs)}
        </StatusBadge>
        <h2 className="text-lg font-semibold text-text-heading">{liveClass.title}</h2>
        <p className="text-sm text-text-secondary">
          {dayText} · {timeText}
          {liveClass.teacherName ? ` · ${liveClass.teacherName}` : ''}
        </p>
      </div>

      {liveClass.booked ? (
        canJoin && joinUrl ? (
          <Button asChild shape="pill">
            <a href={joinUrl} target="_blank" rel="noreferrer">
              <Video aria-hidden="true" />
              Vào lớp
            </a>
          </Button>
        ) : (
          <Button shape="pill" disabled title="Mở trước giờ bắt đầu 15 phút">
            <Video aria-hidden="true" />
            Vào lớp
          </Button>
        )
      ) : (
        <Button shape="pill" disabled={bookingBusy || liveClass.seatsLeft === 0} onClick={onBook}>
          {liveClass.seatsLeft === 0 ? 'Hết chỗ' : bookingBusy ? 'Đang giữ chỗ…' : 'Giữ chỗ'}
        </Button>
      )}
    </Card>
  )
}
