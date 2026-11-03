import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'
import JSZip from 'jszip'
import type { UserRole } from '../../src/services/userService'
import { installQuizFixture } from './quiz-permissions-fixture'

// The AI assistant pages talk to /api/v1/ai-assistant only. The fixture below answers
// those calls and writes one scripted run to the event stream, so the browser tests
// cover the contract without a live backend.

const BASE = '/api/v1/ai-assistant'
const stamp = '2026-11-01T08:00:00Z'

interface Conversation {
  id: string
  title: string
  subjectId: string | null
  mode: string | null
  createdAt: string
  updatedAt: string
}

interface DraftItem {
  id: string
  draftId: string
  sectionCode: string
  groupKey: string | null
  position: number
  question: Record<string, unknown>
  source: string
  kept: boolean
  checkResult: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

interface Draft {
  draft: Record<string, unknown>
  items: DraftItem[]
}

type DocumentMode = 'STRUCTURED' | 'FREE'

/** A conversation's editor document, as GET and PUT …/document carry it. */
interface FixtureDocument {
  mode: DocumentMode
  content: Record<string, unknown> | null
  version: number
  updatedAt: string | null
}

/** The server's answer for a conversation whose document was never saved. */
const NO_DOCUMENT: FixtureDocument = { mode: 'STRUCTURED', content: null, version: 0, updatedAt: null }

// Tiptap JSON for fixture documents, written out by hand: the page's own builders import CSS.
type DocNode = Record<string, unknown>

const run = (text: string, ...marks: Array<'bold' | 'italic'>): DocNode => ({
  type: 'text',
  text,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
})
const paragraph = (...content: DocNode[]): DocNode => ({ type: 'paragraph', ...(content.length ? { content } : {}) })
const heading = (level: 1 | 2 | 3, text: string): DocNode => ({ type: 'heading', attrs: { level }, content: [run(text)] })
const choiceGrid = (...options: string[]): DocNode => ({
  type: 'choiceGrid',
  attrs: { columns: 'auto' },
  content: options.map((text, index) => ({
    type: 'choiceCell',
    attrs: { label: 'ABCDEFGH'[index] },
    content: [run(text)],
  })),
})
/** A saved document; the page records on it which draft items it has already written in (`deliveredItems`). */
const tiptapDoc = (...content: DocNode[]) => ({ type: 'doc', attrs: { deliveredItems: [] as string[] }, content })

/** A document kept in the question-card mode: its content only holds the free text around the draft's questions. */
const structuredDocument = (title: string, itemIds: string[]): FixtureDocument => ({
  mode: 'STRUCTURED',
  content: { ...tiptapDoc(heading(1, title.toUpperCase())), attrs: { deliveredItems: itemIds } },
  version: 1,
  updatedAt: stamp,
})

const question = (text: string, difficulty = 'TB') => ({
  partCode: 'P2',
  partName: '2. Toán học',
  patternCode: 'MA.Q07',
  patternName: 'Đọc hiểu đồ thị',
  difficulty,
  questionType: 'SINGLE_CHOICE',
  hasFigure: false,
  hasFormula: false,
  text,
  passage: null,
  explanation: 'Vì vậy chọn A.',
  options: [
    { label: 'A', text: 'Đáp án đúng', correct: true },
    { label: 'B', text: 'Đáp án sai', correct: false },
    { label: 'C', text: 'Đáp án gần đúng', correct: false },
    { label: 'D', text: 'Không xác định', correct: false },
  ],
})

/** A question the backend reused from a bank paper, figure and all. */
const bankQuestion = (text: string, imageUrl: string | null) => ({
  ...question(text),
  hasFigure: Boolean(imageUrl),
  sourceQuestionId: 'bank-q-1',
  sourceTitle: 'Đề minh hoạ 2024',
  imageUrl,
  passageImageUrl: null,
})

const item = (
  conversationId: string,
  id: string,
  position: number,
  text: string,
  check: Record<string, unknown> | null = null
): DraftItem => ({
  id,
  draftId: `draft-${conversationId}`,
  sectionCode: 'P2',
  groupKey: null,
  position,
  question: question(text),
  source: 'AI',
  kept: false,
  checkResult: check,
  createdAt: stamp,
  updatedAt: stamp,
})

const bankItem = (
  conversationId: string,
  id: string,
  position: number,
  text: string,
  imageUrl: string | null
): DraftItem => ({
  ...item(conversationId, id, position, text),
  question: bankQuestion(text, imageUrl),
  source: 'BANK',
  kept: true,
})

const emptyDraft = (conversation: Conversation): Draft => ({
  draft: {
    id: `draft-${conversation.id}`,
    conversationId: conversation.id,
    name: conversation.title,
    examFormat: 'VACT_2025',
    status: 'DRAFT',
  },
  items: [],
})

const seededItems = (conversationId: string) => [
  item(conversationId, 'item-1', 1, 'Tính giá trị của biểu thức x cộng 1.', {
    needsReview: true,
    reasons: ['Đáp án chưa được đối chiếu với đề gốc.'],
  }),
  item(conversationId, 'item-2', 2, 'Rút gọn biểu thức hai x trừ x.', { passed: true }),
]

/** A server-sent event stream as the server writes it. */
const sse = (...events: [string, unknown][]) =>
  events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join('')

const composeStream = (conversationId: string) =>
  sse(
    ['stage', { stage: 'explore', status: 'running', summary: 'Đã khảo sát 120 câu' }],
    ['stage', { stage: 'plan', status: 'running' }],
    ['stage', { stage: 'plan', status: 'done', cells: 2 }],
    ['slot', { stage: 'write', status: 'running', index: 1, total: 2, section: 'Toán học', difficulty: 'TB' }],
    ['item', {
      stage: 'write',
      status: 'saved',
      itemId: 'item-1',
      section: 'P2',
      position: 1,
      source: 'AI',
      question: seededItems(conversationId)[0].question,
      check: { needsReview: true, reasons: ['Đáp án chưa được đối chiếu với đề gốc.'] },
    }],
    ['slot', { stage: 'write', status: 'running', index: 2, total: 2, section: 'Toán học', difficulty: 'KHO' }],
    ['item', {
      stage: 'write',
      status: 'saved',
      itemId: 'item-2',
      section: 'P2',
      position: 2,
      source: 'AI',
      question: seededItems(conversationId)[1].question,
      check: { passed: true },
    }],
    ['end', { status: 'DONE', written: 2, reused: 0, needsReview: 1 }]
  )

const askStream = [
  ['tool', { tool: 'tra-cuu', arguments: { query: 'đạo hàm' } }],
  ['error', { message: 'Máy chủ không xử lý được câu hỏi.' }],
] as [string, unknown][]

interface AiFixtureOptions {
  conversations?: Conversation[]
  messages?: Record<string, Record<string, unknown>[]>
  drafts?: Record<string, Draft>
  /** Editor documents by conversation id; any other conversation reads as never saved. */
  documents?: Record<string, FixtureDocument>
  /** A compose run that never ends until the test cancels it. */
  endless?: boolean
  /** The text of the `answer` event an ask run publishes, instead of its usual error. */
  askAnswer?: string
  /** A compose run already going when the page opens: the draft reports it, with the last event before it began. */
  runningAfter?: string
}

/** The running test's fixture; after the test every request must have had a handler and the page must not have thrown. */
let checkedFixture: { unmatched: string[]; pageErrors: string[] } | null = null

test.afterEach(() => {
  const fixture = checkedFixture
  checkedFixture = null
  if (!fixture) return
  expect(fixture.unmatched, 'requests without a fixture handler').toEqual([])
  expect(fixture.pageErrors, 'errors thrown in the page').toEqual([])
})

async function installAiFixture(page: Page, role: UserRole = 'MANAGER', options: AiFixtureOptions = {}) {
  const quiz = await installQuizFixture(page, role)
  checkedFixture = quiz
  const state = {
    conversations: [...(options.conversations ?? [])] as Conversation[],
    messages: new Map(Object.entries(options.messages ?? {})),
    drafts: new Map(Object.entries(options.drafts ?? {})),
    documents: new Map(Object.entries(options.documents ?? {})),
    /** Set to make the next document save answer 409 once: another tab saved this content first, one version on. */
    conflictNextSave: null as Record<string, unknown> | null,
    /** While set, creating a conversation waits for it before answering. */
    creationGate: null as Promise<void> | null,
    /** This many conversation creations fail with a server error first. */
    failCreations: 0,
    /** This many document reads fail with a server error first. */
    failDocumentReads: 0,
    /** The next document save is stored, but its answer never reaches the page (the connection drops). */
    loseNextSaveAnswer: false,
    requests: [] as Array<{ method: string; path: string; body: Record<string, unknown>; lastEventId: string }>,
    mode: 'compose' as 'ask' | 'compose' | 'mock-exam',
    posted: false,
    cancelled: false,
  }

  // The subject list also reads which subjects have an exam framework; Toán has one.
  await page.route('**/api/v1/master-data/categories', (route) =>
    route.fulfill({
      json: {
        success: true,
        status: 200,
        data: [{ categoryId: 'category-1', categoryName: 'Toán', codePrefix: 'MA', versionId: 'version-1', version: '2025' }],
        message: 'OK',
      },
    })
  )
  // The dashboard the console menu starts from lists the course catalogue.
  await page.route('**/api/v1/courses/main', (route) =>
    route.fulfill({ json: { success: true, status: 200, data: [], message: 'OK' } })
  )

  await page.route('**/api/v1/ai-assistant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const body = (method === 'GET' || method === 'DELETE'
      ? {}
      : (request.postDataJSON() as Record<string, unknown> | null) ?? {}) as Record<string, unknown>
    state.requests.push({ method, path, body, lastEventId: request.headers()['last-event-id'] ?? '' })
    // Shaped like the server's ApiResponse; `code` is the stable error code some failures carry.
    const reply = (data: unknown, status = 200, message = 'OK', code?: string) =>
      route.fulfill({ status, json: { success: status < 400, status, data, message, ...(code ? { code } : {}) } })
    const unhandled = () => {
      quiz.unmatched.push(`${method} ${path}`)
      return reply(null, 501, 'Fixture has no handler')
    }

    if (path === `${BASE}/conversations`) {
      if (method === 'GET') {
        return reply({
          content: state.conversations,
          pageNumber: 0,
          pageSize: 50,
          totalElements: state.conversations.length,
          totalPages: 1,
          last: true,
        })
      }
      if (state.creationGate) await state.creationGate
      if (state.failCreations > 0) {
        state.failCreations -= 1
        return reply(null, 500, 'Máy chủ đang bận, chưa tạo được đề.')
      }
      const created: Conversation = {
        id: `conv-${state.conversations.length + 1}`,
        title: String(body.title ?? ''),
        subjectId: (body.subjectId as string | undefined) ?? null,
        mode: null,
        createdAt: stamp,
        updatedAt: stamp,
      }
      state.conversations = [created, ...state.conversations]
      state.messages.set(created.id, [])
      state.drafts.set(created.id, emptyDraft(created))
      return reply(created)
    }

    const match = path.match(/^\/api\/v1\/ai-assistant\/conversations\/([^/]+)(?:\/(.+))?$/)
    if (!match) return unhandled()
    const conversationId = decodeURIComponent(match[1])
    const action = match[2] ?? ''
    const conversation = state.conversations.find((entry) => entry.id === conversationId)
    if (!conversation) return reply(null, 404, 'Not found')

    if (!action) {
      if (method === 'PATCH') {
        conversation.title = String(body.title ?? conversation.title)
        return reply(null)
      }
      if (method === 'DELETE') {
        state.conversations = state.conversations.filter((entry) => entry.id !== conversationId)
        state.documents.delete(conversationId)
        return reply(null)
      }
    }

    // One document per conversation, saved over the version it was read at, as the server checks it.
    if (action === 'document') {
      const stored = state.documents.get(conversationId) ?? NO_DOCUMENT
      if (method === 'GET') {
        if (state.failDocumentReads > 0) {
          state.failDocumentReads -= 1
          return reply(null, 500, 'Máy chủ đang bận, chưa đọc được đề.')
        }
        return reply(stored)
      }
      if (method === 'PUT') {
        const content = body.content as Record<string, unknown> | null | undefined
        const mode = body.mode
        if ((mode !== 'STRUCTURED' && mode !== 'FREE') || typeof body.version !== 'number' || content?.type !== 'doc') {
          return reply(null, 400, 'Dữ liệu tài liệu không hợp lệ.', 'AI_ASSISTANT_INVALID')
        }
        let current = stored
        if (state.conflictNextSave) {
          current = { ...stored, content: state.conflictNextSave, version: stored.version + 1, updatedAt: stamp }
          state.conflictNextSave = null
          state.documents.set(conversationId, current)
        }
        if (body.version !== current.version) {
          return reply(
            current,
            409,
            'Tài liệu đã được cập nhật. Vui lòng tải lại phiên bản mới nhất.',
            'AI_DOCUMENT_VERSION_CONFLICT'
          )
        }
        const saved: FixtureDocument = { mode, content, version: current.version + 1, updatedAt: stamp }
        state.documents.set(conversationId, saved)
        if (state.loseNextSaveAnswer) {
          state.loseNextSaveAnswer = false
          return route.abort('failed')
        }
        return reply(saved)
      }
    }

    if (action === 'cancel') {
      state.cancelled = true
      return reply(true)
    }

    if (action === 'messages') {
      if (method === 'GET') return reply(state.messages.get(conversationId) ?? [])
      state.posted = true
      state.mode = body.mode === 'ask' || body.mode === 'mock-exam' ? body.mode : 'compose'
      const messages = state.messages.get(conversationId) ?? []
      const messageId = `user-${messages.length + 1}`
      messages.push({
        id: messageId,
        conversationId,
        role: 'USER',
        mode: body.mode,
        content: body.content,
        createdAt: stamp,
      })
      if (state.mode !== 'ask') {
        messages.push({
          id: `assistant-${messages.length + 1}`,
          conversationId,
          role: 'ASSISTANT',
          mode: body.mode,
          content: 'Mình đã soạn xong 2 câu cho phần Toán học.',
          createdAt: stamp,
        })
        const draft = state.drafts.get(conversationId) ?? emptyDraft(conversation)
        state.drafts.set(conversationId, { draft: draft.draft, items: seededItems(conversationId) })
      }
      state.messages.set(conversationId, messages)
      return reply({ messageId, jobId: 'job-1' })
    }

    if (action === 'stream') {
      // The answer is persisted like the server does, so the post-run refresh keeps it.
      if (state.posted && state.mode === 'ask' && options.askAnswer) {
        const messages = state.messages.get(conversationId) ?? []
        if (!messages.some((message) => message.id === 'assistant-ask-1')) {
          messages.push({
            id: 'assistant-ask-1',
            conversationId,
            role: 'ASSISTANT',
            mode: 'ask',
            content: options.askAnswer,
            createdAt: stamp,
          })
          state.messages.set(conversationId, messages)
        }
      }
      // Until the message is posted there is nothing to replay; the client reconnects
      // after two seconds, by which time the scripted run is ready.
      const body =
        options.runningAfter && !state.posted
          ? state.cancelled
            ? sse(['end', { status: 'CANCELLED', written: 0 }])
            : sse(
                ['stage', { stage: 'explore', status: 'running', summary: 'Đã khảo sát 120 câu' }],
                ['tool', { tool: 'search_bank_questions', arguments: { patternCode: 'MA.Q07', difficulty: 'TB', excludeIds: ['x'] } }],
                ['slot', { stage: 'write', status: 'running', index: 2, total: 2, section: 'Toán học', difficulty: 'TB' }],
                // The question being written, in two pieces cut mid-word.
                ['draft', { unit: 2, section: 'P2', positions: [2], attempt: 1, text: '{"questions":[{"stem":"Tập nghiệm của phương trình' }],
                ['draft', { unit: 2, section: 'P2', positions: [2], attempt: 1, text: ' x bình phương bằng 4 là","options":["{2}","{-2' }]
              )
          : !state.posted
          ? ''
          : state.cancelled
            ? sse(['end', { status: 'CANCELLED', written: 0 }])
            : state.mode === 'ask'
              ? options.askAnswer
                ? sse(
                    ['answer', { messageId: 'assistant-ask-1', text: options.askAnswer }],
                    ['end', { status: 'DONE' }]
                  )
                : sse(...askStream)
              : options.endless
                ? sse(['tool', { tool: 'soan-cau-hoi', arguments: { section: 'P2' } }])
                : composeStream(conversationId)
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    }

    if (action === 'draft' || action.startsWith('draft/')) {
      const draft = state.drafts.get(conversationId) ?? emptyDraft(conversation)
      const segments = action.split('/')
      if (segments.length === 1) {
        return reply(options.runningAfter && !state.cancelled
          ? { ...draft, run: { mode: 'compose', status: 'RUNNING', progress: 'Đã soạn 1/2 câu', afterEventId: options.runningAfter } }
          : draft)
      }
      if (segments[1] !== 'items') return unhandled()

      if (segments.length === 2 && method === 'POST') {
        const added: DraftItem = {
          id: `manual-${draft.items.length + 1}`,
          draftId: `draft-${conversationId}`,
          sectionCode: String(body.sectionCode ?? 'P2'),
          groupKey: null,
          position: draft.items.length + 1,
          question: (body.question as Record<string, unknown>) ?? {},
          source: 'MANUAL',
          kept: true,
          checkResult: null,
          createdAt: stamp,
          updatedAt: stamp,
        }
        draft.items.push(added)
        state.drafts.set(conversationId, draft)
        return reply(added)
      }

      if (segments.length === 3 && segments[2] === 'reorder' && method === 'PUT') {
        const itemIds = (body.itemIds as string[]) ?? []
        itemIds.forEach((id, index) => {
          const target = draft.items.find((entry) => entry.id === id)
          if (target) target.position = index + 1
        })
        return reply(null)
      }

      const target = draft.items.find((entry) => entry.id === segments[2])
      if (!target) return reply(null, 404, 'Item not found')
      if (segments[3] === 'keep' && method === 'PATCH') {
        target.kept = body.kept === true
        return reply(null)
      }
      if (segments[3] === 'question' && method === 'PATCH') {
        target.question = (body.question as Record<string, unknown>) ?? target.question
        return reply(null)
      }
      if (method === 'DELETE') {
        draft.items = draft.items.filter((entry) => entry.id !== target.id)
        return reply(null)
      }
    }

    return unhandled()
  })

  return { quiz, state }
}

