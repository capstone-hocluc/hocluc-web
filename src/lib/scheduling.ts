import type { ScheduleCalendarItem } from '../types/scheduling'

export const SCHEDULING_TIMEZONE = 'Asia/Ho_Chi_Minh'

export function localDateKeyForInstant(instant: string, timezone = SCHEDULING_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return value('year') + '-' + value('month') + '-' + value('day')
}

export function localToday(timezone = SCHEDULING_TIMEZONE) {
  return localDateKeyForInstant(new Date().toISOString(), timezone)
}

/** Date-key arithmetic treats the components as a calendar date, not as an API Instant. */
export function addLocalDays(dateKey: string, amount: number) {
  const parts = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount))
  return date.toISOString().slice(0, 10)
}

export function startOfLocalWeek(dateKey: string) {
  const parts = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
  return addLocalDays(dateKey, -((weekday + 6) % 7))
}

export function localDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = new Date(dateKey + 'T00:00:00Z')
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', ...options }).format(date)
}

/** Convert a local wall-clock date/time into an Instant without using the browser's timezone. */
export function localDateTimeToInstant(
  dateKey: string,
  hour: number,
  minute: number,
  timezone = SCHEDULING_TIMEZONE
) {
  const dateParts = dateKey.split('-').map(Number)
  const targetAsUtc = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], hour, minute)
  let guess = targetAsUtc
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess))
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
    const representedAsUtc = Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second')
    )
    guess += targetAsUtc - representedAsUtc
  }
  return new Date(guess).toISOString()
}

export function instantToLocalDateTimeInput(
  instant: string,
  timezone = SCHEDULING_TIMEZONE
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return value('year') + '-' + value('month') + '-' + value('day') + 'T' + value('hour') + ':' + value('minute')
}

export function itemStart(item: ScheduleCalendarItem) {
  return item.item.startTime
}

export function itemEnd(item: ScheduleCalendarItem) {
  return item.item.endTime
}

export function itemTitle(item: ScheduleCalendarItem) {
  return item.item.title
}

export function itemSubtitle(item: ScheduleCalendarItem) {
  if (item.kind === 'schedule') return item.item.courseName
  if (item.kind === 'classSession') return item.item.sectionTitle || item.item.teacherName
  return item.item.instructorName || 'Lớp trực tuyến'
}

export function itemDateKey(item: ScheduleCalendarItem, timezone?: string) {
  return localDateKeyForInstant(itemStart(item), itemTimezone(item, timezone))
}

export function itemTimeLabel(item: ScheduleCalendarItem, timezone?: string) {
  const displayTimezone = itemTimezone(item, timezone)
  const start = new Date(itemStart(item))
  const end = new Date(itemEnd(item))
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: displayTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(start) + ' – ' + formatter.format(end)
}

export function itemStatus(item: ScheduleCalendarItem) {
  return item.item.status
}

export function itemLocation(item: ScheduleCalendarItem) {
  if (item.kind === 'schedule') return item.item.location
  if (item.kind === 'classSession') return item.item.classroom
  return null
}

export function itemMeetingUrl(item: ScheduleCalendarItem) {
  if (item.kind === 'schedule') return safeExternalUrl(item.item.meetingUrl)
  if (item.kind === 'classSession') return safeExternalUrl(item.item.meetingLink)
  return item.item.joinable ? safeExternalUrl(item.item.meetingUrl) : null
}

export function safeExternalUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function itemTimezone(item: ScheduleCalendarItem, fallback = SCHEDULING_TIMEZONE) {
  return item.kind === 'schedule' ? item.item.timezone || fallback : fallback
}

export function sortScheduleItems(items: ScheduleCalendarItem[]) {
  return [...items].sort((a, b) => Date.parse(itemStart(a)) - Date.parse(itemStart(b)))
}

/** Keep API ranges half-open in the selected scheduling timezone, even when the backend query is inclusive. */
export function filterScheduleItemsToInstantRange(
  items: ScheduleCalendarItem[],
  range: { startDate: string; endDate: string }
) {
  const start = Date.parse(range.startDate)
  const end = Date.parse(range.endDate)
  return items.filter((item) => {
    const instant = Date.parse(itemStart(item))
    return Number.isFinite(instant) && instant >= start && instant < end
  })
}
