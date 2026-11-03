// A loaded paper in the exam workspace, shown the way a compose run is: the same header, outline, A4 sheet with the
// words being written live, status bar, and the run's stages in the right column, here read-only.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { BankSource } from '../../../services/questionBankService'
import Button from '../../console/button'
import { ListTree } from '../../console/icons'
import Notice from '../../console/notice'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import ResizeHandle from '../../ui/ResizeHandle'
import DocHeader from '../exam-doc/DocHeader'
import DocSheet from '../exam-doc/DocSheet'
import StatusBar from '../exam-doc/StatusBar'
import { scrollToPos } from '../exam-doc/doc-outline'
import { draftToDoc } from '../exam-doc/draft-to-doc'
import { ExamDocContext, type ExamDocContextValue } from '../exam-doc/exam-doc-context'
import { findTagged } from '../exam-doc/exam-tags'
import { liveDraftKey } from '../exam-doc/nodes/live-draft-widget'
import { useFollowWriting } from '../exam-doc/use-follow-writing'
import { useWheelZoom } from '../exam-doc/use-wheel-zoom'
import { useVariantEditor } from '../exam-doc/variants/use-variant-editor'
import { PaperOutlineTree } from '../exam-doc/doc-tree'
import type { ShownQuestion } from '../question-bank/ReadingPaper'
import { readItemId, readingStages, readingToPaper } from '../question-bank/reading-to-paper'
import { usePaperReading } from '../question-bank/use-paper-reading'
import PaperReadingPanel from './PaperReadingPanel'
import { questionNumbers } from './exam-format'
import { DIVIDER_WIDTH, PANEL_LIMITS, usePanelWidths } from './use-panel-widths'

const noop = () => undefined

interface PaperReadingWorkspaceProps {
  source: BankSource
  onBack: () => void
  backHref: string
  onNew: () => void
  /** The left panel (every exam and paper) with this paper's outline under it. */
  renderTree: (
    outline: ReactNode,
    chrome: { onCollapse?: () => void; onClose?: () => void; className: string; style?: CSSProperties }
  ) => ReactNode
  /** Given for a failed paper the viewer may load again. */
  onLoadAgain?: () => void
  /** Given for a finished paper with unlabelled questions the viewer may have labelled. */
  onLabel?: () => void
  /** Why Jev cannot label now, shown when questions stay unlabelled. */
  labellingBlocker?: string | null
  /** The list of exams and papers (a sheet), rendered with the workspace. */
  children?: ReactNode
}

