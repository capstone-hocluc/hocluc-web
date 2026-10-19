import { formatAbsolute, formatReadable, parseInstant } from './detail-format'

interface DateTimeProps {
  value: string | null | undefined
  /** Shown when the value is missing or unreadable. */
  fallback?: string
  /** Always the absolute form, for dates that are not "when did it happen" (a schedule slot). */
  absolute?: boolean
}

// A readable instant whose tooltip carries the full date, e.g. "2 giờ trước" -> "14/10/2026 19:30".
export default function DateTime({ value, fallback = '—', absolute = false }: DateTimeProps) {
  const date = parseInstant(value)
  if (!date) return <>{fallback}</>
  const full = formatAbsolute(date)
  return (
    <time dateTime={date.toISOString()} title={full}>
      {absolute ? full : formatReadable(date)}
    </time>
  )
}
