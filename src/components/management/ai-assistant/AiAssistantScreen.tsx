// The AI exam composer, laid out like a document editor: header with menus, formatting toolbar, the document
// panel (the exams, templates) on the left, the A4 paper in the middle, the AI chat on the right, a status bar below.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { rewriteAiSelection, type AiAssistantMode, type AiConversation, type AiRevisedItem, type AiAttachment, type AiSolutionStyle } from '../../../services/aiAssistantService'
import { useAiAssistant, type AiComposeSettings } from '../../../hooks/useAiAssistant'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { getErrorMessage } from '../../../lib/errors'
import ThemeProvider from '../../common/ThemeProvider'
import Button from '../../console/button'
import { FileText, Landmark, Sparkles } from '../../console/icons'
import ConfirmDialog from '../../console/confirm-dialog'
import Notice from '../../console/notice'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ResizeHandle from '../../ui/ResizeHandle'
import FormulaDialog, { type FormulaValue } from '../../ui/math/FormulaDialog'
import { DIVIDER_WIDTH, PANEL_LIMITS, usePanelWidths } from './use-panel-widths'
import { buildPaper, isSoloGroup, questionNumbers } from './exam-format'
import ChatPanel from './ChatPanel'
import ChatBar from './ChatBar'
import { useChatDock } from './use-chat-dock'
import ExamPaper from './ExamPaper'
import ExportQuizDialog from './ExportQuizDialog'
import SaveToBankDialog from './SaveToBankDialog'
import { useDraftBank } from './use-draft-bank'
import DocHeader from '../exam-doc/DocHeader'
import DocSheet from '../exam-doc/DocSheet'
import DocToolbar from '../exam-doc/DocToolbar'
import StatusBar from '../exam-doc/StatusBar'
import TemplateLibrary from '../exam-doc/templates/TemplateLibrary'
import PublishMenu from './PublishMenu'
import WorkspaceTree, { ShowExamListButton } from './WorkspaceTree'
import { parentHeadingText, partHeadings, questionsToBlocks } from '../exam-doc/draft-to-doc'
import { scrollToPos } from '../exam-doc/doc-outline'
import { EditorOutlineTree, PaperOutlineTree } from '../exam-doc/doc-tree'
import { ExamDocContext, type ExamDocContextValue } from '../exam-doc/exam-doc-context'
import { clearExam, deliveredItems, findTagged, partHeadingPlace, questionInsertPos } from '../exam-doc/exam-tags'
import { refreshChartImages } from '../exam-doc/chart-refresh'
import { downloadExamOnlyDocx, keyParts, removeAnswerKey, replaceAnswerKey, type KeyParts } from '../exam-doc/answer-key'
import { restoreSoloPassages } from '../exam-doc/solo-passages'
import { replaceQuestionBlocks, replaceSheetRange } from '../exam-doc/replace-question'
import { examSheet, sheetDocument, sheetQuestion, sheetQuestions, type DraftPlace } from '../exam-doc/doc-snapshot'
import { applySheetEdit, renumber } from '../exam-doc/sheet-edits'
import { useStoreValue } from '../../../lib/value-store'
import type { AiRun } from '../../../hooks/useAiAssistant'
import AiSelectionMenu from '../exam-doc/ai-selection-menu'
import AiSuggestionBar from '../exam-doc/ai-suggestion-bar'
import { useProofread } from '../exam-doc/use-proofread'
import { useWheelZoom } from '../exam-doc/use-wheel-zoom'
import { revisedNumbers } from './revise-request'
import { AssistantChatProvider } from './chat/AssistantChatProvider'
import { ChatActionsProvider, type ChatActions, type ExamDownload } from './chat/reply-parts'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import { downloadDocument, downloadPdf } from '../exam-doc/export'
import { useDocEditor } from '../exam-doc/use-doc-editor'
import { useExamDocument } from '../exam-doc/use-exam-document'
import type { BankSource } from '../../../services/questionBankService'
import BankImportDialog from '../question-bank/BankImportDialog'
import { useSourceActions } from '../question-bank/use-source-actions'
import PaperReadingWorkspace from './PaperReadingWorkspace'
import SheetWriting from './SheetWriting'
import { useBankPapers } from './use-bank-papers'
import { clearRequestedPaper, requestedPaper, showPaperInAddress } from './open-paper'

