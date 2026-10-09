import Status, { type StatusTone } from '../status'
import type { ScheduleStatus } from '../../../types/scheduling'

const labels: Record<ScheduleStatus, string> = {
  SCHEDULED: 'Sắp diễn ra',
  ONGOING: 'Đang diễn ra',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
}

const tones: Record<ScheduleStatus, StatusTone> = {
  SCHEDULED: 'info',
  ONGOING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
}

export default function ScheduleStatusBadge({ status }: { status: ScheduleStatus | string }) {
  const known = status in labels ? (status as ScheduleStatus) : null
  return <Status tone={known ? tones[known] : 'neutral'}>{known ? labels[known] : status}</Status>
}
