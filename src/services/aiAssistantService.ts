import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL, getAccessToken, refreshAfterUnauthorized, request } from '../lib/api'

/** 'revise' is a compose run that rewrites named questions ("Sửa câu 2"); the composer never offers it as a mode. */
export type AiAssistantMode = 'ask' | 'compose' | 'mock-exam' | 'revise'
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
  /** The AI could not write this question; it holds its place on the exam with `failure` saying why. */
  failed?: boolean | null
  failure?: string | null
  /** A full solution's method ("Phương pháp giải"); absent from a short one. */
  method?: string | null
  /** A full solution's reason each wrong option is wrong, by option label. */
  eliminations?: Record<string, string> | null
  options?: AiQuestionOption[] | null
  sourceQuestionId?: string | null
  /** Set on a question reused from the bank: the paper it came from. */
  sourceTitle?: string | null
  /** Signed URL of the question figure, present on a reused bank question that has one. */
  imageUrl?: string | null
  /** Signed URL of the figure of the shared passage. */
  passageImageUrl?: string | null
  /** A chart the AI drew data for, shown with the question (Tư duy khoa học). */
  chart?: AiChart | null
  /** The chart of the shared passage; every question of the group carries it. */
  passageChart?: AiChart | null
}

/**
 * Chart data as the server checked it (`ai/compose/ChartSpec` on the backend reads the same JSON, field for field):
 * - bar, line, pie: numbers over labelled categories, one value per category in every series.
 * - function: the graph of one to three functions y = f(x) in the window xMin..xMax by yMin..yMax, with optional
 *   labelled points and asymptotes ({ x: a } is the vertical line x = a, { y: b } the horizontal line y = b), all inside
 *   the window. An expression uses x, numbers with a decimal point, + - * / ^, parentheses, sqrt abs sin cos tan ln
 *   log exp (argument in parentheses), pi and e; ^ groups to the right and binds tighter than a leading minus
 *   (-x^2 is -(x^2)); a product may leave out its * before a name or "(" (2x, 3(x+1), x sin(x)) and then reads like *
 *   and /, left to right; log is base 10, ln natural.
 * - variation: a variation table (bảng biến thiên). `xValues` (2 to 9, increasing, "-∞" first and "+∞" last when
 *   there) head the columns; `signs` is the f'(x) row read left to right, at xValues[0], on the interval to
 *   xValues[1], at xValues[1], and so on (one entry fewer than twice the x values): "", "0" or "||" (undefined) at an
 *   x value, "+", "-" or "0" on an interval; `values` holds f, or its limit, at each x value: "||" where f is
 *   undefined, "a||b" there with its limit a from the left and b from the right. The arrows follow the signs. `name`
 *   ("f", or "y" for the rows y' and y) names the function.
 */
export type AiChart = AiDataChart | AiFunctionChart | AiVariationChart

export interface AiDataChart {
  type: 'bar' | 'line' | 'pie'
  title?: string
  xLabel?: string
  yLabel?: string
  categories: string[]
  series: { name: string; values: number[] }[]
}

export interface AiFunctionChart {
  type: 'function'
  title?: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  functions: { expression: string; label?: string }[]
  points?: { x: number; y: number; label?: string }[]
  asymptotes?: ({ x: number } | { y: number })[]
}

