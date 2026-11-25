import { cn } from '../../../lib/cn'
import { fieldControlClass } from '../form-field'

interface Props {
  value: string
  onChange: (next: string) => void
  ariaLabel: string
  disabled?: boolean
  compact?: boolean
  className?: string
}

const QUARTER_HOUR_CLOCKS: string[] = (() => {
  const list: string[] = []
  for (let h = 6; h <= 22; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 30) break
      list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return list
})()

/** Guarantees strict 24h HH:mm display across all OS/browser locales. */
export default function ClockSelect({
  value,
  onChange,
  ariaLabel,
  disabled,
  compact,
  className,
}: Props) {
  const normalized = value ? value.slice(0, 5) : ''
  const options =
    normalized && !QUARTER_HOUR_CLOCKS.includes(normalized)
      ? [...QUARTER_HOUR_CLOCKS, normalized].sort()
      : QUARTER_HOUR_CLOCKS

  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        fieldControlClass,
        compact ? 'h-9 px-2 text-center' : 'min-h-11 px-2 text-center',
        'tabular-nums',
        className
      )}
    >
      {options.map((clock) => (
        <option key={clock} value={clock}>
          {clock}
        </option>
      ))}
    </select>
  )
}
