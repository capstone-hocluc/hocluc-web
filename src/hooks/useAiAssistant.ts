import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AiAttachment,
  AiStreamUnavailable,
  addAiDraftItem,
  cancelAiRun,
  createAiConversation,
  deleteAiConversation,
  followAiConversation,
  getAiConversations,
  getAiDraft,
  getAiMessages,
  publishAiConversation,
  removeAiDraftItem,
  renameAiConversation,
  reorderAiDraftItems,
  sendAiMessage,
  uploadAiAttachment,
  setAiDraftItemKept,
  updateAiDraftQuestion,
  type AiAssistantMode,
  type AiConversation,
  type AiDraftItem,
  type AiDraftQuestion,
  type AiDraftResponse,
  type AiExamFormat,
  type AiMessage,
  type AiPublishedAs,
  type AiRevisedItem,
  type AiConfirmRequest,
  type AiPaperImport,
  type AiExamSheet,
  type AiSendConfig,
  type AiSheetDocument,
  type AiSheetEdit,
  type AiSolutionStyle,
  type AiStreamEvent,
  type AiAnswerKeyAsk,
} from '../services/aiAssistantService'
import { ApiError } from '../lib/api'
import type { BankSource } from '../services/questionBankService'
import type { SelectOption } from '../components/console/select-field'
import {
  buildPaper,
  emptyManualQuestion,
  EXAM_FORMATS,
  questionNumbers,
  traceLines,
  type AiChatMessage,
  type AiTraceStage,
} from '../components/management/ai-assistant/exam-format'
import { addRunItem, finishBefore, initialStages, markAllDone, replaySteps, stepStages, stepTime, toolLine, withStage } from './ai-run-stages'
import {
  liveDraftView,
  type LiveDraft,
  type LiveDraftView,
} from '../components/management/exam-doc/live-draft'
import { createValueStore, useStoreValue, type ValueStore } from '../lib/value-store'
import { readSessionCache, writeSessionCache } from '../lib/session-cache'

const CONVERSATIONS_CACHE = 'ai-assistant.conversations'
import { revisedNumbers } from '../components/management/ai-assistant/revise-request'

/**
 * Compose settings. No subject and no difficulty: the request names them ("10 câu Toán mức khó"), and one naming no
 * subject is for the whole format.
 */
export interface AiComposeSettings {
  examFormat: AiExamFormat
  questionCount: number | 'full'
  bankRatio: number
  bankSourceId: string
  /** How much of a solution each question carries, and the answer guide after the exam shows. */
  solutionStyle: AiSolutionStyle
}

const DEFAULT_SETTINGS: AiComposeSettings = {
  examFormat: 'VACT_2025',
  questionCount: 5,
  bankRatio: 0.2,
  bankSourceId: '',
  solutionStyle: 'full',
}

const AUDIO_MODES: readonly AiAssistantMode[] = ['ask', 'compose', 'mock-exam', 'revise']

/** A question only the sheet holds ("Sửa câu 5" on a typed question), as the AI rewrote it. */
export interface SheetRewrite {
  seq: number
  number: number
  question: AiDraftQuestion
}

/**
 * What a compose request carries besides its words: the exam on the sheet (for the assistant that changes it) and
 * whether the teacher agreed to replace that exam with a new one.
 */
export interface ComposeExtra {
  sheet?: AiExamSheet
  confirmed?: boolean
  /**
   * The words are the request the assistant proposed, sent for the teacher once they agreed: its reply already said
   * them, so the chat keeps them out of sight. Never set for the teacher's own words.
   */
  agreed?: boolean
  /** The paper a mock exam follows, as the assistant proposed it; the settings' paper otherwise. */
  bankSourceId?: string
}

/** The unit the AI is writing, with its words read once into questions and options (the sheet and the chat show them). */
export type LiveWriting = LiveDraft & { view: LiveDraftView }

export interface AiRun {
  mode: AiAssistantMode
  messageId: string | null
  jobId: string | null
  stages: AiTraceStage[]
  trace: string[]
  itemIds: string[]
  knownAssistantIds: string[]
  /** The unit the AI is writing right now, as far as its words have come. */
  draft: LiveWriting | null
  /** The words of an ask answer being written, until the answer itself arrives. */
  answer?: string
  /** The assistant changes the exam there is (it may still write new questions through the compose stages). */
  agent?: boolean
}

/**
 * The run going on, if any. It changes with every word the AI writes, so it lives outside React state: read it with
 * {@link useStoreValue} and one of the selectors below, and only that component re-renders.
 */
export type AiRunStore = ValueStore<AiRun | null>

const NO_STAGES: AiTraceStage[] = []
const NO_TRACE: string[] = []
export const runStagesOf = (run: AiRun | null) => run?.stages ?? NO_STAGES
export const runTraceOf = (run: AiRun | null) => run?.trace ?? NO_TRACE
export const runWritingOf = (run: AiRun | null) => run?.draft ?? null
export const runAnswerOf = (run: AiRun | null) => run?.answer ?? ''
/** The question the run added last, for following the writing on the sheet. */
export const runLastItemOf = (run: AiRun | null) => run?.itemIds.at(-1) ?? null
const runGoingOn = (run: AiRun | null) => run !== null

/** The question "Bạn muốn soạn môn nào?", answered by a send (its subjects no longer offered) or asked again. */
const answerSubjects = (message: AiChatMessage, answered: boolean): AiChatMessage =>
  message.subjectChoices ? { ...message, subjectChoices: { ...message.subjectChoices, answered } } : message

interface StreamHandle {
  controller: AbortController
  conversationId: string
  syncing: boolean
  opened: boolean
  /** The connection never opened, so any event that arrives later belongs to an older run. */
  dead: boolean
  syncResolve: (() => void) | null
  quietTimer: number | null
  hardTimer: number | null
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
}

/** The code of the backend's refusal of a compose request that names no subject. */
const SUBJECT_REQUIRED = 'AI_COMPOSE_SUBJECT_REQUIRED'

function subjectsOf(data: unknown): { id: string; name: string }[] {
  const list = (data as { subjects?: unknown } | null)?.subjects
  if (!Array.isArray(list)) return []
  return list.filter(
    (entry): entry is { id: string; name: string } =>
      typeof entry?.id === 'string' && typeof entry?.name === 'string' && entry.name.trim() !== ''
  )
}

/** Whether the teacher can teach every subject of the exam format, so the whole paper is a choice. */
function wholeOf(data: unknown): boolean {
  return (data as { whole?: unknown } | null)?.whole === true
}

/** The compose settings a stored request config tells; what it does not tell stays as it was. */
function settingsFromConfig(config: Record<string, unknown> | null | undefined, previous: AiComposeSettings): AiComposeSettings {
  if (!config || typeof config !== 'object') return previous
  const next = { ...previous }
  if (EXAM_FORMATS.some((format) => format.id === config.examFormat)) next.examFormat = config.examFormat as AiExamFormat
  if (config.questionCount === 'full' || (typeof config.questionCount === 'number' && config.questionCount > 0)) {
    next.questionCount = config.questionCount as number | 'full'
  }
  if (typeof config.bankRatio === 'number' && config.bankRatio >= 0 && config.bankRatio <= 1) next.bankRatio = config.bankRatio
  if (config.solutionStyle === 'full' || config.solutionStyle === 'short') next.solutionStyle = config.solutionStyle
  if (typeof config.bankSourceId === 'string') next.bankSourceId = config.bankSourceId
  return next
}

/** The conversation the address names (?c=<id>), read once when the page opens. */
function conversationInAddress(): string | null {
  return new URLSearchParams(window.location.search).get('c')
}

