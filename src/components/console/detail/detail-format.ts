// Dates for detail views: recent instants read as "2 giờ trước", older ones as
// "14/10/2026 19:30", always in Vietnam time (the console's business zone).
const VN = 'Asia/Ho_Chi_Minh'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: VN,
})
const TIME = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: VN,
})
const RELATIVE = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

export function parseInstant(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "14/10/2026 19:30" */
export function formatAbsolute(date: Date) {
  return `${DATE.format(date)} ${TIME.format(date)}`
}

/** "2 giờ trước" within a week of now, the absolute form beyond that. */
export function formatReadable(date: Date, now = Date.now()) {
  const diff = date.getTime() - now
  if (Math.abs(diff) >= WEEK_MS) return formatAbsolute(date)
  if (Math.abs(diff) < 60 * 1000) return RELATIVE.format(0, 'second')
  const [unit, size] = UNITS.find(([, size]) => Math.abs(diff) >= size) ?? UNITS[2]
  return RELATIVE.format(Math.trunc(diff / size), unit)
}