type AiFixtureState = Awaited<ReturnType<typeof installAiFixture>>['state']

/** Bodies of the document saves (PUT …/document) the page sent for a conversation, oldest first. */
const documentSaves = (state: AiFixtureState, conversationId: string) =>
  state.requests
    .filter((entry) => entry.method === 'PUT' && entry.path === `${BASE}/conversations/${conversationId}/document`)
    .map((entry) => entry.body)

async function openAssistant(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  // The compose settings sit behind the "Cấu hình đề" chip; its title sums them up, with no subject in it.
  await expect(page.getByRole('button', { name: 'Cấu hình đề', exact: true })).toHaveAttribute('title', '5 câu · Trung bình')
  // The new exam's sheet takes edits once its document is ready; a click before that would not place the caret.
  await expect(docEditor(page)).toHaveAttribute('contenteditable', 'true')
}

async function sendCompose(page: Page, text = 'Soạn 2 câu đại số cơ bản') {
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill(text)
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
}

/** The editable document on the A4 sheets (free mode). */
const docEditor = (page: Page) => page.getByRole('textbox', { name: 'Nội dung đề', exact: true })

/** The paper of question cards that structured mode shows instead of the free document. */
const questionPaper = (page: Page) => page.getByRole('article', { name: 'Đề thi', exact: true })

async function openFileMenu(page: Page) {
  await page.getByRole('menubar', { name: 'Menu đề thi' }).getByRole('menuitem', { name: 'Tệp', exact: true }).click()
}

/** Tệp ▸ Chế độ đề ▸ "Giữ cấu trúc câu hỏi": the question cards replace the free document on the sheet. */
async function chooseStructuredMode(page: Page) {
  await expect(docEditor(page)).toBeVisible()
  await openFileMenu(page)
  await page.getByRole('menuitemradio', { name: 'Giữ cấu trúc câu hỏi', exact: true }).click()
  await expect(questionPaper(page)).toBeVisible()
  await expect(docEditor(page)).toHaveCount(0)
}

