// The AI exam composer, laid out like a document editor: header with menus, formatting toolbar, the document
// panel (outline, templates) on the left, the A4 paper in the middle, the AI chat on the right, a status bar below.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { rewriteAiSelection, type AiAssistantMode, type AiConversation, type AiRevisedItem } from '../../../services/aiAssistantService'
import { useAiAssistant, type AiComposeSettings } from '../../../hooks/useAiAssistant'
import ThemeProvider from '../../common/ThemeProvider'
import Button from '../../console/button'
import { FileText } from '../../console/icons'
import ConfirmDialog from '../../console/confirm-dialog'
import Notice from '../../console/notice'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ResizeHandle from '../../ui/ResizeHandle'
import FormulaDialog, { type FormulaValue } from '../../ui/math/FormulaDialog'
import { DIVIDER_WIDTH, PANEL_LIMITS, usePanelWidths } from './use-panel-widths'
import { buildPaper, isSoloGroup, questionNumbers } from './exam-format'
import ChatPanel from './ChatPanel'
import ExamPaper from './ExamPaper'
import DocHeader from '../exam-doc/DocHeader'
import DocSheet from '../exam-doc/DocSheet'
import DocToolbar from '../exam-doc/DocToolbar'
import StatusBar from '../exam-doc/StatusBar'
import TemplateLibrary from '../exam-doc/templates/TemplateLibrary'
import { EditorOutlineTree, PaperOutlineTree } from '../exam-doc/doc-tree'
import WorkspaceTree from './WorkspaceTree'
import { parentHeadingText, partHeadings, questionsToBlocks } from '../exam-doc/draft-to-doc'
import { scrollToPos } from '../exam-doc/doc-outline'
import { ExamDocContext, type ExamDocContextValue } from '../exam-doc/exam-doc-context'
import { deliveredItems, findTagged, partHeadingPlace, questionInsertPos } from '../exam-doc/exam-tags'
import { refreshChartImages } from '../exam-doc/chart-refresh'
import { downloadExamOnlyDocx, replaceAnswerKey } from '../exam-doc/answer-key'
import { restoreSoloPassages } from '../exam-doc/solo-passages'
import { replaceQuestionBlocks, replaceSheetRange } from '../exam-doc/replace-question'
import { sheetDocument, sheetQuestion, sheetQuestions } from '../exam-doc/doc-snapshot'
import AiSelectionMenu from '../exam-doc/ai-selection-menu'
import { useWheelZoom } from '../exam-doc/use-wheel-zoom'
import { revisedNumbers } from './revise-request'
import type { ExamDownload } from './AssistantMessage'
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
import type { BankSource } from '../../../services/questionBankService'
import BankImportDialog from '../question-bank/BankImportDialog'
import { useSourceActions } from '../question-bank/use-source-actions'
import PaperReadingWorkspace from './PaperReadingWorkspace'
import { useBankPapers } from './use-bank-papers'
import { clearRequestedPaper, requestedPaper, showPaperInAddress } from './open-paper'

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
  canImport = false,
}: {
  onBack: () => void
  backHref: string
  /** The viewer may load papers into the bank (the AI reads them here, as it writes an exam). */
  canImport?: boolean
}) {
  const ai = useAiAssistant()
  const bankPapers = useBankPapers(true)
  // The loaded paper on the sheet instead of an exam: one asked for by the bank's list (or kept in the address) at
  // first. The list refreshes it; `queued` covers one just loaded, before the list has it.
  const [viewingId, setViewingId] = useState<string | null>(requestedPaper)
  const [queued, setQueued] = useState<BankSource | null>(null)
  const [importing, setImporting] = useState(false)
  useEffect(clearRequestedPaper, [])
  const viewingPaper = viewingId
    ? (bankPapers.papers.find((paper) => paper.id === viewingId) ?? (queued?.id === viewingId ? queued : null))
    : null
  // A paper that is not in the list (deleted, or not allowed) leaves the address once the list is in.
  const shownPaperId = bankPapers.loading ? viewingId : (viewingPaper?.id ?? null)
  useEffect(() => showPaperInAddress(shownPaperId), [shownPaperId])
  const { refresh: refreshPapers } = bankPapers
  const openQueued = useCallback(
    (source: BankSource) => {
      setQueued(source)
      setViewingId(source.id)
      refreshPapers()
    },
    [refreshPapers]
  )
  const sourceActions = useSourceActions(openQueued)
  const { actionError, setActionError: clearActionError } = sourceActions
  useEffect(() => {
    if (!actionError) return
    showErrorToast(actionError)
    clearActionError('')
  }, [actionError, clearActionError])
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
      // A question's own passage leads only it, so its lead can name it ("trả lời câu 7").
      const nodes = questionsToBlocks(ai.paper, [question], { shownGroups, complete: isSoloGroup(question.groupId) }).map((block) =>
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
  // Ctrl + wheel or a pinch over the sheet zooms the paper, not the page.
  useWheelZoom(sheetScroller, zoom, setZoom)
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

  // A compose run that ends leaves the answer key after the exam: the answer table and the solution guide, written
  // once every question it added is on the sheet. The teacher's later edits to the key stay until they ask for a new
  // one ("Cập nhật đáp án").
  const keyDue = useRef(false)
  const lastRunMode = useRef(ai.runMode)
  useEffect(() => {
    // A revise run only updates a key the exam already has (as each rewritten question arrives, below).
    if (lastRunMode.current && lastRunMode.current !== 'ask' && lastRunMode.current !== 'revise' && !ai.runMode) {
      keyDue.current = true
    }
    lastRunMode.current = ai.runMode
  }, [ai.runMode])
  const solutionStyle = ai.settings.solutionStyle
  useEffect(() => {
    if (!keyDue.current || ai.running || !editor || examDoc.loading || ai.draftLoading || examDoc.mode !== 'FREE') return
    const delivered = deliveredItems(editor.state.doc)
    if (delivered && ai.paper.questions.some((question) => !delivered.has(question.id))) return
    keyDue.current = false
    replaceAnswerKey(editor, ai.paper, solutionStyle)
  }, [ai.paper, ai.running, ai.runMode, ai.draftLoading, examDoc.loading, examDoc.mode, editor, solutionStyle])

  // A question the AI rewrote ("Sửa câu 2") replaces its blocks where it stands, keeping its number; an exam that has
  // an answer key gets it written again for the new answer, and the sheet shows the question.
  const writtenRevisions = useRef(new Map<string, number>())
  const { addRunStep } = ai
  useEffect(() => {
    if (!editor || examDoc.loading || examDoc.mode !== 'FREE') return
    const rewritten = ai.paper.questions.filter(
      (question) => question.revision > 0 && writtenRevisions.current.get(question.id) !== question.revision
    )
    if (rewritten.length === 0) return
    let shown: number | null = null
    for (const question of rewritten) {
      writtenRevisions.current.set(question.id, question.revision)
      const at = replaceQuestionBlocks(editor, ai.paper, question)
      shown ??= at
    }
    let hasKey = false
    editor.state.doc.forEach((node) => {
      if (node.attrs.examKey) hasKey = true
    })
    if (hasKey && replaceAnswerKey(editor, ai.paper, solutionStyle)) addRunStep('Cập nhật đáp án')
    if (shown !== null) scrollToPos(editor, shown)
  }, [ai.paper, addRunStep, examDoc.loading, examDoc.mode, editor, solutionStyle])

  // A question only the sheet holds (the teacher typed it), rewritten by the AI: written over that question, keeping its
  // number; the passage above it stays, so the rewrite brings its own only when the question had none.
  const sheetContexts = useRef(new Map<number, boolean>())
  const writtenRewrites = useRef(0)
  useEffect(() => {
    if (!editor || examDoc.loading || examDoc.mode !== 'FREE') return
    const pending = ai.rewrites.filter((rewrite) => rewrite.seq > writtenRewrites.current)
    if (pending.length === 0) return
    let shown: number | null = null
    for (const rewrite of pending) {
      writtenRewrites.current = Math.max(writtenRewrites.current, rewrite.seq)
      const target = sheetQuestions(editor.state.doc).filter((question) => question.number === rewrite.number && !question.itemId)
      const at = target[0] ?? sheetQuestion(sheetQuestions(editor.state.doc), rewrite.number)
      if (!at) continue
      const keepsPassage = sheetContexts.current.get(rewrite.number) ?? Boolean(at.context)
      const question = keepsPassage
        ? { ...rewrite.question, passage: null, passageImageUrl: null, passageChart: null }
        : rewrite.question
      const paper = buildPaper(null, [{ id: `sheet-${rewrite.seq}`, sectionCode: 'SHEET', groupKey: null, position: rewrite.number,
        question, source: 'AI', kept: true, checkResult: null }], '')
      replaceSheetRange(editor, at.from, at.to, rewrite.number, questionsToBlocks(paper, paper.questions, { complete: true }))
      shown ??= at.from
    }
    if (shown !== null) scrollToPos(editor, shown)
  }, [ai.rewrites, examDoc.loading, examDoc.mode, editor])

  // Charts are drawn again from their data when an exam opens, so one saved with an older drawing looks current.
  useEffect(() => {
    // A refreshed drawing is saved like an edit, once; later opens find it current and change nothing.
    if (!editor || examDoc.loading || ai.draftLoading) return
    refreshChartImages(editor, ai.paper)
  }, [ai.paper, ai.draftLoading, examDoc.loading, editor])

  // A question's own passage (a bank question's reading text, function or rules) goes back above it in exams
  // written before such passages were printed; saved like an edit, once.
  useEffect(() => {
    if (!editor || examDoc.loading || ai.draftLoading || examDoc.mode !== 'FREE') return
    restoreSoloPassages(editor, ai.paper)
  }, [ai.paper, ai.draftLoading, examDoc.loading, examDoc.mode, editor])

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
  function downloadExam(format: ExamDownload) {
    if (format === 'docx-exam') {
      // The original exam only: an exam code's sheet has no guide, and its answer table belongs to that code.
      if (editor) void downloadExamOnlyDocx(editor)
      return
    }
    if (format === 'pdf' || format === 'pdf-exam') {
      // The sheet's editor: the original, or the read-only variant being viewed.
      if (examDoc.mode !== 'FREE') showErrorToast('Tải PDF chỉ có ở chế độ Văn bản tự do')
      else if (shownEditor) {
        void downloadPdf(shownEditor, { code: variants.activeVariant ?? null, examOnly: format === 'pdf-exam' })
      }
      return
    }
    // What the sheet shows: the original, or the exam code being viewed (named after it).
    if (shownEditor) void downloadDocument(shownEditor, 'docx', variants.activeVariant ?? null)
  }

  /**
   * Sends the composer's text. "Sửa câu 2 …" in compose mode rewrites those questions: each number is the one the sheet
   * prints (or the question cards show), looked up to its draft question before anything is sent.
   */
  function sendMessage() {
    const onSheet = examDoc.mode === 'FREE' && editor ? editor : null
    // A question about the exam reads the sheet the teacher sees.
    if (ai.mode === 'ask') {
      ai.send(onSheet ? { document: sheetDocument(onSheet.state.doc) } : undefined)
      return
    }
    const numbers = ai.mode === 'compose' ? revisedNumbers(ai.value) : null
    if (!numbers) {
      ai.send()
      return
    }
    const targets: AiRevisedItem[] = []
    const missing: number[] = []
    if (onSheet) {
      // Any question the sheet prints, typed by the teacher or written by the AI, as it reads now.
      const questions = sheetQuestions(onSheet.state.doc)
      for (const number of numbers) {
        const found = sheetQuestion(questions, number)
        if (!found) missing.push(number)
        else {
          sheetContexts.current.set(number, Boolean(found.context))
          targets.push({ number, ...(found.itemId ? { itemId: found.itemId } : {}), text: found.text, ...(found.context ? { context: found.context } : {}) })
        }
      }
    } else {
      const byNumber = new Map<number, string>()
      numberOf.forEach((number, id) => byNumber.set(number, id))
      for (const number of numbers) {
        const itemId = byNumber.get(number)
        if (itemId) targets.push({ number, itemId })
        else missing.push(number)
      }
    }
    if (missing.length > 0) {
      ai.setNotice(`Đề không có câu ${missing.join(', ')} để sửa.`)
      return
    }
    ai.send({ revise: targets })
  }

  /** "Nhờ AI sửa" on a selection: the exam's conversation (made now for a new exam) asks the AI for the new words. */
  async function rewriteSelection(request: { selection: string; context: string; instruction: string }) {
    const id = ai.activeId ?? (await ai.ensureConversation(ai.activeConversation?.title || 'Đề thi mới'))
    if (!id) throw new Error('Chưa mở được đề để nhờ trợ lý AI sửa.')
    return rewriteAiSelection(id, request)
  }

  /** The answer key written again from the questions the sheet holds now, in the chosen solution style. */
  function writeAnswerKey() {
    setChatSheet(false)
    if (!editor || examDoc.mode !== 'FREE') {
      showErrorToast('Đáp án chỉ ghi được ở chế độ Văn bản tự do')
      return
    }
    variants.setActiveVariant(null)
    replaceAnswerKey(editor, ai.paper, solutionStyle)
    let at: number | null = null
    editor.state.doc.forEach((node, pos) => {
      if (at === null && node.attrs.examKey && node.type.name === 'heading') at = pos
    })
    if (at === null) showErrorToast('Đề chưa có câu nào của trợ lý AI để làm đáp án')
    else scrollToPos(editor, at)
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
    setViewingId(null)
    ai.startNew()
    setOutlineSheet(false)
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

  /** The list of exams is the left panel (a sheet on a narrow screen). */
  function openTree() {
    setChatSheet(false)
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen(true)
    else setOutlineSheet(true)
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
    onSend: sendMessage,
    onStop: ai.cancel,
    onRegenerate: ai.regenerate,
    onStartNew: startNew,
    conversationsOpen: outlineOpen || outlineSheet,
    onOpenConversations: openTree,
    onPickPrompt: pickPrompt,
    onDownload: downloadExam,
    onAnswerKey: writeAnswerKey,
  }

  /** The left panel: every exam and loaded paper, with the open one's outline under it. */
  const renderTree = (outline: ReactNode, chrome: { onCollapse?: () => void; onClose?: () => void; templates?: ReactNode; className: string; style?: CSSProperties }) => (
    <WorkspaceTree
      conversations={ai.conversations}
      papers={bankPapers.papers}
      activeId={ai.activeId}
      activePaperId={viewingPaper?.id ?? null}
      loading={ai.conversationsLoading || bankPapers.loading}
      outline={outline}
      onSelect={(id) => {
        setViewingId(null)
        ai.selectConversation(id)
        setOutlineSheet(false)
        setEditingId(null)
        setFocusedId(null)
      }}
      onSelectPaper={(id) => {
        setViewingId(id)
        setOutlineSheet(false)
      }}
      onNew={startNew}
      onImport={
        canImport
          ? () => {
              setOutlineSheet(false)
              setImporting(true)
            }
          : undefined
      }
      onRename={(id, title) => void ai.renameConversation(id, title)}
      onDelete={(id) => setPendingDelete(ai.conversations.find((item) => item.id === id) ?? null)}
      {...chrome}
    />
  )
  // The free document lists its own headings; the question view lists the draft (the document would show hidden text).
  const composeOutline =
    examDoc.mode === 'FREE' ? (
      <EditorOutlineTree editor={shownEditor} depth={1} />
    ) : (
      <PaperOutlineTree paper={ai.paper} numberOf={numberOf} onJump={jumpToQuestion} depth={1} />
    )
  const composeTemplates = examDoc.mode === 'FREE' ? <TemplateLibrary /> : undefined

  const importDialog = importing && (
    <BankImportDialog
      onClose={() => setImporting(false)}
      onQueued={(source) => {
        setImporting(false)
        openQueued(source)
      }}
    />
  )

  if (viewingPaper) {
    const labelling = sourceActions.labelling
    return (
      <ThemeProvider>
        <PaperReadingWorkspace
          key={viewingPaper.id}
          source={viewingPaper}
          onBack={onBack}
          backHref={backHref}
          onNew={startNew}
          renderTree={renderTree}
          onLoadAgain={
            canImport && viewingPaper.status === 'FAILED' ? () => sourceActions.loadAgain(viewingPaper) : undefined
          }
          onLabel={
            canImport && viewingPaper.status === 'DONE' && viewingPaper.unlabelledCount > 0 && labelling?.ready !== false
              ? () => sourceActions.askLabelling(viewingPaper)
              : undefined
          }
          labellingBlocker={labelling && !labelling.ready ? labelling.reason : null}
        >
          {importDialog}
          {sourceActions.dialogs}
        </PaperReadingWorkspace>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ExamDocContext.Provider value={docContext}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <AiSelectionMenu
          editor={editor}
          enabled={editable && !variants.activeDoc}
          onRewrite={rewriteSelection}
          onError={showErrorToast}
        />
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
          actions={
            canImport ? (
              <Button appearance="ghost" size="sm" onClick={() => setImporting(true)} aria-label="Nạp đề" title="Nạp đề">
                <FileText size={15} />
                <span className="hidden lg:inline">Nạp đề</span>
              </Button>
            ) : undefined
          }
        />

        <div className="shrink-0 px-2 pb-1.5 sm:px-3">
          <DocToolbar />
        </div>

        <div ref={row} className="flex min-h-0 min-w-0 flex-1">
          {outlineOpen && (
            <>
              {renderTree(composeOutline, {
                onCollapse: () => setOutlineOpen(false),
                templates: composeTemplates,
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

        {importDialog}

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
            {renderTree(composeOutline, {
              onClose: () => setOutlineSheet(false),
              templates: composeTemplates,
              className: 'flex h-full w-full',
            })}
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
