import StatusBadge from '../ui/StatusBadge'
import type { ScheduleStatus } from '../../types/scheduling'

const labels: Record<ScheduleStatus, string> = {
  SCHEDULED: 'Sắp diễn ra',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
}

const tones: Record<ScheduleStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  SCHEDULED: 'info',
  ONGOING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
}

export default function ScheduleStatusBadge({ status }: { status: ScheduleStatus | string }) {
  const knownStatus = status in labels ? (status as ScheduleStatus) : null
  return (
    <StatusBadge tone={knownStatus ? tones[knownStatus] : 'neutral'} size="sm">
      {knownStatus ? labels[knownStatus] : status}
    </StatusBadge>
  )
}
