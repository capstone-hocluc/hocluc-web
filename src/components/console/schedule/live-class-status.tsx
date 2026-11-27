import Status, { type StatusTone } from '../status'

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: 'Sắp diễn ra', tone: 'info' },
  LIVE: { label: 'Đang dạy', tone: 'success' },
  COMPLETED: { label: 'Đã dạy', tone: 'neutral' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
}

export default function LiveClassStatus({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: status, tone: 'neutral' as const }
  return <Status tone={meta.tone}>{meta.label}</Status>
}