test('the console menu opens the assistant, whose compose settings ask for no subject', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/dashboard')

  await page.locator('aside nav').getByRole('button', { name: 'Trợ lý AI', exact: true }).click()

  await expect(page).toHaveURL(/\/console\/manager\/ai-assistant$/)
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  await page.getByRole('button', { name: 'Cấu hình đề', exact: true }).click()
  // The request names the subject ("10 câu Toán"); the settings have no subject to pick.
  await expect(page.getByText('Định dạng đề', { exact: true })).toBeVisible()
  await expect(page.getByText('Môn học', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })).toHaveAttribute('placeholder', /Soạn 10 câu Toán/)
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toBeDisabled()
  expect(state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations`)).toBe(true)
})

test('a compose run streams its stages and items into the paper', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toBeVisible()
  await expect(page.getByText('Khảo sát ngân hàng câu hỏi')).toBeVisible()
  await expect(page.getByText('Đang soạn câu 2/2', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Mình đã soạn xong 2 câu cho phần Toán học.')).toBeVisible()
  // The finished exam is offered as files, not as a jump to the sheet beside.
  await expect(page.getByRole('button', { name: 'Tải Word', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải PDF', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem trong đề' })).toHaveCount(0)

  const first = page.locator('#exam-question-item-1')
  await expect(first).toContainText('Tính giá trị của biểu thức x cộng 1.')
  await expect(first.getByText('Cần duyệt', { exact: true })).toBeVisible()
  await expect(first.getByText('Đáp án chưa được đối chiếu với đề gốc.')).toBeVisible()
  await expect(page.locator('#exam-question-item-2')).toContainText('Rút gọn biểu thức hai x trừ x.')
  await expect(page.getByRole('button', { name: 'Tới câu 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tới câu 2', exact: true })).toBeVisible()

  // Choosing the mode was the new exam's first edit: it created the conversation (named after the document's
  // heading) and saved the document under it in that mode, so the prompt went to that conversation.
  const created = state.requests.filter((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations`)
  expect(created.map((entry) => entry.body)).toEqual([{ title: 'ĐỀ THI MỚI' }])
  expect(documentSaves(state, 'conv-1')[0]).toMatchObject({ mode: 'STRUCTURED', version: 0 })
  const sent = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`)
  expect(sent?.body).toMatchObject({
    content: 'Soạn 2 câu đại số cơ bản',
    mode: 'compose',
    config: { examFormat: 'VACT_2025', questionCount: 5, bankRatio: 0.2 },
  })
  expect(sent?.body).not.toHaveProperty('config.subjectId')
})

test('an AI-written question shows its pattern by name', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)
  await sendCompose(page)

  const first = page.locator('#exam-question-item-1')
  await expect(first.getByText('Đọc hiểu đồ thị', { exact: true })).toBeVisible()
  await expect(first.getByText('MA.Q07', { exact: true })).toHaveCount(0)
})

test('a reused bank question shows its source and figure', async ({ page }) => {
  const figure =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#e2e8f0"/><text x="120" y="66" text-anchor="middle" font-family="serif" font-size="18">Hình 1</text></svg>'
    )
  const saved: Conversation = {
    id: 'conv-9',
    title: 'Đề có hình',
    subjectId: 'category-1',
    mode: 'compose',
    createdAt: stamp,
    updatedAt: stamp,
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [saved],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: 'Đề có hình', examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [bankItem('conv-9', 'bank-1', 1, 'Đọc biểu đồ nhiệt độ theo tháng.', figure)],
      },
    },
    documents: { 'conv-9': structuredDocument('Đề có hình', ['bank-1']) },
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  const card = page.locator('#exam-question-bank-1')
  await expect(card.getByText('Từ ngân hàng: Đề minh hoạ 2024', { exact: true })).toBeVisible()
  const image = card.getByRole('img', { name: 'Hình minh hoạ câu 1' })
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', figure)
  await expect(
    page
      .getByRole('article', { name: 'Đề thi' })
      .getByRole('heading', { name: 'Phần 2. Toán học', exact: true })
  ).toBeVisible()
  await page.screenshot({ path: '.playwright-mcp/tv/ai-assistant-figure-1440.png' })
})

test('a figure that fails to load is not shown', async ({ page }) => {
  const saved: Conversation = {
    id: 'conv-9',
    title: 'Đề có hình lỗi',
    subjectId: 'category-1',
    mode: 'compose',
    createdAt: stamp,
    updatedAt: stamp,
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [saved],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: 'Đề có hình lỗi', examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [bankItem('conv-9', 'bank-1', 1, 'Đọc biểu đồ độ ẩm theo tháng.', '/missing-ai13-figure.png')],
      },
    },
    documents: { 'conv-9': structuredDocument('Đề có hình lỗi', ['bank-1']) },
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  const card = page.locator('#exam-question-bank-1')
  await expect(card.getByText('Từ ngân hàng: Đề minh hoạ 2024', { exact: true })).toBeVisible()
  await expect(card.getByRole('img', { name: 'Hình minh hoạ câu 1' })).toHaveCount(0)
})

test('keeping and dropping an AI question each call the draft API', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)
  await sendCompose(page)

  const first = page.locator('#exam-question-item-1')
  const keepRequests = () => state.requests.filter((entry) => entry.method === 'PATCH' && entry.path.endsWith('/keep'))

  await first.getByRole('button', { name: 'Giữ', exact: true }).click()
  await expect.poll(() => keepRequests().at(-1)?.body).toEqual({ kept: true })
  await expect.poll(() => keepRequests().at(-1)?.path).toBe(`${BASE}/conversations/conv-1/draft/items/item-1/keep`)
  await expect(first.getByText('Đã giữ', { exact: true })).toBeVisible()

  await first.getByRole('button', { name: 'Bỏ', exact: true }).click()
  await expect.poll(() => keepRequests().at(-1)?.body).toEqual({ kept: false })
})

test('dragging a paper question reorders the draft through the API', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)
  await sendCompose(page)

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await page.getByRole('button', { name: 'Kéo câu 1 để đổi chỗ' }).dispatchEvent('dragstart', { dataTransfer })
  await page.locator('#exam-question-item-2').dispatchEvent('dragover', { dataTransfer })
  await page.locator('#exam-question-item-2').dispatchEvent('drop', { dataTransfer })

  // The document autosave also uses PUT; the reorder has its own path.
  const reorders = () =>
    state.requests.filter((entry) => entry.method === 'PUT' && entry.path === `${BASE}/conversations/conv-1/draft/items/reorder`)
  await expect.poll(() => reorders().at(-1)?.body).toEqual({
    sectionCode: 'P2',
    itemIds: ['item-2', 'item-1'],
  })
  await expect(page.locator('#exam-question-item-2')).toContainText('Câu 1')
  await expect(page.locator('#exam-question-item-1')).toContainText('Câu 2')
})

test('stopping a run asks the server to cancel it', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { endless: true })
  await openAssistant(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn đề kiểm tra')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  // The stop button keeps the send button's 32px circle, with a small square in it.
  const stop = page.getByRole('button', { name: 'Dừng tạo câu trả lời' })
  await expect(stop).toBeVisible()
  expect((await stop.boundingBox())?.width).toBe(32)
  expect((await stop.locator('svg').boundingBox())?.width).toBeLessThanOrEqual(14)
  await stop.click()

  await expect.poll(() => state.requests.filter((entry) => entry.path.endsWith('/cancel')).length).toBeGreaterThan(0)
  // The server ends the run with CANCELLED, so the thread stops showing "đang xử lý".
  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toHaveCount(0, { timeout: 12_000 })
  await expect(page.getByText('Trợ lý AI đang xử lý')).toHaveCount(0)
})

test('an ask run that fails shows the error inside the thread', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)

  await page.getByRole('button', { name: 'Chế độ trả lời' }).click()
  await page.getByRole('option', { name: /Hỏi đáp/ }).click()
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Đạo hàm là gì?')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Trợ lý AI báo lỗi')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Máy chủ không xử lý được câu hỏi.')).toBeVisible()
  expect(state.requests.find((entry) => entry.method === 'POST' && entry.path.endsWith('/messages'))?.body)
    .toMatchObject({ content: 'Đạo hàm là gì?', mode: 'ask' })
})

test('an ask run shows the answer text sent in the answer event', async ({ page }) => {
  const answer = 'Đạo hàm là tốc độ thay đổi tức thời của hàm số tại một điểm.'
  await installAiFixture(page, 'MANAGER', { askAnswer: answer })
  await openAssistant(page)

  await page.getByRole('button', { name: 'Chế độ trả lời' }).click()
  await page.getByRole('option', { name: /Hỏi đáp/ }).click()
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Đạo hàm là gì?')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText(answer, { exact: true })).toBeVisible({ timeout: 15_000 })
})

test('opening a saved conversation loads its messages, title and paper', async ({ page }) => {
  const saved: Conversation = {
    id: 'conv-9',
    title: 'Đề đã lưu',
    subjectId: 'category-1',
    mode: 'compose',
    createdAt: stamp,
    updatedAt: stamp,
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [saved],
    messages: {
      'conv-9': [
        { id: 'm1', conversationId: 'conv-9', role: 'USER', mode: 'compose', content: 'Soạn giúp tôi một câu đại số.', createdAt: stamp },
        {
          id: 'm2',
          conversationId: 'conv-9',
          role: 'ASSISTANT',
          mode: 'compose',
          content: 'Mình đã thêm câu hỏi vào đề.',
          createdAt: stamp,
          trace: ['Gọi công cụ soan-cau-hoi'],
        },
      ],
    },
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: 'Đề đã lưu', examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [item('conv-9', 'saved-1', 1, 'Câu đã lưu trong bản nháp.', { passed: true })],
      },
    },
    documents: { 'conv-9': structuredDocument('Đề đã lưu', ['saved-1']) },
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  await expect(page.getByText('Soạn giúp tôi một câu đại số.')).toBeVisible()
  // The saved document chose the question cards, so the paper shows them instead of the free document.
  await expect(questionPaper(page)).toBeVisible()
  await expect(page.locator('#exam-question-saved-1')).toContainText('Câu đã lưu trong bản nháp.')
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('Đề đã lưu')

  // The conversation list and a new conversation are opened from the chat's own header.
  const chat = page.getByRole('complementary', { name: 'Trợ lý AI', exact: true })
  await expect(page.getByRole('banner').getByRole('button', { name: 'Cuộc trò chuyện', exact: true })).toHaveCount(0)
  await chat.getByRole('button', { name: 'Cuộc trò chuyện', exact: true }).click()
  await expect(page.getByLabel('Cuộc trò chuyện trợ lý AI')).toBeVisible()
  await expect(page.getByRole('button', { name: /Đề đã lưu/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Cuộc trò chuyện trợ lý AI')).toBeHidden()

  await chat.getByRole('button', { name: 'Cuộc trò chuyện mới', exact: true }).click()
  await expect(page.getByText('Soạn giúp tôi một câu đại số.')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('')
})

// Free documents: the exam is a Tiptap document on paged A4 sheets ("Văn bản tự do", the default mode).

const savedExam: Conversation = {
  id: 'conv-9',
  title: 'Đề kiểm tra Toán 10',
  subjectId: 'category-1',
  mode: 'compose',
  createdAt: stamp,
  updatedAt: stamp,
}

/** Four questions of one part, each with four options; a code can only reorder them inside the part. */
const EXAM_STEMS = [
  'Tập nghiệm của phương trình x bình phương bằng 4 có mấy phần tử?',
  'Giá trị nhỏ nhất của hàm số y bằng x bình phương là bao nhiêu?',
  'Hệ số góc của đường thẳng y bằng 3x cộng 1 là bao nhiêu?',
  'Phương trình x cộng 1 bằng 0 có bao nhiêu nghiệm?',
]

const examContent = tiptapDoc(
  heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
  heading(2, 'PHẦN I. TRẮC NGHIỆM'),
  ...EXAM_STEMS.flatMap((stem, index) => [
    paragraph(run(`Câu ${index + 1}. `, 'bold'), run(stem)),
    choiceGrid('0', '1', '2', '3'),
  ]),
  paragraph(run('--- HẾT ---', 'bold'))
)

const examDocument = (version = 3): FixtureDocument => ({ mode: 'FREE', content: examContent, version, updatedAt: stamp })

/** The "Câu n. …" lines of a sheet, in order. */
const questionLines = (sheet: Locator) => sheet.locator(':scope > p').filter({ hasText: /^Câu \d+\./ })

const stemsOf = (lines: string[]) => lines.map((line) => line.replace(/^Câu \d+\.\s*/, '').trim())

/** Opens the saved exam (the only conversation, so it opens by itself) and waits until `line` is on the sheet. */
async function openSavedDocument(page: Page, line: string) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  // Opening a saved exam loads the list, its draft and its document first; a busy machine needs a little longer.
  await expect(docEditor(page)).toContainText(line, { timeout: 15_000 })
}

async function openSavedExam(page: Page) {
  await openSavedDocument(page, EXAM_STEMS[0])
  await expect(questionLines(docEditor(page))).toHaveCount(EXAM_STEMS.length)
}

/** Puts the caret at the end of the sheet's paragraph holding `line`. */
async function caretAtEndOf(page: Page, line: string) {
  await docEditor(page).locator(':scope > p', { hasText: line }).click()
  await page.keyboard.press('End')
}

/** The save state shown beside the exam title. */
const saveStatus = (page: Page) => page.getByRole('banner').getByRole('status')

/** The text of each top-level block of a sheet, in order (page spacers left out). */
const sheetBlocks = (sheet: Locator) =>
  sheet.evaluate((root) =>
    Array.from(root.children)
      .filter((child) => !child.classList.contains('exam-doc-page-gap'))
      .map((child) => (child.textContent ?? '').replace(/\s+/g, ' ').trim())
  )

const nodeText = (node: DocNode): string =>
  node.type === 'text' ? String(node.text ?? '') : ((node.content as DocNode[] | undefined) ?? []).map(nodeText).join('')

/** The text of each top-level block of a saved document. */
const savedBlocks = (body: Record<string, unknown> | undefined) =>
  (((body?.content as DocNode | undefined)?.content as DocNode[] | undefined) ?? []).map(nodeText)

const creations = (state: AiFixtureState) =>
  state.requests.filter((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations`)

const NOTE = 'Ghi chú: làm bài trong 45 phút.'

/** A short saved exam: the title, one note line and the end line. */
const noteContent = (note: string) =>
  tiptapDoc(heading(1, 'ĐỀ KIỂM TRA TOÁN 10'), paragraph(run(note)), paragraph(run('--- HẾT ---', 'bold')))

