import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AiStreamUnavailable,
  addAiDraftItem,
  cancelAiRun,
  createAiConversation,
  deleteAiConversation,
  followAiConversation,
  getAiConversations,
  getAiDraft,
  getAiMessages,
  removeAiDraftItem,
  renameAiConversation,
  reorderAiDraftItems,
  sendAiMessage,
  setAiDraftItemKept,
  updateAiDraftQuestion,
  type AiAssistantMode,
  type AiConversation,
  type AiDifficulty,
  type AiDraftItem,
  type AiDraftQuestion,
  type AiDraftResponse,
  type AiExamFormat,
  type AiMessage,
  type AiRevisedItem,
  type AiSendConfig,
  type AiSheetDocument,
  type AiSolutionStyle,
  type AiStreamEvent,
} from '../services/aiAssistantService'
import { getBankSources } from '../services/questionBankService'
import type { SelectOption } from '../components/console/select-field'
import {
  buildPaper,
  DIFFICULTY_LABELS,
  emptyManualQuestion,
  questionNumbers,
  traceLines,
  type AiChatMessage,
  type AiTraceItem,
  type AiTraceStage,
} from '../components/management/ai-assistant/exam-format'
import { liveDraftTail, liveDraftView, type LiveDraft } from '../components/management/exam-doc/live-draft'
import { revisedNumbers } from '../components/management/ai-assistant/revise-request'

/** Compose settings. No subject: the request names it, and one naming none is for the whole format. */
export interface AiComposeSettings {
  examFormat: AiExamFormat
  questionCount: number | 'full'
  difficulty: AiDifficulty
  bankRatio: number
  bankSourceId: string
  /** How much of a solution each question carries, and the answer guide after the exam shows. */
  solutionStyle: AiSolutionStyle
}

const DEFAULT_SETTINGS: AiComposeSettings = {
  examFormat: 'VACT_2025',
  questionCount: 5,
  difficulty: 'TB',
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

interface AiRun {
  mode: AiAssistantMode
  messageId: string | null
  jobId: string | null
  stages: AiTraceStage[]
  trace: string[]
  itemIds: string[]
  knownAssistantIds: string[]
  /** The unit the AI is writing right now, as far as its words have come. */
  draft: LiveDraft | null
}

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

const STAGE_TITLES: Record<string, string> = {
  explore: 'Khảo sát ngân hàng câu hỏi',
  plan: 'Lập ma trận đề',
  write: 'Soạn câu hỏi',
  lookup: 'Tra cứu',
  revise: 'Sửa câu hỏi',
  queue: 'Đang chờ đến lượt',
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
}

function normalizeMode(value: string | null | undefined): AiAssistantMode | undefined {
  return AUDIO_MODES.includes(value as AiAssistantMode) ? (value as AiAssistantMode) : undefined
}

function titleFromText(text: string) {
  const line = text.trim().split('\n')[0]?.trim() ?? ''
  if (!line) return 'Cuộc trò chuyện mới'
  return line.length > 60 ? `${line.slice(0, 59)}…` : line
}

function initialStages(mode: AiAssistantMode): AiTraceStage[] {
  if (mode === 'ask') return [{ id: 'lookup', title: STAGE_TITLES.lookup, items: [], state: 'running' }]
  // A revise run reports its steps under the write stage, retitled.
  if (mode === 'revise') return [{ id: 'write', title: STAGE_TITLES.revise, items: [], state: 'running' }]
  return [
    { id: 'explore', title: STAGE_TITLES.explore, state: 'running' },
    { id: 'plan', title: STAGE_TITLES.plan, state: 'pending' },
    { id: 'write', title: STAGE_TITLES.write, state: 'pending' },
  ]
}

function withStage(
  stages: AiTraceStage[],
  id: string,
  patch: Partial<AiTraceStage>
): AiTraceStage[] {
  if (!stages.some((stage) => stage.id === id)) {
    return [...stages, { id, title: STAGE_TITLES[id] ?? id, ...patch }]
  }
  return stages.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage))
}

/** A later stage starting means the ones before it finished. */
function finishBefore(stages: AiTraceStage[], id: string): AiTraceStage[] {
  const order = ['queue', 'explore', 'plan', 'write']
  const index = order.indexOf(id)
  if (index < 0) return stages
  return stages.map((stage) =>
    order.indexOf(stage.id) >= 0 && order.indexOf(stage.id) < index && stage.state !== 'done'
      ? { ...stage, state: 'done' }
      : stage
  )
}

