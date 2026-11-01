import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { EditorContent } from '@tiptap/react'
import { useExamDoc } from './exam-doc-context'
import { placeCaretNear, repaginate } from './pagination'
import './exam-doc.css'

/** A4 in CSS pixels at 96 dpi, and the exam margins (top 2 cm, right 1.5 cm, bottom 2 cm, left 2 cm). */
const CM = 96 / 2.54
const SHEET = {
  widthCm: 21,
  marginLeftCm: 2,
  marginRightCm: 1.5,
} as const

function Ruler() {
  const width = SHEET.widthCm * CM
  const start = SHEET.marginLeftCm * CM
  const end = (SHEET.widthCm - SHEET.marginRightCm) * CM
  const ticks: Array<{ x: number; kind: 'cm' | 'half' | 'quarter'; label?: number }> = []
  for (let quarter = 0; quarter <= SHEET.widthCm * 4; quarter++) {
    const cm = quarter / 4 - SHEET.marginLeftCm
    const x = quarter * (CM / 4)
    const kind = quarter % 4 === 0 ? 'cm' : quarter % 2 === 0 ? 'half' : 'quarter'
    ticks.push({ x, kind, label: kind === 'cm' && cm > 0 && x < end ? cm : undefined })
  }
  return (
    <svg
      aria-hidden
      width={width}
      height={18}
      viewBox={`0 0 ${width} 18`}
      className="block text-text-tertiary print:hidden"
    >
      <rect x={0} y={4} width={start} height={10} className="fill-background-gray-secondary" />
      <rect x={end} y={4} width={width - end} height={10} className="fill-background-gray-secondary" />
      <rect x={start} y={4} width={end - start} height={10} className="fill-card-background" />
      {ticks.map((tick) =>
        tick.label !== undefined ? (
          <text key={tick.x} x={tick.x} y={12.5} textAnchor="middle" fontSize={8} fill="currentColor">
            {tick.label}
          </text>
        ) : (
          <line
            key={tick.x}
            x1={tick.x}
            x2={tick.x}
            y1={tick.kind === 'quarter' ? 8 : 6.5}
            y2={tick.kind === 'quarter' ? 10 : 11.5}
            stroke="currentColor"
            strokeWidth={0.75}
          />
        )
      )}
      <path d={`M${start - 4} 0 h8 l-4 5 z`} className="fill-brand-500" />
      <path d={`M${end - 4} 0 h8 l-4 5 z`} className="fill-brand-500" />
    </svg>
  )
}

/** Sheet width plus the paper's side padding, in unscaled CSS pixels. */
const PAPER_WIDTH = SHEET.widthCm * CM + 32
const MIN_FIT = 0.5

/** The scale (≤ 1) at which the paper fits the width of the column holding it. */
function useFitToWidth(paper: RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState(1)
  useEffect(() => {
    const column = paper.current?.parentElement
    if (!column) return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(MIN_FIT, Math.min(1, Math.floor((entry.contentRect.width / PAPER_WIDTH) * 100) / 100))
      setFit((current) => (current === next ? current : next))
    })
    observer.observe(column)
    return () => observer.disconnect()
  }, [paper])
  return fit
}

/**
 * The paper in print layout: one A4 sheet per page (count from the pagination plugin) stacked with a 24px gap, the
 * editor flowing over them, the ruler above, all scaled by the zoom.
 */
export default function DocSheet() {
  const { editor, zoom: chosenZoom, showRuler, pages, loading, activeVariant } = useExamDoc()
  // While the document is read the editor exists but is empty: the sheet shows a skeleton instead (a variant is
  // built from an already loaded document, so it is never waiting).
  const ready = editor && !(loading && activeVariant === null)
  const paper = useRef<HTMLDivElement>(null)
  const fit = useFitToWidth(paper)
  // At 100% the sheet shrinks to the column it sits in (like a docs app beside open side panels); other zoom levels are
  // taken as asked, scrolling sideways if they must.
  const zoom = chosenZoom === 1 ? fit : chosenZoom

  // A zoom change rescales text without resizing anything an observer sees; line breaks can still shift.
  useEffect(() => {
    if (editor) repaginate(editor)
  }, [editor, zoom])

  function onSheetMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!editor || event.button !== 0 || editor.view.dom.contains(event.target as Node)) return
    if (placeCaretNear(editor, event.clientX, event.clientY)) event.preventDefault()
  }

  return (
    <div ref={paper} className="exam-doc-paper mx-auto w-fit px-4 pt-3 pb-10 print:p-0" style={{ zoom }}>
      {showRuler && (
        <div className="sticky top-0 z-10 mb-2 bg-background-gray-secondary/95 py-1 backdrop-blur-sm print:hidden">
          <Ruler />
        </div>
      )}
      <div
        className="exam-doc-pages"
        style={{ minHeight: `calc(${pages} * var(--exam-doc-page-pitch) - var(--exam-doc-page-gap))` }}
        onMouseDown={onSheetMouseDown}
      >
        {Array.from({ length: pages }, (_, index) => (
          <div key={index} aria-hidden className="exam-doc-page" style={{ top: `calc(${index} * var(--exam-doc-page-pitch))` }} />
        ))}
        <div className="exam-doc-sheet" aria-busy={!ready || undefined}>
          {ready ? (
            <EditorContent editor={editor} />
          ) : (
            <div aria-hidden className="flex flex-col gap-3">
              <div className="mx-auto h-5 w-2/5 animate-pulse rounded bg-background-gray-secondary" />
              <div className="mx-auto h-4 w-1/4 animate-pulse rounded bg-background-gray-secondary" />
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-4 animate-pulse rounded bg-background-gray-secondary" style={{ width: `${90 - index * 7}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