const noteDocument = (version = 3): FixtureDocument => ({ mode: 'FREE', content: noteContent(NOTE), version, updatedAt: stamp })

test('exam codes reorder the questions and are viewed read-only beside the original', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  expect(stemsOf(await questionLines(docEditor(page)).allTextContents())).toEqual(EXAM_STEMS)

  await page.getByRole('button', { name: 'Tạo mã đề', exact: true }).click()
  const panel = page.getByRole('complementary', { name: 'Tạo mã đề', exact: true })
  await expect(panel.getByText('4 câu trong 1 phần', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
  await panel.getByRole('button', { name: 'Tạo 4 mã đề', exact: true }).click()

  const tabs = page.getByRole('tablist', { name: 'Các tab của đề' }).getByRole('tab')
  await expect(tabs).toHaveText(['Đề gốc', 'Mã 101', 'Mã 102', 'Mã 103', 'Mã 104'])
  await expect(tabs.filter({ hasText: 'Mã 101' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Đang xem mã 101 · chỉ đọc', { exact: true })).toBeVisible()

  // The code is shown in its own read-only editor: the original document is off the sheet.
  const variant = page.getByRole('textbox', { name: 'Mã đề đang xem (chỉ đọc)', exact: true })
  await expect(variant).toHaveAttribute('contenteditable', 'false')
  await expect(docEditor(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đậm', exact: true })).toBeDisabled()
  await expect(variant).toContainText('Mã đề 101')
  await expect(questionLines(variant)).toHaveCount(EXAM_STEMS.length)
  const lines = await questionLines(variant).allTextContents()
  expect(lines.map((line) => /^Câu (\d+)\./.exec(line)?.[1])).toEqual(['1', '2', '3', '4'])
  const shown = stemsOf(lines)
  expect([...shown].sort()).toEqual([...EXAM_STEMS].sort())
  expect(shown).not.toEqual(EXAM_STEMS)
  await expect(variant.locator('[data-choice-grid]')).toHaveCount(EXAM_STEMS.length)

  await page.getByRole('button', { name: 'Về đề gốc', exact: true }).click()
  await expect(page.getByText('Đang xem mã 101 · chỉ đọc', { exact: true })).toHaveCount(0)
  await expect(tabs.filter({ hasText: 'Đề gốc' })).toHaveAttribute('aria-selected', 'true')
  expect(stemsOf(await questionLines(docEditor(page)).allTextContents())).toEqual(EXAM_STEMS)

  // Codes belong to the free document: the question view closes the code shown and the codes panel.
  await tabs.filter({ hasText: 'Mã 102' }).click()
  await expect(page.getByText('Đang xem mã 102 · chỉ đọc', { exact: true })).toBeVisible()
  await openFileMenu(page)
  await page.getByRole('menuitemradio', { name: 'Giữ cấu trúc câu hỏi', exact: true }).click()
  await expect(questionPaper(page)).toBeVisible()
  await expect(page.getByText(/^Đang xem mã/)).toHaveCount(0)
  await expect(panel).toHaveCount(0)
})

/** Tệp ▸ Tải xuống ▸ `item`, by keyboard: a Radix submenu closes when the pointer jumps across it. */
async function downloadFromFileMenu(page: Page, item: string) {
  await openFileMenu(page)
  await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).press('ArrowRight')
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: item, exact: true }).press('Enter')
  return download
}

test('Tệp ▸ Tải xuống saves the document as JSON and as a Word file', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)

  const json = await downloadFromFileMenu(page, 'JSON (.json)')
  expect(json.suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10.json')
  const exported = JSON.parse(await readFile(await json.path(), 'utf8')) as unknown
  expect(exported).toMatchObject({ format: 'hocluc-exam-doc', version: 1, content: examContent })

  const word = await downloadFromFileMenu(page, 'Word (.docx)')
  expect(word.suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10.docx')
  const bytes = await readFile(await word.path())
  expect(bytes.length).toBeGreaterThan(0)
  const zip = await JSZip.loadAsync(bytes)
  const body = await zip.file('word/document.xml')?.async('string')
  expect(body).toContain('ĐỀ KIỂM TRA TOÁN 10')
  for (const stem of EXAM_STEMS) expect(body).toContain(stem)
})

test('a compose run in the free document writes each question under its own part', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  await expect(sheet).toBeVisible()
  await sendCompose(page)

  // Nothing was edited before the prompt, so the prompt created the conversation and names it.
  expect(creations(state).map((entry) => entry.body)).toEqual([{ title: 'Soạn 2 câu đại số cơ bản' }])

  const lines = questionLines(sheet)
  await expect(lines).toHaveText(['Câu 1. Tính giá trị của biểu thức x cộng 1.', 'Câu 2. Rút gọn biểu thức hai x trừ x.'])
  for (const [index, number] of [1, 2].entries()) {
    const line = lines.nth(index)
    await expect(line.locator('strong')).toHaveText(`Câu ${number}.`)
    const options = line.locator('xpath=following-sibling::*[1]')
    await expect(options).toHaveAttribute('data-choice-grid', '')
    await expect(options.locator('.exam-choice-label')).toHaveText(['A.', 'B.', 'C.', 'D.'])
    await expect(options.locator('.exam-choice-body')).toHaveText(['Đáp án đúng', 'Đáp án sai', 'Đáp án gần đúng', 'Không xác định'])
  }
  // Under their part's heading, written with them; a part without questions gets no heading.
  const blocks = await sheetBlocks(sheet)
  const part = blocks.indexOf('PHẦN 2. TOÁN HỌC')
  expect(part).toBeGreaterThan(-1)
  expect(blocks[part + 1]).toBe('Câu 1. Tính giá trị của biểu thức x cộng 1.')
  expect(blocks[part + 3]).toBe('Câu 2. Rút gọn biểu thức hai x trừ x.')
  expect(blocks[part + 5]).toBe('--- HẾT ---')
  expect(blocks).not.toContain('PHẦN 3. TƯ DUY KHOA HỌC')
  expect(blocks.at(-1)).toBe('--- HẾT ---')

  const outline = page.getByRole('complementary', { name: 'Mục lục đề thi', exact: true })
  await expect(outline.getByRole('button', { name: /^Tới Câu \d+\./ })).toHaveText([
    'Câu 1. Tính giá trị của biểu thức x cộng 1.',
    'Câu 2. Rút gọn biểu thức hai x trừ x.',
  ])

  // The new conversation's document is saved from version 0 on, without being read back, and lists what it received.
  await expect
    .poll(() => (documentSaves(state, 'conv-1').at(-1)?.content as DocNode | undefined)?.attrs)
    .toEqual({ deliveredItems: ['item-1', 'item-2'] })
  const saves = documentSaves(state, 'conv-1')
  expect(saves.map((save) => save.version)).toEqual(saves.map((_, index) => index))
  expect(savedBlocks(saves.at(-1))).toEqual(
    expect.arrayContaining(['Câu 1. Tính giá trị của biểu thức x cộng 1.', 'Câu 2. Rút gọn biểu thức hai x trừ x.'])
  )
  expect(state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations/conv-1/document`)).toBe(false)

  // Undo takes back the teacher's own edits only, never the AI's questions.
  const title = sheet.locator(':scope > h1')
  await title.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' 2026')
  await expect(title).toHaveText('ĐỀ THI MỚI 2026')
  await page.keyboard.press('Control+z')
  await expect(title).toHaveText('ĐỀ THI MỚI')
  await page.keyboard.press('Control+z')
  await expect(lines).toHaveCount(2)
})

// Regression: the editor that showed the loading placeholder must never pass its empty document to the saver of the
// document that replaces it.
test('opening a saved document saves nothing until it is edited', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  await page.waitForTimeout(1_600)
  expect(documentSaves(state, 'conv-9')).toEqual([])
  expect(state.documents.get('conv-9')).toEqual(noteDocument(3))
})

test('typing in a saved document saves it once after a pause, over the version it was read at', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  const status = saveStatus(page)
  await expect(status).toHaveText('Đã lưu')

  await caretAtEndOf(page, NOTE)
  await page.keyboard.type(' Không dùng tài liệu.')
  await expect(status).toHaveText('Đang lưu…')
  await expect(status).toHaveText('Đã lưu')
  const saves = documentSaves(state, 'conv-9')
  expect(saves).toHaveLength(1)
  expect(saves[0]).toMatchObject({ mode: 'FREE', version: 3 })
  expect(savedBlocks(saves[0])).toEqual(['ĐỀ KIỂM TRA TOÁN 10', `${NOTE} Không dùng tài liệu.`, '--- HẾT ---'])
  expect(state.documents.get('conv-9')?.version).toBe(4)
  // One save for the whole burst of typing, not one per key.
  await page.waitForTimeout(1_600)
  expect(documentSaves(state, 'conv-9')).toHaveLength(1)
})

/** Saves one edit of the saved note, then lets another tab save first, so the next save (over version 4) is refused. */
async function provokeConflict(page: Page, state: AiFixtureState) {
  await openSavedDocument(page, NOTE)
  await caretAtEndOf(page, NOTE)
  await page.keyboard.type(' Không dùng tài liệu.')
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(1)
  await expect(saveStatus(page)).toHaveText('Đã lưu')
  state.conflictNextSave = noteContent('Bản sửa ở tab khác.')
  await page.keyboard.type(' Thêm.')
  await expect(saveStatus(page)).toHaveText('Có bản mới hơn')
  expect(documentSaves(state, 'conv-9').map((save) => save.version)).toEqual([3, 4])
}

const CONFLICT_NOTICE = 'Đề này vừa được lưu ở nơi khác.'

test('a save refused for a newer version elsewhere keeps the sheet read-only until the newer one is loaded', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await provokeConflict(page, state)
  const sheet = docEditor(page)
  await expect(page.getByText(CONFLICT_NOTICE)).toBeVisible()
  await expect(sheet).toHaveAttribute('contenteditable', 'false')

  // While the choice waits, typing changes nothing and nothing more is sent.
  await page.keyboard.type(' Nữa.')
  await page.waitForTimeout(1_600)
  expect(documentSaves(state, 'conv-9')).toHaveLength(2)
  await expect(sheet).not.toContainText('Nữa.')

  await page.getByRole('button', { name: 'Tải bản mới nhất', exact: true }).click()
  await expect(page.getByText(CONFLICT_NOTICE)).toHaveCount(0)
  await expect(sheet).toContainText('Bản sửa ở tab khác.')
  await expect(sheet).not.toContainText('Không dùng tài liệu.')
  await expect(sheet).toHaveAttribute('contenteditable', 'true')
  await expect(saveStatus(page)).toHaveText('Đã lưu')

  // Saving goes on over the version that was loaded.
  await caretAtEndOf(page, 'Bản sửa ở tab khác.')
  await page.keyboard.type(' Đã xem.')
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(3)
  const third = documentSaves(state, 'conv-9')[2]
  expect(third).toMatchObject({ mode: 'FREE', version: 5 })
  expect(savedBlocks(third)).toContain('Bản sửa ở tab khác. Đã xem.')
})

test('keeping my version after a refused save writes it over the newer one', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await provokeConflict(page, state)

  await page.getByRole('button', { name: 'Giữ bản của tôi', exact: true }).click()
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(3)
  const third = documentSaves(state, 'conv-9')[2]
  expect(third).toMatchObject({ mode: 'FREE', version: 5 })
  expect(savedBlocks(third)).toContain(`${NOTE} Không dùng tài liệu. Thêm.`)
  await expect(saveStatus(page)).toHaveText('Đã lưu')
  await expect(page.getByText(CONFLICT_NOTICE)).toHaveCount(0)
  await expect(docEditor(page)).toHaveAttribute('contenteditable', 'true')
  expect(state.documents.get('conv-9')?.version).toBe(6)
})

test('a save whose answer was lost is recognised when it is retried, and saving carries on', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  state.loseNextSaveAnswer = true
  await caretAtEndOf(page, NOTE)
  await page.keyboard.type(' Không dùng tài liệu.')
  await expect(saveStatus(page)).toHaveText('Chưa lưu được')

  // Tried again by itself over the same version: the server already holds exactly that, so no conflict is shown.
  await expect.poll(() => documentSaves(state, 'conv-9').length, { timeout: 10_000 }).toBe(2)
  await expect(saveStatus(page)).toHaveText('Đã lưu')
  await expect(page.getByText(CONFLICT_NOTICE)).toHaveCount(0)
  await expect(docEditor(page)).toHaveAttribute('contenteditable', 'true')
  expect(documentSaves(state, 'conv-9').map((save) => save.version)).toEqual([3, 3])

  // The next edit names the version the server holds.
  await page.keyboard.type(' Thêm.')
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(3)
  expect(documentSaves(state, 'conv-9')[2]).toMatchObject({ version: 4 })
  expect(savedBlocks(documentSaves(state, 'conv-9')[2])).toContain(`${NOTE} Không dùng tài liệu. Thêm.`)
})

test('the first edit of a new exam creates its conversation, which keeps the text through a compose run', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  const title = sheet.locator(':scope > h1')
  await expect(title).toHaveText('ĐỀ THI MỚI')

  // A line under the title, then the instructions template after it.
  const line = 'Lớp 10A1, kiểm tra giữa kỳ.'
  // The sheet may still settle (fonts, fit-to-width) right after it opens: type only once the caret is at the title's end.
  await expect(async () => {
    await title.click()
    await page.keyboard.press('End')
    // The editor's own selection, not the browser's: ProseMirror reads a native End move a moment later.
    const atEnd = await page.evaluate(() => {
      const root = document.querySelector('[aria-label="Nội dung đề"]') as (Element & { editor?: { state: { selection: { from: number; empty: boolean }; doc: { firstChild: { nodeSize: number } | null } } } }) | null
      const state = root?.editor?.state
      return Boolean(state && state.selection.empty && state.selection.from === (state.doc.firstChild?.nodeSize ?? 0) - 1)
    })
    expect(atEnd).toBe(true)
  }).toPass()
  await page.keyboard.press('Enter')
  await page.keyboard.type(line)
  const panel = page.getByRole('complementary', { name: 'Mục lục đề thi', exact: true })
  await panel.getByRole('tab', { name: 'Mẫu đề thi', exact: true }).click()
  await panel.getByRole('button', { name: 'Chèn mẫu Hướng dẫn làm bài', exact: true }).click()
  await expect(saveStatus(page)).toHaveText('Đã lưu')

  // One conversation, named after the heading; its document is saved from version 0 without being read back,
  // so the sheet is not rebuilt and the text stays where it was written.
  expect(creations(state).map((entry) => entry.body)).toEqual([{ title: 'ĐỀ THI MỚI' }])
  const first = documentSaves(state, 'conv-1')[0]
  expect(first).toMatchObject({ mode: 'FREE', version: 0 })
  expect(savedBlocks(first)).toContain(line)
  await expect.poll(() => savedBlocks(documentSaves(state, 'conv-1').at(-1))).toContain('Hướng dẫn làm bài:')
  expect(state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations/conv-1/document`)).toBe(false)
  expect((await sheetBlocks(sheet)).slice(0, 3)).toEqual(['ĐỀ THI MỚI', line, 'Hướng dẫn làm bài:'])

  // The prompt goes to that conversation; the text stays and the questions join it.
  await sendCompose(page)
  expect(creations(state)).toHaveLength(1)
  expect(state.requests.some((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`)).toBe(true)
  await expect(questionLines(sheet)).toHaveCount(2)
  expect((await sheetBlocks(sheet)).slice(0, 3)).toEqual(['ĐỀ THI MỚI', line, 'Hướng dẫn làm bài:'])
  await expect
    .poll(() => savedBlocks(documentSaves(state, 'conv-1').at(-1)))
    .toEqual(expect.arrayContaining([line, 'Hướng dẫn làm bài:', 'Câu 1. Tính giá trị của biểu thức x cộng 1.']))
})

test('an exam opened while a new exam is still being created never receives the new exam\'s text', async ({ page }) => {
  // What the saved exam's own document looks like afterwards is the empty-save bug's test; this one checks the text.
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  await page.getByRole('button', { name: 'Đề mới', exact: true }).click()
  const sheet = docEditor(page)
  const title = sheet.locator(':scope > h1')
  await expect(title).toHaveText('ĐỀ THI MỚI')

  // The new exam's first edit asks for its conversation; the answer is held back.
  let release = () => {}
  state.creationGate = new Promise<void>((resolve) => {
    release = resolve
  })
  const marker = 'Ghi chú riêng của đề mới.'
  await title.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(marker)
  await expect.poll(() => creations(state).length).toBe(1)

  // Meanwhile the saved exam is picked in the list; then the new exam's conversation is created.
  await page.getByRole('button', { name: 'Cuộc trò chuyện', exact: true }).click()
  await page.getByLabel('Cuộc trò chuyện trợ lý AI').getByRole('button', { name: /Đề kiểm tra Toán 10/ }).click()
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue(savedExam.title)
  release()
  await page.waitForTimeout(1_600)
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue(savedExam.title)
  await expect(sheet).not.toContainText(marker)

  // The saved exam still saves its own edits, and nothing sent to it holds the new exam's text.
  await sheet.locator(':scope > p').first().click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Đã kiểm tra.')
  const holds = (text: string) => documentSaves(state, 'conv-9').filter((save) => savedBlocks(save).some((block) => block.includes(text)))
  await expect.poll(() => holds('Đã kiểm tra.').length).toBeGreaterThan(0)
  expect(holds(marker)).toEqual([])
})

test('a new exam whose conversation cannot be created says so and tries again later, not on every key', async ({ page }) => {
  const { state } = await installAiFixture(page)
  state.failCreations = 1
  await openAssistant(page)
  const status = saveStatus(page)
  const title = docEditor(page).locator(':scope > h1')
  await title.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' 2026')
  await expect(status).toHaveText('Chưa lưu được')
  await expect(status).toHaveAttribute('title', 'Máy chủ đang bận, chưa tạo được đề.')
  await page.keyboard.type(' giữa kỳ')
  expect(creations(state)).toHaveLength(1)

  // It is tried again by itself after a pause, then the text is saved under the new conversation.
  await expect.poll(() => creations(state).length, { timeout: 10_000 }).toBe(2)
  await expect(status).toHaveText('Đã lưu')
  const [save] = documentSaves(state, 'conv-1')
  expect(save).toMatchObject({ mode: 'FREE', version: 0 })
  expect(savedBlocks(save)[0]).toBe('ĐỀ THI MỚI 2026 giữa kỳ')
})

test('a document that cannot be read shows the error instead of the sheet until it is read again', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  state.failDocumentReads = 1
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  const main = page.getByRole('main')
  await expect(main.getByText('Máy chủ đang bận, chưa đọc được đề.')).toBeVisible()
  await expect(docEditor(page)).toHaveCount(0)
  await expect(saveStatus(page)).toHaveCount(0)
  await main.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await expect(docEditor(page)).toContainText(NOTE)
  await expect(main.getByText('Máy chủ đang bận, chưa đọc được đề.')).toHaveCount(0)
  expect(documentSaves(state, 'conv-9')).toEqual([])
})

test('a shared passage holding a Markdown table is written once, as a table, under its own part only', async ({ page }) => {
  const passage = 'Một nhóm ghi nhận số liệu sau:\n\n| Nhóm | Số người |\n|---|---|\n| A | 80 |\n| B | 63 |\n\nSố liệu chỉ là quan sát.'
  const grouped = (id: string, position: number, text: string): DraftItem => ({
    ...item('conv-9', id, position, text),
    sectionCode: 'P3.2',
    groupKey: 'P3.2-G1',
    question: { ...question(text), partCode: 'P3.2', passage },
  })
  await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [grouped('item-1', 1, 'Nhóm nào đông hơn?'), grouped('item-2', 2, 'Hai nhóm chênh nhau bao nhiêu người?')],
      },
    },
  })
  await openSavedDocument(page, 'Nhóm nào đông hơn?')

  const sheet = docEditor(page)
  const table = sheet.locator('table')
  await expect(table).toHaveCount(1)
  await expect(table.locator('th')).toHaveText(['Nhóm', 'Số người'])
  await expect(table.locator('td')).toHaveText(['A', '80', 'B', '63'])
  await expect(sheet).not.toContainText('|---|')
  await expect(sheet).toContainText('Số liệu chỉ là quan sát.')
  await expect(questionLines(sheet)).toHaveText(['Câu 1. Nhóm nào đông hơn?', 'Câu 2. Hai nhóm chênh nhau bao nhiêu người?'])
  const blocks = await sheetBlocks(sheet)
  expect(blocks).toEqual(expect.arrayContaining(['PHẦN 3. TƯ DUY KHOA HỌC', '3.2. Suy luận khoa học']))
  expect(blocks).not.toContain('PHẦN 2. TOÁN HỌC')
  expect(blocks).not.toContain('PHẦN 1. SỬ DỤNG NGÔN NGỮ')
})

test('a run still going when the exam is opened is followed again, from right before it began, and can be stopped', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    messages: {
      'conv-9': [{ id: 'user-1', conversationId: 'conv-9', role: 'USER', mode: 'compose', content: 'Soạn đề ĐGNL đầy đủ', createdAt: stamp }],
    },
    runningAfter: '41',
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  // The page reloaded mid-run: the stages and the stop button come back instead of a finished-looking exam.
  const stop = page.getByRole('button', { name: 'Dừng tạo câu trả lời' })
  await expect(stop).toBeVisible()
  await expect(page.getByText('Khảo sát ngân hàng câu hỏi')).toBeVisible()
  await expect(page.getByText('Đang soạn câu 2/2', { exact: true })).toBeVisible()
  // Tool calls read as what they did, without their raw arguments.
  await expect(page.getByText('Tìm câu mẫu trong ngân hàng', { exact: true })).toBeVisible()
  await expect(page.getByText(/excludeIds|patternCode/)).toHaveCount(0)
  // The question being written shows word by word on the sheet (and as one line in the chat), never in the saved document.
  const live = docEditor(page).locator('[data-live-draft]')
  await expect(live).toContainText('Tập nghiệm của phương trình x bình phương bằng 4 là')
  await expect(live).toContainText('A. {2}')
  await expect(live).toContainText('B. {-2')
  await expect(page.getByText('Đang viết', { exact: true })).toBeVisible()
  // The sheet follows the writing; scrolling lets go of it, and the button picks it up again.
  const followButton = page.getByRole('button', { name: 'Theo dõi AI đang viết', exact: true })
  await expect(followButton).toHaveCount(0)
  await live.hover()
  await page.mouse.wheel(0, -300)
  await expect(followButton).toBeVisible()
  await followButton.click()
  await expect(followButton).toHaveCount(0)
  await expect(live).toBeInViewport()
  expect(documentSaves(state, 'conv-9').map((save) => JSON.stringify(save.content)).join('')).not.toContain('Tập nghiệm')
  const streams = state.requests.filter((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations/conv-9/stream`)
  expect(streams[0]?.lastEventId).toBe('41')

  await stop.click()
  await expect.poll(() => state.requests.some((entry) => entry.path === `${BASE}/conversations/conv-9/cancel`)).toBe(true)
  await expect(stop).toHaveCount(0, { timeout: 12_000 })
})

/** The charts of a sheet: chart nodes, each showing its drawing as a picture. */
const sheetCharts = (sheet: Locator) => sheet.locator('[data-chart-node]')

/** The chart blocks of a saved document, in order. */
const savedCharts = (body: Record<string, unknown> | undefined) =>
  (((body?.content as DocNode | undefined)?.content as DocNode[] | undefined) ?? []).filter((node) => node.type === 'chart')

/** The SVG a chart's picture draws. */
const drawingOf = async (image: Locator) => decodeURIComponent((await image.getAttribute('src')) ?? '')

test('a science passage and a data question show the charts the AI drew, one per passage', async ({ page }) => {
  const passageChart = {
    type: 'line', title: 'Nhiệt độ trung bình', xLabel: 'Tháng', yLabel: '°C',
    categories: ['1', '2', '3'], series: [{ name: 'Hà Nội', values: [16.5, 18, 21] }],
  }
  const ownChart = {
    type: 'bar', title: 'Doanh thu', categories: ['2022', '2023'],
    series: [{ name: 'A', values: [480, 600] }, { name: 'B', values: [300, 410] }],
  }
  const grouped = (id: string, position: number, text: string): DraftItem => ({
    ...item('conv-9', id, position, text),
    sectionCode: 'P3.2',
    groupKey: 'P3.2-G1',
    question: { ...question(text), partCode: 'P3.2', passage: 'Một nhóm đo nhiệt độ theo tháng.', passageChart },
  })
  const single: DraftItem = {
    ...item('conv-9', 'item-3', 3, 'Doanh thu năm 2023 của A tăng bao nhiêu phần trăm?'),
    sectionCode: 'P3.1',
    question: { ...question('Doanh thu năm 2023 của A tăng bao nhiêu phần trăm?'), partCode: 'P3.1', chart: ownChart },
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [grouped('item-1', 1, 'Tháng nào nóng nhất?'), grouped('item-2', 2, 'Nhiệt độ tăng bao nhiêu?'), single],
      },
    },
  })
  await openSavedDocument(page, 'Tháng nào nóng nhất?')

  // Each chart is a chart node, its data kept to be edited, showing its drawing.
  const sheet = docEditor(page)
  await expect(sheetCharts(sheet)).toHaveCount(2)
  const line = sheetCharts(sheet).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình' })
  const bars = sheetCharts(sheet).getByRole('img', { name: 'Biểu đồ cột: Doanh thu' })
  await expect(line).toHaveCount(1)
  await expect(bars).toHaveCount(1)
  const src = await drawingOf(line)
  expect(src).toContain('<polyline')
  expect(src).toContain('16,5')
  expect(src).toContain('21')
  // The drawing is a picture the browser can draw, so printing and the PDF keep it.
  expect(await line.evaluate((image: HTMLImageElement) => image.decode().then(() => image.naturalWidth))).toBeGreaterThan(0)
  expect(await drawingOf(bars)).toContain('<rect')
  // Nothing to edit until a chart is selected.
  await expect(sheet.getByRole('button', { name: 'Sửa biểu đồ', exact: true })).toHaveCount(0)
})

