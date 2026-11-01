import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL, getAccessToken, refreshAfterUnauthorized, request } from '../lib/api'

export type AiAssistantMode = 'ask' | 'compose' | 'mock-exam'
export type AiDifficulty = 'DE' | 'TB' | 'KHO'
export type AiExamFormat = 'VACT_2025' | 'VACT_2018'
export type AiDraftSource = 'AI' | 'BANK' | 'MANUAL'

export interface AiConversation {
  id: string
  ownerId?: string
  title: string
  subjectId: string | null
  mode?: AiAssistantMode | string | null
  createdAt: string
  updatedAt: string
}

export interface AiConversationPage {
  content: AiConversation[]
  pageNumber?: number
  pageSize?: number
  totalElements?: number
  totalPages?: number
  last?: boolean
}

export interface AiAgentStep {
  type: 'THINKING' | 'TOOL_CALL' | 'TOOL_RESULT' | 'FINAL' | string
  iteration?: number | null
  text?: string | null
  toolName?: string | null
  arguments?: unknown
  resultSize?: number | null
}

export interface AiMessage {
  id: string
  conversationId?: string
  role: 'USER' | 'ASSISTANT'
  mode?: AiAssistantMode | string | null
  content: string
  trace?: AiAgentStep[] | string[] | null
  createdAt: string
}

export interface AiSent {
  messageId: string
  jobId: string | null
}

export interface AiQuestionOption {
  label: string
  text: string
  correct?: boolean
}

/** A question as the AI writes it, and as the draft item stores it. */
export interface AiDraftQuestion {
  partCode?: string | null
  partName?: string | null
  patternCode?: string | null
  patternName?: string | null
  difficulty?: AiDifficulty | string | null
  questionType?: string | null
  hasFigure?: boolean | null
  hasFormula?: boolean | null
  text: string
  passage?: string | null
  explanation?: string | null
  options?: AiQuestionOption[] | null
  sourceQuestionId?: string | null
  /** Set on a question reused from the bank: the paper it came from. */
  sourceTitle?: string | null
  /** Signed URL of the question figure, present on a reused bank question that has one. */
  imageUrl?: string | null
  /** Signed URL of the figure of the shared passage. */
  passageImageUrl?: string | null
}

export interface AiCheckResult {
  passed?: boolean
  needsReview?: boolean
  attempts?: number
  source?: string | null
  reasons?: string[] | null
  warnings?: string[] | null
  skipped?: string[] | null
  labelPattern?: string | null
  labelConfidence?: number | null
  reviewedAnswer?: unknown
}

export interface AiDraftItem {
  id: string
  draftId?: string
  sectionCode: string
  groupKey: string | null
  position: number
  question: AiDraftQuestion
  source: AiDraftSource
  kept: boolean
  checkResult: AiCheckResult | null
  createdAt?: string
  updatedAt?: string
}

