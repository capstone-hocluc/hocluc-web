// The AI exam composer, laid out like a document editor: header with menus, formatting toolbar, the document
// panel (outline, templates) on the left, the A4 paper in the middle, the AI chat on the right, a status bar below.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AiAssistantMode, AiConversation } from '../../../services/aiAssistantService'
import { useAiAssistant, type AiComposeSettings } from '../../../hooks/useAiAssistant'
import ThemeProvider from '../../common/ThemeProvider'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import Notice from '../../console/notice'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ResizeHandle from '../../ui/ResizeHandle'
import FormulaDialog, { type FormulaValue } from '../../ui/math/FormulaDialog'
import { DIVIDER_WIDTH, PANEL_LIMITS, usePanelWidths } from './use-panel-widths'
import { questionNumbers } from './exam-format'
import AiSidebar from './AiSidebar'
import ChatPanel from './ChatPanel'
import ExamOutline from './ExamOutline'
import ExamPaper from './ExamPaper'
import DocHeader from '../exam-doc/DocHeader'
import DocSheet from '../exam-doc/DocSheet'
import DocToolbar from '../exam-doc/DocToolbar'
import LeftPanel from '../exam-doc/LeftPanel'
import StatusBar from '../exam-doc/StatusBar'
import TemplateLibrary from '../exam-doc/templates/TemplateLibrary'
import { parentHeadingText, partHeadings, questionsToBlocks } from '../exam-doc/draft-to-doc'
import { scrollToPos } from '../exam-doc/doc-outline'
import { ExamDocContext, type ExamDocContextValue } from '../exam-doc/exam-doc-context'
import { deliveredItems, findTagged, partHeadingPlace, questionInsertPos } from '../exam-doc/exam-tags'
import { refreshChartImages } from '../exam-doc/chart-refresh'
import { showErrorToast } from '../../../lib/toastBus'
import { downloadDocument, downloadPdf } from '../exam-doc/export'
import { liveDraftView } from '../exam-doc/live-draft'
import { useFollowWriting } from '../exam-doc/use-follow-writing'
import { liveDraftKey } from '../exam-doc/nodes/live-draft-widget'
import { useDocEditor } from '../exam-doc/use-doc-editor'
import { useExamDocument } from '../exam-doc/use-exam-document'
import VariantBanner from '../exam-doc/variants/VariantBanner'
import VariantsPanel from '../exam-doc/variants/VariantsPanel'
import { useExamVariants } from '../exam-doc/variants/use-exam-variants'
import { useVariantEditor } from '../exam-doc/variants/use-variant-editor'