test('a chart saved as a picture becomes a chart holding the draft\'s data when the exam opens', async ({ page }) => {
  const passageChart = {
    type: 'line', title: 'Nhiệt độ trung bình', categories: ['Tháng 1', 'Tháng 2', 'Tháng 3'],
    series: [{ name: 'Hà Nội', values: [16.5, 18, 21] }],
  }
  const old = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')}`
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [{
          ...item('conv-9', 'item-1', 1, 'Tháng nào nóng nhất?'),
          sectionCode: 'P3.2',
          groupKey: 'P3.2-G1',
          question: { ...question('Tháng nào nóng nhất?'), partCode: 'P3.2', passage: 'Đo nhiệt độ theo tháng.', passageChart },
        }],
      },
    },
    documents: {
      'conv-9': {
        mode: 'FREE',
        version: 2,
        updatedAt: stamp,
        content: {
          type: 'doc',
          attrs: { deliveredItems: ['item-1'] },
          content: [
            heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
            paragraph(run('Đo nhiệt độ theo tháng.')),
            { type: 'image', attrs: { src: old, alt: 'Biểu đồ đường: Nhiệt độ trung bình' } },
            { type: 'paragraph', attrs: { examItem: 'item-1' }, content: [run('Câu 1. ', 'bold'), run('Tháng nào nóng nhất?')] },
            // A drawing no chart of the draft is named for (the teacher put it in): it stays a picture.
            { type: 'image', attrs: { src: old, alt: 'Biểu đồ cột: Khác' } },
            paragraph(run('--- HẾT ---', 'bold')),
          ],
        },
      },
    },
  })
  await openSavedDocument(page, 'Tháng nào nóng nhất?')

  const sheet = docEditor(page)
  const chart = sheetCharts(sheet).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình' })
  await expect(chart).toHaveCount(1)
  expect(await drawingOf(chart)).toContain('<polyline')
  // Saved once, the picture replaced by a chart with the draft's data; nothing else in the document changed.
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(1)
  const [save] = documentSaves(state, 'conv-9')
  expect(savedCharts(save)).toEqual([
    {
      type: 'chart',
      attrs: {
        data: {
          columns: [{ id: 'label', label: 'Nhãn', role: 'label' }, { id: 's1', label: 'Hà Nội', role: 'series' }],
          rows: [['Tháng 1', 16.5], ['Tháng 2', 18], ['Tháng 3', 21]],
        },
        spec: { type: 'line', title: 'Nhiệt độ trung bình', xLabel: '', yLabel: '', legend: true, palette: 'print', width: 0.85 },
      },
    },
  ])
  const savedImages = (((save.content as DocNode | undefined)?.content as DocNode[] | undefined) ?? []).filter((node) => node.type === 'image')
  expect(savedImages.map((node) => (node.attrs as DocNode | undefined)?.alt)).toEqual(['Biểu đồ cột: Khác'])
  expect(savedBlocks(save)).toEqual(['ĐỀ KIỂM TRA TOÁN 10', 'Đo nhiệt độ theo tháng.', '', 'Câu 1. Tháng nào nóng nhất?', '', '--- HẾT ---'])
  // Not an edit of the teacher's: Ctrl+Z does not bring the picture back.
  await caretAtEndOf(page, 'Đo nhiệt độ theo tháng.')
  await page.keyboard.press('Control+z')
  await expect(sheetCharts(sheet)).toHaveCount(1)
  await expect(sheet.locator(':scope > img')).toHaveCount(1)
  await expect(sheet.locator(':scope > img')).toHaveAttribute('alt', 'Biểu đồ cột: Khác')
})

