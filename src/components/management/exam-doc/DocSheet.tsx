import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { EditorContent } from '@tiptap/react'
import ChartEditorHost from './chart-editor/ChartEditorHost'
import { useExamDoc } from './exam-doc-context'
import { placeCaretNear, repaginate } from './pagination'
import Ruler from './ruler/Ruler'
import './exam-doc.css'

/** Sheet width (A4 at 96 dpi) plus the paper's side padding, in unscaled CSS pixels. */
const PAPER_WIDTH = (21 * 96) / 2.54 + 32
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
  const { editor, zoom: chosenZoom, showRuler, pages, loading } = useExamDoc()
  // While the document is read the editor exists but is empty: the sheet shows a skeleton instead.
  const ready = editor && !loading
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
    <>
      {/* The ruler stays put above the scrolling sheets. It sits outside the zoomed paper: a sticky box inside a
          zoomed one drifts a few pixels as the sheet scrolls. It is zoomed on its own, so its marks match the sheet. */}
      {showRuler && (
        <div className="sticky top-0 z-10 bg-background-gray-secondary/95 py-1 backdrop-blur-sm print:hidden">
          <div className="mx-auto w-fit px-4" style={{ zoom }}>
            <Ruler />
          </div>
        </div>
      )}
      <div ref={paper} className="exam-doc-paper mx-auto w-fit px-4 pt-2 pb-10 print:p-0" style={{ zoom }}>
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
        {/* The dialog charts on the sheet open to be edited (it renders outside the paper, over the page). */}
        <ChartEditorHost editor={editor} />
      </div>
    </>
  )
}
