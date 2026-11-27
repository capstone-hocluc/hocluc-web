import Button from '../button'
import { CalendarDays, List } from '../icons'

export type LiveScheduleView = 'week' | 'list'

export default function ScheduleViewToggle({
  view,
  onChange,
}: {
  view: LiveScheduleView
  onChange: (view: LiveScheduleView) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-card-border p-1" role="group" aria-label="Kiểu xem">
      <Button size="sm" appearance={view === 'week' ? 'fill' : 'ghost'} aria-pressed={view === 'week'} onClick={() => onChange('week')}>
        <CalendarDays size={15} />
        Tuần
      </Button>
      <Button size="sm" appearance={view === 'list' ? 'fill' : 'ghost'} aria-pressed={view === 'list'} onClick={() => onChange('list')}>
        <List size={15} />
        Danh sách
      </Button>
    </div>
  )
}