/** A line chart of three months as the editor stores a chart: a data table (labels, then a series) and its settings. */
const temperatureChart: DocNode = {
  type: 'chart',
  attrs: {
    data: {
      columns: [{ id: 'label', label: 'Tháng', role: 'label' }, { id: 's1', label: 'Hà Nội', role: 'series' }],
      rows: [['1', 16.5], ['2', 18], ['3', 21]],
    },
    spec: { type: 'line', title: 'Nhiệt độ trung bình', xLabel: 'Tháng', yLabel: '°C', legend: true, palette: 'print', width: 0.85 },
  },
}

const chartDocument = (): FixtureDocument => ({
  mode: 'FREE',
  version: 3,
  updatedAt: stamp,
  content: tiptapDoc(
    heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
    paragraph(run('Đo nhiệt độ theo tháng.')),
    temperatureChart,
    paragraph(run('Câu 1. ', 'bold'), run('Tháng nào nóng nhất?')),
    paragraph(run('--- HẾT ---', 'bold'))
  ),
})

test('a chart is edited in its dialog, the edit saved as one undo step', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': chartDocument() } })
  await openSavedDocument(page, 'Tháng nào nóng nhất?')
  const sheet = docEditor(page)
  const drawing = sheetCharts(sheet).getByRole('img')
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')

  // A selected chart shows its edit button.
  const edit = sheet.getByRole('button', { name: 'Sửa biểu đồ', exact: true })
  await expect(edit).toHaveCount(0)
  await drawing.click()
  await expect(edit).toBeVisible()
  await edit.click()
  const dialog = page.getByRole('dialog', { name: 'Sửa biểu đồ', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true })).toHaveValue('Nhiệt độ trung bình')
  const first = dialog.getByRole('textbox', { name: 'Hà Nội, dòng 1', exact: true })
  await expect(first).toHaveValue('16,5')

  // A value with a Vietnamese decimal comma and another kind of chart, previewed; the sheet waits for "Lưu".
  await first.fill('16,8')
  const bars = dialog.getByRole('button', { name: 'Cột', exact: true })
  await bars.click()
  await expect(bars).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByRole('img', { name: 'Biểu đồ cột: Nhiệt độ trung bình' })).toBeVisible()
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ cột: Nhiệt độ trung bình')
  expect(await drawingOf(drawing)).toContain('<rect')
  expect(await drawingOf(drawing)).toContain('16,8')
  await expect
    .poll(() => savedCharts(documentSaves(state, 'conv-9').at(-1))[0]?.attrs)
    .toMatchObject({ spec: { type: 'bar', title: 'Nhiệt độ trung bình' }, data: { rows: [['1', 16.8], ['2', 18], ['3', 21]] } })

  // Focus is back in the document: one Ctrl+Z takes the whole edit back, and nothing before it.
  await expect(sheet).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')
  expect(await drawingOf(drawing)).toContain('<polyline')
  expect(await drawingOf(drawing)).toContain('16,5')
  await page.keyboard.press('Control+z')
  await expect(sheetCharts(sheet)).toHaveCount(1)
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')

  // A double click opens it too; "Huỷ" changes nothing.
  await drawing.dblclick()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill('Lượng mưa')
  await dialog.getByRole('button', { name: 'Huỷ', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')

  // So does Enter on the selected chart; a cell that is not a number keeps the chart from being saved.
  await drawing.click()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  const second = dialog.getByRole('textbox', { name: 'Hà Nội, dòng 2', exact: true })
  await second.fill('mười tám')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(second).toHaveAttribute('aria-invalid', 'true')
  await expect(second).toBeFocused()
  await expect(dialog.getByText('Có ô số liệu trống hoặc không phải là số.', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ đường: Nhiệt độ trung bình')

  // Copied, the chart is its picture carrying its data; pasted, that picture is a chart again, not an image.
  await drawing.click()
  const copied = await sheet.evaluate((root) => {
    const data = new DataTransfer()
    root.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }))
    return data.getData('text/html')
  })
  expect(copied).toMatch(/<img [^>]*data-chart=/)
  await caretAtEndOf(page, 'Tháng nào nóng nhất?')
  await sheet.evaluate((root, html) => {
    const data = new DataTransfer()
    data.setData('text/html', html)
    root.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, copied)
  await expect(sheetCharts(sheet)).toHaveCount(2)
  await expect(sheetCharts(sheet).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình' })).toHaveCount(2)
  await expect(sheet.locator(':scope > img')).toHaveCount(0)
})

test('Chèn ▸ Biểu đồ puts a sample chart after the caret\'s line and opens it to be edited', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  await caretAtEndOf(page, NOTE)

  await page.getByRole('menubar', { name: 'Menu đề thi' }).getByRole('menuitem', { name: 'Chèn', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Biểu đồ', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa biểu đồ', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true })).toBeFocused()
  await page.keyboard.type('Số học sinh')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  const sheet = docEditor(page)
  const drawing = sheetCharts(sheet).getByRole('img')
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ cột: Số học sinh')
  await expect(sheet.locator(':scope > p', { hasText: NOTE }).locator('xpath=following-sibling::*[1]')).toHaveAttribute('data-chart-node', '')
  // Inserting and editing are an undo step each.
  await expect(sheet).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ cột')
  await page.keyboard.press('Control+z')
  await expect(sheetCharts(sheet)).toHaveCount(0)
})

