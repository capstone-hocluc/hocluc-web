import { ArrowUpRight, CalendarClock, MapPin } from '../icons'
import type { ScheduleCalendarItem } from '../../../types/scheduling'
import { itemDateKey, itemLocation, itemSubtitle, itemTimeLabel, itemTitle, localDateLabel, sortScheduleItems } from '../../../lib/scheduling'
import Button from '../button'
import Status from '../status'
import ScheduleStatusBadge from './schedule-status-badge'
import { scheduleKindLabel } from './schedule-labels'

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
    <div className="flex flex-col gap-5">
      {[...grouped.entries()].map(([date, dateItems]) => (
        <section key={date} aria-labelledby={'schedule-date-' + date}>
          <h2 id={'schedule-date-' + date} className="mb-2 text-sm font-medium text-text-tertiary capitalize">
            {localDateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <div className="flex flex-col gap-2">
            {dateItems.map((item) => (
              <article
                key={item.kind + ':' + item.sourceId}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card-background p-4 sm:gap-4"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
                  <CalendarClock size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-text-primary">{itemTitle(item)}</h3>
                    <ScheduleStatusBadge status={item.item.status} />
                    {item.kind === 'classSession' && item.item.overridden && <Status tone="info">Đã điều chỉnh</Status>}
                  </div>
                  <p className="mt-1 truncate text-sm text-text-tertiary">{itemSubtitle(item)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                    <time dateTime={item.item.startTime}>{itemTimeLabel(item, timezone)}</time>
                    {itemLocation(item) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} aria-hidden="true" />
                        {itemLocation(item)}
                      </span>
                    )}
                    <span>{scheduleKindLabel(item.kind)}</span>
                  </div>
                </div>
                <Button size="icon" appearance="ghost" aria-label={'Xem chi tiết ' + itemTitle(item)} onClick={() => onSelect(item)}>
                  <ArrowUpRight size={17} />
                </Button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
