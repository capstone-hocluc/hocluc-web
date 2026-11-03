import { useRef, useState } from 'react'
import { cn } from '../../../../lib/cn'
import { Minus, Plus } from './toolbar-icons'
import {
  MAX_FONT_SIZE_PT,
  MIN_FONT_SIZE_PT,
  clampFontSize,
  formatDecimal,
  parseFontSize,
} from './toolbar-options'
import { ToolbarButton } from './ToolbarButton'

interface FontSizeControlProps {
  /** Size of the selection, in points. */
  value: number
  disabled: boolean
  /** Applies a size in points to the selection without moving focus. */
  onChange: (pt: number) => void
  /** Gives the caret back to the editor. */
  onDone: () => void
}

/** − [11,5] + : the field shows the selection's size; Enter or leaving the field applies what was typed. */
export function FontSizeControl({ value, disabled, onChange, onDone }: FontSizeControlProps) {
  // Only set while the user is typing, so the field follows the selection the rest of the time.
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)

  const commit = (raw: string) => {
    setDraft(null)
    const pt = parseFontSize(raw)
    if (pt !== null && pt !== value) onChange(pt)
  }

  // − / + start from what is typed in the field, if anything, so a pending edit is not lost.
  const step = (delta: 1 | -1) => {
    const base = draft === null ? value : (parseFontSize(draft) ?? value)
    setDraft(null)
    onChange(clampFontSize(base + delta))
    onDone()
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <ToolbarButton
        label="Giảm cỡ chữ"
        icon={Minus}
        disabled={disabled || value <= MIN_FONT_SIZE_PT}
        onClick={() => step(-1)}
      />
      <input
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label="Cỡ chữ"
        aria-valuenow={value}
        aria-valuemin={MIN_FONT_SIZE_PT}
        aria-valuemax={MAX_FONT_SIZE_PT}
        aria-valuetext={`${formatDecimal(value)} pt`}
        title="Cỡ chữ (pt)"
        disabled={disabled}
        value={draft ?? formatDecimal(value)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          if (cancelled.current) {
            cancelled.current = false
            setDraft(null)
            return
          }
          commit(event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault()
            cancelled.current = event.key === 'Escape'
            event.currentTarget.blur()
            onDone()
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault()
            const base = parseFontSize(event.currentTarget.value) ?? value
            setDraft(formatDecimal(clampFontSize(base + (event.key === 'ArrowUp' ? 1 : -1))))
          }
        }}
        className={cn(
          'h-7 w-11 shrink-0 rounded-md border border-input-border bg-input-background text-center text-[13px] font-medium text-text-primary outline-none transition-colors',
          'focus:border-input-primary-focus-border focus-visible:ring-2 focus-visible:ring-input-primary-focus-border/30 disabled:opacity-40'
        )}
      />
      <ToolbarButton
        label="Tăng cỡ chữ"
        icon={Plus}
        disabled={disabled || value >= MAX_FONT_SIZE_PT}
        onClick={() => step(1)}
      />
    </div>
  )
}