const runIsAgent = (run: AiRun | null) => Boolean(run?.agent)

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
  backLabel,
  canImport = false,
}: {
  onBack: () => void
  backHref: string
  backLabel?: string
  /** The viewer may load papers into the bank (the AI reads them here, as it writes an exam). */
  canImport?: boolean
}) {
  const bankPapers = useBankPapers(true)
  const ai = useAiAssistant(bankPapers)
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
  const shownPaperId = bankPapers.settled ? (viewingPaper?.id ?? null) : viewingId
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
  // Whether Jev can label a paper only matters once one is open here.
  const sourceActions = useSourceActions(openQueued, { watchLabelling: canImport && viewingPaper !== null })
  const { actionError, setActionError: clearActionError } = sourceActions
  useEffect(() => {
    if (!actionError) return
    showErrorToast(actionError)
    clearActionError('')
  }, [actionError, clearActionError])
  const [chatOpen, setChatOpen] = useState(true)
  const [chatSheet, setChatSheet] = useState(false)
  const [chatDock, setChatDock] = useChatDock()
  const chatBeside = chatOpen && chatDock === 'side'
  const chatBar = chatOpen && chatDock === 'bottom'
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null)
  // Exams whose outline the viewer unfolded in the list ("Hiện bố cục", a double click), kept here so a paper opened
  // from the list (its own workspace) keeps it too.
  const [outlined, setOutlined] = useState<ReadonlySet<string>>(() => new Set())
  const showOutline = useCallback(
    (key: string, shown: boolean) =>
      setOutlined((current) => {
        if (current.has(key) === shown) return current
        const next = new Set(current)
        if (shown) next.add(key)
        else next.delete(key)
        return next
      }),
    []
  )
  const [greeting] = useState(() => {
    const bucket = greetingForHour(new Date().getHours())
    return bucket[Math.floor(Math.random() * bucket.length)]
  })
  const highlight = useRef<number | null>(null)
  const { row, widths, max, change } = usePanelWidths(chatBeside, outlineOpen)
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

  // Only the free document is edited here, and not while a newer version saved elsewhere waits for a decision.
  const editable = examDoc.mode === 'FREE' && !examDoc.conflict && !examDoc.loading
  const proofread = useProofread(editor, () => ai.activeId ? Promise.resolve(ai.activeId) : ai.ensureConversation(ai.activeConversation?.title || 'Đề thi mới'), showErrorToast)
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable, false)
  }, [editor, editable])

  // The runs that replace the exam save the sheet first, take the old exam off it once the server took them, and read
  // it again when the server puts the old exam back (the run was stopped).
  const [sheetCleared, setSheetCleared] = useState(0)
  // Once the assistant changed the exam there is, its new questions are numbered by the sheet: the draft's numbers
  // still count the questions it took off. A new exam replacing the sheet numbers from the draft again.
  const numberOnSheet = useRef(false)
  const agentRun = useStoreValue(ai.runStore, runIsAgent)
  useEffect(() => {
    if (agentRun) numberOnSheet.current = true
  }, [agentRun])
  // Where the draft put each AI question: the sheet reads a question's part and passage from it.
  const draftPlaces = useMemo(
    () => new Map<string, DraftPlace>(ai.paper.questions.map((question) => [question.id, { part: question.partId, group: question.groupId ?? null }])),
    [ai.paper]
  )
  const { attachSheet } = ai
  const { saveNow, reloadFromServer } = examDoc
  const freeEditor = examDoc.mode === 'FREE' ? editor : null
  useEffect(() => {
    attachSheet({
      save: saveNow,
      clear: () => {
        if (!freeEditor || freeEditor.isDestroyed) return
        numberOnSheet.current = false
        clearExam(freeEditor)
        setSheetCleared((count) => count + 1)
        // Saved at once: a reload before the usual pause would read the old exam back and add the new one under it.
        void saveNow()
      },
      reload: reloadFromServer,
    })
    return () => attachSheet(null)
  }, [attachSheet, saveNow, reloadFromServer, freeEditor])

  // Draft questions the document has not received yet (the AI is writing, or the document was closed during a run)
  // are written under their own part. The teacher's caret stays where it is and Ctrl+Z does not take them back out;
  // the document remembers which items it received, so one the teacher deleted is not written again.
  useEffect(() => {
    if (!editor || examDoc.loading || ai.draftLoading) return
    const delivered = deliveredItems(editor.state)
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
    }
    if (numberOnSheet.current) renumber(tr, draftPlaces)
    // Each question's "Câu n." line marks it as written (see ExamTags): no doc attribute changes, which would draw the
    // whole sheet again for every question that lands.
    editor.view.dispatch(tr.setMeta('addToHistory', false))
    // A clear of the sheet also takes off questions of the new run that landed before it: they are written again.
  }, [ai.paper, ai.draftLoading, examDoc.loading, editor, sheetCleared, draftPlaces])

  const sheetScroller = useRef<HTMLElement>(null)
  // Ctrl + wheel or a pinch over the sheet zooms the paper, not the page.
  useWheelZoom(sheetScroller, zoom, setZoom)

  // A compose run that ends leaves the answer key after the exam: the answer table and the solution guide, written
  // once every question it added is on the sheet. The teacher's later edits to the key stay until they ask for a new
  // one ("Cập nhật đáp án"). Only a run the server took counts: a refused send changed nothing, so its key stays. A
  // revise run only updates a key the exam already has (as each rewritten question arrives, below).
  const keyWrittenFor = useRef(ai.examRunsEnded)
  const solutionStyle = ai.settings.solutionStyle
  useEffect(() => {
    if (keyWrittenFor.current === ai.examRunsEnded) return
    if (ai.running || !editor || examDoc.loading || ai.draftLoading || examDoc.mode !== 'FREE') return
    const delivered = deliveredItems(editor.state)
    if (delivered && ai.paper.questions.some((question) => !delivered.has(question.id))) return
    keyWrittenFor.current = ai.examRunsEnded
    replaceAnswerKey(editor, ai.paper, solutionStyle)
  }, [ai.examRunsEnded, ai.paper, ai.running, ai.draftLoading, examDoc.loading, examDoc.mode, editor, solutionStyle])

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
    const parts = keyParts(editor.state.doc)
    if ((parts.table || parts.guide) && replaceAnswerKey(editor, ai.paper, solutionStyle, parts)) addRunStep('Cập nhật đáp án')
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

  // The assistant took questions off the exam or moved them: the sheet changes the same way (once each), and an exam
  // with an answer key gets it written again for the new numbers.
  const madeEdits = useRef(new Set<string>())
  const { sheetEdits, activeId } = ai
  useEffect(() => {
    if (!editor || examDoc.loading || examDoc.mode !== 'FREE') return
    const pending = sheetEdits.filter((edit) => edit.conversationId === activeId && !madeEdits.current.has(edit.editId))
    if (pending.length === 0) return
    let changed = false
    for (const edit of pending) {
      madeEdits.current.add(edit.editId)
      changed = applySheetEdit(editor, edit, draftPlaces) || changed
    }
    if (changed) rewriteKey()
  }, [sheetEdits, activeId, draftPlaces, examDoc.loading, examDoc.mode, editor]) // eslint-disable-line react-hooks/exhaustive-deps

  /** An exam that has an answer key gets it written again from the sheet as it is now. */
  function rewriteKey() {
    if (!editor) return
    const parts = keyParts(editor.state.doc)
    if ((parts.table || parts.guide) && replaceAnswerKey(editor, ai.paper, solutionStyle, parts)) addRunStep('Cập nhật đáp án')
  }

  // An assistant run that ended changed the exam there is: an exam with an answer key gets it written again once the
  // questions it added are on the sheet; one without a key gets none.
  const keyRewrittenFor = useRef(ai.agentRunsEnded)
  useEffect(() => {
    if (keyRewrittenFor.current === ai.agentRunsEnded) return
    if (ai.running || !editor || examDoc.loading || ai.draftLoading || examDoc.mode !== 'FREE') return
    const delivered = deliveredItems(editor.state)
    if (delivered && ai.paper.questions.some((question) => !delivered.has(question.id))) return
    keyRewrittenFor.current = ai.agentRunsEnded
    rewriteKey()
  }, [ai.agentRunsEnded, ai.paper, ai.running, ai.draftLoading, examDoc.loading, examDoc.mode, editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // What the teacher asked the assistant to do to the answer key, done once the run's questions are on the sheet: it is
  // written as "Cập nhật đáp án" writes it (solutions asked for, "lời giải đầy đủ", stay the exam's from then on), or
  // its solutions or the whole of it come off.
  const keyAskedFor = useRef(ai.answerKeyRequest?.seq ?? 0)
  useEffect(() => {
    const request = ai.answerKeyRequest
    if (!request || keyAskedFor.current === request.seq) return
    if (ai.running || !editor || examDoc.loading || ai.draftLoading) return
    const delivered = deliveredItems(editor.state)
    if (delivered && ai.paper.questions.some((question) => !delivered.has(question.id))) return
    keyAskedFor.current = request.seq
    const { ask } = request
    if (ask.action === 'remove') {
      removeAnswerKey(editor, ask.part)
      return
    }
    const style = ask.solutions ?? solutionStyle
    if (style !== solutionStyle) ai.setSettings((previous) => ({ ...previous, solutionStyle: style }))
    writeAnswerKey(style, { table: true, guide: ask.guide !== false })
  }, [ai.answerKeyRequest, ai.paper, ai.running, ai.draftLoading, examDoc.loading, editor]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const docContext = useMemo<ExamDocContextValue>(
    () => ({
      editor,
      mode: examDoc.mode,
      setMode: examDoc.setMode,
      saveState: examDoc.saveState,
      saveError: examDoc.saveError,
      loading: examDoc.loading,
      zoom,
      setZoom,
      showRuler,
      setShowRuler,
      openFormula: (kind) => setFormula({ pos: null, initial: kind === 'chem' ? { latex: '\\ce{}', display: false } : null }),
      pages,
    }),
    [
      editor,
      examDoc.mode,
      examDoc.setMode,
      examDoc.saveState,
      examDoc.saveError,
      examDoc.loading,
      zoom,
      showRuler,
      pages,
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

  // The question bank's side of the exam: what is saved there, and what the viewer may save. Looked up again when the
  // draft's questions change, but not for each question a run adds (once the run ends). Writing into the bank is
  // authoring work: a teacher only teaches, so for one (or before the active role is known) nothing is looked up.
  const quizAccess = useQuizAccess()
  const bankAllowed = quizAccess.role === 'STAFF' || quizAccess.role === 'MANAGER' || quizAccess.role === 'ADMINISTRATOR'
  const writtenQuestions = useMemo(() => ai.paper.questions.filter((question) => !question.failure), [ai.paper])
  const bankKey = ai.running ? 'running' : ai.paper.questions.map((question) => question.id).join(',')
  // Looked up once the draft is in, so opening an exam asks once (not for the empty draft, then again for its questions).
  const bank = useDraftBank(ai.draftLoading ? null : (ai.activeId ?? null), bankKey, bankAllowed)
  const [pendingReplace, setPendingReplace] = useState<{ total: number; kept: number } | null>(null)
  // The chat on assistant-ui: its thread and composer read the conversation the hook keeps, and its sends come here.
  // The runtime is made by AssistantChatProvider (it follows the run on its own); the page reaches its composer here.
  const chatRuntime = useRef<AssistantRuntime | null>(null)
  const composerOf = () => chatRuntime.current?.thread.composer ?? null
  const [bankDialog, setBankDialog] = useState(false)
  const [quizDialog, setQuizDialog] = useState(false)
  const canSaveToBank = bank.ready && writtenQuestions.some((question) => bank.authorable(question.id))
  const keptWritten = writtenQuestions.filter((question) => question.kept).length
  const { save: saveToBank } = bank

  const saveOneToBank = useCallback(
    async (id: string) => {
      const label = `Câu ${numberOf.get(id) ?? '?'}`
      try {
        const [result] = await saveToBank([id])
        if (result?.result === 'SKIPPED') showErrorToast(`${label}: ${result.reason ?? 'chưa lưu được'}`)
        else if (result) showSuccessToast(`Đã lưu ${label.toLowerCase()} vào ngân hàng`)
      } catch (error) {
        showErrorToast(getErrorMessage(error))
      }
    },
    [numberOf, saveToBank]
  )

  /** The finished exam from the chat: a Word file, or a PDF of the A4 sheets (which only the free document is on). */
  function downloadExam(format: ExamDownload) {
    if (format === 'docx-exam') {
      if (editor) void downloadExamOnlyDocx(editor)
      return
    }
    if (format === 'pdf' || format === 'pdf-exam') {
      if (examDoc.mode !== 'FREE') showErrorToast('Tải PDF chỉ có ở chế độ Văn bản tự do')
      else if (editor) void downloadPdf(editor, { examOnly: format === 'pdf-exam' })
      return
    }
    if (editor) void downloadDocument(editor, 'docx')
  }

  /**
   * Sends the composer's words; resolves false when they do not go, and the composer gets them back. "Sửa câu 2 …" in
   * compose mode rewrites those questions: each number is the one the sheet prints (or the question cards show), looked
   * up to its draft question before anything is sent. `replacing`: the teacher already agreed to replace the exam.
   */
  function sendMessage(
    text: string,
    replacing = false,
    attachments: AiAttachment[] = [],
    after?: string | null
  ): Promise<boolean> {
    const onSheet = examDoc.mode === 'FREE' && editor ? editor : null
    // A question about the exam reads the sheet the teacher sees.
    if (ai.mode === 'ask') {
      return ai.send(text, {
        ...(onSheet ? { document: sheetDocument(onSheet.state.doc) } : {}),
        attachments,
        ...(after !== undefined ? { after } : {}),
      })
    }
    // "Sửa câu 2 …" revises in compose and mock-exam alike, once there is an exam to revise.
    const hasQuestions = ai.paper.questions.length > 0 || (onSheet ? sheetQuestions(onSheet.state.doc).length > 0 : false)
    const numbers = ai.mode === 'compose' || hasQuestions ? revisedNumbers(text) : null
    if (!numbers) {
      const total = Math.max(ai.paper.questions.length, onSheet ? sheetQuestions(onSheet.state.doc).length : 0)
      const sheet = onSheet ? examSheet(onSheet.state.doc, draftPlaces) : undefined
      // The assistant reads the exam and decides what the words ask for (add, remove, move, rewrite, or a new exam,
      // which it leaves for the teacher to agree to).
      // The sheet says whether the exam has questions; the draft keeps the ones the teacher took off the sheet.
      if (ai.mode === 'compose' && ai.composeAgent && (sheet ? sheet.questions.length : ai.paper.questions.length) > 0) {
        return ai.send(text, { compose: { ...(sheet ? { sheet } : {}), ...(replacing ? { confirmed: true } : {}) } })
      }
      // A new run replaces the exam, the questions kept and those typed on the sheet included: ask first.
      if (!replacing && total > 0) {
        setPendingReplace({ total, kept: ai.paper.questions.filter((question) => question.kept).length })
        return Promise.resolve(false)
      }
      return ai.send(text, replacing ? { compose: { confirmed: true } } : undefined)
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
      return Promise.resolve(false)
    }
    return ai.send(text, { revise: targets })
  }

  /** Words a send of the page's own (a retry, a subject chosen) did not get through go back to an empty composer. */
  function giveBack(text: string | null) {
    const composer = composerOf()
    if (composer && text && !composer.getState().text) composer.setText(text)
  }

  /** "Thay đề" in the question before a new run: the composer's words go, past the question. */
  function replaceExam() {
    setPendingReplace(null)
    const composer = composerOf()
    const text = composer?.getState().text ?? ''
    composer?.setText('')
    void sendMessage(text, true).then((sent) => giveBack(sent ? null : text))
  }

  /** "Nhờ AI sửa" on a selection: the exam's conversation (made now for a new exam) asks the AI for the new words. */
  async function rewriteSelection(request: { selection: string; context: string; instruction: string }) {
    const id = ai.activeId ?? (await ai.ensureConversation(ai.activeConversation?.title || 'Đề thi mới'))
    if (!id) throw new Error('Chưa mở được đề để nhờ trợ lý AI sửa.')
    return rewriteAiSelection(id, request)
  }

  /** The answer key written again from the questions the sheet holds now, in the chosen solution style. */
  function writeAnswerKey(style: AiSolutionStyle = solutionStyle, parts?: KeyParts) {
    setChatSheet(false)
    if (!editor || examDoc.mode !== 'FREE') {
      showErrorToast('Đáp án chỉ ghi được ở chế độ Văn bản tự do')
      return
    }
    replaceAnswerKey(editor, ai.paper, style, parts)
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
      if (pos !== null) scrollToPos(editor, pos)
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
    composerOf()?.setText('')
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
    composerOf()?.setText(prompt)
  }

  function toggleChat() {
    // The bar fits any width; the panel beside the paper is a sheet on a narrow screen.
    if (chatDock === 'bottom' || window.matchMedia('(min-width: 1024px)').matches) setChatOpen((open) => !open)
    else setChatSheet((open) => !open)
  }

  function dockBottom() {
    setChatDock('bottom')
    setChatSheet(false)
    setChatOpen(true)
  }

  function dockSide() {
    setChatDock('side')
    if (window.matchMedia('(min-width: 1024px)').matches) setChatOpen(true)
    else {
      setChatOpen(false)
      setChatSheet(true)
    }
  }

  function toggleOutline() {
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  /** The list of exams is the left panel (a sheet on a narrow screen). */
  function toggleTree() {
    setChatSheet(false)
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  const chatPanelProps = {
    messages: ai.messages,
    mode: ai.mode,
    pending: ai.running,
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
    onStop: ai.cancel,
    onStartNew: startNew,
    conversationsOpen: outlineOpen || outlineSheet,
    onOpenConversations: toggleTree,
    onPickPrompt: pickPrompt,
  }
  // What the turns of the thread do: the reply's own buttons, and the run its progress follows.
  function regenerate() {
    const last = ai.messages.at(-1)
    if (last?.role === 'assistant' && last.error && last.retryText) void ai.retry(last.id).then(giveBack)
    else ai.regenerate()
  }

  const chatActions: ChatActions = {
    onDownload: downloadExam,
    onAnswerKey: () => writeAnswerKey(),
    onRetry: (messageId) => void ai.retry(messageId).then(giveBack),
    onChooseSubject: (messageId, subjectName) => void ai.chooseSubject(messageId, subjectName).then(giveBack),
  }

  /** The left panel: every exam and loaded paper, grouped. */
  const renderTree = (chrome: {
    onCollapse?: () => void
    onClose?: () => void
    templates?: ReactNode
    outline?: ReactNode
    className: string
    style?: CSSProperties
  }) => (
    <WorkspaceTree
      conversations={ai.conversations}
      papers={bankPapers.papers}
      activeId={ai.activeId}
      activePaperId={viewingPaper?.id ?? null}
      loading={ai.conversationsLoading || bankPapers.loading}
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
      canImport={canImport}
      onRename={(id, title) => void ai.renameConversation(id, title)}
      onDelete={(id) => setPendingDelete(ai.conversations.find((item) => item.id === id) ?? null)}
      outlined={outlined}
      onOutlineChange={showOutline}
      {...chrome}
    />
  )
  const composeTemplates = examDoc.mode === 'FREE' ? <TemplateLibrary /> : undefined
  const composeOutline =
    examDoc.mode === 'FREE' ? (
      <EditorOutlineTree
        editor={editor}
        depth={2}
        onJump={(pos) => {
          setOutlineSheet(false)
          if (editor) scrollToPos(editor, pos)
        }}
      />
    ) : (
      <PaperOutlineTree paper={ai.paper} numberOf={numberOf} onJump={jumpToQuestion} depth={2} />
    )

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
          backLabel={backLabel}
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
      <AssistantChatProvider
        run={ai.runStore}
        runtimeRef={chatRuntime}
        conversationId={ai.activeId ?? null}
        messages={ai.messages}
        running={ai.running}
        loading={ai.draftLoading}
        sendBlocked={ai.mode === 'mock-exam' && !ai.settings.bankSourceId}
        onSend={(text, attachments) => sendMessage(text, false, attachments)}
        onAttach={ai.mode === 'ask' ? ai.uploadAttachment : undefined}
        onCancel={ai.cancel}
        onRegenerate={regenerate}
        examCard={!ai.composeAgent}
        allMessages={ai.allMessages}
        onShowBranch={ai.showBranch}
        onEdit={(text, after) => {
          // A question asked again in compose would replace the exam; only an ask question has versions.
          if (ai.mode !== 'ask') {
            ai.setNotice('Chỉ sửa được câu hỏi ở chế độ Hỏi đáp.')
            return Promise.resolve(false)
          }
          return sendMessage(text, false, [], after)
        }}
      >
      <ChatActionsProvider value={chatActions}>
      <ExamDocContext.Provider value={docContext}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <AiSelectionMenu
          editor={editor}
          enabled={editable}
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
          backLabel={backLabel}
          chatOpen={chatOpen || chatSheet}
          onToggleChat={toggleChat}
          outlineOpen={outlineOpen || outlineSheet}
          onToggleOutline={toggleOutline}
          onNew={startNew}
          actions={
            <>
              {canSaveToBank && (
                <Button
                  appearance="ghost"
                  size="sm"
                  onClick={() => setBankDialog(true)}
                  aria-label="Lưu vào ngân hàng"
                  title="Lưu vào ngân hàng"
                >
                  <Landmark size={15} />
                  <span className="hidden lg:inline">Lưu vào ngân hàng</span>
                </Button>
              )}
              {canImport && (
                <Button appearance="ghost" size="sm" onClick={() => setImporting(true)} aria-label="Nạp đề" title="Nạp đề">
                  <FileText size={15} />
                  <span className="hidden lg:inline">Nạp đề</span>
                </Button>
              )}
              {ai.activeId && (
                <PublishMenu
                  onQuiz={quizAccess.canWrite && keptWritten > 0 ? () => setQuizDialog(true) : undefined}
                  onPublished={(as) => {
                    if (ai.activeId) void ai.markPublished(ai.activeId, as)
                  }}
                />
              )}
            </>
          }
        />

        <div ref={row} className="flex min-h-0 min-w-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-2 pb-1.5 sm:px-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><DocToolbar /></div>
                <Button size="sm" appearance="outline" disabled={!editable || proofread.running} onClick={() => void proofread.start()}>
                  <Sparkles size={15} aria-hidden />
                  AI soát đề
                </Button>
              </div>
              <AiSuggestionBar editor={editor} proofread={proofread} />
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1">
              <ShowExamListButton listOpen={outlineOpen} onClick={toggleOutline} />
              {outlineOpen && (
                <>
                  {renderTree({
                    onCollapse: () => setOutlineOpen(false),
                    templates: composeTemplates,
                    outline: composeOutline,
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

              <div className="relative flex min-h-0 min-w-0 flex-1">
                <main
                  ref={sheetScroller}
                  className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background-gray-secondary [scrollbar-gutter:stable]"
                >
                  {examDoc.mode === 'FREE' ? (
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
                        {examDoc.conflict && (
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
                        bank={bankAllowed ? {
                          saved: (id) => Boolean(bank.savedQuestionId(id)),
                          canSave: bank.canSave,
                          saving: bank.isSaving,
                          onSave: (id) => void saveOneToBank(id),
                        } : undefined}
                      />
                    )}
                  </div>
                  )}
                  <SheetWriting
                    editor={editor}
                    run={ai.runStore}
                    scroller={sheetScroller}
                    following={ai.running && examDoc.mode === 'FREE'}
                    raised={chatBar}
                  />
                </main>
                {chatBar && (
                  <ChatBar
                    {...chatPanelProps}
                    run={ai.runStore}
                    onDockSide={dockSide}
                    onHide={() => setChatOpen(false)}
                  />
                )}
              </div>
            </div>
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
              <ChatPanel
                {...chatPanelProps}
                card
                onCollapse={() => setChatOpen(false)}
                onDockBottom={dockBottom}
                style={{ width: widths.chat }}
                className="hidden shrink-0 lg:flex"
              />
            </>
          )}
        </div>

        {importDialog}

        {bankDialog && bankAllowed && (
          <SaveToBankDialog
            questions={writtenQuestions}
            numberOf={numberOf}
            bank={bank}
            onClose={() => setBankDialog(false)}
          />
        )}

        {quizDialog && ai.activeId && (
          <ExportQuizDialog
            conversationId={ai.activeId}
            title={ai.activeConversation?.title ?? ''}
            questionCount={keptWritten}
            reviewCount={writtenQuestions.filter((question) => question.kept && question.needsReview).length}
            numberOf={numberOf}
            role={quizAccess.role}
            onClose={() => setQuizDialog(false)}
            onExported={(as) => {
              if (ai.activeId) void ai.markPublished(ai.activeId, as)
            }}
          />
        )}

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
              onDockBottom={dockBottom}
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
            <SheetTitle className="sr-only">Đề của tôi</SheetTitle>
            {renderTree({
              onClose: () => setOutlineSheet(false),
              templates: composeTemplates,
              outline: composeOutline,
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

        {pendingReplace && (
          <ConfirmDialog
            title="Soạn đề mới thay đề hiện tại?"
            description={`${pendingReplace.total} câu hiện có sẽ bị thay, kể cả ${pendingReplace.kept} câu đã giữ. Muốn sửa một câu, nhắn "Sửa câu 2 …".`}
            cancelLabel="Huỷ"
            confirmLabel="Thay đề"
            variant="danger"
            onCancel={() => setPendingReplace(null)}
            onConfirm={replaceExam}
          />
        )}

        {ai.confirmRequest?.action === 'compose' && (
          <ConfirmDialog
            title="Soạn đề mới thay đề hiện tại?"
            description={`${ai.confirmRequest.total} câu hiện có sẽ bị thay, kể cả ${ai.paper.questions.filter((question) => question.kept).length} câu đã giữ.`}
            cancelLabel="Giữ đề"
            confirmLabel="Thay đề"
            variant="danger"
            onCancel={ai.dismissConfirm}
            onConfirm={() => {
              const content = ai.confirmRequest?.action === 'compose' ? ai.confirmRequest.content : ''
              ai.dismissConfirm()
              if (content) void sendMessage(content, true)
            }}
          />
        )}

        {ai.confirmRequest?.action === 'remove' && (
          <ConfirmDialog
            title={`Bỏ ${ai.confirmRequest.numbers.length} câu khỏi đề?`}
            description={`Câu ${ai.confirmRequest.numbers.join(', ')} sẽ bị bỏ, các câu sau được đánh số lại.`}
            cancelLabel="Giữ nguyên"
            confirmLabel="Bỏ câu"
            variant="danger"
            onCancel={ai.dismissConfirm}
            onConfirm={() => {
              const request = ai.confirmRequest
              ai.dismissConfirm()
              if (request?.action === 'remove' && editor && examDoc.mode === 'FREE' && applySheetEdit(editor, request, draftPlaces)) rewriteKey()
            }}
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
      </ChatActionsProvider>
      </AssistantChatProvider>
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
