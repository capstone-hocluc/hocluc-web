import { useMemo } from 'react'
import { AlertTriangle } from '../icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatClockFromInstant,
  formatTimeRangeFromInstants,
  minutesFromInstant,
  WEEKDAYS_ORDERED,
} from '../../../lib/liveScheduleFormat'
import { addLocalDays, localToday } from '../../../lib/scheduling'
import { cn } from '../../../lib/cn'
import '../../../styles/scheduling/live-schedule.css'

interface Props {
  weekStart: string
  classes: ConsoleLiveClass[]
  selectedId?: string | null
  onSelect: (liveClass: ConsoleLiveClass) => void
  mode: 'management' | 'teacher'
  minHour?: number
  maxHour?: number
  showLegend?: boolean
}

const SLOT_MINUTES = 30
const ROW_HEIGHT_PX = 24

export default function LiveWeekGrid({
  weekStart,
  classes,
  selectedId,
  onSelect,
  mode,
  minHour = 8,
  maxHour = 22,
  showLegend = true,
}: Props) {
  const todayKey = localToday()
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addLocalDays(weekStart, i)),
    [weekStart]
  )

  const { startHour, endHour } = useMemo(() => {
    let low = minHour
    let high = maxHour
    for (const item of classes) {
      const startMin = minutesFromInstant(item.startTime)
      const endMin = minutesFromInstant(item.endTime)
      low = Math.min(low, Math.floor(startMin / 60))
      high = Math.max(high, Math.ceil(endMin / 60))
    }
    return { startHour: Math.max(0, low), endHour: Math.min(24, Math.max(low + 4, high)) }
  }, [classes, minHour, maxHour])

  const totalRows = (endHour - startHour) * 2
  const hours = useMemo(() => {
    const step = mode === 'management' ? 2 : 1
    const list: number[] = []
    for (let h = startHour; h < endHour; h += step) {
      list.push(h)
    }
    return list
  }, [startHour, endHour, mode])

  return (
    <section aria-label="Lịch tuần" className="ls-week-shell min-w-0 flex-1">
      <div className="ls-week-inner">
        <div className="ls-week-header">
          <div />
          {weekDates.map((dateKey, idx) => {
            const isToday = mode === 'teacher' && dateKey === todayKey
            const dayNum = dateKey.slice(8, 10)
            return (
              <div
                key={dateKey}
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  'text-center text-[13px]',
                  isToday ? 'font-semibold text-[#0b3a82]' : 'text-[#526984]'
                )}
              >
                {WEEKDAYS_ORDERED[idx].short}
                {isToday ? (
                  <strong className="mx-auto mt-0.5 block size-8 rounded-full bg-[#0b3a82] text-base leading-8 text-white">
                    {dayNum}
                  </strong>
                ) : (
                  <strong className="block text-lg font-bold text-text-primary">{dayNum}</strong>
                )}
              </div>
            )
          })}
        </div>

        <div
          className="ls-week-grid"
          style={{
            gridTemplateRows: `repeat(${totalRows}, ${ROW_HEIGHT_PX}px)`,
            backgroundSize: `100% ${ROW_HEIGHT_PX * 2}px`,
          }}
        >
          {hours.map((hour) => {
            const row = (hour - startHour) * 2 + 1
            return (
              <div
                key={hour}
                style={{ gridColumn: 1, gridRow: `${row} / span 2` }}
                className="pr-2 pt-0.5 text-right text-[11px] text-[#526984]"
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            )
          })}

          {weekDates.map((dateKey, idx) => (
            <div
              key={dateKey}
              style={{ gridColumn: idx + 2, gridRow: `1 / span ${totalRows}` }}
              className={cn(
                'ls-week-col',
                mode === 'teacher' && dateKey === todayKey && 'ls-week-col-today'
              )}
            />
          ))}

          {classes.map((item) => {
            const dateKey = dateKeyOfInstant(item.startTime)
            const dayIndex = weekDates.indexOf(dateKey)
            if (dayIndex === -1) return null

            const startMin = minutesFromInstant(item.startTime)
            const endMin = Math.max(startMin + 30, minutesFromInstant(item.endTime))
            const startRow = Math.max(1, Math.floor((startMin - startHour * 60) / SLOT_MINUTES) + 1)
            const spanRows = Math.max(2, Math.ceil((endMin - startMin) / SLOT_MINUTES))
            const clampedSpan = Math.min(spanRows, totalRows - startRow + 1)
            if (clampedSpan <= 0) return null

            const isCancelled = item.status === 'CANCELLED'
            const isCompleted = item.status === 'COMPLETED'
            const isLive = item.status === 'LIVE'
            const isAttention = !isCancelled && !isCompleted && Boolean(item.needsAttention)
            const isSelected = selectedId === item.id

            const cardClass = cn(
              'ls-event-btn',
              isCancelled
                ? 'ls-event-cancelled'
                : isLive
                  ? 'ls-event-live'
                  : isAttention
                    ? 'ls-event-attention'
                    : isCompleted
                      ? 'ls-event-completed'
                      : 'ls-event-upcoming',
              isSelected && (isAttention ? 'ls-event-selected' : 'ls-event-selected-blue')
            )

            const secondaryLine = (() => {
              if (isCancelled) return 'Đã hủy'
              if (isAttention) return 'Ngoài giờ rảnh'
              if (mode === 'teacher') {
                if (isCompleted) return item.attendanceTaken ? 'Đã dạy · đã điểm danh' : 'Chưa điểm danh'
                if (isLive) return 'Đang dạy'
                return item.courseTitle || ''
              }
              if (isLive) return 'Đang dạy'
              return item.teacherName || ''
            })()

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(item)}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${startRow} / span ${clampedSpan}`,
                }}
                className={cardClass}
              >
                <strong className={cn('flex items-center gap-1 text-xs leading-tight', isCancelled && 'line-through')}>
                  {isAttention && (
                    <AlertTriangle size={13} className="shrink-0 text-[#a35400]" aria-hidden="true" />
                  )}
                  <span className="truncate">{item.title}</span>
                </strong>
                <span>
                  <span className="block whitespace-nowrap text-[11px]">
                    {formatTimeRangeFromInstants(item.startTime, item.endTime)}
                  </span>
                </span>
                {secondaryLine && (
                  <span
                    className={cn(
                      'truncate',
                      isAttention
                        ? 'text-[#7a3d00]'
                        : isLive
                          ? 'text-[#dbeafe]'
                          : mode === 'teacher' && isCompleted && !item.attendanceTaken
                            ? 'font-semibold text-[#0b3a82]'
                            : 'text-[#526984]'
                    )}
                  >
                    {secondaryLine}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {showLegend && (
          <div className="flex flex-wrap gap-4 pt-3 text-xs text-[#526984]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-xs border border-[#a9d4ff] bg-[#edf5ff]" />
              Sắp diễn ra
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-xs border-2 border-[#c46a00] bg-[#fff6ea]" />
              Cần xem
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-xs bg-[#0b3a82]" />
              Đang dạy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-xs border border-dashed border-[#9fb3c8] bg-[#f3f5f8]" />
              Đã hủy
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
