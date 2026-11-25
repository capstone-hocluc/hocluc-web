// A loaded paper in the exam workspace, shown the way a compose run is: the same header, list of exams, A4 sheet with the
// words being written live, status bar, and the assistant's chat on the right, the reading as its latest turn.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { BankSource } from '../../../services/questionBankService'
import Button from '../../console/button'
import { ListTree } from '../../console/icons'
import Notice from '../../console/notice'
import { ConsoleSubTabsList, ConsoleSubTabsTrigger, ConsoleTabs, ConsoleTabsContent } from '../../console/tabs'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import ResizeHandle from '../../ui/ResizeHandle'
import DocHeader from '../exam-doc/DocHeader'
import DocSheet from '../exam-doc/DocSheet'
import StatusBar from '../exam-doc/StatusBar'
import { scrollToPos } from '../exam-doc/doc-outline'
import { EditorOutlineTree } from '../exam-doc/doc-tree'
import { draftToDoc } from '../exam-doc/draft-to-doc'
import { ExamDocContext, type ExamDocContextValue } from '../exam-doc/exam-doc-context'
import { findTagged } from '../exam-doc/exam-tags'
import { liveDraftKey } from '../exam-doc/nodes/live-draft-widget'
import { useFollowWriting } from '../exam-doc/use-follow-writing'
import { useReadOnlyEditor } from '../exam-doc/use-read-only-editor'
import { useWheelZoom } from '../exam-doc/use-wheel-zoom'
import { failureText } from '../question-bank/question-bank-labels'
import type { ShownQuestion } from '../question-bank/ReadingPaper'
import { readItemId, readingStages, readingToPaper } from '../question-bank/reading-to-paper'
import { usePaperReading } from '../question-bank/use-paper-reading'
import PaperPagesView from './PaperPagesView'
import PaperReadingCard from './PaperReadingCard'
import { ReadingActionsContext, readingStatus, type ReadingActions, type ReadingTurn } from './reading-turn'
import { ShowExamListButton } from './WorkspaceTree'
import { DIVIDER_WIDTH, PANEL_LIMITS, usePanelWidths } from './use-panel-widths'

const noop = () => undefined

type PaperView = 'read' | 'pages'

/** Where the assistant's chat goes beside the paper; the reading shows in its thread as its latest turn. */
export interface PaperChatChrome {
  onCollapse?: () => void
  className: string
  style?: CSSProperties
}

interface PaperReadingWorkspaceProps {
  source: BankSource
  onBack: () => void
  backHref: string
  backLabel?: string
  onNew: () => void
  /** Back to the exam being written. */
  onClose: () => void
  /** The left panel: every exam and paper. */
  renderTree: (chrome: {
    onCollapse?: () => void
    onClose?: () => void
    outline?: ReactNode
    className: string
    style?: CSSProperties
  }) => ReactNode
  /** Whether the assistant is shown, beside the paper, in a sheet or as the bar at its bottom. */
  chatOpen: boolean
  onToggleChat: () => void
  /** The chat is the panel beside the paper (not the bar, nor a sheet on a narrow screen). */
  chatBeside: boolean
  onCollapseChat: () => void
  renderChat: (chrome: PaperChatChrome) => ReactNode
  /** The assistant's bar at the bottom of the paper, when it is docked there. */
  chatBar?: ReactNode
  /** Given for a failed paper the viewer may load again. */
  onLoadAgain?: () => void
  /** Given for a finished paper with unlabelled questions the viewer may have labelled. */
  onLabel?: () => void
  /** Why Jev cannot label now, shown when questions stay unlabelled. */
  labellingBlocker?: string | null
  /** Hands the reading to the assistant's chat, which shows it as its own turn; null once the paper is closed. */
  onReading: (turn: ReadingTurn | null) => void
  /** Dialogs and sheets of the workspace (the list of exams, the chat on a narrow screen). */
  children?: ReactNode
}

