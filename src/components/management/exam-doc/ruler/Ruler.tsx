import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '../../../../lib/cn'
import { useExamDoc } from '../exam-doc-context'
import { commitIndents, indentTargets, previewIndents, type IndentOptions } from '../extensions'
import { NO_INDENTS, TEXT_WIDTH_CM, formatCm, patchIndents, readIndents, type Indents } from '../indents'

/** A4 in CSS pixels at 96 dpi; the exam's side margins (left 2 cm, right 1.5 cm). */
const CM = 96 / 2.54
const SHEET_CM = 21
const MARGIN_LEFT_CM = 2
const WIDTH = SHEET_CM * CM
const HEIGHT = 22
/** Where the ruler's band sits, top to bottom. */
const BAR = { top: 5, height: 10 }
/** A drag lands on quarter centimetres. */
const SNAP_CM = 0.25

/** The ruler measures from the page margin, so it sets the indents of blocks straight on the sheet. */
const OPTIONS: IndentOptions = { scope: 'top-level' }

type Marker = 'firstLine' | 'hanging' | 'left' | 'right'

const MARKERS: Array<{ marker: Marker; label: string; top: number; height: number; shape: string }> = [
  { marker: 'firstLine', label: 'Thụt dòng đầu', top: 0, height: 7, shape: 'M1 0H11L6 6Z' },
  { marker: 'hanging', label: 'Thụt treo', top: 10, height: 6, shape: 'M6 0L11 6H1Z' },
  { marker: 'left', label: 'Thụt lề trái', top: 16, height: 6, shape: 'M1 0.5H11V5H1Z' },
  { marker: 'right', label: 'Thụt lề phải', top: 10, height: 6, shape: 'M6 0L11 6H1Z' },
]

/** Where a marker stands, in cm from the left text margin. */
function positionOf(marker: Marker, { left, right, firstLine }: Indents): number {
  if (marker === 'firstLine') return left + firstLine
  if (marker === 'right') return TEXT_WIDTH_CM - right
  return left
}

/** The indents that put `marker` at `position` (cm from the left text margin), the others where they are. */
function patchFor(marker: Marker, position: number, start: Indents): Partial<Indents> {
  if (marker === 'firstLine') return { firstLine: position - start.left }
  // The hanging marker moves the lines after the first; the first line stays where it starts.
  if (marker === 'hanging') return { left: position, firstLine: start.left + start.firstLine - position }
  if (marker === 'right') return { right: TEXT_WIDTH_CM - position }
  return { left: position }
}

/** The value a marker's slider reports. */
function valueOf(marker: Marker, indents: Indents): number {
  if (marker === 'firstLine') return indents.firstLine
  if (marker === 'right') return indents.right
  return indents.left
}

function readRuler(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return { indents: NO_INDENTS, active: false }
  // Word's ruler shows the first paragraph of the selection.
  const [first] = indentTargets(editor.state, OPTIONS.scope)
  return { indents: first ? readIndents(first.node.attrs) : NO_INDENTS, active: editor.isEditable && Boolean(first) }
}

interface Drag {
  marker: Marker
  pointerId: number
  start: Indents
  /** Pointer to marker distance at the press, cm, so the marker does not jump under the pointer. */
  grab: number
  patch: Partial<Indents> | null
}

/**
 * The ruler above the sheet. Its markers show the indents of the selected paragraph and set them, as in Word:
 * first line (top), hanging and left (bottom left), right (bottom right). A drag snaps to 0.25 cm and is one undo
 * step; Escape cancels it. Arrow keys move a focused marker 0.25 cm, 1 cm with Shift.
 */
