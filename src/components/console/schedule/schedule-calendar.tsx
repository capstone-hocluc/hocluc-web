import { ChevronLeft, ChevronRight } from '../icons'
import type { ScheduleCalendarItem } from '../../../types/scheduling'
import { addLocalDays, itemDateKey, itemTimeLabel, itemTitle, localDateLabel, localToday, sortScheduleItems, startOfLocalWeek } from '../../../lib/scheduling'
import Button from '../button'
import Status from '../status'
import ScheduleStatusBadge from './schedule-status-badge'
import ScheduleList from './schedule-list'

interface Props {
  items: ScheduleCalendarItem[]
  date: string
  onDateChange: (date: string) => void
  onSelect: (item: ScheduleCalendarItem) => void
  timezone?: string
}

export default function ScheduleCalendar({ items, date, onDateChange, onSelect, timezone }: Props) {
  const weekStart = startOfLocalWeek(date)
  const days = Array.from({ length: 7 }, (_, index) => addLocalDays(weekStart, index))
  const weekItems = sortScheduleItems(items).filter((item) => {
    const key = itemDateKey(item, timezone)
    return key >= days[0] && key <= days[6]
  })

  return (
    <section className="flex flex-col gap-3" aria-label="Lịch theo tuần">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-primary">
          {localDateLabel(days[0], { day: 'numeric', month: 'short' })} – {localDateLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div className="flex gap-1">
          <Button size="icon" appearance="outline" aria-label="Tuần trước" onClick={() => onDateChange(addLocalDays(date, -7))}>
            <ChevronLeft />
          </Button>
          <Button size="sm" appearance="outline" className="h-9" onClick={() => onDateChange(localToday(timezone))}>Tuần này</Button>
          <Button size="icon" appearance="outline" aria-label="Tuần sau" onClick={() => onDateChange(addLocalDays(date, 7))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="hidden gap-2 md:grid md:grid-cols-4 min-[1200px]:grid-cols-7">
        {days.map((day) => {
          const dayItems = weekItems.filter((item) => itemDateKey(item, timezone) === day)
          return (
            <section
              key={day}
              className="min-h-40 min-w-0 rounded-xl border border-card-border bg-card-background p-2.5"
              aria-label={localDateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <h3 className="mb-2.5 flex justify-between gap-1 text-xs font-medium text-text-tertiary capitalize">
                <span>{localDateLabel(day, { weekday: 'short' })}</span>
                <time dateTime={day} className="text-text-primary">{localDateLabel(day, { day: 'numeric', month: 'numeric' })}</time>
              </h3>
              <div className="flex flex-col gap-2">
                {dayItems.length ? dayItems.map((item) => (
                  <button
                    type="button"
                    key={item.kind + ':' + item.sourceId}
                    className="block w-full min-w-0 rounded-lg border border-card-border bg-background-gray-secondary p-2 text-left text-text-primary transition-colors hover:border-brand-500 focus-visible:border-brand-500 focus-visible:outline-none"
                    onClick={() => onSelect(item)}
                  >
                    <span className="block truncate text-xs font-medium">{itemTitle(item)}</span>
                    <span className="mt-1 block text-[11px] text-text-tertiary">{itemTimeLabel(item, timezone)}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      <ScheduleStatusBadge status={item.item.status} />
                      {item.kind === 'classSession' && item.item.overridden && <Status tone="info">Đã điều chỉnh</Status>}
                    </span>
                  </button>
                )) : <p className="py-3 text-center text-xs text-text-tertiary">Trống</p>}
              </div>
            </section>
          )
        })}
      </div>
      <div className="md:hidden">
        <ScheduleList items={weekItems} onSelect={onSelect} timezone={timezone} />
      </div>
    </section>
  )
}
