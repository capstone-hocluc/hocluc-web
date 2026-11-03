import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '../../lib/cn'

interface ResizeHandleProps {
  label: string
  value: number
  min: number
  max: number
  defaultValue: number
  step: number
  /** +1 when ArrowRight grows the value, -1 when ArrowLeft does. */
  direction: 1 | -1
  /** `keep` is true once a change is committed (pointer released after a move, a key, a double click). */
  onChange: (value: number, keep: boolean) => void
  /** The value the pointer's x position stands for, or null when it cannot be measured. */
  valueAt: (clientX: number) => number | null
  className?: string
  homeEnd?: boolean
}

// While any divider is dragged the whole document loses text selection and shows the resize cursor.
// Counting drags means only the first one saves the page's own styles and only the last one restores them.
let dragsInProgress = 0
let savedStyles: { userSelect: string; webkitUserSelect: string; cursor: string } | null = null

function lockDocument() {
  const style = document.documentElement.style
  if (dragsInProgress++ === 0) {
    savedStyles = { userSelect: style.userSelect, webkitUserSelect: style.webkitUserSelect, cursor: style.cursor }
    style.userSelect = 'none'
    style.webkitUserSelect = 'none'
    style.cursor = 'col-resize'
  }
}

function unlockDocument() {
  if (dragsInProgress === 0 || --dragsInProgress > 0 || !savedStyles) return
  const style = document.documentElement.style
  style.userSelect = savedStyles.userSelect
  style.webkitUserSelect = savedStyles.webkitUserSelect
  style.cursor = savedStyles.cursor
  savedStyles = null
}

/** A vertical divider that resizes a neighbouring panel: drag it, use the arrow keys, double click to reset. */
export default function ResizeHandle({
  label, value, min, max, defaultValue, step, direction, onChange, valueAt, className, homeEnd = false,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const pointer = useRef<number | null>(null)
  const moved = useRef(false)
  const latest = useRef(value)

  useEffect(
    () => () => {
      if (pointer.current !== null) unlockDocument()
    },
    []
  )

  function end(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return
    pointer.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    unlockDocument()
    setDragging(false)
    // A press without a move is a click (or half of a double click): it must not store the width shown now.
    if (moved.current) onChange(latest.current, true)
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === 'ArrowLeft' ? -step * direction : event.key === 'ArrowRight' ? step * direction : 0
    const next = delta ? value + delta : homeEnd && event.key === 'Home' ? min : homeEnd && event.key === 'End' ? max : null
    if (next === null) return
    event.preventDefault()
    onChange(next, true)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      title="Kéo để đổi độ rộng, bấm đúp để về mặc định"
      onPointerDown={(event) => {
        if (event.button !== 0 || pointer.current !== null) return
        event.currentTarget.setPointerCapture(event.pointerId)
        pointer.current = event.pointerId
        moved.current = false
        latest.current = value
        lockDocument()
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId) return
        const next = valueAt(event.clientX)
        if (next === null) return
        moved.current = true
        latest.current = next
        onChange(next, false)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={key}
      onDoubleClick={() => onChange(defaultValue, true)}
      className={cn('group cursor-col-resize touch-none items-center justify-center outline-none', className)}
    >
      <span aria-hidden className={cn('h-16 w-1 rounded-full bg-card-border transition-colors group-hover:bg-brand-500 group-focus-visible:bg-brand-500', dragging && 'bg-brand-500')} />
    </div>
  )
}