export default function Ruler() {
  const { editor } = useExamDoc()
  const { indents, active } = useEditorState({ editor, selector: () => readRuler(editor) }) ?? readRuler(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState<{ marker: Marker; indents: Indents; x: number; top: number } | null>(null)

  const start = MARGIN_LEFT_CM * CM
  const end = (MARGIN_LEFT_CM + TEXT_WIDTH_CM) * CM
  const shown = dragging?.indents ?? indents

  /** Screen geometry of the ruler, whatever zoom it is drawn at. */
  function measure() {
    const box = svg.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    const scale = box.width / WIDTH
    return {
      box,
      /** cm from the left text margin under a screen x. */
      toCm: (clientX: number) => (clientX - box.left) / scale / CM - MARGIN_LEFT_CM,
      toX: (cm: number) => box.left + (MARGIN_LEFT_CM + cm) * CM * scale,
    }
  }

  function stop(patch: Partial<Indents> | null) {
    const current = drag.current
    drag.current = null
    setDragging(null)
    // A sheet that turned read-only during the drag only loses the preview.
    if (current && editor && !editor.isDestroyed) commitIndents(editor.view, editor.isEditable ? patch : null, OPTIONS)
  }

  // Escape cancels a drag wherever focus is (the editor keeps it while the pointer drags).
  useEffect(() => {
    if (!dragging) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      stop(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  // A drag cut short by the ruler going away (ruler hidden, sheet switched) leaves no preview behind.
  useEffect(
    () => () => {
      if (drag.current && editor && !editor.isDestroyed) previewIndents(editor.view, null)
      drag.current = null
    },
    [editor]
  )

  function onPointerDown(marker: Marker, event: PointerEvent<HTMLDivElement>) {
    const geometry = measure()
    if (!active || !editor?.isEditable || event.button !== 0 || !geometry) return
    // The editor keeps focus and its selection, so typing and Ctrl+Z go on there after the drag.
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      marker,
      pointerId: event.pointerId,
      start: indents,
      grab: geometry.toCm(event.clientX) - positionOf(marker, indents),
      patch: null,
    }
    setDragging({ marker, indents, x: geometry.toX(positionOf(marker, indents)), top: geometry.box.bottom })
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    const geometry = measure()
    if (!current || current.pointerId !== event.pointerId || !geometry || !editor) return
    const position = Math.round((geometry.toCm(event.clientX) - current.grab) / SNAP_CM) * SNAP_CM
    const next = patchIndents(current.start, patchFor(current.marker, position, current.start))
    // The patch of where the marker really lands (clamped), so every selected block gets that value.
    current.patch = patchFor(current.marker, positionOf(current.marker, next), current.start)
    previewIndents(editor.view, { patch: current.patch, options: OPTIONS })
    setDragging({
      marker: current.marker,
      indents: next,
      x: geometry.toX(positionOf(current.marker, next)),
      top: geometry.box.bottom,
    })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    stop(drag.current.patch)
  }

  /** Pointer cancelled or capture lost (after pointerup the drag is already over): the drag is dropped. */
  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) stop(null)
  }

  function onKeyDown(marker: Marker, event: KeyboardEvent<HTMLDivElement>) {
    if (!active || !editor?.isEditable || drag.current) return
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!direction) return
    event.preventDefault()
    const position = positionOf(marker, indents) + direction * (event.shiftKey ? 1 : SNAP_CM)
    editor.commands.setIndents(patchFor(marker, position, indents), OPTIONS)
  }

  const ticks: Array<{ x: number; kind: 'cm' | 'half' | 'quarter'; label?: number }> = []
  for (let quarter = 0; quarter <= SHEET_CM * 4; quarter++) {
    const cm = quarter / 4 - MARGIN_LEFT_CM
    const x = quarter * (CM / 4)
    const kind = quarter % 4 === 0 ? 'cm' : quarter % 2 === 0 ? 'half' : 'quarter'
    ticks.push({ x, kind, label: kind === 'cm' && cm > 0 && x < end ? cm : undefined })
  }
  const middle = BAR.top + BAR.height / 2

  return (
    <div role="group" aria-label="Thước" className="relative print:hidden" style={{ width: WIDTH, height: HEIGHT }}>
      <svg ref={svg} aria-hidden width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block text-text-tertiary">
        <rect x={0} y={BAR.top} width={start} height={BAR.height} className="fill-background-gray-secondary" />
        <rect x={end} y={BAR.top} width={WIDTH - end} height={BAR.height} className="fill-background-gray-secondary" />
        <rect x={start} y={BAR.top} width={end - start} height={BAR.height} className="fill-card-background" />
        {ticks.map((tick) =>
          tick.label !== undefined ? (
            <text key={tick.x} x={tick.x} y={middle + 3} textAnchor="middle" fontSize={8} fill="currentColor">
              {tick.label}
            </text>
          ) : (
            <line
              key={tick.x}
              x1={tick.x}
              x2={tick.x}
              y1={tick.kind === 'quarter' ? middle - 1 : middle - 2.5}
              y2={tick.kind === 'quarter' ? middle + 1 : middle + 2.5}
              stroke="currentColor"
              strokeWidth={0.75}
            />
          )
        )}
      </svg>
      {MARKERS.map(({ marker, label, top, height, shape }) => {
        const value = valueOf(marker, shown)
        // The slider's range: the values the marker reaches dragged all the way left and right.
        const ends = [-100, 100].map((cm) => valueOf(marker, patchIndents(shown, patchFor(marker, cm, shown))))
        // A drag under way keeps its handlers even if the sheet turns read-only meanwhile, so it can still end.
        const held = dragging?.marker === marker
        return (
          <div
            key={marker}
            role="slider"
            aria-label={label}
            aria-orientation="horizontal"
            aria-valuenow={value}
            aria-valuemin={Math.min(...ends)}
            aria-valuemax={Math.max(...ends)}
            aria-valuetext={formatCm(value)}
            aria-disabled={!active || undefined}
            tabIndex={active ? 0 : undefined}
            title={active ? label : undefined}
            data-ruler-marker={marker}
            className={cn(
              'absolute touch-none rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              active ? 'cursor-ew-resize' : 'pointer-events-none opacity-50'
            )}
            style={{ left: (MARGIN_LEFT_CM + positionOf(marker, shown)) * CM - 6, top, width: 12, height }}
            onPointerDown={active ? (event) => onPointerDown(marker, event) : undefined}
            onMouseDown={active ? (event) => event.preventDefault() : undefined}
            onPointerMove={active || held ? onPointerMove : undefined}
            onPointerUp={active || held ? onPointerUp : undefined}
            onPointerCancel={active || held ? onPointerCancel : undefined}
            onLostPointerCapture={active || held ? onPointerCancel : undefined}
            onKeyDown={active ? (event) => onKeyDown(marker, event) : undefined}
          >
            <svg aria-hidden width={12} height={height} viewBox={`0 0 12 ${height}`} className="block">
              <path d={shape} className="fill-brand-500 stroke-card-background" strokeWidth={0.75} />
            </svg>
          </div>
        )
      })}
      {dragging &&
        createPortal(
          <>
            <div
              aria-hidden
              data-ruler-guide
              className="pointer-events-none fixed bottom-0 z-50 border-l border-dashed border-brand-500"
              style={{ left: dragging.x, top: dragging.top }}
            />
            {/* The slider's aria-valuetext says the value to assistive tech; this is the one the eye follows. */}
            <div
              aria-hidden
              data-ruler-value
              className="pointer-events-none fixed z-50 rounded-md border border-card-border bg-card-background px-1.5 py-0.5 text-xs font-medium text-text-primary shadow-sm"
              style={{ left: dragging.x + 6, top: dragging.top + 4 }}
            >
              {formatCm(valueOf(dragging.marker, dragging.indents))}
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
