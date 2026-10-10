import { CalendarDays, List, Search } from '../console/icons'
import Button from '../ui/Button'

export type ScheduleViewMode = 'agenda' | 'week'

interface Props {
  date: string
  onDateChange: (date: string) => void
  query: string
  onQueryChange: (query: string) => void
  view: ScheduleViewMode
  onViewChange: (view: ScheduleViewMode) => void
}

export default function ScheduleFilters({
  date,
  onDateChange,
  query,
  onQueryChange,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-3 sm:flex-row sm:items-center sm:p-4">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Tìm lịch theo tên buổi hoặc lớp</span>
        <Search
          size={17}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          name="scheduleQuery"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-10 max-[767px]:h-11 w-full rounded-xl border border-border-subtle bg-surface-input pr-3 pl-10 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          placeholder="Tên buổi hoặc lớp…"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-text-muted">
          <span>Tuần chứa ngày</span>
        <input
          name="scheduleDate"
          autoComplete="off"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="h-10 max-[767px]:h-11 min-w-0 rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        />
      </label>
      <div className="flex rounded-xl border border-border-subtle p-1" role="group" aria-label="Cách xem lịch">
        <Button
          size="sm"
          className="max-[767px]:min-h-11"
          appearance={view === 'agenda' ? 'fill' : 'ghost'}
          aria-pressed={view === 'agenda'}
          onClick={() => onViewChange('agenda')}
        >
          <List size={15} />
          Danh sách
        </Button>
        <Button
          size="sm"
          className="max-[767px]:min-h-11"
          appearance={view === 'week' ? 'fill' : 'ghost'}
          aria-pressed={view === 'week'}
          onClick={() => onViewChange('week')}
        >
          <CalendarDays size={15} />
          Tuần
        </Button>
      </div>
    </div>
  )
}
