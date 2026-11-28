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
      <Button
        size="icon"
        className="size-8.5"
        appearance={view === 'week' ? 'fill' : 'ghost'}
        aria-label="Xem theo tuần"
        title="Tuần"
        aria-pressed={view === 'week'}
        onClick={() => onChange('week')}
      >
        <CalendarDays size={15} />
      </Button>
      <Button
        size="icon"
        className="size-8.5"
        appearance={view === 'list' ? 'fill' : 'ghost'}
        aria-label="Xem dạng danh sách"
        title="Danh sách"
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        <List size={15} />
      </Button>
    </div>
  )
}
