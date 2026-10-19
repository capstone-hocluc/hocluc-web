import { ChevronLeft, ChevronRight } from '../console/icons'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import {
  addLocalDays,
  itemDateKey,
  itemTimeLabel,
  itemTitle,
  localDateLabel,
  localToday,
  sortScheduleItems,
  startOfLocalWeek,
} from '../../lib/scheduling'
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
    <section className="space-y-4" aria-label="Lịch theo tuần">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold tracking-[-0.3px] text-text-heading">
          {localDateLabel(days[0], { day: 'numeric', month: 'short' })} –{' '}
          {localDateLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div className="flex gap-1">
          <Button
            size="icon"
            className="max-[767px]:size-11"
            appearance="outline"
            aria-label="Tuần trước"
            onClick={() => onDateChange(addLocalDays(date, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            className="max-[767px]:min-h-11"
            appearance="outline"
            onClick={() => onDateChange(localToday(timezone))}
          >
            Tuần này
          </Button>
          <Button
            size="icon"
            className="max-[767px]:size-11"
            appearance="outline"
            aria-label="Tuần sau"
            onClick={() => onDateChange(addLocalDays(date, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3 max-[1199px]:grid-cols-4 max-[767px]:hidden">
        {days.map((day) => {
          const dayItems = weekItems.filter((item) => itemDateKey(item, timezone) === day)
          return (
            <section
              key={day}
              className="min-h-44 min-w-0 rounded-xl border border-line-card bg-surface p-3 shadow-card-soft"
              aria-label={localDateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <h3 className="mb-3 flex items-baseline justify-between gap-1 border-b border-line pb-2 text-sm font-semibold text-text-body capitalize">
                <span>{localDateLabel(day, { weekday: 'short' })}</span>
                <time dateTime={day} className="text-text-heading">
                  {localDateLabel(day, { day: 'numeric', month: 'numeric' })}
                </time>
              </h3>
              <div className="space-y-2">
                {dayItems.length ? (
                  dayItems.map((item) => (
                    <button
                      type="button"
                      key={item.kind + ':' + item.sourceId}
                      className="block w-full min-w-0 cursor-pointer rounded-xl border border-line-brand bg-surface-brand p-2.5 text-left text-text-heading transition hover:-translate-y-0.5 hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      onClick={() => onSelect(item)}
                    >
                      <span className="block truncate text-sm font-semibold">
                        {itemTitle(item)}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-text-body">
                        {itemTimeLabel(item, timezone)}
                      </span>
                      <span className="mt-1 block truncate text-xs text-text-muted">
                        {item.kind === 'classSession'
                          ? 'Buổi trong chuỗi'
                          : item.kind === 'liveClass'
                            ? 'Lớp trực tuyến'
                            : 'Lịch đơn'}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        <ScheduleStatusBadge status={item.item.status} />
                        {item.kind === 'classSession' && item.item.overridden && (
                          <StatusBadge tone="info" size="sm">
                            Đã điều chỉnh
                          </StatusBadge>
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-text-faint">Không có lịch</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
      <div className="hidden max-[767px]:block">
        <ScheduleList items={weekItems} onSelect={onSelect} timezone={timezone} />
      </div>
    </section>
  )
}
