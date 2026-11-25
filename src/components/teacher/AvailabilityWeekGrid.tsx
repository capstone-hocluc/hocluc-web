import { useMemo, useState } from 'react'
import type { ConsoleLiveClass } from '../../services/liveClassService'
import type { AvailabilitySlot, DayOfWeek } from '../../types/scheduling'
import {
  dateKeyOfInstant,
  dayOfWeekFromDateKey,
  formatClockFromInstant,
  formatMinutesClock,
  minutesFromInstant,
  parseClockMinutes,
  WEEKDAYS_ORDERED,
} from '../../lib/liveScheduleFormat'
import { cn } from '../../lib/cn'
import '../../styles/scheduling/live-schedule.css'

interface Props {
  slots: AvailabilitySlot[]
  weekClasses: ConsoleLiveClass[]
  onAddRange: (day: DayOfWeek, startMin: number, endMin: number) => void
  onRemoveSlot: (slot: AvailabilitySlot) => void
}

const DEFAULT_START_HOUR = 7
const DEFAULT_END_HOUR = 22

export default function AvailabilityWeekGrid({
  slots,
  weekClasses,
  onAddRange,
  onRemoveSlot,
}: Props) {
  const { startHour, endHour } = useMemo(() => {
    let low = DEFAULT_START_HOUR
    let high = DEFAULT_END_HOUR
    for (const slot of slots) {
      const startMin = parseClockMinutes(slot.startTime)
      const endMin = parseClockMinutes(slot.endTime)
      if (endMin > startMin) {
        low = Math.min(low, Math.floor(startMin / 60))
        high = Math.max(high, Math.ceil(endMin / 60))
      }
    }
    for (const item of weekClasses) {
      const startMin = minutesFromInstant(item.startTime)
      const endMin = Math.max(startMin + 30, minutesFromInstant(item.endTime))
      low = Math.min(low, Math.floor(startMin / 60))
      high = Math.max(high, Math.ceil(endMin / 60))
    }
    return { startHour: Math.max(0, low), endHour: Math.min(24, Math.max(low + 4, high)) }
  }, [slots, weekClasses])

  const totalRows = (endHour - startHour) * 2
  const labelHours = useMemo(() => {
    const list: number[] = []
    for (let h = startHour; h < endHour; h += 3) {
      list.push(h)
    }
    return list
  }, [startHour, endHour])

  const [dragState, setDragState] = useState<{
    day: DayOfWeek
    anchorRow: number
    currentRow: number
  } | null>(null)

  const handlePointerDown = (day: DayOfWeek, row: number) => {
    setDragState({ day, anchorRow: row, currentRow: row })
  }

  const handlePointerEnter = (day: DayOfWeek, row: number) => {
    setDragState((prev) => {
      if (!prev || prev.day !== day) return prev
      return { ...prev, currentRow: row }
    })
  }

  const commitDrag = () => {
    if (!dragState) return
    const minRow = Math.min(dragState.anchorRow, dragState.currentRow)
    const maxRow = Math.max(dragState.anchorRow, dragState.currentRow)
    const startMin = startHour * 60 + minRow * 30
    const endMin = startHour * 60 + (maxRow + 1) * 30
    onAddRange(dragState.day, startMin, endMin)
    setDragState(null)
  }

  const previewRowSpan = dragState
    ? {
        dayIdx: WEEKDAYS_ORDERED.findIndex((d) => d.value === dragState.day),
        startRow: Math.min(dragState.anchorRow, dragState.currentRow) + 1,
        span: Math.abs(dragState.currentRow - dragState.anchorRow) + 1,
      }
    : null

  return (
    <section
      aria-label="Giờ rảnh hàng tuần"
      className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-card-border bg-card-background"
      onPointerUp={commitDrag}
      onPointerCancel={() => setDragState(null)}
    >
      <div className="flex min-w-[680px] flex-wrap items-center justify-between gap-2.5 border-b border-card-border px-4 py-3.5 text-[13px] text-[#526984]">
        <span>Kéo trên lưới để thêm giờ rảnh, bấm vào khối để xóa</span>
        <div className="flex flex-wrap gap-3.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-[#cfe5ff]" />
            Giờ rảnh
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-[#0b3a82]" />
            Buổi tuần này
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-xs border-2 border-[#c46a00] bg-[#fff6ea]" />
            Buổi ngoài giờ rảnh
          </span>
        </div>
      </div>

      <div className="min-w-[680px] px-3 pt-2.5 pb-4">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-card-border pb-2 text-center text-sm font-semibold text-text-primary">
          <div />
          {WEEKDAYS_ORDERED.map((d) => (
            <div key={d.value}>{d.short}</div>
          ))}
        </div>

        <div className="ls-avail-grid" style={{ gridTemplateRows: `repeat(${totalRows}, 18px)` }}>
          {labelHours.map((hour) => {
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

          {WEEKDAYS_ORDERED.map((day, dayIdx) =>
            Array.from({ length: totalRows }, (_, row) => (
              <div
                key={`${day.value}-${row}`}
                role="gridcell"
                aria-label={`${day.label} ${formatMinutesClock(startHour * 60 + row * 30)}`}
                style={{ gridColumn: dayIdx + 2, gridRow: row + 1 }}
                className="ls-avail-cell"
                onPointerDown={(e) => {
                  e.preventDefault()
                  handlePointerDown(day.value, row)
                }}
                onPointerEnter={() => handlePointerEnter(day.value, row)}
              />
            ))
          )}

          {previewRowSpan && previewRowSpan.dayIdx >= 0 && (
            <div
              style={{
                gridColumn: previewRowSpan.dayIdx + 2,
                gridRow: `${previewRowSpan.startRow} / span ${previewRowSpan.span}`,
              }}
              className="pointer-events-none z-2 mx-0.5 rounded-md border border-dashed border-[#0b3a82] bg-[#cfe5ff]/75"
            />
          )}

          {slots.map((slot, index) => {
            const dayIdx = WEEKDAYS_ORDERED.findIndex((d) => d.value === slot.dayOfWeek)
            if (dayIdx === -1) return null
            const dayMeta = WEEKDAYS_ORDERED[dayIdx]
            const startMin = Math.max(startHour * 60, parseClockMinutes(slot.startTime))
            const endMin = Math.min(endHour * 60, parseClockMinutes(slot.endTime))
            if (endMin <= startMin) return null
            const startRow = Math.floor((startMin - startHour * 60) / 30) + 1
            const span = Math.max(1, Math.ceil((endMin - startMin) / 30))
            const startLabel = slot.startTime.slice(0, 5)
            const endLabel = slot.endTime.slice(0, 5)
            return (
              <button
                key={`${slot.dayOfWeek}-${startLabel}-${endLabel}-${index}`}
                type="button"
                aria-label={`Giờ rảnh ${dayMeta.label} ${startLabel} đến ${endLabel}`}
                onClick={() => onRemoveSlot(slot)}
                style={{ gridColumn: dayIdx + 2, gridRow: `${startRow} / span ${span}` }}
                className="ls-avail-block"
              >
                <span>
                  {startLabel} – {endLabel}
                </span>
              </button>
            )
          })}

          {weekClasses.map((item) => {
            const dateKey = dateKeyOfInstant(item.startTime)
            const dayEnum = dayOfWeekFromDateKey(dateKey)
            const dayIdx = WEEKDAYS_ORDERED.findIndex((d) => d.value === dayEnum)
            if (dayIdx === -1) return null

            const startMin = Math.max(startHour * 60, minutesFromInstant(item.startTime))
            const endMin = Math.min(endHour * 60, Math.max(startMin + 30, minutesFromInstant(item.endTime)))
            if (endMin <= startMin) return null

            const startRow = Math.floor((startMin - startHour * 60) / 30) + 1
            const span = Math.max(2, Math.ceil((endMin - startMin) / 30))

            const clockStart = formatClockFromInstant(item.startTime)
            const clockEnd = formatClockFromInstant(item.endTime)
            const coveredByDraft = slots.some(
              (s) =>
                s.dayOfWeek === dayEnum &&
                s.startTime.slice(0, 5) <= clockStart &&
                s.endTime.slice(0, 5) >= clockEnd
            )
            const isOutside = Boolean(item.needsAttention) || !coveredByDraft

            return (
              <div
                key={item.id}
                style={{ gridColumn: dayIdx + 2, gridRow: `${startRow} / span ${span}` }}
                className={cn(isOutside ? 'ls-avail-class-warn' : 'ls-avail-class-ok')}
              >
                {item.subjectName || item.title} · {clockStart}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
