import { useMemo } from 'react'
import { AlertTriangle } from '../icons'
import type { ConsoleLiveClass } from '../../../services/liveClassService'
import {
  dateKeyOfInstant,
  formatTimeRangeFromInstants,
  minutesFromInstant,
  WEEKDAYS_ORDERED,
} from '../../../lib/liveScheduleFormat'
import { addLocalDays, localToday } from '../../../lib/scheduling'
import { cn } from '../../../lib/cn'
import LiveClassLegend from './live-class-legend'
import { hourLinesStyle, LIVE_CLASS_TONE_CLASS, selectedRing, WEEK_COLUMNS, type LiveClassTone } from './live-class-tones'

interface Props {
  weekStart: string
  classes: ConsoleLiveClass[]
  selectedId?: string | null
  onSelect: (liveClass: ConsoleLiveClass) => void
  mode: 'management' | 'teacher'
  minHour?: number
  maxHour?: number
  showLegend?: boolean
  /** Drops the card border when the grid sits inside another card. */
  bare?: boolean
}

const SLOT_MINUTES = 30
const ROW_HEIGHT_PX = 24

function toneOf(item: ConsoleLiveClass): LiveClassTone {
  if (item.status === 'CANCELLED') return 'cancelled'
  if (item.status === 'LIVE') return 'live'
  if (item.status !== 'COMPLETED' && item.needsAttention) return 'attention'
  if (item.status === 'COMPLETED') return 'completed'
  return 'upcoming'
}

export default function LiveWeekGrid({
  weekStart,
  classes,
  selectedId,
  onSelect,
  mode,
  minHour = 7,
  maxHour = 22,
  showLegend = true,
  bare = false,
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
      const endMin = Math.max(startMin + 30, minutesFromInstant(item.endTime))
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
    <section
      aria-label="Lịch tuần"
      className={cn(
        'min-w-0 flex-1 overflow-x-auto',
        !bare && 'rounded-xl border border-card-border bg-card-background'
      )}
    >
      <div className="min-w-[720px] px-3 pt-3 pb-4">
        <div className={cn(WEEK_COLUMNS, 'border-b border-card-border pb-2')}>
          <div />
          {weekDates.map((dateKey, idx) => {
            const isToday = mode === 'teacher' && dateKey === todayKey
            return (
              <div
                key={dateKey}
                aria-current={isToday ? 'date' : undefined}
                className={cn('text-center text-xs', isToday ? 'font-semibold text-brand-500' : 'text-text-tertiary')}
              >
                {WEEKDAYS_ORDERED[idx].short}
                <strong
                  className={cn(
                    'mx-auto mt-0.5 block text-base',
                    isToday
                      ? 'size-8 rounded-full bg-brand-500 leading-8 text-white'
                      : 'font-semibold text-text-primary'
                  )}
                >
                  {dateKey.slice(8, 10)}
                </strong>
              </div>
            )
          })}
        </div>

        <div
          className={cn(WEEK_COLUMNS, 'relative')}
          style={{ gridTemplateRows: `repeat(${totalRows}, ${ROW_HEIGHT_PX}px)`, ...hourLinesStyle(ROW_HEIGHT_PX * 2) }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ gridColumn: 1, gridRow: `${(hour - startHour) * 2 + 1} / span 2` }}
              className="pt-0.5 pr-2 text-right text-xs text-text-tertiary"
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}

          {weekDates.map((dateKey, idx) => (
            <div
              key={dateKey}
              style={{ gridColumn: idx + 2, gridRow: `1 / span ${totalRows}` }}
              className={cn(
                'border-l border-card-border',
                mode === 'teacher' && dateKey === todayKey && 'bg-badge-blue-background/40'
              )}
            />
          ))}

          {classes.map((item) => {
            const dayIndex = weekDates.indexOf(dateKeyOfInstant(item.startTime))
            if (dayIndex === -1) return null

            const startMin = minutesFromInstant(item.startTime)
            const endMin = Math.max(startMin + 30, minutesFromInstant(item.endTime))
            const startRow = Math.max(1, Math.floor((startMin - startHour * 60) / SLOT_MINUTES) + 1)
            const spanRows = Math.max(2, Math.ceil((endMin - startMin) / SLOT_MINUTES))
            const clampedSpan = Math.min(spanRows, totalRows - startRow + 1)
            if (clampedSpan <= 0) return null

            const tone = toneOf(item)
            const isSelected = selectedId === item.id
            const unmarked = mode === 'teacher' && tone === 'completed' && !item.attendanceTaken

            const secondaryLine = (() => {
              if (tone === 'cancelled') return 'Đã hủy'
              if (tone === 'attention') return 'Ngoài giờ rảnh'
              if (tone === 'live') return 'Đang dạy'
              if (mode === 'teacher') {
                if (tone === 'completed') return item.attendanceTaken ? 'Đã dạy · đã điểm danh' : 'Chưa điểm danh'
                return item.courseTitle || ''
              }
              return item.teacherName || ''
            })()

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(item)}
                style={{ gridColumn: dayIndex + 2, gridRow: `${startRow} / span ${clampedSpan}` }}
                className={cn(
                  'z-1 mx-[3px] my-0.5 flex cursor-pointer flex-col gap-px overflow-hidden rounded-lg px-[7px] py-1 text-left text-xs leading-tight transition-shadow focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500',
                  LIVE_CLASS_TONE_CLASS[tone],
                  selectedRing(isSelected, tone === 'attention')
                )}
              >
                <strong className={cn('flex items-center gap-1 font-semibold', tone === 'cancelled' && 'line-through')}>
                  {tone === 'attention' && (
                    <AlertTriangle size={13} className="shrink-0 text-badge-warning-icon-color" aria-hidden="true" />
                  )}
                  <span className="truncate">{item.title}</span>
                </strong>
                <span className="whitespace-nowrap">{formatTimeRangeFromInstants(item.startTime, item.endTime)}</span>
                {secondaryLine && (
                  <span
                    className={cn(
                      'truncate',
                      tone === 'live' ? 'opacity-85' : unmarked ? 'font-semibold text-brand-500' : 'text-text-secondary'
                    )}
                  >
                    {secondaryLine}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {showLegend && <LiveClassLegend className="pt-3" />}
      </div>
    </section>
  )
}