function markAllDone(stages: AiTraceStage[]): AiTraceStage[] {
  return stages.map((stage) => ({ ...stage, state: 'done' }))
}

function addTraceItem(stages: AiTraceStage[], item: AiTraceItem): AiTraceStage[] {
  const running =
    [...stages].reverse().find((stage) => stage.state === 'running') ?? stages[stages.length - 1]
  if (!running) return stages
  return stages.map((stage) =>
    stage.id === running.id ? { ...stage, items: [...(stage.items ?? []), item] } : stage
  )
}

/** What each tool the assistant calls does, in the teacher's words; its raw arguments (ids, JSON) stay hidden. */
const TOOL_LABELS: Record<string, string> = {
  get_exam_format: 'Xem cấu trúc đề',
  list_patterns: 'Xem các dạng câu của môn',
  get_pattern: 'Đọc yêu cầu của dạng câu',
  matrix_stats: 'Đếm câu có sẵn trong ngân hàng',
  search_bank_questions: 'Tìm câu mẫu trong ngân hàng',
  list_draft_questions: 'Xem các câu của đề',
  get_draft_question: 'Đọc câu trong đề',
  list_document_questions: 'Xem các câu của đề',
  get_document_question: 'Đọc câu trong đề',
  revise_question: 'Viết lại câu',
  check_question: 'Soát lại câu',
}

/** A tool call as one plain line: what it did, and at most a short readable hint (a difficulty, a query). */
function toolLine(data: { tool: string; arguments?: unknown }) {
  const args = (data.arguments && typeof data.arguments === 'object' ? data.arguments : {}) as Record<string, unknown>
  const label = TOOL_LABELS[data.tool] ?? (data.tool ? 'Tra cứu dữ liệu' : 'Công cụ')
  const difficulty = typeof args.difficulty === 'string' ? DIFFICULTY_LABELS[args.difficulty as AiDifficulty] : undefined
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  const number = typeof args.number === 'number' ? `câu ${args.number}` : undefined
  const detail =
    number ?? (difficulty ? `mức ${difficulty.toLowerCase()}` : query ? (query.length > 60 ? `${query.slice(0, 59)}…` : query) : undefined)
  return { label, detail }
}