test('a chart goes into the Word file as a picture of its drawing, and into Markdown and JSON', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': chartDocument() } })
  await openSavedDocument(page, 'Tháng nào nóng nhất?')

  const json = await downloadFromFileMenu(page, 'JSON (.json)')
  const exported = JSON.parse(await readFile(await json.path(), 'utf8')) as { content: DocNode }
  expect(((exported.content.content as DocNode[] | undefined) ?? []).filter((node) => node.type === 'chart')).toEqual([temperatureChart])

  const markdown = await downloadFromFileMenu(page, 'Markdown (.md)')
  expect(await readFile(await markdown.path(), 'utf8')).toMatch(/!\[Biểu đồ đường: Nhiệt độ trung bình\]\(<?data:image\/svg\+xml/)

  const word = await downloadFromFileMenu(page, 'Word (.docx)')
  const zip = await JSZip.loadAsync(await readFile(await word.path()))
  expect(Object.keys(zip.files).filter((name) => /^word\/media\/.+\.png$/.test(name))).toHaveLength(1)
  const body = await zip.file('word/document.xml')?.async('string')
  expect(body).toContain('descr="Biểu đồ đường: Nhiệt độ trung bình"')
  expect(body).toContain('Tháng nào nóng nhất?')
})

test('reopening a document writes in only the draft questions it has never received', async ({ page }) => {
  // The teacher deleted Câu 1 earlier; Câu 3 was written while the document was closed.
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [...seededItems('conv-9'), item('conv-9', 'item-3', 3, 'Tìm x biết 2x bằng 6.')],
      },
    },
    documents: {
      'conv-9': {
        mode: 'FREE',
        version: 4,
        updatedAt: stamp,
        content: {
          type: 'doc',
          attrs: { deliveredItems: ['item-1', 'item-2'] },
          content: [
            heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
            { type: 'heading', attrs: { level: 2, examPart: 'P2' }, content: [run('PHẦN 2. TOÁN HỌC')] },
            { type: 'paragraph', attrs: { examItem: 'item-2' }, content: [run('Câu 2. ', 'bold'), run('Rút gọn biểu thức hai x trừ x.')] },
            choiceGrid('Đáp án đúng', 'Đáp án sai', 'Đáp án gần đúng', 'Không xác định'),
            paragraph(run('--- HẾT ---', 'bold')),
          ],
        },
      },
    },
  })
  await openSavedDocument(page, 'Rút gọn biểu thức hai x trừ x.')

  const sheet = docEditor(page)
  await expect(questionLines(sheet)).toHaveText(['Câu 2. Rút gọn biểu thức hai x trừ x.', 'Câu 3. Tìm x biết 2x bằng 6.'])
  const blocks = await sheetBlocks(sheet)
  expect(blocks.indexOf('Câu 3. Tìm x biết 2x bằng 6.')).toBe(blocks.indexOf('Câu 2. Rút gọn biểu thức hai x trừ x.') + 2)
  expect(blocks.at(-1)).toBe('--- HẾT ---')
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(1)
  expect(documentSaves(state, 'conv-9')[0]).toMatchObject({
    version: 4,
    content: { attrs: { deliveredItems: ['item-1', 'item-2', 'item-3'] } },
  })
})

test('switching a saved free document to question cards saves the mode and turns the free-only tools off', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [item('conv-9', 'saved-1', 1, 'Câu đã lưu trong bản nháp.', { passed: true })],
      },
    },
    documents: { 'conv-9': { ...noteDocument(2), content: { ...noteContent(NOTE), attrs: { deliveredItems: ['saved-1'] } } } },
  })
  await openSavedDocument(page, NOTE)

  await openFileMenu(page)
  await expect(page.getByRole('menuitemradio', { name: 'Văn bản tự do', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('menuitemradio', { name: 'Giữ cấu trúc câu hỏi', exact: true }).click()
  await expect(questionPaper(page)).toBeVisible()
  await expect(page.locator('#exam-question-saved-1')).toContainText('Câu đã lưu trong bản nháp.')
  await expect(docEditor(page)).toHaveCount(0)
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(1)
  const [save] = documentSaves(state, 'conv-9')
  expect(save).toMatchObject({ mode: 'STRUCTURED', version: 2 })
  expect(savedBlocks(save)).toEqual(['ĐỀ KIỂM TRA TOÁN 10', NOTE, '--- HẾT ---'])

  // Formatting, exam codes and files belong to the free document; the outline lists the draft's questions.
  const freeOnly = 'Chỉ có ở chế độ Văn bản tự do'
  await expect(page.getByRole('button', { name: 'Đậm', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Tạo nhiều mã đề', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Tạo nhiều mã đề', exact: true })).toHaveAttribute('title', freeOnly)
  await expect(page.getByRole('button', { name: 'Tạo mã đề', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Tới câu 1', exact: true })).toBeVisible()
  await openFileMenu(page)
  await expect(page.getByRole('menuitem', { name: 'Mở file (Word, Markdown, JSON)…', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).press('ArrowRight')
  for (const label of ['Word (.docx)', 'Markdown (.md)', 'JSON (.json)']) {
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('title', freeOnly)
  }
  await expect(page.getByRole('menuitem', { name: 'PDF (in ra PDF)', exact: true })).not.toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'PDF (in ra PDF)', exact: true })).toHaveCount(0)
  await expect(page.getByRole('menuitemradio', { name: 'Văn bản tự do', exact: true })).toHaveCount(0)

  // Back to the free document, as it was, saved in that mode over the next version.
  await openFileMenu(page)
  await page.getByRole('menuitemradio', { name: 'Văn bản tự do', exact: true }).click()
  await expect(docEditor(page)).toContainText(NOTE)
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(2)
  expect(documentSaves(state, 'conv-9')[1]).toMatchObject({ mode: 'FREE', version: 3 })
})

test('the bold button follows the selection and toggles bold on it', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  const bold = page.getByRole('button', { name: 'Đậm', exact: true })
  const note = docEditor(page).locator(':scope > p', { hasText: NOTE })

  await caretAtEndOf(page, NOTE)
  await page.keyboard.press('Shift+Home')
  await expect(bold).toHaveAttribute('aria-pressed', 'false')
  await bold.click()
  await expect(bold).toHaveAttribute('aria-pressed', 'true')
  await expect(note.locator('strong')).toHaveText(NOTE)
  await bold.click()
  await expect(bold).toHaveAttribute('aria-pressed', 'false')
  await expect(note.locator('strong')).toHaveCount(0)

  // The caret in the bold end line shows bold as on.
  await caretAtEndOf(page, '--- HẾT ---')
  await expect(bold).toHaveAttribute('aria-pressed', 'true')
})

test('the formula button inserts a formula that KaTeX sets', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  await caretAtEndOf(page, NOTE)

  await page.getByRole('button', { name: 'Chèn công thức toán', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Chèn công thức' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('status', { name: 'Đang tải công cụ công thức' })).toHaveCount(0)
  // Under load MathLive may take keys only a moment after it shows: type until the field holds the formula.
  const field = dialog.locator('math-field')
  await expect(async () => {
    await field.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('a+b')
    expect(await field.evaluate((element) => (element as HTMLElement & { value: string }).value)).toBe('a+b')
  }).toPass()
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  const formula = docEditor(page).locator(':scope > p', { hasText: NOTE }).locator('[data-math]')
  await expect(formula.locator('.katex')).toBeVisible()
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText('a+b')
  await expect.poll(() => JSON.stringify(documentSaves(state, 'conv-9').at(-1)?.content ?? null)).toContain('"latex":"a+b"')
})

test('a link to an unsafe address is refused and a web address is linked', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument(3) } })
  await openSavedDocument(page, NOTE)
  await caretAtEndOf(page, NOTE)
  await page.keyboard.press('Shift+Home')

  await page.getByRole('button', { name: 'Thêm công cụ', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Chèn liên kết', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Chèn liên kết', exact: true })
  const address = form.getByRole('textbox', { name: 'Địa chỉ liên kết', exact: true })
  await address.fill('javascript://x%0aalert(1)')
  await form.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(form.getByText('Liên kết không hợp lệ', { exact: true })).toBeVisible()
  await expect(address).toHaveAttribute('aria-invalid', 'true')
  await expect(docEditor(page).locator('a')).toHaveCount(0)

  await address.fill('hocluc.vn/de-thi')
  await form.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(form).toHaveCount(0)
  const link = docEditor(page).locator('a')
  await expect(link).toHaveAttribute('href', 'https://hocluc.vn/de-thi')
  await expect(link).toHaveText(NOTE)
})