/** Writes the open conversation into the address without a new history entry, so a reload opens it again. */
function showConversationInAddress(id: string | null) {
  const url = new URL(window.location.href)
  if ((url.searchParams.get('c') ?? null) === id) return
  if (id) url.searchParams.set('c', id)
  else url.searchParams.delete('c')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function normalizeMode(value: string | null | undefined): AiAssistantMode | undefined {
  return AUDIO_MODES.includes(value as AiAssistantMode) ? (value as AiAssistantMode) : undefined
}

function titleFromText(text: string) {
  const line = text.trim().split('\n')[0]?.trim() ?? ''
  if (!line) return 'Cuộc trò chuyện mới'
  return line.length > 60 ? `${line.slice(0, 59)}…` : line
}

/** A reply's run, rebuilt from the steps the server kept with it: its stages, timed as they happened. */
function stepsOf(message: AiMessage): Pick<AiChatMessage, 'stages'> {
  const mode = normalizeMode(message.mode)
  const stages = mode ? replaySteps(message.steps, mode, Date.parse(message.createdAt)) : undefined
  return stages ? { stages } : {}
}

function mapMessage(message: AiMessage): AiChatMessage {
  return {
    id: message.id,
    parentId: message.parentId ?? null,
    role: message.role === 'USER' ? 'user' : 'assistant',
    body: message.content ?? '',
    createdAt: message.createdAt,
    mode: normalizeMode(message.mode),
    trace: traceLines(message.trace),
    ...stepsOf(message),
    ...(message.suggestions ? { suggestions: message.suggestions } : {}),
    ...(message.attachments?.length ? { attachments: message.attachments } : {}),
    ...(message.files?.length ? { files: message.files } : {}),
    ...(message.agreed ? { agreed: true } : {}),
  }
}

/** Messages only this page holds: the teacher's words while sending, a refused request's question, a run's summary. */
const LOCAL_ID = /^(local|subject|error|summary)-/

/**
 * The server's messages with what the page showed that the server does not hold. A refused request (the question
 * "Bạn muốn soạn môn nào?" and the words above it) is never stored, and a finished run's card is built here; a reload
 * of the thread keeps them where they were, after the message they followed.
 */
/**
 * The message each one follows: its parent, or, for a message older than versions, the one written before it.
 * Takes the conversation in the order its messages were written.
 */
export function parentsOf(all: readonly AiChatMessage[]): Map<string, string | null> {
  const parents = new Map<string, string | null>()
  let before: string | null = null
  for (const message of all) {
    parents.set(message.id, message.parentId ?? before)
    before = message.id
  }
  return parents
}

/** The branch of the conversation down to `head` (the newest message by default), from its first message. */
function branchOf(all: readonly AiChatMessage[], head: string | null = all.at(-1)?.id ?? null): AiChatMessage[] {
  const byId = new Map(all.map((message) => [message.id, message]))
  const parents = parentsOf(all)
  const path: AiChatMessage[] = []
  const seen = new Set<string>()
  for (let id = head; id && byId.has(id) && !seen.has(id); id = parents.get(id) ?? null) {
    seen.add(id)
    path.push(byId.get(id) as AiChatMessage)
  }
  return path.reverse()
}

function mergeServerMessages(server: AiChatMessage[], previous: AiChatMessage[]): AiChatMessage[] {
  const previousById = new Map(previous.map((message) => [message.id, message]))
  const merged = server.map((message) => {
    const shown = previousById.get(message.id)
    if (!shown) return message
    const { stages, addedItemIds, stopped } = shown
    return { ...message, ...(stages ? { stages } : {}), ...(addedItemIds ? { addedItemIds } : {}), ...(stopped ? { stopped } : {}) }
  })
  const onServer = new Set(server.map((message) => message.id))
  let anchor = -1
  const placed = new Map<number, AiChatMessage[]>()
  for (const message of previous) {
    if (onServer.has(message.id)) {
      anchor = merged.findIndex((entry) => entry.id === message.id)
    } else if (LOCAL_ID.test(message.id)) {
      const list = placed.get(anchor) ?? []
      list.push(message)
      placed.set(anchor, list)
    }
  }
  if (placed.size === 0) return merged
  const result: AiChatMessage[] = [...(placed.get(-1) ?? [])]
  merged.forEach((message, index) => {
    result.push(message, ...(placed.get(index) ?? []))
  })
  return result
}

function mapStreamItem(event: Extract<AiStreamEvent, { type: 'item' }>['data']): AiDraftItem {
  return {
    id: event.itemId,
    sectionCode: event.section,
    groupKey: event.group ?? null,
    position: event.position ?? 0,
    question: event.question,
    source: event.source,
    kept: event.source === 'MANUAL',
    checkResult: event.check ?? null,
  }
}

function endSummary(event: Extract<AiStreamEvent, { type: 'end' }>['data'], itemCount: number) {
  const written = event.written ?? itemCount
  if (event.status === 'CANCELLED') {
    return written > 0 ? `Đã dừng. ${written} câu đã soạn.` : 'Đã dừng.'
  }
  const parts = [`Đã soạn xong ${written} câu`]
  if (event.reused) parts.push(`dùng lại ${event.reused} câu từ ngân hàng`)
  if (event.needsReview) parts.push(`${event.needsReview} câu cần duyệt`)
  return `${parts.join(', ')}.`
}

/** The papers loaded into the bank, as the workspace's list holds them: one request serves the list and the composer. */
export interface BankPaperList {
  papers: BankSource[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const NO_BANK_PAPERS: BankPaperList = { papers: [], loading: false, error: null, refresh: () => undefined }

interface QuizConversationScope {
  quizId: string
  readSheet: () => AiExamSheet
}

/** The open exam's sheet, as the page lends it to the runs that replace its exam. */
export interface ExamSheet {
  /** Saves what waits to be saved, so the server keeps the exam a new run replaces as the teacher sees it. */
  save: () => Promise<void>
  /** Takes the replaced exam off the sheet, once the server took the run that writes the new one. */
  clear: () => void
  /** Reads the sheet again: the server put back the exam a stopped run replaced. */
  reload: () => Promise<void>
  /** The exam as the sheet prints it now, for the assistant to read; null while there is no sheet to read. */
  read: () => AiExamSheet | null
}

/** How long a run's send waits for the sheet to be saved, or a stopped run for the sheet put back. */
const SHEET_WAIT_MS = 10_000

function atMost(promise: Promise<void>, ms: number) {
  return Promise.race([promise, new Promise<void>((resolve) => window.setTimeout(resolve, ms))])
}

/**
 * The AI assistant page: conversations, the live stream of a run, and the draft it writes into. `onPaperImport` loads a
 * paper the teacher asked the assistant to load; left out where the viewer may not load papers.
 */
export function useAiAssistant(
  bank: BankPaperList = NO_BANK_PAPERS,
  onPaperImport?: (conversationId: string, paper: AiPaperImport) => void,
  scope?: QuizConversationScope,
) {
  const quizId = scope?.quizId
  const readQuizSheet = scope?.readSheet
  const sheetRef = useRef<ExamSheet | null>(null)
  const attachSheet = useCallback((sheet: ExamSheet | null) => {
    sheetRef.current = sheet
  }, [])
  // What the page does with a paper the teacher asked the assistant to load: it loads it at once, nothing to agree to.
  const paperImportRef = useRef(onPaperImport ?? null)
  useEffect(() => {
    paperImportRef.current = onPaperImport ?? null
  })
  // After a reload the list this tab showed last is shown at once, while it is asked for again.
  const [cachedConversations] = useState(() => quizId ? null : readSessionCache<AiConversation[]>(CONVERSATIONS_CACHE))
  const [conversations, setConversations] = useState<AiConversation[]>(cachedConversations ?? [])
  const [conversationsLoading, setConversationsLoading] = useState(cachedConversations === null)
  const [conversationsError, setConversationsError] = useState(false)
  /** The server's list has come in at least once (until then the list shown may be this tab's copy, or nothing). */
  const [listed, setListed] = useState(false)
  const listedRef = useRef(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [draft, setDraft] = useState<AiDraftResponse | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [mode, setMode] = useState<AiAssistantMode>('compose')
  // Whether the assistant takes every message, as the server says with an exam's draft. It is the same for every exam,
  // so once known it holds for a new exam too.
  const [assistantOn, setAssistantOn] = useState(false)
  const assistantOnRef = useRef(false)
  const [runStore] = useState<AiRunStore>(() => createValueStore<AiRun | null>(null))
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  // Counts the exam runs (compose, mock exam) the server took that have ended on the open exam, its draft read again.
  const [examRunsEnded, setExamRunsEnded] = useState(0)
  // The assistant's runs that ended: they changed an exam, so only a key it already has is written again.
  const [agentRunsEnded, setAgentRunsEnded] = useState(0)
  const [saving, setSaving] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [settings, setSettings] = useState<AiComposeSettings>(DEFAULT_SETTINGS)
  /** The settings on screen, readable between renders. */
  const settingsRef = useRef<AiComposeSettings>(DEFAULT_SETTINGS)
  /** What the teacher last chose in the settings panel; a new exam starts from it, never from another exam's request. */
  const preferredSettingsRef = useRef<AiComposeSettings>(DEFAULT_SETTINGS)
  /** The papers a mock exam can be built on: those the bank has finished reading. */
  const papers = useMemo<SelectOption[]>(
    () =>
      bank.papers
        .filter((source) => source.status === 'DONE')
        .map((source) => ({ id: source.id, label: source.year ? `${source.title} · ${source.year}` : source.title })),
    [bank.papers]
  )
  const papersLoading = bank.loading
  const papersError = bank.error ?? (!bank.loading && papers.length === 0 ? 'Ngân hàng chưa có đề đã đọc xong.' : null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  /** The conversation this page created last for a new exam (its document takes over what the exam held). */
  const [createdConversationId, setCreatedConversationId] = useState<string | null>(null)

  const activeIdRef = useRef<string | null>(null)
  const creationRef = useRef<{ generation: number; promise: Promise<string | null> } | null>(null)
  /** Bumped whenever the teacher opens another exam or a new one; a creation from before is then not adopted. */
  const generationRef = useRef(0)
  const conversationsRef = useRef<AiConversation[]>(cachedConversations ?? [])
  const messagesRef = useRef<AiChatMessage[]>([])
  /** Every message of the open conversation the server holds, in every branch; `messages` is the one shown. */
  const [allMessages, setAllMessages] = useState<AiChatMessage[]>([])
  const draftRef = useRef<AiDraftResponse | null>(null)
  const runRef = useRef<AiRun | null>(null)
  const sendingRef = useRef(false)
  const streamRef = useRef<StreamHandle | null>(null)
  const cursorsRef = useRef(new Map<string, string>())
  const runTimerRef = useRef<number | null>(null)
  const cancelTimerRef = useRef<number | null>(null)
  const autoSelectRef = useRef(true)
  const cancelRequestedRef = useRef(false)
  const addressConversationRef = useRef<string | null>(quizId ? null : conversationInAddress())
  /** An exam opened before the list arrived: its mode comes from the list, unless the teacher picks one first. */
  const modeFromListRef = useRef<string | null>(null)
  /** Questions streamed in since the last paint; they reach the draft (and the document) together. */
  const pendingItemsRef = useRef<AiDraftItem[]>([])
  const itemFlushRef = useRef<number | null>(null)
  /** Counts the questions the AI rewrote on this page (see `AiDraftItem.revision`). */
  const revisionRef = useRef(0)
  /** Questions only the sheet holds that the AI rewrote, in order; the page writes each once (by `seq`). */
  const [rewrites, setRewrites] = useState<SheetRewrite[]>([])
  /** The assistant's changes to the exam's order, in order; the page makes each once on the sheet (by `editId`). */
  const [sheetEdits, setSheetEdits] = useState<Array<AiSheetEdit & { conversationId: string }>>([])
  /** A change the assistant left for the teacher to agree to, on the exam it is for. */
  const [confirmRequest, setConfirmRequest] = useState<{ conversationId: string; request: AiConfirmRequest } | null>(null)
  // What the teacher asked the assistant to do to the answer key, done once the run's questions are in; `seq` tells
  // each request from the last.
  const [answerKeyRequest, setAnswerKeyRequest] = useState<{
    conversationId: string
    seq: number
    ask: AiAnswerKeyAsk
  } | null>(null)

  /** The mode the teacher picks; an exam opened before the list arrived then keeps it. */
  const chooseMode = useCallback((next: AiAssistantMode) => {
    modeFromListRef.current = null
    setMode(next)
  }, [])

  const showSettings = useCallback((next: AiComposeSettings) => {
    settingsRef.current = next
    setSettings(next)
  }, [])

  /** A change the teacher makes in the settings panel: it is also what a new exam starts from. */
  const changeSettings = useCallback(
    (update: (previous: AiComposeSettings) => AiComposeSettings) => {
      const next = update(settingsRef.current)
      preferredSettingsRef.current = next
      showSettings(next)
    },
    [showSettings]
  )

  const updateConversations = useCallback((next: AiConversation[]) => {
    conversationsRef.current = next
    setConversations(next)
    if (!quizId) writeSessionCache(CONVERSATIONS_CACHE, next)
  }, [quizId])

  const updateMessages = useCallback((next: AiChatMessage[]) => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const updateDraft = useCallback((next: AiDraftResponse | null) => {
    draftRef.current = next
    setDraft(next)
    if (next?.composeAgent && !assistantOnRef.current) {
      assistantOnRef.current = true
      setAssistantOn(true)
    }
  }, [])

  const updateRun = useCallback((next: AiRun | null) => {
    runRef.current = next
    runStore.set(next)
  }, [runStore])

  /**
   * Puts the streamed questions waiting in the buffer into the draft in one update. A long exam streams a question every
   * few seconds, and a reload replays dozens at once; one paper rebuild and one document insert per batch keeps the page
   * responsive.
   */
  const flushItems = useCallback(() => {
    if (itemFlushRef.current !== null) {
      window.clearTimeout(itemFlushRef.current)
      itemFlushRef.current = null
    }
    const batch = pendingItemsRef.current
    pendingItemsRef.current = []
    const current = draftRef.current
    if (batch.length === 0 || !current) return
    const byId = new Map(current.items.map((entry) => [entry.id, entry]))
    for (const entry of batch) byId.set(entry.id, entry)
    updateDraft({ ...current, items: [...byId.values()] })
  }, [updateDraft])

  const clearRunTimer = useCallback(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }
    if (cancelTimerRef.current !== null) {
      window.clearTimeout(cancelTimerRef.current)
      cancelTimerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    // Questions still waiting for a paint belong to the run being left; they must not land in another exam.
    pendingItemsRef.current = []
    if (itemFlushRef.current !== null) {
      window.clearTimeout(itemFlushRef.current)
      itemFlushRef.current = null
    }
    const handle = streamRef.current
    if (!handle) return
    streamRef.current = null
    if (handle.quietTimer !== null) window.clearTimeout(handle.quietTimer)
    if (handle.hardTimer !== null) window.clearTimeout(handle.hardTimer)
    handle.syncResolve?.()
    handle.syncResolve = null
    handle.controller.abort()
  }, [])

  /**
   * Reads the conversation's messages again. `then` runs in the same update that shows them (or once they cannot be
   * read): an ended run's progress gives way to its reply there, so the thread never shows the turn without either.
   */
  const refreshMessages = useCallback(async (conversationId: string, then?: () => void) => {
    try {
      const server = (await getAiMessages(conversationId)).map(mapMessage)
      if (activeIdRef.current !== conversationId) return false
      setAllMessages(server)
      updateMessages(mergeServerMessages(branchOf(server), messagesRef.current))
      return true
    } catch {
      return false
    } finally {
      then?.()
    }
  }, [updateMessages])

  const refreshDraft = useCallback(async (conversationId: string) => {
    try {
      const next = await getAiDraft(conversationId)
      if (activeIdRef.current !== conversationId) return false
      updateDraft(next)
      return true
    } catch {
      return false
    }
  }, [updateDraft])

  /** An exam run the server took has ended and the exam's draft was read again: the answer key is due. */
  const examRunEnded = useCallback((conversationId: string, runMode: AiAssistantMode, agent = false) => {
    if (runMode === 'ask' || runMode === 'revise' || activeIdRef.current !== conversationId) return
    if (agent) setAgentRunsEnded((count) => count + 1)
    else setExamRunsEnded((count) => count + 1)
  }, [])

  const finishRun = useCallback(
    async (event: AiStreamEvent, conversationId: string) => {
      const finished = runRef.current
      flushItems()
      clearRunTimer()
      stopStream()
      setCancelling(false)
      setSending(false)
      sendingRef.current = false

      // The sheet is read again before the draft: it already holds the questions the draft gets back.
      // A stopped exam run gets back the exam it replaced from the stop itself; a failed one says so on its end.
      const examRun = finished !== null && finished.mode !== 'ask' && finished.mode !== 'revise'
      const stoppedRun = event.type === 'end' && event.data.status === 'CANCELLED'
      const restored = (event.type === 'end' || event.type === 'error') && event.data.restored === true
      if (examRun && (stoppedRun || restored) && activeIdRef.current === conversationId && sheetRef.current) {
        await atMost(sheetRef.current.reload(), SHEET_WAIT_MS)
      }

      if (event.type === 'error') {
        updateRun(null)
        if (finished && finished.mode !== 'ask') {
          await refreshDraft(conversationId)
          examRunEnded(conversationId, finished.mode, finished.agent)
        }
        return
      }
      if (event.type !== 'end') return

      const endEvent = event
      const stopped = endEvent.data.status === 'CANCELLED'
      if (!finished) {
        updateRun(null)
        return
      }
      // The run's progress stays in the thread until its reply is read, and leaves with it in one update.
      const endRun = () => updateRun(null)

      if (finished.mode === 'ask') {
        await refreshMessages(conversationId, endRun)
        return
      }

      const [messagesLoaded] = await Promise.all([
        refreshMessages(conversationId, endRun),
        refreshDraft(conversationId),
      ])
      examRunEnded(conversationId, finished.mode, finished.agent)
      const ask = endEvent.data.answerKey
      if (ask) setAnswerKeyRequest((previous) => ({ conversationId, seq: (previous?.seq ?? 0) + 1, ask }))
      if (!messagesLoaded || activeIdRef.current !== conversationId) return

      const known = new Set(finished.knownAssistantIds)
      const latest = [...messagesRef.current]
        .reverse()
        .find(
          (message) => message.role === 'assistant' && !message.error && !known.has(message.id)
        )
      if (latest) {
        updateMessages(
          messagesRef.current.map((message) =>
            message.id === latest.id
              ? { ...message, addedItemIds: finished.itemIds, stages: markAllDone(finished.stages, Date.now()), ...(stopped ? { stopped } : {}) }
              : message
          )
        )
        return
      }
      updateMessages([
        ...messagesRef.current,
        {
          id: `summary-${crypto.randomUUID()}`,
          role: 'assistant',
          // A stopped run says so in its card; the words would only repeat it.
          body: stopped
            ? ''
            : finished.mode === 'revise'
              ? `Đã sửa ${finished.itemIds.length} câu.`
              : endSummary(endEvent.data, finished.itemIds.length),
          createdAt: new Date().toISOString(),
          mode: finished.mode,
          stages: markAllDone(finished.stages, Date.now()),
          addedItemIds: finished.itemIds,
          ...(endEvent.data.files?.length ? { files: endEvent.data.files } : {}),
          ...(stopped ? { stopped } : {}),
        },
      ])
    },
    [clearRunTimer, examRunEnded, flushItems, refreshDraft, refreshMessages, stopStream, updateMessages, updateRun]
  )

  const applyEvent = useCallback(
    (event: AiStreamEvent) => {
      const current = runRef.current
      if (!current) return

      switch (event.type) {
        case 'stage':
        case 'slot': {
          updateRun({ ...current, stages: stepStages(current.stages, event, current.mode, stepTime(event), crypto.randomUUID()) })
          return
        }
        case 'text': {
          updateRun({ ...current, answer: event.data.text })
          return
        }
        case 'tool': {
          const line = toolLine(event.data)
          updateRun({
            ...current,
            trace:
              current.mode === 'ask'
                ? [...current.trace, line.detail ? `${line.label} · ${line.detail}` : line.label]
                : current.trace,
            stages: stepStages(current.stages, event, current.mode, stepTime(event), crypto.randomUUID()),
            // Words written before a tool call were the model thinking, not the answer.
            answer: undefined,
          })
          return
        }
        case 'draft': {
          // The words of the unit being written; a new unit or a new attempt starts over.
          const previous = current.draft
          const continuing = previous !== null && previous.unit === event.data.unit && !event.data.reset
          const text = (continuing ? previous.text : '') + event.data.text
          const draft: LiveWriting = {
            unit: event.data.unit,
            section: event.data.section,
            positions: event.data.positions,
            text,
            view: liveDraftView(text),
          }
          // The words show on the sheet; the chat's steps change only when the writing stage starts, not with each word.
          const writing = current.stages.some((stage) => stage.id === 'write' && stage.state === 'running')
          updateRun({
            ...current,
            draft,
            ...(writing ? {} : { stages: withStage(finishBefore(current.stages, 'write', Date.now()), 'write', { state: 'running' }, Date.now()) }),
          })
          return
        }
        case 'item': {
          const item = mapStreamItem(event.data)
          // A rewritten question gets a new revision, so the sheet knows to replace it where it stands.
          if (event.data.revised) item.revision = ++revisionRef.current
          pendingItemsRef.current.push(item)
          itemFlushRef.current ??= window.setTimeout(flushItems, 250)
          // The checked question replaces the words shown while it was being written.
          const written = current.draft?.positions.includes(event.data.position) ?? false
          updateRun({
            ...current,
            itemIds: [...new Set([...current.itemIds, item.id])],
            ...(written
              ? {
                  draft: null,
                  stages: current.stages.map((stage) =>
                    stage.id === 'write' ? { ...stage, items: (stage.items ?? []).filter((entry) => entry.id !== 'draft') } : stage
                  ),
                }
              : {}),
          })
          return
        }
        case 'rewrite': {
          // A question only the sheet holds, rewritten: the page writes it over that question.
          const rewrite: SheetRewrite = { seq: ++revisionRef.current, number: event.data.number, question: event.data.question }
          setRewrites((previous) => [...previous, rewrite])
          updateRun({ ...current, itemIds: [...current.itemIds, `sheet-${event.data.number}`] })
          return
        }
        case 'edit': {
          const conversationId = activeIdRef.current
          if (!conversationId) return
          setSheetEdits((previous) =>
            previous.some((edit) => edit.editId === event.data.editId) ? previous : [...previous, { ...event.data, conversationId }]
          )
          return
        }
        case 'answer': {
          if (!messagesRef.current.some((message) => message.id === event.data.messageId)) {
            updateMessages([
              ...messagesRef.current,
              {
                id: event.data.messageId,
                role: 'assistant',
                body: event.data.text,
                createdAt: new Date().toISOString(),
                mode: 'ask',
                trace: current.trace,
              },
            ])
          }
          // The reply now holds the words; the running turn stops showing them.
          updateRun({ ...current, stages: markAllDone(current.stages, Date.now()), answer: undefined })
          return
        }
        case 'end': {
          updateRun({ ...current, stages: markAllDone(current.stages, Date.now()) })
          const conversationId = activeIdRef.current
          const confirm = event.data.confirm
          if (confirm && conversationId) {
            if (confirm.action === 'import') paperImportRef.current?.(conversationId, confirm)
            else setConfirmRequest({ conversationId, request: confirm })
          }
          void finishRun(event, activeIdRef.current ?? '')
          return
        }
        case 'error': {
          updateRun({ ...current, stages: markAllDone(current.stages, Date.now()) })
          updateMessages([
            ...messagesRef.current,
            {
              id: `error-${crypto.randomUUID()}`,
              role: 'assistant',
              body: event.data.message || 'Trợ lý AI gặp lỗi.',
              createdAt: new Date().toISOString(),
              mode: current.mode,
              error: true,
            },
          ])
          void finishRun(event, activeIdRef.current ?? '')
          return
        }
      }
    },
    [finishRun, flushItems, updateMessages, updateRun]
  )

  /**
   * Gives up on a run that has gone quiet: no event for this long (an answer: 2 minutes, an exam: 10). It is armed
   * again by every event, so a full 120-question exam that keeps reporting is followed to its end.
   */
  const armRunTimer = useCallback(
    (conversationId: string, runMode: AiAssistantMode) => {
      if (runTimerRef.current !== null) window.clearTimeout(runTimerRef.current)
      runTimerRef.current = window.setTimeout(() => {
        runTimerRef.current = null
        if (runRef.current && activeIdRef.current === conversationId) {
          setNotice('Máy chủ chưa báo xong. Kết quả sẽ được tải lại.')
          void refreshMessages(conversationId)
          void refreshDraft(conversationId).then(() => examRunEnded(conversationId, runMode))
          updateRun(null)
          stopStream()
        }
      }, runMode === 'ask' ? 120_000 : 600_000)
    },
    [examRunEnded, refreshDraft, refreshMessages, stopStream, updateRun]
  )

  /**
   * Opens the stream and waits until the replay of older events is over, so nothing from a past run leaks in.
   * `resumeFrom` follows a run already going (the page was opened or reloaded during it): the stream starts right
   * before that run, so every event it replays is the run's own and is shown.
   */
  const beginStream = useCallback(
    (conversationId: string, resumeFrom?: string): Promise<void> => {
      stopStream()
      const handle: StreamHandle = {
        controller: new AbortController(),
        conversationId,
        syncing: resumeFrom === undefined,
        opened: false,
        dead: false,
        syncResolve: null,
        quietTimer: null,
        hardTimer: null,
      }
      streamRef.current = handle

      const finishSync = () => {
        if (!handle.syncing) return
        handle.syncing = false
        // never opened: whatever arrives later is a replay of an older run, not this one
        if (!handle.opened) {
          handle.dead = true
          if (activeIdRef.current === conversationId) {
            setNotice('Không nhận được tiến trình trực tiếp. Kết quả sẽ tải lại khi máy chủ xong.')
          }
        }
        if (handle.quietTimer !== null) window.clearTimeout(handle.quietTimer)
        if (handle.hardTimer !== null) window.clearTimeout(handle.hardTimer)
        handle.quietTimer = null
        handle.hardTimer = null
        handle.syncResolve?.()
        handle.syncResolve = null
      }
      const quiet = (delay: number) => {
        if (!handle.syncing) return
        if (handle.quietTimer !== null) window.clearTimeout(handle.quietTimer)
        handle.quietTimer = window.setTimeout(finishSync, delay)
      }

      const sync = new Promise<void>((resolve) => {
        handle.syncResolve = resolve
      })
      const cursor = resumeFrom ?? cursorsRef.current.get(conversationId) ?? null
      if (resumeFrom === undefined) handle.hardTimer = window.setTimeout(finishSync, 10_000)
      else handle.syncResolve?.()

      void followAiConversation(conversationId, {
        after: cursor,
        signal: handle.controller.signal,
        isReplaying: () => handle.syncing,
        onOpen: () => {
          handle.opened = true
          quiet(cursor ? 160 : 260)
        },
        onEvent: (event, id) => {
          if (id) cursorsRef.current.set(conversationId, id)
          if (handle.syncing) {
            quiet(event.type === 'end' ? 160 : 220)
            return
          }
          if (handle.dead || activeIdRef.current !== conversationId) return
          if (runRef.current) armRunTimer(conversationId, runRef.current.mode)
          applyEvent(event)
        },
      }).catch((error) => {
        if (handle.controller.signal.aborted) return
        finishSync()
        if (error instanceof AiStreamUnavailable && activeIdRef.current === conversationId) {
          setNotice('Không nhận được tiến trình trực tiếp. Kết quả sẽ tải lại khi máy chủ xong.')
        }
      })

      return sync
    },
    [applyEvent, armRunTimer, stopStream]
  )

  const loadConversation = useCallback(
    async (conversationId: string) => {
      generationRef.current += 1
      stopStream()
      clearRunTimer()
      sendingRef.current = false
      setSending(false)
      setCancelling(false)
      updateRun(null)
      activeIdRef.current = conversationId
      setActiveId(conversationId)
      const conversation = conversationsRef.current.find((item) => item.id === conversationId)
      const conversationMode = normalizeMode(conversation?.mode)
      // Before the server's list is in, the mode shown is a guess (this tab's copy, or none) that the list corrects.
      modeFromListRef.current = conversation && listedRef.current ? null : conversationId
      if (conversationMode) setMode(conversationMode)
      setAllMessages([])
      updateMessages([])
      updateDraft(null)
      setDraftLoading(true)
      setNotice(null)
      try {
        const [serverMessages, draftResponse] = await Promise.all([
          getAiMessages(conversationId),
          getAiDraft(conversationId),
        ])
        if (activeIdRef.current !== conversationId) return
        const all = serverMessages.map(mapMessage)
        setAllMessages(all)
        updateMessages(branchOf(all))
        updateDraft(draftResponse)
        // The config the exam was last asked with comes back to the settings (a reload would reset it).
        showSettings(settingsFromConfig(draftResponse.draft?.config, preferredSettingsRef.current))
        // A run still going (the page was reloaded, or the exam opened during it) is followed again from its start,
        // so its stages, tool calls and new questions keep showing and it can be stopped.
        const active = draftResponse.run
        if (active && !runRef.current) {
          const agent = active.mode === 'agent'
          const runMode: AiAssistantMode = active.mode === 'agent' ? 'compose' : active.mode
          updateRun({
            mode: runMode,
            ...(agent ? { agent } : {}),
            messageId: null,
            jobId: null,
            stages: initialStages(runMode, agent, null),
            trace: [],
            itemIds: [],
            knownAssistantIds: messagesRef.current
              .filter((message) => message.role === 'assistant')
              .map((message) => message.id),
            draft: null,
          })
          void beginStream(conversationId, active.afterEventId)
          armRunTimer(conversationId, runMode)
        }
      } catch (error) {
        if (activeIdRef.current === conversationId) setNotice(errorMessage(error))
      } finally {
        if (activeIdRef.current === conversationId) setDraftLoading(false)
      }
    },
    [armRunTimer, beginStream, clearRunTimer, showSettings, stopStream, updateDraft, updateMessages, updateRun]
  )

  const loadConversations = useCallback(async () => {
    // A list already on screen (this tab's copy) stays while the server's comes in.
    if (conversationsRef.current.length === 0) setConversationsLoading(true)
    const wanted = addressConversationRef.current
    addressConversationRef.current = null
    if (wanted && !activeIdRef.current) {
      // The exam the address names opens at once, alongside the list (it need not be on the list's first page).
      autoSelectRef.current = false
      void loadConversation(wanted)
    }
    try {
      const page = await getAiConversations(0, 50, quizId)
      updateConversations(page.content ?? [])
      setConversationsError(false)
      const opened = modeFromListRef.current
      modeFromListRef.current = null
      if (opened && opened === activeIdRef.current) {
        const listedMode = normalizeMode(page.content?.find((item) => item.id === opened)?.mode)
        if (listedMode) setMode(listedMode)
      }
      if (!wanted && autoSelectRef.current && !activeIdRef.current && page.content?.[0]) {
        void loadConversation(page.content[0].id)
      }
    } catch (error) {
      setConversationsError(true)
      setNotice(errorMessage(error))
    } finally {
      listedRef.current = true
      setListed(true)
      setConversationsLoading(false)
    }
  }, [loadConversation, quizId, updateConversations])

  useEffect(() => {
    // The first fetch starts the request lifecycle; its loading flags drive the skeletons.
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    // Until the list has loaded the address may still name the exam to open, so it is left alone.
    if (listed && !quizId) showConversationInAddress(activeId)
  }, [activeId, listed, quizId])

  useEffect(() => {
    // A mock exam is built on a paper the bank has read: settings naming none of them take the first one.
    if (mode !== 'mock-exam' || papers.length === 0) return
    const previous = settingsRef.current
    if (papers.some((option) => option.id === previous.bankSourceId)) return
    const next = { ...previous, bankSourceId: papers[0].id }
    preferredSettingsRef.current = { ...preferredSettingsRef.current, bankSourceId: next.bankSourceId }
    showSettings(next)
  }, [mode, papers, settings.bankSourceId, showSettings])

  useEffect(
    () => () => {
      stopStream()
      clearRunTimer()
    },
    [clearRunTimer, stopStream]
  )

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  )

  const paper = useMemo(
    () =>
      buildPaper(
        draft?.draft ?? {
          id: 'draft',
          name: 'Đề thi mới',
          examFormat: settings.examFormat,
          status: 'DRAFT',
        },
        draft?.items ?? [],
        activeConversation?.title ?? ''
      ),
    [activeConversation?.title, draft, settings.examFormat]
  )

  const numberOf = useMemo(() => questionNumbers(paper), [paper])

  const dismissConfirm = useCallback(() => setConfirmRequest(null), [])

  const buildConfig = useCallback(
    (
      text: string,
      runMode: AiAssistantMode,
      revise?: AiRevisedItem[],
      document?: AiSheetDocument,
      compose?: ComposeExtra
    ): AiSendConfig | undefined => {
      if (revise) {
        return { examFormat: settings.examFormat, solutionStyle: settings.solutionStyle, instruction: text, items: revise }
      }
      if (runMode === 'ask') return document ? { document } : undefined
      return {
        examFormat: settings.examFormat,
        ...(!quizId ? { questionCount: settings.questionCount } : {}),
        bankRatio: settings.bankRatio,
        solutionStyle: settings.solutionStyle,
        instruction: text,
        ...(runMode === 'mock-exam' && (compose?.bankSourceId || settings.bankSourceId)
          ? { bankSourceId: compose?.bankSourceId || settings.bankSourceId }
          : {}),
        ...(compose?.sheet ? { sheet: compose.sheet } : {}),
        ...(compose?.confirmed ? { confirmed: true } : {}),
        ...(compose?.confirmed && compose.agreed ? { agreed: true } : {}),
      }
    },
    [quizId, settings]
  )

  /**
   * The open exam's conversation, created when the exam has none yet (the first AI request, or the first edit of a
   * new exam's document). Calls made while one is being created share it. Resolves to null when the teacher opened
   * another exam meanwhile: the conversation is then left in the list and nothing is moved into it. Rejects when the
   * conversation cannot be created.
   */
  const ensureConversation = useCallback(
    (title: string): Promise<string | null> => {
      if (activeIdRef.current) return Promise.resolve(activeIdRef.current)
      const generation = generationRef.current
      if (creationRef.current?.generation === generation) return creationRef.current.promise
      // The teacher is working on this new exam: loading the list must not open another one over it.
      autoSelectRef.current = false
      const creation = (async () => {
        setCreatingConversation(true)
        try {
          const conversation = await createAiConversation({ title, ...(quizId ? { quizId } : {}) })
          updateConversations([conversation, ...conversationsRef.current])
          if (generationRef.current !== generation || activeIdRef.current) return null
          activeIdRef.current = conversation.id
          setActiveId(conversation.id)
          setCreatedConversationId(conversation.id)
          // Messages already on screen (a refused request, its question) stay with the exam being made.
          updateDraft(null)
          await refreshDraft(conversation.id)
          return conversation.id
        } finally {
          if (creationRef.current?.promise === creation) {
            creationRef.current = null
            setCreatingConversation(false)
          }
        }
      })()
      creationRef.current = { generation, promise: creation }
      return creation
    },
    [quizId, refreshDraft, updateConversations, updateDraft]
  )

  /** Takes back the conversation a failed send created: it holds nothing yet, so it leaves the list and the screen. */
  const discardConversation = useCallback(
    (conversationId: string) => {
      if (activeIdRef.current !== conversationId) return
      generationRef.current += 1
      autoSelectRef.current = false
      activeIdRef.current = null
      setActiveId(null)
      setCreatedConversationId(null)
      updateDraft(null)
      updateConversations(conversationsRef.current.filter((conversation) => conversation.id !== conversationId))
      // A conversation that stays on the server unseen is harmless; the screen does not wait for the delete.
      void deleteAiConversation(conversationId).catch(() => undefined)
    },
    [updateConversations, updateDraft]
  )

  /**
   * Sends `text` and follows the run it starts. Resolves false when the words did not go: another send or run is on,
   * or the server refused them (the error shows in the thread). A question back (which subject) counts as sent.
   */
  const startRun = useCallback(
    async (
      text: string,
      requestedMode: AiAssistantMode = mode,
      revise?: AiRevisedItem[],
      document?: AiSheetDocument,
      attachments?: AiAttachment[],
      after?: string | null,
      compose?: ComposeExtra
    ): Promise<boolean> => {
      if (sendingRef.current || runRef.current) return false
      // Known for a new exam once its conversation is made (see below).
      let runMode = requestedMode
      sendingRef.current = true
      cancelRequestedRef.current = false
      setSending(true)
      setNotice(null)
      setConfirmRequest(null)
      const knownAssistantIds = messagesRef.current
        .filter((message) => message.role === 'assistant')
        .map((message) => message.id)
      const localUserId = `local-${crypto.randomUUID()}`
      // A new send answers what an earlier refusal asked: its retry is done with, and its question is answered (asked
      // again if this send is refused too).
      const answeredHere = new Set(
        messagesRef.current
          .filter((message) => message.subjectChoices && !message.subjectChoices.answered)
          .map((message) => message.id)
      )
      if (answeredHere.size > 0 || messagesRef.current.some((message) => message.retryText)) {
        updateMessages(
          messagesRef.current
            .filter((message) => !message.retryText)
            .map((message) => (answeredHere.has(message.id) ? answerSubjects(message, true) : message))
        )
      }

      // Asked again: the page goes back to the message the first version followed, and the new one follows it.
      if (after !== undefined) {
        const at = after === null ? -1 : messagesRef.current.findIndex((message) => message.id === after)
        if (after !== null && at < 0) {
          sendingRef.current = false
          setSending(false)
          return false
        }
        updateMessages(messagesRef.current.slice(0, at + 1))
      }
      const parentId =
        after !== undefined ? after : ([...messagesRef.current].reverse().find((message) => !LOCAL_ID.test(message.id))?.id ?? null)

      let conversationId = activeIdRef.current
      // Made for this send (not by an edit of the sheet): it is taken back when the send fails, leaving no empty exam.
      let createdHere = false
      // The questions a compose run clears from the draft before it is sent; a refused send puts them back.
      let replaced: { before: AiDraftResponse; cleared: AiDraftResponse } | null = null
      try {
        if (!conversationId) {
          const shared = creationRef.current !== null
          conversationId = await ensureConversation(titleFromText(text))
          // The teacher opened another exam while this one was being created: the request is dropped.
          if (!conversationId) {
            sendingRef.current = false
            setSending(false)
            return true
          }
          createdHere = !shared
        }
        // Where the assistant takes every message, a question and a request alike go to it; only a revision, and a new
        // or mock exam the teacher agreed to, keep their own mode.
        if (assistantOnRef.current && runMode !== 'revise' && !compose?.confirmed) runMode = 'compose'

        updateMessages([
          ...messagesRef.current,
          {
            id: localUserId,
            parentId,
            role: 'user',
            body: text,
            createdAt: new Date().toISOString(),
            ...(attachments?.length ? { attachments } : {}),
            // What the assistant proposed, sent for the teacher once they agreed (the server marks it alike).
            ...(compose?.confirmed && compose.agreed ? { agreed: true } : {}),
          },
        ])
        // A new compose run replaces the exam; a revise run rewrites some of its questions in place, and the assistant
        // changes the exam there is (a request on an exam with questions, unless the teacher agreed to replace it). The
        // server keeps the exam as it was (to give it back if the run is stopped), so the sheet is saved first.
        const examRun = runMode !== 'ask' && runMode !== 'revise'
        // The assistant reads the exam, empty or not, and decides what the words ask for; a new exam it starts or
        // proposes comes back as a request the teacher agreed to.
        const toAssistant = runMode === 'compose' && assistantOnRef.current && !compose?.confirmed
        // The assistant reads the sheet with every message, also one sent again ("Tạo lại", "Thử lại"): without it an
        // exam with questions would read as empty, and a new exam would start over it unasked.
        if ((toAssistant || readQuizSheet) && !compose?.sheet) {
          const sheet = readQuizSheet?.() ?? sheetRef.current?.read()
          if (sheet) compose = { ...compose, sheet }
        }
        const replacing = examRun && !toAssistant
        const initialRun: AiRun = {
          mode: runMode,
          ...(toAssistant ? { agent: true } : {}),
          messageId: null,
          jobId: null,
          stages: initialStages(runMode, toAssistant),
          trace: [],
          itemIds: [],
          knownAssistantIds,
          draft: null,
        }
        updateRun(initialRun)
        if (examRun && sheetRef.current) await atMost(sheetRef.current.save(), SHEET_WAIT_MS)
        if (replacing && draftRef.current) {
          replaced = { before: draftRef.current, cleared: { ...draftRef.current, items: [] } }
          updateDraft(replaced.cleared)
        }

        const synced = beginStream(conversationId)
        await synced

        const sent = await sendAiMessage(conversationId, {
          content: text,
          mode: runMode,
          config: buildConfig(text, runMode, runMode === 'revise' ? revise : undefined, document, compose),
          ...(attachments?.length ? { attachments } : {}),
          ...(parentId ? { parentId } : {}),
        })
        const running = runRef.current
        if (running) {
          updateRun({ ...running, messageId: sent.messageId, jobId: sent.jobId })
        }
        // The server says whether the run replaces the exam; one that does not leaves the sheet as it is.
        if ((sent.replaced ?? replacing) && activeIdRef.current === conversationId) sheetRef.current?.clear()
        else if (replaced && sent.replaced === false && draftRef.current === replaced.cleared) updateDraft(replaced.before)
        updateMessages(
          messagesRef.current.map((message) =>
            message.id === localUserId ? { ...message, id: sent.messageId } : message
          )
        )
        sendingRef.current = false
        setSending(false)
        if (cancelRequestedRef.current) {
          cancelRequestedRef.current = false
          void cancelAiRun(conversationId)
        }
        armRunTimer(conversationId, runMode)
        return true
      } catch (error) {
        stopStream()
        clearRunTimer()
        updateRun(null)
        // The server took no run, so nothing replaces the exam's questions: they come back as they were, unless the
        // draft has changed since (another exam was opened).
        if (replaced && draftRef.current === replaced.cleared) updateDraft(replaced.before)
        if (createdHere && conversationId) discardConversation(conversationId)
        if (error instanceof ApiError && error.code === SUBJECT_REQUIRED && subjectsOf(error.data).length > 0) {
          // Not a failure: the assistant asks which subject, and the teacher's words stay above the question.
          updateMessages([
            ...messagesRef.current,
            {
              id: `subject-${crypto.randomUUID()}`,
              role: 'assistant',
              body: error.message || 'Bạn muốn soạn môn nào?',
              createdAt: new Date().toISOString(),
              mode: runMode,
              subjectChoices: { text, subjects: subjectsOf(error.data), whole: wholeOf(error.data) },
            },
          ])
          sendingRef.current = false
          setSending(false)
          return true
        }
        // Refused: the teacher's words leave the thread, and the question this send answered offers its subjects again.
        updateMessages(
          messagesRef.current
            .filter((message) => message.id !== localUserId || message.role !== 'user')
            .map((message) => (answeredHere.has(message.id) ? answerSubjects(message, false) : message))
        )
        updateMessages([
          ...messagesRef.current,
          {
            id: `error-${crypto.randomUUID()}`,
            role: 'assistant',
            body: errorMessage(error),
            createdAt: new Date().toISOString(),
            mode: runMode,
            error: true,
            ...(runMode !== 'revise' ? { retryText: text } : {}),
            ...(runMode !== 'revise' && compose?.confirmed && compose.agreed
              ? { retryAgreed: compose.bankSourceId ? { bankSourceId: compose.bankSourceId } : {} }
              : {}),
          },
        ])
        // The error shows once, in the thread; the caller gives the teacher's words back to the input to send again.
        sendingRef.current = false
        setSending(false)
        return false
      }
    },
    [
      armRunTimer,
      beginStream,
      buildConfig,
      clearRunTimer,
      discardConversation,
      ensureConversation,
      mode,
      readQuizSheet,
      stopStream,
      updateDraft,
      updateMessages,
      updateRun,
    ]
  )

  /**
   * Sends the composer's words; resolves whether they went (false: the composer keeps them). `revise` (the questions
   * "Sửa câu 2" names) makes it a revise run; `document` (the exam on the sheet) goes with an ask, so the assistant
   * reads what the teacher sees.
   */
  const send = useCallback(
    (
      words: string,
      extra?: {
        revise?: AiRevisedItem[]
        document?: AiSheetDocument
        attachments?: AiAttachment[]
        after?: string | null
        compose?: ComposeExtra
        /** A mode of the page's own choosing (a mock exam the teacher agreed to); the picked one otherwise. */
        mode?: AiAssistantMode
      }
    ) => {
      const text = words.trim()
      if (!text) return Promise.resolve(false)
      const revise = extra?.revise
      return startRun(text, revise?.length ? 'revise' : (extra?.mode ?? mode), revise, extra?.document, extra?.attachments, extra?.after, extra?.compose)
    },
    [mode, startRun]
  )

  /** Stores an image or PDF for the next ask question, on the open exam (made now for a new one). */
  const uploadAttachment = useCallback(
    async (file: File) => {
      const id = await ensureConversation(titleFromText(file.name))
      if (!id) throw new Error('Không tạo được đề để đính kèm tệp.')
      return uploadAiAttachment(id, file)
    },
    [ensureConversation]
  )

  /** A step the page took for the run going on (the answer key written again), shown with the run's own steps. */
  const addRunStep = useCallback(
    (label: string, detail?: string) => {
      const current = runRef.current
      if (!current) return
      updateRun({
        ...current,
        stages: addRunItem(current.stages, { id: `step-${crypto.randomUUID()}`, label, detail, state: 'done' }, Date.now()),
      })
    },
    [updateRun]
  )

  const regenerate = useCallback(() => {
    if (sendingRef.current || runRef.current) return
    const lastAssistant = [...messagesRef.current].reverse().find((message) => message.role === 'assistant')
    // The teacher's own words: a request they agreed to (the assistant's, sent for them) is not shown, so asking again
    // starts from what they asked.
    const lastUser = [...messagesRef.current].reverse().find((message) => message.role === 'user' && !message.agreed)
    if (!lastUser) return
    const lastMode = normalizeMode(lastAssistant?.mode) ?? mode
    // A request to rewrite numbered questions needs those questions looked up again; composing it anew would
    // replace the whole exam.
    if (lastMode === 'revise' || (!assistantOnRef.current && revisedNumbers(lastUser.body))) {
      setNotice('Hãy nhắn lại yêu cầu sửa câu để trợ lý sửa lại.')
      return
    }
    const at = messagesRef.current.indexOf(lastUser)
    const before = [...messagesRef.current.slice(0, at)].reverse().find((message) => !LOCAL_ID.test(message.id))
    void startRun(lastUser.body, lastMode, undefined, undefined, lastUser.attachments, before?.id ?? null)
  }, [mode, startRun])

  /** Shows another branch of the conversation: the messages the thread lists, by id. */
  const showBranch = useCallback(
    (ids: readonly string[]) => {
      if (sendingRef.current || runRef.current) return
      const known = new Map([...allMessages, ...messagesRef.current].map((message) => [message.id, message]))
      const branch = ids.flatMap((id) => (known.has(id) ? [known.get(id) as AiChatMessage] : []))
      if (branch.length === ids.length) updateMessages(branch)
    },
    [allMessages, updateMessages]
  )

  /** Sends words the page wrote (not the composer's); resolves to them when they did not go, for the input. */
  const sendFor = useCallback(
    async (text: string, runMode: AiAssistantMode) => ((await startRun(text, runMode)) ? null : text),
    [startRun]
  )

  /** "Thử lại" on the error of a send: the same words, sent again. */
  const retry = useCallback(
    async (messageId: string) => {
      const failed = messagesRef.current.find((message) => message.id === messageId)
      if (!failed?.retryText) return null
      // A request the teacher agreed to goes again as it went: agreed (so not shown as theirs), from the paper it named.
      if (failed.retryAgreed) {
        const agreed = { confirmed: true, agreed: true, ...failed.retryAgreed }
        const sent = await startRun(failed.retryText, failed.mode ?? mode, undefined, undefined, undefined, undefined, agreed)
        return sent ? null : failed.retryText
      }
      return sendFor(failed.retryText, failed.mode ?? mode)
    },
    [mode, sendFor, startRun]
  )

  /** A subject (null: the whole paper) chosen for the question "Bạn muốn soạn môn nào?": the same request, with it added. */
  const chooseSubject = useCallback(
    async (messageId: string, subjectName: string | null) => {
      const asked = messagesRef.current.find((message) => message.id === messageId)
      if (!asked?.subjectChoices || asked.subjectChoices.answered) return null
      const words = asked.subjectChoices.text.trim().replace(/[\s.,;:!?…]+$/u, '')
      return sendFor(subjectName === null ? `${words} cả đề` : `${words} môn ${subjectName}`, asked.mode ?? mode)
    },
    [mode, sendFor]
  )

  const cancel = useCallback(() => {
    const conversationId = activeIdRef.current
    if (!conversationId || (!runRef.current && !sendingRef.current)) return
    cancelRequestedRef.current = sendingRef.current
    setCancelling(true)
    void cancelAiRun(conversationId)
      .then((cancelled) => {
        const handle = streamRef.current
        // The server took the request: the run shows as stopped now, not when its stream gets to say so.
        if (cancelled || !handle || !handle.opened) {
          void finishRun({ type: 'end', data: { status: 'CANCELLED' } }, conversationId)
          return
        }
        if (cancelTimerRef.current !== null) window.clearTimeout(cancelTimerRef.current)
        cancelTimerRef.current = window.setTimeout(() => {
          if (runRef.current) void finishRun({ type: 'end', data: { status: 'CANCELLED' } }, conversationId)
        }, 4000)
      })
      .catch((error) => {
        setCancelling(false)
        setNotice(errorMessage(error))
      })
  }, [finishRun])

  const startNew = useCallback(() => {
    generationRef.current += 1
    stopStream()
    clearRunTimer()
    autoSelectRef.current = false
    activeIdRef.current = null
    setActiveId(null)
    // The versions of the exam left behind go with it: its first question would count as one of the new one's.
    setAllMessages([])
    updateMessages([])
    updateDraft(null)
    updateRun(null)
    setSending(false)
    setCancelling(false)
    sendingRef.current = false
    setDraftLoading(false)
    setNotice(null)
    showSettings(preferredSettingsRef.current)
  }, [clearRunTimer, showSettings, stopStream, updateDraft, updateMessages, updateRun])

  const selectConversation = useCallback(
    (conversationId: string) => {
      if (conversationId === activeIdRef.current) return
      autoSelectRef.current = false
      void loadConversation(conversationId)
    },
    [loadConversation]
  )

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      const nextTitle = title.trim()
      if (!nextTitle) return
      const previous = conversationsRef.current
      updateConversations(
        previous.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, title: nextTitle } : conversation
        )
      )
      try {
        await renameAiConversation(conversationId, nextTitle)
      } catch (error) {
        updateConversations(previous)
        setNotice(errorMessage(error))
        throw error
      }
    },
    [updateConversations]
  )

  /**
   * Moves the exam to the published ones at once. A file is recorded here; a quiz or mock exam was already recorded
   * by its export, so only the list changes.
   */
  const markPublished = useCallback(
    async (conversationId: string, as: AiPublishedAs) => {
      const before = conversationsRef.current.find((conversation) => conversation.id === conversationId)
      const mark = (publishedAt: string | null, publishedAs: AiPublishedAs | null) =>
        updateConversations(
          conversationsRef.current.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, publishedAt, publishedAs } : conversation
          )
        )
      mark(new Date().toISOString(), as)
      // A quiz export records it on the server itself; a file is recorded here.
      if (as !== 'DOCX' && as !== 'PDF') return
      try {
        await publishAiConversation(conversationId, as)
      } catch (error) {
        mark(before?.publishedAt ?? null, before?.publishedAs ?? null)
        setNotice(errorMessage(error))
      }
    },
    [updateConversations]
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      const previous = conversationsRef.current
      const wasActive = activeIdRef.current === conversationId
      updateConversations(previous.filter((conversation) => conversation.id !== conversationId))
      if (wasActive) startNew()
      try {
        await deleteAiConversation(conversationId)
      } catch (error) {
        updateConversations(previous)
        setNotice(errorMessage(error))
        if (wasActive) void loadConversation(conversationId)
      }
    },
    [loadConversation, startNew, updateConversations]
  )

  const mutate = useCallback(
    async (optimistic: () => () => void, request: () => Promise<unknown>) => {
      const rollback = optimistic()
      setSaving((count) => count + 1)
      try {
        await request()
      } catch (error) {
        rollback()
        setNotice(errorMessage(error))
      } finally {
        setSaving((count) => Math.max(0, count - 1))
      }
    },
    []
  )

  const updateQuestion = useCallback(
    async (
      itemId: string,
      patch: Pick<AiDraftQuestion, 'text' | 'options' | 'explanation'>
    ) => {
      const conversationId = activeIdRef.current
      const current = draftRef.current
      const item = current?.items.find((entry) => entry.id === itemId)
      if (!conversationId || !current || !item) return
      const question: AiDraftQuestion = {
        ...item.question,
        text: patch.text,
        explanation: patch.explanation,
        options: patch.options?.map((option) => ({
          label: option.label,
          text: option.text,
          correct: option.correct,
        })),
      }
      const previous = current
      await mutate(
        () => {
          updateDraft({
            ...current,
            items: current.items.map((entry) =>
              entry.id === itemId ? { ...entry, question } : entry
            ),
          })
          return () => updateDraft(previous)
        },
        () => updateAiDraftQuestion(conversationId, itemId, question)
      )
    },
    [mutate, updateDraft]
  )

  const toggleKeep = useCallback(
    async (itemId: string, kept: boolean) => {
      const conversationId = activeIdRef.current
      const current = draftRef.current
      const item = current?.items.find((entry) => entry.id === itemId)
      if (!conversationId || !current || !item) return
      const previous = current
      await mutate(
        () => {
          updateDraft({
            ...current,
            items: current.items.map((entry) =>
              entry.id === itemId ? { ...entry, kept } : entry
            ),
          })
          return () => updateDraft(previous)
        },
        () => setAiDraftItemKept(conversationId, itemId, kept)
      )
    },
    [mutate, updateDraft]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      const conversationId = activeIdRef.current
      const current = draftRef.current
      if (!conversationId || !current) return
      const previous = current
      await mutate(
        () => {
          updateDraft({ ...current, items: current.items.filter((entry) => entry.id !== itemId) })
          return () => updateDraft(previous)
        },
        () => removeAiDraftItem(conversationId, itemId)
      )
    },
    [mutate, updateDraft]
  )

  const moveItem = useCallback(
    async (sourceId: string, targetId: string) => {
      const conversationId = activeIdRef.current
      const current = draftRef.current
      if (!conversationId || !current || sourceId === targetId) return
      const source = current.items.find((item) => item.id === sourceId)
      const target = current.items.find((item) => item.id === targetId)
      if (!source || !target || source.sectionCode !== target.sectionCode) return

      const sectionItems = current.items
        .filter((item) => item.sectionCode === source.sectionCode)
        .sort((a, b) => a.position - b.position)
      const from = sectionItems.findIndex((item) => item.id === sourceId)
      const to = sectionItems.findIndex((item) => item.id === targetId)
      if (from < 0 || to < 0) return
      const reordered = [...sectionItems]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)
      const positions = new Map(reordered.map((item, index) => [item.id, index + 1]))
      const previous = current

      await mutate(
        () => {
          updateDraft({
            ...current,
            items: current.items.map((item) =>
              positions.has(item.id) ? { ...item, position: positions.get(item.id)! } : item
            ),
          })
          return () => updateDraft(previous)
        },
        () =>
          reorderAiDraftItems(
            conversationId,
            source.sectionCode,
            reordered.map((item) => item.id)
          )
      )
    },
    [mutate, updateDraft]
  )

  const addManual = useCallback(
    async (sectionCode: string): Promise<string | null> => {
      const conversationId = activeIdRef.current
      const current = draftRef.current
      if (!conversationId || !current) return null
      const before = new Set(current.items.map((item) => item.id))
      setSaving((count) => count + 1)
      try {
        const added = await addAiDraftItem(conversationId, {
          sectionCode,
          question: emptyManualQuestion(),
        })
        if (added) {
          const items = current.items.some((item) => item.id === added.id)
            ? current.items
            : [...current.items, added]
          updateDraft({ ...current, items })
          return added.id
        }
        const loaded = await getAiDraft(conversationId)
        if (activeIdRef.current !== conversationId) return null
        updateDraft(loaded)
        return loaded.items.find((item) => !before.has(item.id))?.id ?? null
      } catch (error) {
        setNotice(errorMessage(error))
        return null
      } finally {
        setSaving((count) => Math.max(0, count - 1))
      }
    },
    [updateDraft]
  )

  // Only whether a run goes on and what it does reach this hook's renders; its progress is read from `runStore`.
  const running = useStoreValue(runStore, runGoingOn) || sending
  const canStop = Boolean(activeConversation) && running

  return {
    conversations,
    conversationsLoading,
    conversationsError,
    activeId,
    activeConversation,
    messages,
    /** Every message of the open conversation in every branch, for the thread's versions of a turn. */
    allMessages,
    showBranch,
    paper,
    numberOf,
    draftLoading,
    // With the assistant taking every message there is one way to send, the compose settings beside it.
    mode: assistantOn ? ('compose' as const) : mode,
    running,
    sending,
    creatingConversation,
    createdConversationId,
    cancelling,
    saving,
    notice,
    settings,
    papers,
    papersLoading,
    papersError,
    canStop,
    setMode: chooseMode,
    setSettings: changeSettings,
    setNotice,
    send,
    regenerate,
    retry,
    chooseSubject,
    addRunStep,
    cancel,
    ensureConversation,
    uploadAttachment,
    startNew,
    selectConversation,
    renameConversation,
    markPublished,
    deleteConversation,
    reloadConversations: loadConversations,
    reloadPapers: bank.refresh,
    updateQuestion,
    toggleKeep,
    deleteItem,
    moveItem,
    addManual,
    /** The run going on: its stages, trace and the words being written (see `runStagesOf` and the other selectors). */
    runStore,
    /** Grows by one each time an exam run the server took ends on the open exam (done, stopped, failed, given up). */
    examRunsEnded,
    agentRunsEnded,
    attachSheet,
    rewrites,
    sheetEdits,
    /** The change the assistant asks the teacher to agree to on the open exam, or null. */
    confirmRequest: confirmRequest && confirmRequest.conversationId === activeId ? confirmRequest.request : null,
    dismissConfirm,
    /** Every message goes to the assistant, which reads the exam and answers or changes it; there is no mode to pick. */
    composeAgent: assistantOn,
    /** The answer key the teacher asked the assistant to write again on the open exam, or null. */
    answerKeyRequest: answerKeyRequest && answerKeyRequest.conversationId === activeId ? answerKeyRequest : null,
  }
}