const GREETING_BUCKETS: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: [
    'Chào buổi sáng.',
    'Buổi sáng tốt lành — cùng soạn đề nhé.',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  afternoon: [
    'Chào buổi chiều.',
    'Chiều nay bạn đang nghĩ về đề nào?',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  evening: [
    'Chào buổi tối.',
    'Buổi tối yên tĩnh — mình cùng soạn đề nhé.',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  night: [
    'Đã khuya rồi.',
    'Vẫn thức để soạn đề à?',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
}

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return GREETING_BUCKETS.morning
  if (hour >= 12 && hour < 17) return GREETING_BUCKETS.afternoon
  if (hour >= 17 && hour < 22) return GREETING_BUCKETS.evening
  return GREETING_BUCKETS.night
}

export default function AiAssistantScreen({
  onBack,
  backHref,
}: {
  onBack: () => void
  backHref: string
}) {
  const ai = useAiAssistant()
  const [conversationsOpen, setConversationsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatSheet, setChatSheet] = useState(false)
  // The "Mã đề" panel takes the chat's place on the right (a sheet on narrow screens); one of them at a time.
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [variantsSheet, setVariantsSheet] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null)
  const [greeting] = useState(() => {
    const bucket = greetingForHour(new Date().getHours())
    return bucket[Math.floor(Math.random() * bucket.length)]
  })
  const highlight = useRef<number | null>(null)
  const { row, widths, max, change } = usePanelWidths(chatOpen || variantsOpen, outlineOpen)
  const [zoom, setZoom] = useState(1)
  const [showRuler, setShowRuler] = useState(true)
  const [pages, setPages] = useState(1)
  // The formula being written: `pos` is set when an existing formula node is edited.
  const [formula, setFormula] = useState<{ pos: number | null; initial: FormulaValue | null } | null>(null)

  const examDoc = useExamDocument(ai.activeId ?? null, ai.paper, ai.draftLoading, {
    createdId: ai.createdConversationId,
    requestConversation: ai.ensureConversation,
  })
  const editFormula = useCallback((pos: number, value: FormulaValue) => setFormula({ pos, initial: value }), [])
  const editor = useDocEditor({
    content: examDoc.loaded?.content ?? null,
    onChange: examDoc.onChange,
    onEditFormula: editFormula,
    onPages: setPages,
  })
  const variants = useExamVariants(editor, ai.activeId ?? null, variantsOpen || variantsSheet)
  const variantView = useVariantEditor(variants.activeDoc?.content ?? null)
  // While a variant is shown, the sheet and the chrome get its read-only editor; the original stays as it is.
  const shownEditor = variants.activeDoc && variantView.editor ? variantView.editor : editor

  // Only the free document is edited here, and not while a newer version saved elsewhere waits for a decision.
  const editable = examDoc.mode === 'FREE' && !examDoc.conflict && !examDoc.loading
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable, false)
  }, [editor, editable])

  // Draft questions the document has not received yet (the AI is writing, or the document was closed during a run)
  // are written under their own part. The teacher's caret stays where it is and Ctrl+Z does not take them back out;
  // the document remembers which items it received, so one the teacher deleted is not written again.
  useEffect(() => {
    if (!editor || examDoc.loading || ai.draftLoading) return
    const delivered = deliveredItems(editor.state.doc)
    if (delivered === null) {
      // Saved before items were tracked: what the draft holds now counts as written.
      const ids = ai.paper.questions.map((question) => question.id)
      editor.view.dispatch(editor.state.tr.setDocAttribute('deliveredItems', ids).setMeta('addToHistory', false))
      return
    }
    const fresh = ai.paper.questions.filter((question) => !delivered.has(question.id))
    if (fresh.length === 0) return
    const tr = editor.state.tr
    const partOrder = ai.paper.parts.map((part) => part.id)
    for (const question of fresh) {
      const part = ai.paper.parts.find((item) => item.id === question.partId)
      if (part && findTagged(tr.doc, 'examPart', part.id) === null) {
        const place = partHeadingPlace(tr.doc, part.id, partOrder, parentHeadingText(part))
        tr.insert(place.pos, partHeadings(part, place.parentShown).map((block) => editor.schema.nodeFromJSON(block)))
      }
      const shownGroups = new Set<string>()
      if (question.groupId && findTagged(tr.doc, 'examGroup', question.groupId) !== null) shownGroups.add(question.groupId)
      const nodes = questionsToBlocks(ai.paper, [question], { shownGroups }).map((block) =>
        editor.schema.nodeFromJSON(block)
      )
      tr.insert(questionInsertPos(tr.doc, question.partId), nodes)
      delivered.add(question.id)
    }
    tr.setDocAttribute('deliveredItems', [...delivered]).setMeta('addToHistory', false)
    editor.view.dispatch(tr)
  }, [ai.paper, ai.draftLoading, examDoc.loading, editor])

  // The question the AI is writing shows on the sheet where it will land, word by word, until the checked question
  // replaces it. Only a decoration changes: nothing is saved and nothing goes into undo.
  const liveDraft = ai.liveDraft
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const shown = liveDraft ? { partId: liveDraft.section, view: liveDraftView(liveDraft.text) } : null
    editor.view.dispatch(editor.state.tr.setMeta(liveDraftKey, shown).setMeta('addToHistory', false))
  }, [editor, liveDraft])

  // While the AI writes, the sheet follows it; the teacher scrolling lets go, and a button picks it up again.
  const sheetScroller = useRef<HTMLElement>(null)
  const followTarget = liveDraft
    ? '[data-live-draft]'
    : ai.lastItemId
      ? `[data-exam-item="${CSS.escape(ai.lastItemId)}"]`
      : null
  const writing = useFollowWriting(
    sheetScroller,
    ai.running && examDoc.mode === 'FREE' && !variants.activeDoc,
    followTarget,
    `${ai.lastItemId ?? ''}:${liveDraft?.text.length ?? 0}`
  )

  // Charts are drawn again from their data when an exam opens, so one saved with an older drawing looks current.
  useEffect(() => {
    // A refreshed drawing is saved like an edit, once; later opens find it current and change nothing.
    if (!editor || examDoc.loading || ai.draftLoading) return
    refreshChartImages(editor, ai.paper)
  }, [ai.paper, ai.draftLoading, examDoc.loading, editor])

  const showVariants = useCallback((open: boolean) => {
    if (!open) {
      setVariantsOpen(false)
      setVariantsSheet(false)
      return
    }
    setChatOpen(false)
    setChatSheet(false)
    if (window.matchMedia('(min-width: 1024px)').matches) setVariantsOpen(true)
    else setVariantsSheet(true)
  }, [])

  // Exam codes belong to the free document: the question view closes them (and shows the original again).
  const { setMode: setDocMode } = examDoc
  const { setActiveVariant } = variants
  const switchMode = useCallback(
    (next: ExamDocContextValue['mode']) => {
      if (next === 'STRUCTURED') {
        setActiveVariant(null)
        showVariants(false)
      }
      setDocMode(next)
    },
    [setDocMode, setActiveVariant, showVariants]
  )

  const docContext = useMemo<ExamDocContextValue>(
    () => ({
      editor: shownEditor,
      sourceEditor: editor,
      variantsOpen: variantsOpen || variantsSheet,
      setVariantsOpen: showVariants,
      activeVariant: variants.activeVariant,
      setActiveVariant: variants.setActiveVariant,
      variantDocs: variants.variantDocs,
      mode: examDoc.mode,
      setMode: switchMode,
      saveState: examDoc.saveState,
      saveError: examDoc.saveError,
      loading: examDoc.loading,
      zoom,
      setZoom,
      showRuler,
      setShowRuler,
      openFormula: (kind) => setFormula({ pos: null, initial: kind === 'chem' ? { latex: '\\ce{}', display: false } : null }),
      pages: shownEditor === editor ? pages : variantView.pages,
    }),
    [
      editor,
      shownEditor,
      variantsOpen,
      variantsSheet,
      showVariants,
      variants.activeVariant,
      variants.setActiveVariant,
      variants.variantDocs,
      examDoc.mode,
      switchMode,
      examDoc.saveState,
      examDoc.saveError,
      examDoc.loading,
      zoom,
      showRuler,
      pages,
      variantView.pages,
    ]
  )

  // The console shell owns this flag on its own pages; the assistant renders
  // outside it, so it carries the console font and token overrides itself.
  useEffect(() => {
    document.documentElement.dataset.console = ''
    return () => {
      delete document.documentElement.dataset.console
    }
  }, [])

  useEffect(
    () => () => {
      if (highlight.current !== null) window.clearTimeout(highlight.current)
    },
    []
  )

  const numberOf = useMemo(() => questionNumbers(ai.paper), [ai.paper])

  /** The finished exam from the chat: a Word file, or a PDF of the A4 sheets (which only the free document is on). */
  function downloadExam(format: 'docx' | 'pdf') {
    if (format === 'pdf') {
      // The sheet's editor: the original, or the read-only variant being viewed.
      if (examDoc.mode !== 'FREE') showErrorToast('Tải PDF chỉ có ở chế độ Văn bản tự do')
      else if (shownEditor) void downloadPdf(shownEditor, { code: variants.activeVariant ?? null })
      return
    }
    if (editor) void downloadDocument(editor, 'docx', variants.activeVariant ?? null)
  }

  function jumpToQuestion(id: string) {
    setChatSheet(false)
    setOutlineSheet(false)
    if (examDoc.mode === 'FREE' && editor) {
      // The free document marks each AI question's "Câu n." line with its draft item.
      const pos = findTagged(editor.state.doc, 'examItem', id)
      if (pos !== null) {
        variants.setActiveVariant(null)
        scrollToPos(editor, pos)
      }
      return
    }
    setFocusedId(id)
    if (highlight.current !== null) window.clearTimeout(highlight.current)
    highlight.current = window.setTimeout(() => setFocusedId(null), 2200)
    window.setTimeout(() => {
      document
        .getElementById(`exam-question-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  function startNew() {
    ai.startNew()
    setConversationsOpen(false)
    setEditingId(null)
    setFocusedId(null)
  }

  async function addQuestion(partId: string) {
    const id = await ai.addManual(partId)
    if (!id) return
    setEditingId(id)
    jumpToQuestion(id)
  }

  function pickPrompt(mode: AiAssistantMode, prompt: string) {
    ai.setMode(mode)
    ai.setValue(prompt)
  }

  function toggleChat() {
    // The chat and the "Mã đề" panel share the right column.
    setVariantsOpen(false)
    setVariantsSheet(false)
    if (window.matchMedia('(min-width: 1024px)').matches) setChatOpen((open) => !open)
    else setChatSheet((open) => !open)
  }

  function toggleOutline() {
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  const chatPanelProps = {
    messages: ai.messages,
    mode: ai.mode,
    value: ai.value,
    pending: ai.running,
    stages: ai.stages,
    trace: ai.trace,
    loading: ai.draftLoading,
    greeting,
    notice: ai.notice,
    onDismissNotice: () => ai.setNotice(null),
    settings: ai.settings,
    onSettingsChange: (patch: Partial<AiComposeSettings>) =>
      ai.setSettings((previous) => ({ ...previous, ...patch })),
    papers: ai.papers,
    papersLoading: ai.papersLoading,
    papersError: ai.papersError,
    onReloadPapers: ai.reloadPapers,
    onModeChange: ai.setMode,
    onValueChange: ai.setValue,
    onSend: ai.send,
    onStop: ai.cancel,
    onRegenerate: ai.regenerate,
    onStartNew: startNew,
    conversationsOpen,
    // On a narrow screen the chat is itself a sheet; it gives way to the list.
    onOpenConversations: () => {
      setChatSheet(false)
      setConversationsOpen(true)
    },
    onPickPrompt: pickPrompt,
    onDownload: downloadExam,
  }

  return (
    <ThemeProvider>
      <ExamDocContext.Provider value={docContext}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <DocHeader
          title={ai.activeConversation?.title ?? ''}
          editable={Boolean(ai.activeConversation)}
          onTitleChange={(title) => {
            if (ai.activeConversation) void ai.renameConversation(ai.activeConversation.id, title)
          }}
          onBack={onBack}
          backHref={backHref}
          chatOpen={chatOpen || chatSheet}
          onToggleChat={toggleChat}
          outlineOpen={outlineOpen || outlineSheet}
          onToggleOutline={toggleOutline}
          onNew={startNew}
        />

        <div className="shrink-0 px-2 pb-2 sm:px-3">
          <DocToolbar />
        </div>

        <div ref={row} className="flex min-h-0 min-w-0 flex-1">
          {outlineOpen && (
            <>
              {examDoc.mode === 'FREE' ? (
                <LeftPanel
                  onCollapse={() => setOutlineOpen(false)}
                  templates={<TemplateLibrary />}
                  style={{ width: widths.outline }}
                  className="hidden shrink-0 border-r border-card-border bg-card-background xl:flex"
                />
              ) : (
                // The question view has its own outline (of the draft); the document's would show the hidden text.
                <ExamOutline
                  paper={ai.paper}
                  numberOf={numberOf}
                  onJump={jumpToQuestion}
                  onCollapse={() => setOutlineOpen(false)}
                  style={{ width: widths.outline }}
                  className="hidden shrink-0 border-r border-card-border bg-card-background xl:flex"
                />
              )}
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

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VariantBanner />
          <main
            ref={sheetScroller}
            className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background-gray-secondary [scrollbar-gutter:stable]"
          >
            {examDoc.mode === 'FREE' || shownEditor !== editor ? (
              examDoc.loadError && examDoc.loading ? (
                <div className="mx-auto max-w-[560px] px-4 py-10">
                  <Notice tone="danger">
                    {examDoc.loadError}
                    <Button size="sm" appearance="outline" onClick={examDoc.retryLoad}>
                      Thử lại
                    </Button>
                  </Notice>
                </div>
              ) : (
                <>
                  {examDoc.conflict && shownEditor === editor && (
                    <div className="sticky top-0 z-20 mx-auto max-w-[794px] px-4 pt-3 print:hidden">
                      <Notice tone="warning">
                        Đề này vừa được lưu ở nơi khác.
                        <Button size="sm" onClick={() => examDoc.resolveConflict('reload')}>
                          Tải bản mới nhất
                        </Button>
                        <Button size="sm" appearance="outline" onClick={() => examDoc.resolveConflict('keep')}>
                          Giữ bản của tôi
                        </Button>
                      </Notice>
                    </div>
                  )}
                  <DocSheet />
                </>
              )
            ) : (
            <div className="mx-auto w-full max-w-[794px] px-3 py-5 sm:px-6 sm:py-8">
              {ai.draftLoading ? (
                <PaperSkeleton />
              ) : (
                <ExamPaper
                  paper={ai.paper}
                  numberOf={numberOf}
                  editingId={editingId}
                  focusedId={focusedId}
                  onStartEdit={setEditingId}
                  onStopEdit={() => setEditingId(null)}
                  onSave={(id, patch) => {
                    void ai.updateQuestion(id, patch).then(() => setEditingId(null))
                  }}
                  onDelete={(id) => {
                    void ai.deleteItem(id)
                    if (editingId === id) setEditingId(null)
                  }}
                  onKeep={(id, kept) => void ai.toggleKeep(id, kept)}
                  onMove={(sourceId, targetId) => void ai.moveItem(sourceId, targetId)}
                  onAdd={(partId) => void addQuestion(partId)}
                />
              )}
            </div>
            )}
            {/* Shown once the teacher scrolled away from the writing; it stays at the bottom of the sheet's view. */}
            {ai.running && !writing.following && examDoc.mode === 'FREE' && !variants.activeDoc && (
              <div className="pointer-events-none sticky bottom-5 z-20 flex justify-center">
                <button
                  type="button"
                  onClick={writing.follow}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-button-primary-background px-4 py-2 text-sm font-semibold text-button-primary-text shadow-card-hover transition-colors hover:bg-button-primary-hover-background focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring"
                >
                  <span aria-hidden className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
                  Theo dõi AI đang viết
                </button>
              </div>
            )}
          </main>
          </div>

          {(chatOpen || variantsOpen) && (
            <>
              <ResizeHandle
                label={variantsOpen ? 'Kéo để đổi độ rộng bảng mã đề' : 'Kéo để đổi độ rộng trợ lý AI'}
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
              {variantsOpen ? (
                <VariantsPanel
                  variants={variants}
                  onClose={() => showVariants(false)}
                  style={{ width: widths.chat }}
                  className="hidden shrink-0 border-l border-card-border lg:flex"
                />
              ) : (
                <ChatPanel
                  {...chatPanelProps}
                  onCollapse={() => setChatOpen(false)}
                  style={{ width: widths.chat }}
                  className="hidden shrink-0 border-l border-card-border lg:flex"
                />
              )}
            </>
          )}
        </div>

        <SheetOverlay isOpen={conversationsOpen} onOpenChange={setConversationsOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(340px,90vw)]! min-w-0! max-w-[90vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[90vw]!"
          >
            <SheetTitle className="sr-only">Cuộc trò chuyện</SheetTitle>
            <AiSidebar
              conversations={ai.conversations}
              activeId={ai.activeId}
              loading={ai.conversationsLoading}
              onSelect={(id) => {
                ai.selectConversation(id)
                setConversationsOpen(false)
                setEditingId(null)
                setFocusedId(null)
              }}
              onNew={startNew}
              onRename={(id, title) => void ai.renameConversation(id, title)}
              onDelete={(id) =>
                setPendingDelete(ai.conversations.find((item) => item.id === id) ?? null)
              }
              onClose={() => setConversationsOpen(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={chatSheet} onOpenChange={setChatSheet}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(380px,92vw)]! min-w-0! max-w-[92vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[92vw]!"
          >
            <SheetTitle className="sr-only">Trợ lý AI</SheetTitle>
            <ChatPanel
              {...chatPanelProps}
              onClose={() => setChatSheet(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={variantsSheet} onOpenChange={setVariantsSheet}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(380px,92vw)]! min-w-0! max-w-[92vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[92vw]!"
          >
            <SheetTitle className="sr-only">Tạo mã đề</SheetTitle>
            <VariantsPanel
              variants={variants}
              onClose={() => setVariantsSheet(false)}
              onNavigate={() => setVariantsSheet(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={outlineSheet} onOpenChange={setOutlineSheet}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(280px,85vw)]! min-w-0! max-w-[85vw]! gap-0 border-r border-card-border bg-card-background p-0 sm:max-w-[85vw]!"
          >
            <SheetTitle className="sr-only">Mục lục đề thi</SheetTitle>
            {examDoc.mode === 'FREE' ? (
              <LeftPanel
                onClose={() => setOutlineSheet(false)}
                templates={<TemplateLibrary />}
                className="flex h-full w-full"
              />
            ) : (
              <ExamOutline
                paper={ai.paper}
                numberOf={numberOf}
                onJump={jumpToQuestion}
                onClose={() => setOutlineSheet(false)}
                className="flex h-full w-full"
              />
            )}
          </SheetContent>
        </SheetOverlay>

        {formula && (
          <FormulaDialog
            initial={formula.initial}
            onClose={() => setFormula(null)}
            onSave={(value) => {
              // The document may have changed under the dialog: edit in place only if a formula is still there.
              if (formula.pos !== null && editor?.state.doc.nodeAt(formula.pos)?.type.name === 'math') {
                editor.chain().focus().updateMath(formula.pos, value).run()
              } else {
                editor?.chain().focus().insertMath(value).run()
              }
              setFormula(null)
            }}
            onDelete={
              formula.pos === null
                ? undefined
                : () => {
                    const pos = formula.pos as number
                    if (editor?.state.doc.nodeAt(pos)?.type.name === 'math') {
                      editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run()
                    }
                    setFormula(null)
                  }
            }
          />
        )}

        {pendingDelete && (
          <ConfirmDialog
            title="Xoá cuộc trò chuyện"
            description={`Xoá "${pendingDelete.title}" cùng toàn bộ đề nháp của cuộc trò chuyện này?`}
            cancelLabel="Huỷ"
            confirmLabel="Xoá"
            variant="danger"
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              const id = pendingDelete.id
              setPendingDelete(null)
              void ai.deleteConversation(id)
            }}
          />
        )}

        <StatusBar />
      </div>
      </ExamDocContext.Provider>
    </ThemeProvider>
  )
}

function PaperSkeleton() {
  return (
    <div aria-hidden className="quiz-paper min-h-[420px] border border-card-border">
      <Skeleton className="mx-auto mt-2 h-5 w-1/2" />
      <Skeleton className="mx-auto mt-3 h-3 w-1/3" />
      <div className="mt-8 space-y-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