export default function PaperReadingWorkspace({
  source,
  onBack,
  backHref,
  onNew,
  renderTree,
  onLoadAgain,
  onLabel,
  labellingBlocker,
  children,
}: PaperReadingWorkspaceProps) {
  const { reading, error, view, streaming, busy } = usePaperReading(source.id, source.status)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelSheet, setPanelSheet] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [showRuler, setShowRuler] = useState(true)
  const { row, widths, max, change } = usePanelWidths(panelOpen, outlineOpen)

  const read = useMemo(() => (reading ? readingToPaper(source.title, reading, view) : null), [reading, view, source.title])
  // The sheet is laid out again only when the questions on it change, not at every word being written.
  const paperJson = read ? JSON.stringify(read.paper) : null
  const doc = useMemo(() => (paperJson ? draftToDoc(JSON.parse(paperJson)) : null), [paperJson])
  const { editor, pages } = useVariantEditor(doc, 'Đề đang đọc (chỉ đọc)')
  const numberOf = useMemo(() => (read ? questionNumbers(read.paper) : new Map<string, number>()), [read])
  const stages = useMemo(() => readingStages(view), [view])

  // The question being written shows where it will land, word by word, as in a compose run.
  const live = read?.live ?? null
  const liveText = live ? JSON.stringify(live) : null
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.view.dispatch(editor.state.tr.setMeta(liveDraftKey, liveText ? JSON.parse(liveText) : null).setMeta('addToHistory', false))
  }, [editor, liveText, doc])

  const sheetScroller = useRef<HTMLElement>(null)
  useWheelZoom(sheetScroller, zoom, setZoom)
  const current = read?.current ?? null
  const followTarget = live ? '[data-live-draft]' : current !== null ? `[data-exam-item="${CSS.escape(readItemId(current))}"]` : null
  const writing = useFollowWriting(sheetScroller, busy && view.live, followTarget, `${current ?? ''}:${liveText?.length ?? 0}`)

  // The original page marks each question with what is known of it.
  const shown = useMemo(() => {
    const map = new Map<number, ShownQuestion>()
    read?.paper.questions.forEach((question) =>
      map.set(question.printedNumber ?? question.position, {
        number: question.printedNumber ?? question.position,
        text: question.prompt,
        options: question.options,
        writing: false,
      })
    )
    if (live && current !== null) map.set(current, { number: current, text: live.view.questions[0]?.stem ?? '', options: [], writing: true })
    return map
  }, [read, live, current])

  function jumpTo(id: string) {
    setOutlineSheet(false)
    setPanelSheet(false)
    if (!editor) return
    const pos = findTagged(editor.state.doc, 'examItem', id)
    if (pos !== null) scrollToPos(editor, pos)
  }

  function togglePanel() {
    if (window.matchMedia('(min-width: 1024px)').matches) setPanelOpen((open) => !open)
    else setPanelSheet((open) => !open)
  }

  function toggleOutline() {
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  function openTree() {
    setPanelSheet(false)
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen(true)
    else setOutlineSheet(true)
  }

  const docContext = useMemo<ExamDocContextValue>(
    () => ({
      editor,
      sourceEditor: null,
      variantsOpen: false,
      setVariantsOpen: noop,
      activeVariant: null,
      setActiveVariant: noop,
      variantDocs: [],
      mode: 'FREE',
      setMode: noop,
      saveState: 'saved',
      saveError: null,
      loading: !reading,
      zoom,
      setZoom,
      showRuler,
      setShowRuler,
      openFormula: noop,
      pages,
    }),
    [editor, reading, zoom, showRuler, pages]
  )

  const panelProps = {
    sourceId: source.id,
    reading,
    view,
    stages,
    streaming,
    busy,
    current,
    shown,
    onSelect: (number: number) => jumpTo(readItemId(number)),
    onLoadAgain,
    conversationsOpen: outlineOpen || outlineSheet,
    onOpenConversations: openTree,
  }
  const outline = read ? (
    <PaperOutlineTree
      paper={read.paper}
      numberOf={numberOf}
      onJump={jumpTo}
      current={current !== null ? readItemId(current) : null}
      depth={1}
    />
  ) : null

  return (
    <ExamDocContext.Provider value={docContext}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <DocHeader
          variant="paper"
          title={source.title}
          editable={false}
          onTitleChange={noop}
          onBack={onBack}
          backHref={backHref}
          chatOpen={panelOpen || panelSheet}
          onToggleChat={togglePanel}
          outlineOpen={outlineOpen || outlineSheet}
          onToggleOutline={toggleOutline}
          onNew={onNew}
          actions={
            onLabel && view.status === 'DONE' ? (
              <Button size="sm" onClick={onLabel}>
                <ListTree size={15} />
                <span className="hidden md:inline">Gán nhãn</span>
              </Button>
            ) : undefined
          }
        />

        <div ref={row} className="flex min-h-0 min-w-0 flex-1">
          {outlineOpen && (
            <>
              {renderTree(outline, {
                onCollapse: () => setOutlineOpen(false),
                style: { width: widths.outline },
                className: 'hidden shrink-0 border-r border-card-border bg-card-background xl:flex',
              })}
              <ResizeHandle
                label="Kéo để đổi độ rộng mục lục"
                value={widths.outline}
                min={PANEL_LIMITS.outline.min}
                max={max.outline}
                defaultValue={PANEL_LIMITS.outline.default}
                step={16}
                direction={1}
                homeEnd
                onChange={(value, keep) => change('outline', value, keep)}
                valueAt={(clientX) => {
                  const box = row.current?.getBoundingClientRect()
                  return box ? clientX - box.left - DIVIDER_WIDTH / 2 : null
                }}
                className="hidden w-1.5 shrink-0 xl:flex"
              />
            </>
          )}

          <main
            ref={sheetScroller}
            aria-label={`Đề ${source.title}`}
            className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background-gray-secondary [scrollbar-gutter:stable]"
          >
            {source.status === 'DONE' && source.unlabelledCount > 0 && labellingBlocker && (
              <div className="mx-auto max-w-[794px] px-4 pt-3">
                <Notice tone="warning">{labellingBlocker}</Notice>
              </div>
            )}
            {error && !reading ? (
              <div className="mx-auto max-w-[560px] px-4 py-10">
                <Notice tone="danger">{error}</Notice>
              </div>
            ) : (
              <DocSheet />
            )}
            {busy && view.live && !writing.following && (
              <div className="pointer-events-none sticky bottom-5 z-20 flex justify-center">
                <button
                  type="button"
                  onClick={writing.follow}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-button-primary-background px-4 py-2 text-sm font-semibold text-button-primary-text shadow-card-hover transition-colors hover:bg-button-primary-hover-background focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring"
                >
                  <span aria-hidden className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
                  Theo dõi AI đang đọc
                </button>
              </div>
            )}
          </main>

          {panelOpen && (
            <>
              <ResizeHandle
                label="Kéo để đổi độ rộng tiến trình"
                value={widths.chat}
                min={PANEL_LIMITS.chat.min}
                max={max.chat}
                defaultValue={PANEL_LIMITS.chat.default}
                step={16}
                direction={-1}
                homeEnd
                onChange={(value, keep) => change('chat', value, keep)}
                valueAt={(clientX) => {
                  const box = row.current?.getBoundingClientRect()
                  return box ? box.right - clientX - DIVIDER_WIDTH / 2 : null
                }}
                className="hidden w-1.5 shrink-0 lg:flex"
              />
              <PaperReadingPanel
                {...panelProps}
                onCollapse={() => setPanelOpen(false)}
                style={{ width: widths.chat }}
                className="hidden shrink-0 border-l border-card-border lg:flex"
              />
            </>
          )}
        </div>

        <SheetOverlay isOpen={panelSheet} onOpenChange={setPanelSheet}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(380px,92vw)]! min-w-0! max-w-[92vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[92vw]!"
          >
            <SheetTitle className="sr-only">Tiến trình đọc đề</SheetTitle>
            <PaperReadingPanel {...panelProps} onClose={() => setPanelSheet(false)} className="flex h-full w-full" />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={outlineSheet} onOpenChange={setOutlineSheet}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(280px,85vw)]! min-w-0! max-w-[85vw]! gap-0 border-r border-card-border bg-card-background p-0 sm:max-w-[85vw]!"
          >
            <SheetTitle className="sr-only">Mục lục đề thi</SheetTitle>
            {renderTree(outline, { onClose: () => setOutlineSheet(false), className: 'flex h-full w-full' })}
          </SheetContent>
        </SheetOverlay>

        {children}

        <StatusBar />
      </div>
    </ExamDocContext.Provider>
  )
}
