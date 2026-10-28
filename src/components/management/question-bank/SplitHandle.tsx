import { useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { cn } from '../../../lib/cn'
import { DEFAULT_PAPER_SHARE, MAX_PAPER_SHARE, MIN_PAPER_SHARE } from './paper-share'

const KEY_STEP = 2

/** A draggable divider between the left column and the paper; the arrow keys move it, a double click resets it. */
export default function SplitHandle({
  row,
  share,
  onChange,
}: {
  /** The grid the divider sits in: its width is what the percent is of. */
  row: RefObject<HTMLElement | null>
  share: number
  onChange: (share: number, keep: boolean) => void
}) {
  const [dragging, setDragging] = useState(false)

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = row.current?.getBoundingClientRect()
    if (!dragging || !box || box.width === 0) return
    onChange(((box.right - event.clientX) / box.width) * 100, false)
  }
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    onChange(share, true)
  }
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowLeft' ? KEY_STEP : event.key === 'ArrowRight' ? -KEY_STEP : 0
    if (delta === 0) return
    event.preventDefault()
    onChange(share + delta, true)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng bản đề"
      aria-valuemin={MIN_PAPER_SHARE}
      aria-valuemax={MAX_PAPER_SHARE}
      aria-valuenow={share}
      tabIndex={0}
      title="Kéo để đổi độ rộng, bấm đúp để về mặc định"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={key}
      onDoubleClick={() => onChange(DEFAULT_PAPER_SHARE, true)}
      className="group hidden cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
    >
      <span
        aria-hidden
        className={cn(
          'h-16 w-1 rounded-full bg-card-border transition-colors group-hover:bg-brand-500 group-focus-visible:bg-brand-500',
          dragging && 'bg-brand-500'
        )}
      />
    </div>
  )
}
