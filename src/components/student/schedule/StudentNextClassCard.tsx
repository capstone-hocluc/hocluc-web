import Card from '../../ui/Card'
import StatusBadge from '../../ui/StatusBadge'
import LiveClassJoinButton from '../live/LiveClassJoinButton'
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
}

export default function StudentNextClassCard({ liveClass, nowMs }: Props) {
  const dateKey = dateKeyOfInstant(liveClass.startTime)
  const dayText = `${relativeDayLabel(dateKey, localToday())}, ${formatDdMm(dateKey)}`
  const timeText = formatTimeRangeFromInstants(liveClass.startTime, liveClass.endTime)

  return (
    <Card as="section" variant="live" padding="lg" aria-label="Buổi tiếp theo" className="flex flex-wrap items-center gap-4">
      <div className="flex min-w-64 flex-1 flex-col gap-1.5">
        <StatusBadge tone="live" size="sm">
          {liveClass.status === 'LIVE'
            ? 'Đang diễn ra'
            : `Buổi tiếp theo · ${formatStartsIn(liveClass.startTime, nowMs)}`}
        </StatusBadge>
        <h2 className="text-lg font-semibold text-text-heading">{liveClass.title}</h2>
        <p className="text-sm text-text-secondary">
          {dayText} · {timeText}
          {liveClass.teacherName ? ` · ${liveClass.teacherName}` : ''}
        </p>
      </div>

      <LiveClassJoinButton liveClass={liveClass} shape="pill" showIcon />
    </Card>
  )
}