function mapMessage(message: AiMessage): AiChatMessage {
  return {
    id: message.id,
    role: message.role === 'USER' ? 'user' : 'assistant',
    body: message.content ?? '',
    createdAt: message.createdAt,
    mode: normalizeMode(message.mode),
    trace: traceLines(message.trace),
  }
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

/** The AI assistant page: conversations, the live stream of a run, and the draft it writes into. */
export function useAiAssistant() {
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [draft, setDraft] = useState<AiDraftResponse | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [mode, setMode] = useState<AiAssistantMode>('compose')
  const [value, setValue] = useState('')
  const [run, setRun] = useState<AiRun | null>(null)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [saving, setSaving] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [settings, setSettings] = useState<AiComposeSettings>(DEFAULT_SETTINGS)
  const [papers, setPapers] = useState<SelectOption[]>([])
  const [papersLoading, setPapersLoading] = useState(false)
  const [papersError, setPapersError] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  /** The conversation this page created last for a new exam (its document takes over what the exam held). */
  const [createdConversationId, setCreatedConversationId] = useState<string | null>(null)

  const activeIdRef = useRef<string | null>(null)
  const creationRef = useRef<{ generation: number; promise: Promise<string | null> } | null>(null)
  /** Bumped whenever the teacher opens another exam or a new one; a creation from before is then not adopted. */
  const generationRef = useRef(0)
  const conversationsRef = useRef<AiConversation[]>([])
  const messagesRef = useRef<AiChatMessage[]>([])
  const draftRef = useRef<AiDraftResponse | null>(null)
  const runRef = useRef<AiRun | null>(null)
  const sendingRef = useRef(false)
  const streamRef = useRef<StreamHandle | null>(null)
  const cursorsRef = useRef(new Map<string, string>())
  const runTimerRef = useRef<number | null>(null)
  const cancelTimerRef = useRef<number | null>(null)
  const autoSelectRef = useRef(true)
  const papersTriedRef = useRef(false)
  const cancelRequestedRef = useRef(false)
  /** Questions streamed in since the last paint; they reach the draft (and the document) together. */
  const pendingItemsRef = useRef<AiDraftItem[]>([])
  const itemFlushRef = useRef<number | null>(null)
  /** Counts the questions the AI rewrote on this page (see `AiDraftItem.revision`). */
  const revisionRef = useRef(0)
  /** Questions only the sheet holds that the AI rewrote, in order; the page writes each once (by `seq`). */
  const [rewrites, setRewrites] = useState<SheetRewrite[]>([])

  const updateConversations = useCallback((next: AiConversation[]) => {
    conversationsRef.current = next
    setConversations(next)
  }, [])

  const updateMessages = useCallback((next: AiChatMessage[]) => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const updateDraft = useCallback((next: AiDraftResponse | null) => {
    draftRef.current = next
    setDraft(next)
  }, [])

  const updateRun = useCallback((next: AiRun | null) => {
    runRef.current = next
    setRun(next)
  }, [])

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

  const refreshMessages = useCallback(async (conversationId: string) => {
    try {
      const server = await getAiMessages(conversationId)
      if (activeIdRef.current !== conversationId) return false
      updateMessages(server.map(mapMessage))
      return true
    } catch {
      return false
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

  const finishRun = useCallback(
    async (event: AiStreamEvent, conversationId: string) => {
      const finished = runRef.current
      flushItems()
      clearRunTimer()
      stopStream()
      setCancelling(false)
      setSending(false)
      sendingRef.current = false

      if (event.type === 'error') {
        updateRun(null)
        if (finished && finished.mode !== 'ask') {
          await refreshDraft(conversationId)
        }
        return
      }
      if (event.type !== 'end') return

      const endEvent = event
      updateRun(null)
      if (!finished) return

      if (finished.mode === 'ask') {
        await refreshMessages(conversationId)
        return
      }

      const [messagesLoaded] = await Promise.all([
        refreshMessages(conversationId),
        refreshDraft(conversationId),
      ])
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
              ? { ...message, addedItemIds: finished.itemIds, stages: markAllDone(finished.stages) }
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
          body: finished.mode === 'revise'
            ? `Đã sửa ${finished.itemIds.length} câu.`
            : endSummary(endEvent.data, finished.itemIds.length),
          createdAt: new Date().toISOString(),
          mode: finished.mode,
          stages: markAllDone(finished.stages),
          addedItemIds: finished.itemIds,
        },
      ])
    },
    [clearRunTimer, flushItems, refreshDraft, refreshMessages, stopStream, updateMessages, updateRun]
  )

  const applyEvent = useCallback(
    (event: AiStreamEvent) => {
      const current = runRef.current
      if (!current) return

      switch (event.type) {
        case 'stage': {
          const stageId = current.mode === 'ask' ? 'lookup' : event.data.stage
          let stages = current.stages
          if (stageId === 'queue') {
            // Queued behind other teachers' runs: shown first, the run's own steps wait until it starts.
            updateRun({
              ...current,
              stages: [
                { id: 'queue', title: STAGE_TITLES.queue, state: 'running', detail: event.data.summary ?? undefined },
                ...stages
                  .filter((stage) => stage.id !== 'queue')
                  .map((stage) => (stage.state === 'running' ? { ...stage, state: 'pending' as const } : stage)),
              ],
            })
            return
          }
          if (
            current.mode !== 'ask' &&
            (stageId === 'explore' || stageId === 'plan' || stageId === 'write') &&
            event.data.status !== 'done'
          ) {
            stages = finishBefore(stages, stageId)
          }
          let detail: string | undefined
          if (stageId === 'explore') detail = event.data.summary ?? undefined
          if (stageId === 'plan' && event.data.status === 'done') {
            const cells = event.data.cells ?? 0
            detail = `${cells} ô${event.data.degraded ? ' · rút gọn' : ''}${event.data.mimic ? ' · mô phỏng' : ''}`
          }
          updateRun({
            ...current,
            stages: withStage(stages, stageId, {
              title: STAGE_TITLES[stageId] ?? stageId,
              state: event.data.status === 'done' ? 'done' : 'running',
              ...(detail !== undefined ? { detail } : {}),
            }),
          })
          return
        }
        case 'tool': {
          const line = toolLine(event.data)
          const item: AiTraceItem = {
            id: `tool-${crypto.randomUUID()}`,
            label: line.label,
            detail: line.detail,
            state: 'done',
          }
          updateRun({
            ...current,
            trace:
              current.mode === 'ask'
                ? [...current.trace, line.detail ? `${line.label} · ${line.detail}` : line.label]
                : current.trace,
            stages: addTraceItem(current.stages, item),
          })
          return
        }
        case 'slot': {
          const label = event.data.revise && event.data.number
            ? `Đang sửa câu ${event.data.number}`
            : `Đang soạn câu ${event.data.index}/${event.data.total}`
          const detail = [
            event.data.section,
            event.data.difficulty ? DIFFICULTY_LABELS[event.data.difficulty as AiDifficulty] : null,
          ]
            .filter(Boolean)
            .join(' · ')
          const item: AiTraceItem = { id: 'slot', label, detail: detail || undefined, state: 'running' }
          const stages = finishBefore(current.stages, 'write')
          updateRun({
            ...current,
            stages: withStage(stages, 'write', {
              state: 'running',
              detail: `${event.data.index}/${event.data.total} câu`,
              items: [...(stages.find((stage) => stage.id === 'write')?.items ?? []).filter((entry) => entry.id !== 'slot'), item],
            }),
          })
          return
        }
        case 'draft': {
          // The words of the unit being written; a new unit or a new attempt starts over.
          const previous = current.draft
          const continuing = previous !== null && previous.unit === event.data.unit && !event.data.reset
          const draft: LiveDraft = {
            unit: event.data.unit,
            section: event.data.section,
            positions: event.data.positions,
            text: (continuing ? previous.text : '') + event.data.text,
          }
          const tail = liveDraftTail(liveDraftView(draft.text))
          const stages = finishBefore(current.stages, 'write')
          const items = (stages.find((stage) => stage.id === 'write')?.items ?? []).filter((entry) => entry.id !== 'draft')
          updateRun({
            ...current,
            draft,
            stages: withStage(stages, 'write', {
              state: 'running',
              items: tail ? [...items, { id: 'draft', label: 'Đang viết', detail: tail, state: 'running' }] : items,
            }),
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
          updateRun({ ...current, stages: markAllDone(current.stages) })
          return
        }
        case 'end': {
          updateRun({ ...current, stages: markAllDone(current.stages) })
          void finishRun(event, activeIdRef.current ?? '')
          return
        }
        case 'error': {
          updateRun({ ...current, stages: markAllDone(current.stages) })
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
          void refreshDraft(conversationId)
          updateRun(null)
          stopStream()
        }
      }, runMode === 'ask' ? 120_000 : 600_000)
    },
    [refreshDraft, refreshMessages, stopStream, updateRun]
  )

  /**
   * Opens the stream and waits until the replay of older events is over, so nothing from a past run leaks in.
   * esumeFrom follows a run already going (the page was opened or reloaded during it): the stream starts right
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
      if (conversationMode) setMode(conversationMode)
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
        updateMessages(serverMessages.map(mapMessage))
        updateDraft(draftResponse)
        // A run still going (the page was reloaded, or the exam opened during it) is followed again from its start,
        // so its stages, tool calls and new questions keep showing and it can be stopped.
        const active = draftResponse.run
        if (active && !runRef.current) {
          updateRun({
            mode: active.mode,
            messageId: null,
            jobId: null,
            stages: initialStages(active.mode),
            trace: [],
            itemIds: [],
            knownAssistantIds: messagesRef.current
              .filter((message) => message.role === 'assistant')
              .map((message) => message.id),
            draft: null,
          })
          void beginStream(conversationId, active.afterEventId)
          armRunTimer(conversationId, active.mode)
        }
      } catch (error) {
        if (activeIdRef.current === conversationId) setNotice(errorMessage(error))
      } finally {
        if (activeIdRef.current === conversationId) setDraftLoading(false)
      }
    },
    [armRunTimer, beginStream, clearRunTimer, stopStream, updateDraft, updateMessages, updateRun]
  )

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true)
    try {
      const page = await getAiConversations()
      updateConversations(page.content ?? [])
      if (autoSelectRef.current && !activeIdRef.current && page.content?.[0]) {
        void loadConversation(page.content[0].id)
      }
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setConversationsLoading(false)
    }
  }, [loadConversation, updateConversations])

  const loadPapers = useCallback(async () => {
    papersTriedRef.current = true
    setPapersLoading(true)
    setPapersError(null)
    try {
      const sources = await getBankSources()
      const options = sources
        .filter((source) => source.status === 'DONE')
        .map((source) => ({
          id: source.id,
          label: source.year ? `${source.title} · ${source.year}` : source.title,
        }))
      setPapers(options)
      if (options.length === 0) {
        setPapersError('Ngân hàng chưa có đề đã đọc xong.')
        return
      }
      setSettings((previous) =>
        options.some((option) => option.id === previous.bankSourceId)
          ? previous
          : { ...previous, bankSourceId: options[0].id }
      )
    } catch (error) {
      setPapersError(errorMessage(error))
    } finally {
      setPapersLoading(false)
    }
  }, [])

  useEffect(() => {
    // The first fetch starts the request lifecycle; its loading flags drive the skeletons.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    // Same lifecycle, started the first time the teacher picks a bank-based mode.
    if (mode === 'mock-exam' && !papersTriedRef.current) void loadPapers()
  }, [mode, loadPapers])

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

  const buildConfig = useCallback(
    (text: string, revise?: AiRevisedItem[], document?: AiSheetDocument): AiSendConfig | undefined => {
      if (revise) {
        return { examFormat: settings.examFormat, solutionStyle: settings.solutionStyle, instruction: text, items: revise }
      }
      if (mode === 'ask') return document ? { document } : undefined
      return {
        examFormat: settings.examFormat,
        questionCount: settings.questionCount === 'full' ? 'full' : settings.questionCount,
        difficultyMix: {
          DE: settings.difficulty === 'DE' ? 1 : 0,
          TB: settings.difficulty === 'TB' ? 1 : 0,
          KHO: settings.difficulty === 'KHO' ? 1 : 0,
        },
        bankRatio: settings.bankRatio,
        solutionStyle: settings.solutionStyle,
        instruction: text,
        ...(mode === 'mock-exam' && settings.bankSourceId
          ? { bankSourceId: settings.bankSourceId }
          : {}),
      }
    },
    [mode, settings]
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
          const conversation = await createAiConversation({ title })
          updateConversations([conversation, ...conversationsRef.current])
          if (generationRef.current !== generation || activeIdRef.current) return null
          activeIdRef.current = conversation.id
          setActiveId(conversation.id)
          setCreatedConversationId(conversation.id)
          updateMessages([])
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
    [refreshDraft, updateConversations, updateDraft, updateMessages]
  )

  const startRun = useCallback(
    async (text: string, runMode: AiAssistantMode = mode, revise?: AiRevisedItem[], document?: AiSheetDocument) => {
      if (sendingRef.current || runRef.current) return
      sendingRef.current = true
      cancelRequestedRef.current = false
      setSending(true)
      setNotice(null)
      const knownAssistantIds = messagesRef.current
        .filter((message) => message.role === 'assistant')
        .map((message) => message.id)
      const localUserId = `local-${crypto.randomUUID()}`

      try {
        let conversationId = activeIdRef.current
        if (!conversationId) {
          conversationId = await ensureConversation(titleFromText(text))
          // The teacher opened another exam while this one was being created: the request is dropped.
          if (!conversationId) {
            sendingRef.current = false
            setSending(false)
            return
          }
        }

        updateMessages([
          ...messagesRef.current,
          {
            id: localUserId,
            role: 'user',
            body: text,
            createdAt: new Date().toISOString(),
          },
        ])
        const initialRun: AiRun = {
          mode: runMode,
          messageId: null,
          jobId: null,
          stages: initialStages(runMode),
          trace: [],
          itemIds: [],
          knownAssistantIds,
          draft: null,
        }
        updateRun(initialRun)
        // A new compose run replaces the draft; a revise run rewrites some of its questions in place.
        if (runMode !== 'ask' && runMode !== 'revise' && draftRef.current) {
          updateDraft({ ...draftRef.current, items: [] })
        }

        const synced = beginStream(conversationId)
        await synced

        const sent = await sendAiMessage(conversationId, {
          content: text,
          mode: runMode,
          config: buildConfig(text, runMode === 'revise' ? revise : undefined, document),
        })
        const running = runRef.current
        if (running) {
          updateRun({ ...running, messageId: sent.messageId, jobId: sent.jobId })
        }
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
      } catch (error) {
        stopStream()
        clearRunTimer()
        updateRun(null)
        updateMessages(
          messagesRef.current.filter((message) => message.id !== localUserId || message.role !== 'user')
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
          },
        ])
        setNotice(errorMessage(error))
        sendingRef.current = false
        setSending(false)
      }
    },
    [
      armRunTimer,
      beginStream,
      buildConfig,
      clearRunTimer,
      ensureConversation,
      mode,
      stopStream,
      updateDraft,
      updateMessages,
      updateRun,
    ]
  )

  /**
   * Sends the composer's text. `revise` (the questions "Sửa câu 2" names) makes it a revise run; `document` (the exam
   * on the sheet) goes with an ask, so the assistant reads what the teacher sees.
   */
  const send = useCallback(
    (extra?: { revise?: AiRevisedItem[]; document?: AiSheetDocument }) => {
      const text = value.trim()
      if (!text || sendingRef.current || runRef.current) return
      setValue('')
      const revise = extra?.revise
      void startRun(text, revise?.length ? 'revise' : mode, revise, extra?.document)
    },
    [mode, startRun, value]
  )

  /** A step the page took for the run going on (the answer key written again), shown with the run's own steps. */
  const addRunStep = useCallback(
    (label: string, detail?: string) => {
      const current = runRef.current
      if (!current) return
      updateRun({
        ...current,
        stages: addTraceItem(current.stages, { id: `step-${crypto.randomUUID()}`, label, detail, state: 'done' }),
      })
    },
    [updateRun]
  )

  const regenerate = useCallback(() => {
    if (sendingRef.current || runRef.current) return
    const lastAssistant = [...messagesRef.current].reverse().find((message) => message.role === 'assistant')
    const lastUser = [...messagesRef.current].reverse().find((message) => message.role === 'user')
    if (!lastUser) return
    const lastMode = normalizeMode(lastAssistant?.mode) ?? mode
    // A request to rewrite numbered questions needs those questions looked up again; composing it anew would
    // replace the whole exam.
    if (lastMode === 'revise' || revisedNumbers(lastUser.body)) {
      setNotice('Hãy nhắn lại yêu cầu sửa câu để trợ lý sửa lại.')
      return
    }
    void startRun(lastUser.body, lastMode)
  }, [mode, startRun])

  const cancel = useCallback(() => {
    const conversationId = activeIdRef.current
    if (!conversationId || (!runRef.current && !sendingRef.current)) return
    cancelRequestedRef.current = sendingRef.current
    setCancelling(true)
    void cancelAiRun(conversationId)
      .then((cancelled) => {
        const handle = streamRef.current
        if (!cancelled && (!handle || !handle.opened)) {
          void finishRun({ type: 'end', data: { status: 'CANCELLED' } }, conversationId)
          return
        }
        if (cancelTimerRef.current !== null) window.clearTimeout(cancelTimerRef.current)
        cancelTimerRef.current = window.setTimeout(() => {
          if (runRef.current) {
            setNotice('Đã gửi yêu cầu dừng nhưng máy chủ chưa phản hồi.')
            void finishRun({ type: 'end', data: { status: 'CANCELLED' } }, conversationId)
          }
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
    updateMessages([])
    updateDraft(null)
    updateRun(null)
    setValue('')
    setSending(false)
    setCancelling(false)
    sendingRef.current = false
    setDraftLoading(false)
    setNotice(null)
  }, [clearRunTimer, stopStream, updateDraft, updateMessages, updateRun])

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

  const running = Boolean(run) || sending
  const canStop = Boolean(activeConversation) && running

  return {
    conversations,
    conversationsLoading,
    activeId,
    activeConversation,
    messages,
    paper,
    numberOf,
    draftLoading,
    mode,
    value,
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
    setMode,
    setValue,
    setSettings,
    setNotice,
    send,
    regenerate,
    addRunStep,
    cancel,
    ensureConversation,
    startNew,
    selectConversation,
    renameConversation,
    deleteConversation,
    reloadConversations: loadConversations,
    reloadPapers: loadPapers,
    updateQuestion,
    toggleKeep,
    deleteItem,
    moveItem,
    addManual,
    stages: run?.stages ?? [],
    /** What the run going on does (ask, compose, mock exam); null when none is. */
    runMode: run?.mode ?? null,
    rewrites,
    /** The unit the AI is writing now, shown on the sheet until its checked question arrives. */
    liveDraft: run?.draft ?? null,
    /** The question this run added last, for following the writing on the sheet. */
    lastItemId: run?.itemIds.at(-1) ?? null,
    trace: run?.trace ?? [],
  }
}
