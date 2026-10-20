import { CalendarDays, List } from '../console/icons'
import Button from '../ui/Button'
import { Input } from '../ui/Field'
import SearchInput from '../ui/SearchInput'

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
    <div className="flex flex-col gap-3 rounded-2xl border border-line-card bg-surface p-3 shadow-card-soft sm:flex-row sm:items-center sm:p-4">
      <SearchInput
        aria-label="Tìm lịch theo tên buổi hoặc lớp"
        name="scheduleQuery"
        autoComplete="off"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="min-w-0 flex-1 max-[767px]:h-12"
        placeholder="Tên buổi hoặc lớp…"
      />
      <label className="flex items-center gap-2 text-sm font-bold text-text-body">
        <span>Tuần chứa ngày</span>
        <Input
          name="scheduleDate"
          autoComplete="off"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-auto min-w-0 max-[767px]:h-12"
        />
      </label>
      <div
        className="flex gap-1 rounded-xl border border-line bg-surface p-1"
        role="group"
        aria-label="Cách xem lịch"
      >
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
