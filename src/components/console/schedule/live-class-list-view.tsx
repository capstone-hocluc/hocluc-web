import { ArrowUpRight, CalendarClock } from '../icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatDdMmYyyy,
  formatTimeRangeFromInstants,
  fullDayLabel,
} from '../../../lib/liveScheduleFormat'
import { cn } from '../../../lib/cn'
import Button from '../button'
import Status from '../status'
import LiveClassStatus from './live-class-status'

interface Props {
  classes: ConsoleLiveClass[]
  selectedId?: string | null
  onSelect: (liveClass: ConsoleLiveClass) => void
  emptyMessage?: string
}

export default function LiveClassListView({
  classes,
  selectedId,
  onSelect,
  emptyMessage = 'Không có buổi học nào trong tuần này.',
}: Props) {
  if (!classes.length) {
    return (
      <div className="rounded-xl border border-card-border bg-card-background px-5 py-12 text-center text-sm text-text-tertiary">
        {emptyMessage}
      </div>
    )
  }

  const grouped = new Map<string, ConsoleLiveClass[]>()
  for (const item of classes) {
    const key = dateKeyOfInstant(item.startTime)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  return (
    <div aria-label="Danh sách buổi học" className="flex flex-col gap-5">
      {[...grouped.entries()].map(([dateKey, dayClasses]) => (
        <section key={dateKey} aria-labelledby={'live-date-' + dateKey}>
          <h2 id={'live-date-' + dateKey} className="mb-2 text-sm font-medium text-text-tertiary">
            {fullDayLabel(dateKey)}, {formatDdMmYyyy(dateKey)}
          </h2>
          <div className="flex flex-col gap-2">
            {dayClasses.map((item) => {
              const isCancelled = item.status === 'CANCELLED'
              const isAttention = !isCancelled && item.status !== 'COMPLETED' && Boolean(item.needsAttention)
              const seatsLabel = item.capacity
                ? `${item.bookedCount ?? 0} / ${item.capacity} chỗ`
                : `${item.bookedCount ?? 0} giữ chỗ`
              return (
                <article
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border bg-card-background p-4 sm:gap-4',
                    selectedId === item.id ? 'border-brand-500' : 'border-card-border'
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
                    <CalendarClock size={19} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn('truncate text-sm font-medium text-text-primary', isCancelled && 'line-through')}>
                        {item.title}
                      </h3>
                      <LiveClassStatus status={item.status} />
                      {isAttention && <Status tone="warning">Ngoài giờ rảnh</Status>}
                    </div>
                    <p className="mt-1 truncate text-sm text-text-tertiary">
                      {[item.teacherName, item.courseTitle].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                      <time dateTime={item.startTime}>{formatTimeRangeFromInstants(item.startTime, item.endTime)}</time>
                      <span>{seatsLabel}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={'Xem chi tiết ' + item.title}
                    aria-pressed={selectedId === item.id}
                    onClick={() => onSelect(item)}
                  >
                    <ArrowUpRight size={17} />
                  </Button>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
