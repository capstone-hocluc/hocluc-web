import { CalendarDays, List, Search } from '../icons'
import Button from '../button'
import { fieldControlClass } from '../form-field'

export type ScheduleViewMode = 'agenda' | 'week'

interface Props {
  date: string
  onDateChange: (date: string) => void
  query: string
  onQueryChange: (query: string) => void
  view: ScheduleViewMode
  onViewChange: (view: ScheduleViewMode) => void
}

export default function ScheduleFilters({ date, onDateChange, query, onQueryChange, view, onViewChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-background p-4 sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Tìm lịch theo tên buổi hoặc lớp</span>
        <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-tertiary" aria-hidden="true" />
        <input
          type="search"
          name="scheduleQuery"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`${fieldControlClass} pl-10`}
          placeholder="Tìm buổi hoặc lớp"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-text-tertiary">
        <span className="sr-only">Tuần chứa ngày</span>
        <input
          name="scheduleDate"
          autoComplete="off"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className={fieldControlClass}
        />
      </label>
      <div className="flex gap-1 rounded-lg border border-card-border p-1" role="group" aria-label="Cách xem lịch">
        <Button size="sm" appearance={view === 'agenda' ? 'fill' : 'ghost'} aria-pressed={view === 'agenda'} onClick={() => onViewChange('agenda')}>
          <List size={15} />
          Danh sách
        </Button>
        <Button size="sm" appearance={view === 'week' ? 'fill' : 'ghost'} aria-pressed={view === 'week'} onClick={() => onViewChange('week')}>
          <CalendarDays size={15} />
          Tuần
        </Button>
      </div>
    </div>
  )
}