export interface AiVariationChart {
  type: 'variation'
  title?: string
  name?: string
  xValues: string[]
  signs: string[]
  values: string[]
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
  /** Set on this page when the AI rewrote the item ("Sửa câu 2"); grows with each rewrite, never saved. */
  revision?: number
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

/** A compose run still queued or going when the draft was read. */
export interface AiActiveRun {
  mode: 'compose' | 'mock-exam'
  status: 'PENDING' | 'RUNNING'
  progress: string | null
  /** The conversation's last event before the run began: following the stream from it replays this run only. */
  afterEventId: string
}

export interface AiDraftResponse {
  draft: AiExamDraftRecord
  items: AiDraftItem[]
  run?: AiActiveRun | null
}

export interface AiSendConfig {
  subjectId?: string
  examFormat?: AiExamFormat
  questionCount?: number | 'full'
  difficultyMix?: Partial<Record<AiDifficulty, number>>
  bankRatio?: number
  instruction?: string
  bankSourceId?: string
  /** Full: method, step-by-step solution and why each wrong option is wrong. Short: a few sentences. */
  solutionStyle?: AiSolutionStyle
  /** The questions a revise run rewrites, each with the number the page prints for it. */
  items?: AiRevisedItem[]
  /** Ask mode: the exam on the sheet. */
  document?: AiSheetDocument
}

/**
 * A question to rewrite, by the number the sheet prints: its draft item when the AI wrote it, and its words as the
 * sheet shows them (with the passage above as `context`), which a question the teacher typed alone has.
 */
export interface AiRevisedItem {
  itemId?: string
  number: number
  text?: string
  context?: string
}

/** The exam on the teacher's sheet, sent with an ask message so the assistant reads what the teacher sees. */
export interface AiSheetDocument {
  outline: string
  questions: Array<{ number: number; text: string }>
}

export type AiSolutionStyle = 'full' | 'short'

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
        /** What the plan changed about the request, e.g. a count cut to the exam's size. */
        notes?: string[] | null
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
        /** A revise run's slot: the question being rewritten, by its printed number. */
        revise?: boolean
        number?: number
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
        /** The item was rewritten in place by a revise run; `number` is the "Câu n" it was asked by. */
        revised?: boolean
        number?: number
      }
    }
  | {
      /** Words of the unit (a question or a passage group) the AI is writing, sent as they come. */
      type: 'draft'
      data: {
        unit: number
        section: string
        positions: number[]
        groupKey?: string | null
        attempt: number
        /** The text written since the previous draft event of the unit. */
        text: string
        /** A new attempt: what was shown of the unit so far is dropped. */
        reset?: boolean
      }
    }
  | { type: 'answer'; data: { messageId: string; text: string } }
  /** A question only the sheet holds, rewritten ("Sửa câu 5"): the page writes it over that question. */
  | { type: 'rewrite'; data: { number: number; question: AiDraftQuestion; check?: AiCheckResult | null } }
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
const EVENT_TYPES = new Set(['stage', 'tool', 'slot', 'draft', 'item', 'rewrite', 'answer', 'end', 'error'])
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

/** A piece of the sheet the teacher selected, rewritten as they ask ("Nhờ AI sửa"); formulas between $...$. */
export async function rewriteAiSelection(
  conversationId: string,
  body: { selection: string; context?: string; instruction: string }
): Promise<string> {
  const result = requireData(
    await request<{ text: string }>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/rewrite`, {
      auth: true,
      method: 'POST',
      body,
    }),
    'Trợ lý AI chưa sửa được đoạn này.'
  )
  return result.text
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

/** Where a draft question stands with the question bank: its subject there and the bank question it became. */
export interface AiBankLink {
  itemId: string
  /** Null when no subject is known for the question: it cannot be saved. */
  subjectId: string | null
  /** Null until the question is saved to the bank. */
  questionId: string | null
}

export type AiBankResult = 'SAVED' | 'ALREADY_SAVED' | 'SKIPPED'

/** One draft question after "Lưu vào ngân hàng": the bank question it is, or why it was left out. */
export interface AiBankItem {
  itemId: string
  result: AiBankResult
  questionId: string | null
  reason: string | null
}

export async function getAiDraftBankLinks(conversationId: string): Promise<AiBankLink[]> {
  const result = requireData(
    await request<{ items: AiBankLink[] }>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/bank`, {
      auth: true,
    }),
    'Không tải được trạng thái lưu vào ngân hàng.'
  )
  return result.items ?? []
}

/** Saves the questions to the bank, in review; without `itemIds`, every question the draft keeps. */
export async function saveAiDraftToBank(conversationId: string, itemIds?: string[]): Promise<AiBankItem[]> {
  const result = requireData(
    await request<{ items: AiBankItem[] }>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/bank`, {
      auth: true,
      method: 'POST',
      body: itemIds ? { itemIds } : {},
      timeoutMs: 120_000,
    }),
    'Không lưu được câu hỏi vào ngân hàng.'
  )
  return result.items ?? []
}

export type AiQuizTarget = 'EXAM' | 'CHAPTER' | 'LESSON' | 'QUICK'

/** Where the new quiz hangs (EXAM: a main course; CHAPTER: a chapter; LESSON, QUICK: a lesson) and what it takes. */
export interface AiQuizExport {
  type: AiQuizTarget
  courseId?: string
  chapterId?: string
  lessonId?: string
  title?: string
  durationMinutes?: number
  /** Without it, every written question the draft keeps. */
  itemIds?: string[]
}

/** The draft quiz made from the exam, and the questions left out with why. */
export interface AiExportedQuiz {
  quizId: string
  type: AiQuizTarget
  title: string
  questionCount: number
  skipped: Array<{ itemId: string; reason: string }>
}

export async function exportAiDraftToQuiz(conversationId: string, body: AiQuizExport): Promise<AiExportedQuiz> {
  return requireData(
    await request<AiExportedQuiz>(`${BASE}/conversations/${encodeURIComponent(conversationId)}/draft/quiz`, {
      auth: true,
      method: 'POST',
      body,
      timeoutMs: 120_000,
    }),
    'Không xuất được đề thành quiz.'
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