test('a four-option template is numbered after the last question of the document', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  const sheet = docEditor(page)

  // The caret after the options of the last question, then the template from "Mẫu đề thi".
  await sheet.locator('[data-choice-grid]').last().locator('.exam-choice-body').last().click()
  const panel = page.getByRole('complementary', { name: 'Mục lục đề thi', exact: true })
  await panel.getByRole('tab', { name: 'Mẫu đề thi', exact: true }).click()
  await panel.getByRole('button', { name: 'Chèn mẫu Bốn phương án, tự xếp hàng', exact: true }).click()

  const lines = questionLines(sheet)
  await expect(lines).toHaveCount(EXAM_STEMS.length + 1)
  const added = lines.last()
  await expect(added).toHaveText('Câu 5. Viết câu dẫn.')
  await expect(added.locator('strong')).toHaveText('Câu 5.')
  const options = added.locator('xpath=following-sibling::*[1]')
  await expect(options.locator('.exam-choice-label')).toHaveText(['A.', 'B.', 'C.', 'D.'])
  await expect(options.locator('.exam-choice-body')).toHaveText(['……', '……', '……', '……'])
  const blocks = await sheetBlocks(sheet)
  expect(blocks.at(-3)).toBe('Câu 5. Viết câu dẫn.')
  expect(blocks.at(-1)).toBe('--- HẾT ---')
  await panel.getByRole('tab', { name: 'Mục lục', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Tới Câu 5. Viết câu dẫn.', exact: true })).toBeVisible()
})

test('content longer than one sheet flows onto a second A4 sheet', async ({ page }) => {
  // The title and 36 lines fit one sheet (about 40 lines of 23px); eight more do not.
  const lines = Array.from({ length: 36 }, (_, index) => `Dòng ${index + 1} của đề.`)
  await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    documents: {
      'conv-9': {
        mode: 'FREE',
        content: tiptapDoc(heading(1, 'ĐỀ KIỂM TRA TOÁN 10'), ...lines.map((line) => paragraph(run(line)))),
        version: 1,
        updatedAt: stamp,
      },
    },
  })
  await openSavedDocument(page, 'Dòng 36 của đề.')
  const counter = page.getByText(/^\d+ trang · \d+ từ$/)
  const sheets = page.locator('.exam-doc-page')
  await expect(counter).toHaveText(/^1 trang · /)
  await expect(sheets).toHaveCount(1)

  await caretAtEndOf(page, 'Dòng 36 của đề.')
  for (let number = 37; number <= 44; number += 1) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Dòng ${number} của đề.`)
  }
  await expect(counter).toHaveText(/^2 trang · /)
  await expect(sheets).toHaveCount(2)
  const second = await rectOf(sheets.nth(1))
  const last = await rectOf(docEditor(page).locator(':scope > p', { hasText: 'Dòng 44 của đề.' }))
  expect(last.y).toBeGreaterThan(second.y)
})

// The composer row is outline | divider | paper | divider | chat. Each divider resizes its
// panel, the paper never drops under 560px, and a committed width is kept in localStorage.

const PANEL_WIDTHS_KEY = 'hocluc.aiAssistant.panelWidths'

function layout(page: Page) {
  return {
    outline: page.getByRole('complementary', { name: 'Mục lục đề thi', exact: true }),
    outlineDivider: page.getByRole('separator', { name: 'Kéo để đổi độ rộng mục lục', exact: true }),
    paper: page.getByRole('main').filter({ has: docEditor(page) }),
    chatDivider: page.getByRole('separator', { name: 'Kéo để đổi độ rộng trợ lý AI', exact: true }),
    chat: page.getByRole('complementary', { name: 'Trợ lý AI', exact: true }),
  }
}

/** Opens the composer at a window size where the chat may not be inline, so it waits for the document instead. */
async function openAssistantAt(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/console/manager/ai-assistant')
  await expect(docEditor(page)).toBeVisible()
}

async function rectOf(locator: Locator) {
  const rect = await locator.boundingBox()
  if (!rect) throw new Error('The element has no layout box')
  return rect
}

const widthOf = (locator: Locator) => async () => (await locator.boundingBox())?.width ?? null
const leftOf = (locator: Locator) => async () => (await locator.boundingBox())?.x ?? null
const rightOf = (locator: Locator) => async () => {
  const rect = await locator.boundingBox()
  return rect ? rect.x + rect.width : null
}

/** Waits until `measure` reads within 1px of `expected`; a failure reports the real reading. */
async function expectPx(measure: () => Promise<number | null>, expected: number) {
  await expect
    .poll(async () => {
      const value = await measure()
      return value !== null && Math.abs(value - expected) <= 1 ? expected : value
    })
    .toBe(expected)
}

async function centerX(locator: Locator) {
  const rect = await rectOf(locator)
  return rect.x + rect.width / 2
}

/** Presses a divider at its center and moves the pointer to `toX`; the release commits the width. */
async function dragDivider(page: Page, divider: Locator, toX: number, release = true) {
  const rect = await rectOf(divider)
  const y = rect.y + rect.height / 2
  await page.mouse.move(rect.x + rect.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(toX, y, { steps: 12 })
  if (release) await page.mouse.up()
}

const storedWidths = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown, PANEL_WIDTHS_KEY)

test('the outline, paper and chat sit left to right at their default widths', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { outline, outlineDivider, paper, chatDivider, chat } = layout(page)

  await expectPx(widthOf(outline), 240)
  await expectPx(widthOf(chat), 388)
  const [outlineBox, outlineDividerBox, paperBox, chatDividerBox, chatBox] = await Promise.all(
    [outline, outlineDivider, paper, chatDivider, chat].map(rectOf)
  )
  const right = (rect: { x: number; width: number }) => Math.round(rect.x + rect.width)
  expect(Math.round(outlineBox.x)).toBe(0)
  expect(right(outlineBox)).toBeLessThanOrEqual(Math.round(outlineDividerBox.x))
  expect(right(outlineDividerBox)).toBeLessThanOrEqual(Math.round(paperBox.x))
  expect(right(paperBox)).toBeLessThanOrEqual(Math.round(chatDividerBox.x))
  expect(right(chatDividerBox)).toBeLessThanOrEqual(Math.round(chatBox.x))
  expect(right(chatBox)).toBe(1440)

  await expect(outlineDivider).toHaveAttribute('aria-orientation', 'vertical')
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '240')
  await expect(outlineDivider).toHaveAttribute('aria-valuemin', '200')
  await expect(chatDivider).toHaveAttribute('aria-orientation', 'vertical')
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '388')
  await expect(chatDivider).toHaveAttribute('aria-valuemin', '308')
})

test('dragging the chat divider resizes the chat between its minimum and the paper limit', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { paper, chatDivider, chat } = layout(page)

  await dragDivider(page, chatDivider, (await centerX(chatDivider)) - 200)
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '588')
  await expectPx(widthOf(chat), 588)

  // Far left: the chat stops where the paper would drop under 560px. With the 240px outline
  // inline that is 1440 - 240 - 12 (dividers) - 560 = 628, below the 648px cap.
  await dragDivider(page, chatDivider, 100)
  const max = Number(await chatDivider.getAttribute('aria-valuemax'))
  expect(max).toBeLessThanOrEqual(648)
  expect(max).toBe(628)
  await expect(chatDivider).toHaveAttribute('aria-valuenow', String(max))
  await expectPx(widthOf(chat), max)
  expect(Math.round((await rectOf(paper)).width)).toBeGreaterThanOrEqual(560)

  // Far right: the chat stops at its 308px minimum.
  await dragDivider(page, chatDivider, 1435)
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '308')
  await expectPx(widthOf(chat), 308)
})

test('the chat divider steps 16px with the arrow keys and jumps with Home and End', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { chatDivider, chat } = layout(page)

  await chatDivider.focus()
  await expect(chatDivider).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '404')
  await expectPx(widthOf(chat), 404)
  await page.keyboard.press('ArrowRight')
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '388')
  await expectPx(widthOf(chat), 388)

  await page.keyboard.press('End')
  const max = await chatDivider.getAttribute('aria-valuemax')
  expect(max).not.toBeNull()
  await expect(chatDivider).toHaveAttribute('aria-valuenow', max ?? '')
  await expectPx(widthOf(chat), Number(max))
  await page.keyboard.press('Home')
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '308')
  await expectPx(widthOf(chat), 308)
})

test('double clicking a moved divider resets its panel to the default width', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { outline, outlineDivider, chatDivider, chat } = layout(page)

  await dragDivider(page, chatDivider, (await centerX(chatDivider)) - 120)
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '508')
  await chatDivider.dblclick()
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '388')
  await expectPx(widthOf(chat), 388)

  await outlineDivider.focus()
  await page.keyboard.press('End')
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '320')
  await outlineDivider.dblclick()
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '240')
  await expectPx(widthOf(outline), 240)
  await expect.poll(() => storedWidths(page)).toEqual({ chat: 388, outline: 240 })
})

test('a committed chat width is stored and read back after a reload', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { chatDivider, chat } = layout(page)
  expect(await storedWidths(page)).toBeNull()

  await dragDivider(page, chatDivider, (await centerX(chatDivider)) - 200, false)
  await expectPx(widthOf(chat), 588)
  // A drag in progress only previews the width; it is stored once the pointer is released.
  expect(await storedWidths(page)).toBeNull()
  await page.mouse.up()
  await expect.poll(() => storedWidths(page)).toEqual({ chat: 588, outline: 240 })

  await page.reload()
  await expect(chat).toBeVisible()
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '588')
  await expectPx(widthOf(chat), 588)
})

test('dragging the outline divider keeps the outline between 200 and 320px', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { outline, outlineDivider } = layout(page)
  await expect(outlineDivider).toHaveAttribute('aria-valuemin', '200')
  await expect(outlineDivider).toHaveAttribute('aria-valuemax', '320')

  await dragDivider(page, outlineDivider, (await centerX(outlineDivider)) + 40)
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '280')
  await expectPx(widthOf(outline), 280)

  await dragDivider(page, outlineDivider, 700)
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '320')
  await expectPx(widthOf(outline), 320)

  await dragDivider(page, outlineDivider, 5)
  await expect(outlineDivider).toHaveAttribute('aria-valuenow', '200')
  await expectPx(widthOf(outline), 200)
})

test('between 1024 and 1280px only the chat stays inline', async ({ page }) => {
  await installAiFixture(page)
  await openAssistantAt(page, 1100, 800)
  const { outline, outlineDivider, paper, chatDivider, chat } = layout(page)

  await expect(chat).toBeVisible()
  await expect(chatDivider).toBeVisible()
  await expectPx(widthOf(chat), 388)
  await expect(outline).toBeHidden()
  await expect(outlineDivider).toBeHidden()
  await expectPx(leftOf(paper), 0)
  await expectPx(rightOf(paper), 1100 - 388 - 6)
})

test('below 1024px the chat opens on the right edge and the outline on the left', async ({ page }) => {
  await installAiFixture(page)
  await openAssistantAt(page, 800, 900)
  const { outline, outlineDivider, paper, chatDivider, chat } = layout(page)

  await expect(chat).toBeHidden()
  await expect(chatDivider).toBeHidden()
  await expect(outline).toBeHidden()
  await expect(outlineDivider).toBeHidden()
  await expectPx(widthOf(paper), 800)

  await page.getByRole('button', { name: 'Hỏi AI', exact: true }).click()
  const chatSheet = page.getByRole('dialog', { name: 'Trợ lý AI', exact: true })
  await expect(chatSheet).toBeVisible()
  // Sheets slide in, so wait for each to settle against its edge.
  await expectPx(rightOf(chatSheet), 800)
  expect(Math.round((await rectOf(chatSheet)).x)).toBeGreaterThan(0)
  await chatSheet.getByRole('button', { name: 'Đóng trợ lý AI' }).click()
  await expect(chatSheet).toHaveCount(0)

  await page.getByRole('button', { name: 'Mục lục', exact: true }).click()
  const outlineSheet = page.getByRole('dialog', { name: 'Mục lục đề thi', exact: true })
  await expect(outlineSheet).toBeVisible()
  await expectPx(leftOf(outlineSheet), 0)
  const outlineBox = await rectOf(outlineSheet)
  expect(Math.round(outlineBox.x + outlineBox.width)).toBeLessThan(800)
})

test('collapsing a panel removes its divider until the panel is reopened', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const { outline, outlineDivider, paper, chatDivider, chat } = layout(page)

  await chat.getByRole('button', { name: 'Thu gọn trợ lý AI' }).click()
  await expect(chat).toHaveCount(0)
  await expect(chatDivider).toHaveCount(0)
  await expect(outlineDivider).toBeVisible()
  await expectPx(rightOf(paper), 1440)

  await outline.getByRole('button', { name: 'Thu gọn mục lục' }).click()
  await expect(outline).toHaveCount(0)
  await expect(outlineDivider).toHaveCount(0)
  await expectPx(leftOf(paper), 0)

  await page.getByRole('button', { name: 'Hỏi AI', exact: true }).click()
  await expect(chatDivider).toHaveAttribute('aria-valuenow', '388')
  await expectPx(widthOf(chat), 388)
})

// End widens the outline first; the chat then gets what the 560px paper leaves, up to 648.
for (const { width, outlineMax, chatMax } of [
  { width: 1440, outlineMax: 320, chatMax: 1440 - 320 - 12 - 560 },
  { width: 1280, outlineMax: 320, chatMax: 1280 - 320 - 12 - 560 },
]) {
  test(`panels at their widest still fit a ${width}px window`, async ({ page }) => {
    await installAiFixture(page)
    await openAssistantAt(page, width, 900)
    const { outline, outlineDivider, paper, chatDivider, chat } = layout(page)

    for (const divider of [outlineDivider, chatDivider]) {
      await divider.focus()
      await page.keyboard.press('End')
    }
    await expect(outlineDivider).toHaveAttribute('aria-valuemax', String(outlineMax))
    await expect(outlineDivider).toHaveAttribute('aria-valuenow', String(outlineMax))
    await expect(chatDivider).toHaveAttribute('aria-valuemax', String(chatMax))
    await expect(chatDivider).toHaveAttribute('aria-valuenow', String(chatMax))
    await expectPx(widthOf(outline), outlineMax)
    await expectPx(widthOf(chat), chatMax)

    expect(Math.round((await rectOf(paper)).width)).toBeGreaterThanOrEqual(560)
    expect(Math.round((await rectOf(outline)).x)).toBeGreaterThanOrEqual(0)
    const chatBox = await rectOf(chat)
    expect(Math.round(chatBox.x + chatBox.width)).toBeLessThanOrEqual(width)
    // The screen clips its row, so this document check alone would miss an overflowing panel.
    const scroll = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.innerWidth)
  })
}
