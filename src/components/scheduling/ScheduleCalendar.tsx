import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import { addLocalDays, itemDateKey, itemTimeLabel, itemTitle, localDateLabel, localToday, sortScheduleItems, startOfLocalWeek } from '../../lib/scheduling'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'
import ScheduleStatusBadge from './ScheduleStatusBadge'
import ScheduleList from './ScheduleList'

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
  const sorted = sortScheduleItems(items)
  const weekItems = sorted.filter((item) => {
    const key = itemDateKey(item, timezone)
    return key >= days[0] && key <= days[6]
  })

  return (
    <section className="hl-scheduling-calendar space-y-3" aria-label="Lịch theo tuần">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-heading">
          {localDateLabel(days[0], { day: 'numeric', month: 'short' })} – {localDateLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div className="flex gap-1">
          <Button size="icon" className="max-[767px]:size-11" appearance="outline" aria-label="Tuần trước" onClick={() => onDateChange(addLocalDays(date, -7))}>
            <ChevronLeft />
          </Button>
          <Button size="sm" className="max-[767px]:min-h-11" appearance="outline" onClick={() => onDateChange(localToday(timezone))}>Tuần này</Button>
          <Button size="icon" className="max-[767px]:size-11" appearance="outline" aria-label="Tuần sau" onClick={() => onDateChange(addLocalDays(date, 7))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="hl-scheduling-week-grid">
        {days.map((day) => {
          const dayItems = weekItems.filter((item) => itemDateKey(item, timezone) === day)
          return (
            <section key={day} className="hl-scheduling-day" aria-label={localDateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}>
              <h3 className="hl-scheduling-day-heading">
                <span>{localDateLabel(day, { weekday: 'short' })}</span>
                <time dateTime={day}>{localDateLabel(day, { day: 'numeric', month: 'numeric' })}</time>
              </h3>
              <div className="space-y-2">
                {dayItems.length ? dayItems.map((item) => (
                  <button
                    type="button"
                    key={item.kind + ':' + item.sourceId}
                    className="hl-scheduling-event"
                    onClick={() => onSelect(item)}
                  >
                    <span className="block truncate text-xs font-semibold">{itemTitle(item)}</span>
                    <span className="mt-1 block text-[11px]">{itemTimeLabel(item, timezone)}</span>
                    <span className="mt-1 block truncate text-[10px] text-text-muted">
                      {item.kind === 'classSession' ? 'Buổi trong chuỗi' : item.kind === 'liveClass' ? 'Lớp trực tuyến' : 'Lịch đơn'}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <ScheduleStatusBadge status={item.item.status} />
                      {item.kind === 'classSession' && item.item.overridden && (
                        <StatusBadge tone="info" size="sm">Đã điều chỉnh</StatusBadge>
                      )}
                    </span>
                  </button>
                )) : <p className="py-3 text-center text-xs text-text-faint">Không có lịch</p>}
              </div>
            </section>
          )
        })}
      </div>
      <div className="hl-scheduling-mobile-agenda">
        <ScheduleList items={weekItems} onSelect={onSelect} timezone={timezone} />
      </div>
    </section>
  )
}
