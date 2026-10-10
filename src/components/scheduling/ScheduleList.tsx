import { ArrowUpRight, CalendarClock, MapPin } from '../console/icons'
import type { ScheduleCalendarItem } from '../../types/scheduling'
import { itemDateKey, itemLocation, itemSubtitle, itemTimeLabel, itemTitle, localDateLabel, sortScheduleItems } from '../../lib/scheduling'
import Button from '../ui/Button'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import ScheduleStatusBadge from './ScheduleStatusBadge'

interface Props {
  items: ScheduleCalendarItem[]
  onSelect: (item: ScheduleCalendarItem) => void
  timezone?: string
}

export default function ScheduleList({ items, onSelect, timezone }: Props) {
  const grouped = new Map<string, ScheduleCalendarItem[]>()
  for (const item of sortScheduleItems(items)) {
    const key = itemDateKey(item, timezone)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([date, dateItems]) => (
        <section key={date} aria-labelledby={'schedule-date-' + date}>
          <h2
            id={'schedule-date-' + date}
            className="mb-2 text-sm font-semibold capitalize text-text-heading"
          >
            {localDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <div className="space-y-2">
            {dateItems.map((item) => (
              <Card
                key={item.kind + ':' + item.sourceId}
                as="article"
                padding="none"
                className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-badge-info-bg text-badge-info-text">
                  <CalendarClock size={19} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-text-heading">{itemTitle(item)}</h3>
                    <ScheduleStatusBadge status={item.item.status} />
                    {item.kind === 'classSession' && item.item.overridden && (
                      <StatusBadge tone="info" size="sm">Đã điều chỉnh</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-text-muted">{itemSubtitle(item)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <time dateTime={item.item.startTime}>{itemTimeLabel(item, timezone)}</time>
                    {itemLocation(item) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} aria-hidden="true" />
                        {itemLocation(item)}
                      </span>
                    )}
                    <span className="capitalize">{item.kind === 'classSession' ? 'Buổi trong chuỗi' : item.kind === 'liveClass' ? 'Lớp trực tuyến' : 'Lịch đơn'}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  className="max-[767px]:size-11"
                  appearance="ghost"
                  aria-label={'Xem chi tiết ' + itemTitle(item)}
                  onClick={() => onSelect(item)}
                >
                  <ArrowUpRight size={17} />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