export default function PaperReadingWorkspace({
  source,
  onBack,
  backHref,
  backLabel,
  onNew,
  onClose,
  renderTree,
  chatOpen,
  onToggleChat,
  chatBeside,
  onCollapseChat,
  renderChat,
  chatBar,
  onLoadAgain,
  onLabel,
  labellingBlocker,
  onReading,
  children,
}: PaperReadingWorkspaceProps) {
  const { reading, error, view, streaming, busy } = usePaperReading(source.id, source.status)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [paperView, setPaperView] = useState<PaperView>('read')
  const [zoom, setZoom] = useState(1)
  const [showRuler, setShowRuler] = useState(true)
  const { row, widths, max, change } = usePanelWidths(chatBeside, outlineOpen)

  const read = useMemo(() => (reading ? readingToPaper(source.title, reading, view) : null), [reading, view, source.title])
  // The sheet is laid out again only when the questions on it change, not at every word being written.
  const paperJson = read ? JSON.stringify(read.paper) : null
  const doc = useMemo(() => (paperJson ? draftToDoc(JSON.parse(paperJson)) : null), [paperJson])
  const { editor, pages } = useReadOnlyEditor(doc, 'Đề đang đọc (chỉ đọc)')
  const stages = useMemo(() => readingStages(view), [view])

  // The reading as the chat shows it: a turn of its own, timed from when its reading began (or, still waiting, from
  // when the paper was loaded) until it was read.
  const running = view.status === 'PENDING' || view.status === 'RUNNING'
  const failure = view.error ?? reading?.error ?? null
  const blocker = view.status === 'DONE' && source.unlabelledCount > 0 ? (labellingBlocker ?? null) : null
  const began = source.startedAt ?? source.createdAt
  const endedAt = source.finishedAt ? Date.parse(source.finishedAt) : view.endedAt
  const turn = useMemo<ReadingTurn>(
    () => ({
      title: source.title,
      running,
      status: readingStatus(view.status, failure !== null),
      progress: running ? view.progress : null,
      error: failure ? failureText(failure) : null,
      stages,
      runTime: began
        ? { startedAt: Date.parse(began), ...(!running && endedAt !== null ? { completedAt: endedAt } : {}) }
        : undefined,
      labellingBlocker: blocker,
      polling: streaming === 'polling' && busy,
    }),
    [source.title, began, running, view.status, view.progress, failure, stages, endedAt, blocker, streaming, busy]
  )
  useEffect(() => onReading(turn), [onReading, turn])
  useEffect(() => () => onReading(null), [onReading])
  const actions = useMemo<ReadingActions>(() => ({ onLoadAgain, onClose }), [onLoadAgain, onClose])

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
  const writing = useFollowWriting(sheetScroller, busy && view.live && paperView === 'read', followTarget, `${current ?? ''}:${liveText?.length ?? 0}`)

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
    setPaperView('read')
    if (!editor) return
    const pos = findTagged(editor.state.doc, 'examItem', id)
    if (pos !== null) scrollToPos(editor, pos)
  }

  function toggleOutline() {
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  const docContext = useMemo<ExamDocContextValue>(
    () => ({
      editor,
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

  // The paper's parts and questions, unfolded under its row in the list.
  const outline = (
    <EditorOutlineTree
      editor={editor}
      depth={2}
      onJump={(pos) => {
        setOutlineSheet(false)
        setPaperView('read')
        if (editor) scrollToPos(editor, pos)
      }}
    />
  )

  return (
    <ReadingActionsContext.Provider value={actions}>
    <ExamDocContext.Provider value={docContext}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <DocHeader
          variant="paper"
          title={source.title}
          editable={false}
          onTitleChange={noop}
          onBack={onBack}
          backHref={backHref}
          backLabel={backLabel}
          chatOpen={chatOpen}
          onToggleChat={onToggleChat}
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
            <div className="relative flex min-h-0 min-w-0 flex-1">
              <ShowExamListButton listOpen={outlineOpen} onClick={toggleOutline} />
              {outlineOpen && (
                <>
                  {renderTree({
                    onCollapse: () => setOutlineOpen(false),
                    outline,
                    style: { width: widths.outline },
                    className: 'hidden shrink-0 border-r border-card-border bg-card-background xl:flex',
                  })}
                  <ResizeHandle
                    label="Kéo để đổi độ rộng danh sách đề"
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

              <ConsoleTabs
                value={paperView}
                onValueChange={(value) => setPaperView(value as PaperView)}
                className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background-gray-secondary"
              >
                <div className="flex shrink-0 flex-col items-center gap-2 px-3 pt-2">
                  {/* With the chat out of sight (closed, a bar, or too narrow a screen), the reading stays over the paper. */}
                  <PaperReadingCard
                    turn={turn}
                    log={view.log}
                    onLoadAgain={onLoadAgain}
                    onClose={onClose}
                    className={`max-h-[35vh] w-full max-w-[794px]${chatBeside ? ' lg:hidden' : ''}`}
                  />
                  <ConsoleSubTabsList aria-label="Bản AI đọc hoặc trang gốc" className="self-center">
                    <ConsoleSubTabsTrigger value="read">Bản AI đọc</ConsoleSubTabsTrigger>
                    <ConsoleSubTabsTrigger value="pages" disabled={(reading?.pageCount ?? 0) === 0}>
                      Trang gốc
                    </ConsoleSubTabsTrigger>
                  </ConsoleSubTabsList>
                </div>
                <ConsoleTabsContent value="read" className="min-h-0 min-w-0 flex-1 gap-0 pt-0">
                  <main
                    ref={sheetScroller}
                    aria-label={`Đề ${source.title}`}
                    className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background-gray-secondary [scrollbar-gutter:stable]"
                  >
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
                </ConsoleTabsContent>
                <ConsoleTabsContent value="pages" className="min-h-0 min-w-0 flex-1 gap-0 overflow-auto bg-background-gray-secondary pt-0">
                  {/* Page images are fetched only while the pages are looked at. */}
                  {paperView === 'pages' && (
                    <PaperPagesView
                      sourceId={source.id}
                      reading={reading}
                      busy={busy}
                      current={current}
                      shown={shown}
                      onSelect={(number) => jumpTo(readItemId(number))}
                    />
                  )}
                </ConsoleTabsContent>
                {chatBar}
              </ConsoleTabs>
            </div>

          {chatBeside && (
            <>
              <ResizeHandle
                label="Kéo để đổi độ rộng trợ lý AI"
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
              {renderChat({
                onCollapse: onCollapseChat,
                style: { width: widths.chat },
                className: 'hidden shrink-0 lg:flex',
              })}
            </>
          )}
        </div>

        <SheetOverlay isOpen={outlineSheet} onOpenChange={setOutlineSheet}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(280px,85vw)]! min-w-0! max-w-[85vw]! gap-0 border-r border-card-border bg-card-background p-0 sm:max-w-[85vw]!"
          >
            <SheetTitle className="sr-only">Đề của tôi</SheetTitle>
            {renderTree({ onClose: () => setOutlineSheet(false), outline, className: 'flex h-full w-full' })}
          </SheetContent>
        </SheetOverlay>

        {children}

        <StatusBar />
      </div>
    </ExamDocContext.Provider>
    </ReadingActionsContext.Provider>
  )
}
