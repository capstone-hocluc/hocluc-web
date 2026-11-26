import type { LiveTimetableSlot } from '../services/liveClassService'
import type { AvailabilityExceptionResponse, AvailabilitySlot, DayOfWeek } from '../types/scheduling'
import { addLocalDays, localDateKeyForInstant, SCHEDULING_TIMEZONE } from './scheduling'

export const WEEKDAYS_ORDERED: Array<{ value: DayOfWeek; short: string; label: string }> = [
  { value: 'MONDAY', short: 'T2', label: 'Thứ Hai' },
  { value: 'TUESDAY', short: 'T3', label: 'Thứ Ba' },
  { value: 'WEDNESDAY', short: 'T4', label: 'Thứ Tư' },
  { value: 'THURSDAY', short: 'T5', label: 'Thứ Năm' },
  { value: 'FRIDAY', short: 'T6', label: 'Thứ Sáu' },
  { value: 'SATURDAY', short: 'T7', label: 'Thứ Bảy' },
  { value: 'SUNDAY', short: 'CN', label: 'Chủ Nhật' },
]

const DAY_INDEX_TO_ENUM: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]

export function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const parts = dateKey.split('-').map(Number)
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
  return DAY_INDEX_TO_ENUM[day]
}

export function formatDdMmYyyy(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  return d && m && y ? `${d}/${m}/${y}` : dateKey
}

export function formatDdMm(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return d && m ? `${d}/${m}` : dateKey
}

export function formatWeekRangeLabel(weekStart: string): string {
  const weekEnd = addLocalDays(weekStart, 6)
  return `${formatDdMm(weekStart)} – ${formatDdMmYyyy(weekEnd)}`
}

export function shortDayLabel(dateKey: string): string {
  const day = dayOfWeekFromDateKey(dateKey)
  return WEEKDAYS_ORDERED.find((entry) => entry.value === day)?.short ?? ''
}

export function fullDayLabel(dateKey: string): string {
  const day = dayOfWeekFromDateKey(dateKey)
  return WEEKDAYS_ORDERED.find((entry) => entry.value === day)?.label ?? ''
}

export function relativeDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Hôm nay'
  if (dateKey === addLocalDays(todayKey, -1)) return 'Hôm qua'
  return fullDayLabel(dateKey)
}

export function formatClockFromInstant(instantIso: string, timezone = SCHEDULING_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instantIso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

export function formatTimeRangeFromInstants(startIso: string, endIso: string): string {
  return `${formatClockFromInstant(startIso)} – ${formatClockFromInstant(endIso)}`
}

export function minutesFromInstant(instantIso: string, timezone = SCHEDULING_TIMEZONE): number {
  const clock = formatClockFromInstant(instantIso, timezone)
  return parseClockMinutes(clock)
}

export function parseClockMinutes(clock: string): number {
  const [h, m] = clock.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

export function formatMinutesClock(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatStartsIn(startIso: string, nowMs: number): string {
  const diffMin = Math.round((Date.parse(startIso) - nowMs) / 60000)
  if (diffMin <= 0) return 'đang diễn ra'
  if (diffMin < 60) return `bắt đầu sau ${diffMin} phút`
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  if (hours < 24) {
    return mins > 0 ? `bắt đầu sau ${hours} giờ ${mins} phút` : `bắt đầu sau ${hours} giờ`
  }
  const days = Math.floor(hours / 24)
  return `bắt đầu sau ${days} ngày`
}

export function canTeacherStartOrJoin(startIso: string, endIso: string, status: string, nowMs: number): boolean {
  if (status === 'CANCELLED' || status === 'COMPLETED') return false
  if (status === 'LIVE') return true
  const startMs = Date.parse(startIso)
  const endMs = Date.parse(endIso)
  return nowMs >= startMs - 15 * 60 * 1000 && nowMs <= endMs
}

export function initialsOf(name?: string | null): string {
  if (!name) return 'HV'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'HV'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function isSlotCoveredByAvailability(
  dateKey: string,
  startClock: string,
  endClock: string,
  recurringSlots: AvailabilitySlot[],
  exceptions: AvailabilityExceptionResponse[]
): boolean {
  const blocked = exceptions.some((ex) => {
    if (ex.exceptionDate !== dateKey || ex.isAvailable) return false
    if (!ex.startTime || !ex.endTime) return true
    return ex.startTime.slice(0, 5) < endClock && ex.endTime.slice(0, 5) > startClock
  })
  if (blocked) return false
  const day = dayOfWeekFromDateKey(dateKey)
  return recurringSlots.some(
    (slot) =>
      slot.dayOfWeek === day &&
      slot.startTime.slice(0, 5) <= startClock &&
      slot.endTime.slice(0, 5) >= endClock
  )
}

export function computeProjectedSessions(
  startDate: string,
  endDate: string,
  slots: LiveTimetableSlot[],
  recurringSlots: AvailabilitySlot[],
  exceptions: AvailabilityExceptionResponse[]
): { count: number; firstDate: string | null; lastDate: string | null; outsideCount: number } {
  if (!startDate || !endDate || startDate > endDate || !slots.length) {
    return { count: 0, firstDate: null, lastDate: null, outsideCount: 0 }
  }
  const validSlots = slots
    .filter((s) => s.startTime && s.endTime && s.startTime < s.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  if (!validSlots.length) {
    return { count: 0, firstDate: null, lastDate: null, outsideCount: 0 }
  }
  let count = 0
  let outsideCount = 0
  let firstDate: string | null = null
  let lastDate: string | null = null
  let cursor = startDate
  let guard = 0
  while (cursor <= endDate && guard < 400) {
    guard += 1
    const day = dayOfWeekFromDateKey(cursor)
    for (const slot of validSlots) {
      if (slot.dayOfWeek !== day) continue
      count += 1
      if (!firstDate) firstDate = cursor
      lastDate = cursor
      if (!isSlotCoveredByAvailability(cursor, slot.startTime.slice(0, 5), slot.endTime.slice(0, 5), recurringSlots, exceptions)) {
        outsideCount += 1
      }
    }
    cursor = addLocalDays(cursor, 1)
  }
  return { count, firstDate, lastDate, outsideCount }
}

export function dateKeyOfInstant(instantIso: string): string {
  return localDateKeyForInstant(instantIso, SCHEDULING_TIMEZONE)
}