export interface AiExamDraftRecord {
  id: string
  conversationId?: string
  name: string
  examFormat: AiExamFormat | string
  status: 'DRAFT' | string
  config?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface AiDraftResponse {
  draft: AiExamDraftRecord
  items: AiDraftItem[]
}

export interface AiSendConfig {
  subjectId?: string
  examFormat?: AiExamFormat
  questionCount?: number | 'full'
  difficultyMix?: Partial<Record<AiDifficulty, number>>
  bankRatio?: number
  instruction?: string
  bankSourceId?: string
}

export interface CreateAiConversation {
  title: string
  subjectId?: string
}

export type AiStreamStage = 'explore' | 'plan' | 'write' | 'Tra cứu' | string

export type AiStreamEvent =
  | {
      type: 'stage'
      data: {
        stage: AiStreamStage
        status?: 'running' | 'done'
        summary?: string | null
        cells?: number | null
        degraded?: boolean | null
        mimic?: boolean | null
      }
    }
  | { type: 'tool'; data: { tool: string; iteration?: number | null; arguments?: unknown } }
  | {
      type: 'slot'
      data: {
        stage: 'write' | string
        status?: 'running' | string
        index: number
        total: number
        position?: number | null
        section?: string | null
        group?: string | null
        pattern?: string | null
        difficulty?: AiDifficulty | string | null
        source?: AiDraftSource | string | null
      }
    }
  | {
      type: 'item'
      data: {
        stage: 'write' | string
        status: 'saved' | string
        itemId: string
        section: string
        group?: string | null
        position: number
        source: AiDraftSource
        question: AiDraftQuestion
        check?: AiCheckResult | null
      }
    }
  | { type: 'answer'; data: { messageId: string; text: string } }
  | {
      type: 'end'
      data: {
        status: 'DONE' | 'CANCELLED' | string
        written?: number | null
        reused?: number | null
        needsReview?: number | null
      }
    }
  | { type: 'error'; data: { message: string } }

const BASE = '/api/v1/ai-assistant'
const EVENT_TYPES = new Set(['stage', 'tool', 'slot', 'item', 'answer', 'end', 'error'])
const MAX_RETRIES = 5
const RETRY_MS = 2000

const requireData = <T>(response: { data?: T }, message: string): T => {
  if (response.data === undefined) throw new Error(message)
  return response.data
}

export async function getAiConversations(page = 0, size = 50): Promise<AiConversationPage> {
  return requireData(
    await request<AiConversationPage>(`${BASE}/conversations?page=${page}&size=${size}`, { auth: true }),
    'Không tải được danh sách cuộc trò chuyện.'
  )
}

export async function createAiConversation(body: CreateAiConversation): Promise<AiConversation> {
  return requireData(
    await request<AiConversation>(`${BASE}/conversations`, { auth: true, method: 'POST', body }),
    'Không tạo được cuộc trò chuyện.'
  )
}

export async function renameAiConversation(id: string, title: string): Promise<void> {
  await request(`${BASE}/conversations/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'PATCH',
    body: { title },
  })
}

export async function deleteAiConversation(id: string): Promise<void> {
  await request(`${BASE}/conversations/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' })
}

export async function getAiMessages(conversationId: string): Promise<AiMessage[]> {
  return requireData(
    await request<AiMessage[]>(
      `${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { auth: true }
    ),
    'Không tải được tin nhắn.'
  )
}

export async function sendAiMessage(
  conversationId: string,
  body: { content: string; mode: AiAssistantMode; config?: AiSendConfig }
): Promise<AiSent> {
  return requireData(
    await request<AiSent>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      auth: true,
      method: 'POST',
      body,
    }),
    'Không gửi được tin nhắn.'
  )
}

export async function cancelAiRun(conversationId: string): Promise<boolean> {
  const response = await request<boolean>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/cancel`,
    { auth: true, method: 'POST' }
  )
  return response.data === true
}

export async function getAiDraft(conversationId: string): Promise<AiDraftResponse> {
  return requireData(
    await request<AiDraftResponse>(
      `${BASE}/conversations/${encodeURIComponent(conversationId)}/draft`,
      { auth: true }
    ),
    'Không tải được bản nháp đề.'
  )
}

export type AiDocumentMode = 'STRUCTURED' | 'FREE'

/** The editor document of a conversation: Tiptap JSON plus the version the next save must name. */
export interface AiDocument {
  mode: AiDocumentMode
  content: Record<string, unknown> | null
  version: number
  updatedAt: string | null
}

export async function getAiDocument(conversationId: string): Promise<AiDocument> {
  return requireData(
    await request<AiDocument>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/document`, { auth: true }),
    'Không tải được tài liệu đề.'
  )
}

/** Saves over `version`; a newer save from elsewhere is a 409 `ApiError` whose `data` is that newer document. */
export async function saveAiDocument(
  conversationId: string,
  body: { mode: AiDocumentMode; content: Record<string, unknown>; version: number }
): Promise<AiDocument> {
  return requireData(
    await request<AiDocument>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/document`, {
      auth: true,
      method: 'PUT',
      body,
    }),
    'Không lưu được tài liệu đề.'
  )
}

export async function updateAiDraftQuestion(
  conversationId: string,
  itemId: string,
  question: AiDraftQuestion
): Promise<void> {
  await request(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/items/${encodeURIComponent(itemId)}/question`,
    { auth: true, method: 'PATCH', body: { question } }
  )
}

export async function setAiDraftItemKept(
  conversationId: string,
  itemId: string,
  kept: boolean
): Promise<void> {
  await request(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/items/${encodeURIComponent(itemId)}/keep`,
    { auth: true, method: 'PATCH', body: { kept } }
  )
}

export async function reorderAiDraftItems(
  conversationId: string,
  sectionCode: string,
  itemIds: string[]
): Promise<void> {
  await request(`${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/items/reorder`, {
    auth: true,
    method: 'PUT',
    body: { sectionCode, itemIds },
  })
}

export async function addAiDraftItem(
  conversationId: string,
  body: { sectionCode: string; groupKey?: string | null; question: AiDraftQuestion }
): Promise<AiDraftItem | null> {
  const response = await request<AiDraftItem>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/items`,
    { auth: true, method: 'POST', body }
  )
  return response.data ?? null
}

export async function removeAiDraftItem(conversationId: string, itemId: string): Promise<void> {
  await request(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/items/${encodeURIComponent(itemId)}`,
    { auth: true, method: 'DELETE' }
  )
}

/** The stream cannot be followed (forbidden, gone, or kept failing): the caller stops waiting on it. */
export class AiStreamUnavailable extends Error {}
class Ended extends Error {}
class TryAgain extends Error {}

export interface AiStreamOptions {
  /** The last event already handled; the server replays what came after it. */
  after?: string | null
  signal: AbortSignal
  onEvent: (event: AiStreamEvent, id: string | null) => void
  /** The connection is open and the replay has started. */
  onOpen?: () => void
  /** True while reading the replay of older runs: their end/error must not close the connection. */
  isReplaying?: () => boolean
}

/**
 * Follows a conversation's stream (stage, tool, slot, item, answer, end, error). Every event carries a persisted id, so a
 * dropped connection reconnects from the last one it saw. Resolves at `end`/`error` or when `signal` aborts; rejects with
 * {@link AiStreamUnavailable} when the stream cannot be followed.
 */
export async function followAiConversation(
  conversationId: string,
  { after, signal, onEvent, onOpen, isReplaying }: AiStreamOptions
): Promise<void> {
  let retries = 0
  try {
    await fetchEventSource(
      `${API_BASE_URL}${BASE}/conversations/${encodeURIComponent(conversationId)}/stream`,
      {
        signal,
        openWhenHidden: true,
        headers: after ? { 'Last-Event-ID': after } : undefined,
        // the token is read at each connection, so one refreshed meanwhile is used
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            credentials: 'same-origin',
            headers: {
              ...(init?.headers as Record<string, string>),
              Authorization: `Bearer ${getAccessToken() ?? ''}`,
            },
          }),
        async onopen(response) {
          if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
            retries = 0
            onOpen?.()
            return
          }
          if (response.status === 401 && (await refreshAfterUnauthorized())) throw new TryAgain()
          throw new AiStreamUnavailable(`stream answered ${response.status}`)
        },
        onmessage(message) {
          if (!EVENT_TYPES.has(message.event) || !message.data) return
          let event: AiStreamEvent
          try {
            event = { type: message.event, data: JSON.parse(message.data) } as AiStreamEvent
          } catch {
            return
          }
          onEvent(event, message.id || null)
          if ((event.type === 'end' || event.type === 'error') && !isReplaying?.()) throw new Ended()
        },
        onclose() {
          // the server closed before an end (its time limit): connect again from the last id
          throw new TryAgain()
        },
        onerror(error) {
          if (error instanceof Ended || error instanceof AiStreamUnavailable) throw error
          retries += 1
          if (retries > MAX_RETRIES) throw new AiStreamUnavailable('the stream kept failing')
          return RETRY_MS
        },
      }
    )
  } catch (error) {
    if (error instanceof Ended || signal.aborted) return
    throw error instanceof AiStreamUnavailable ? error : new AiStreamUnavailable(String(error))
  }
}
