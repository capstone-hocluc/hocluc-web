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
  /** Set once the exam went out through "Xuất bản". */
  publishedAt?: string | null
  publishedAs?: 'QUIZ' | 'EXAM' | 'DOCX' | 'PDF' | null
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
  method: 'Thay giá trị vào biểu thức.',
  eliminations: { B: 'Nhầm dấu khi chuyển vế.', C: 'Làm tròn quá sớm.' },
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

const composeStream = (conversationId: string, planNotes?: string[]) =>
  sse(
    ['stage', { stage: 'explore', status: 'running', summary: 'Đã khảo sát 120 câu' }],
    ['stage', { stage: 'plan', status: 'running' }],
    ['stage', { stage: 'plan', status: 'done', cells: 2, ...(planNotes ? { notes: planNotes } : {}) }],
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

/** Question 2 as "Sửa câu 2 cho khó hơn" rewrites it: new words, and C is now the answer. */
const revisedQuestion = () => ({
  ...question('Tính giá trị của biểu thức hai x cộng một khi x bằng ba.', 'KHO'),
  explanation: 'Thay x bằng 3: 2·3 + 1 = 7.',
  options: [
    { label: 'A', text: '5', correct: false },
    { label: 'B', text: '6', correct: false },
    { label: 'C', text: '7', correct: true },
    { label: 'D', text: '8', correct: false },
  ],
})

/** A revise run as the server streams it: its steps as tool calls, then the question saved over itself. */
const reviseStream = (target: { itemId?: string; number: number }) =>
  sse(
    ['slot', { stage: 'write', status: 'running', index: 1, total: 1, section: 'P2', revise: true, number: target.number }],
    ['tool', { tool: 'get_draft_question', arguments: { number: target.number } }],
    ['tool', { tool: 'revise_question', arguments: { number: target.number, instruction: 'khó hơn' } }],
    ['tool', { tool: 'check_question', arguments: { number: target.number } }],
    // A question the AI wrote is saved over its draft item; one only the sheet holds comes back to be written there.
    target.itemId
      ? ['item', {
          stage: 'write',
          status: 'saved',
          itemId: target.itemId,
          section: 'P2',
          position: 2,
          source: 'AI',
          question: revisedQuestion(),
          check: { passed: true },
          revised: true,
          number: target.number,
        }]
      : ['rewrite', { number: target.number, question: revisedQuestion(), check: { passed: true } }],
    ['end', { status: 'DONE', revised: 1, questions: [{ number: target.number, answer: 'C', needsReview: false }] }]
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
  /** A compose run still queued behind other teachers' runs. */
  queued?: boolean
  /** The teacher already has an exam being composed in another conversation. */
  busyElsewhere?: boolean
  /** A compose request naming no subject is answered with the question which subject, until the words say "môn". */
  subjectRequired?: boolean
  /** The question which subject also offers the whole paper: the teacher can teach every subject of the format. */
  subjectWhole?: boolean
  /** What the plan step of a compose run says about the request. */
  planNotes?: string[]
  /** The text of the `answer` event an ask run publishes, instead of its usual error. */
  askAnswer?: string
  /** A compose run already going when the page opens: the draft reports it, with the last event before it began. */
  runningAfter?: string
  /** Papers loaded into the bank, listed with the exams. */
  bankSources?: Record<string, unknown>[]
  /** What a paper's reading answers, and its stream (null: the stream cannot be opened). */
  bankReading?: (sourceId: string) => unknown
  bankStream?: (sourceId: string) => string | null
  /** The subject every draft question goes under in the bank; without it none is known and nothing can be saved. */
  bankSubject?: string
  /** The subjects the viewer authors in the bank. */
  authorSubjectIds?: string[]
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
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('PressResponder')) quiz.pageErrors.push(message.text())
  })
  const state = {
    // Copies: a test that renames or publishes an exam must not change the shared fixture other tests start from.
    conversations: (options.conversations ?? []).map((conversation) => ({ ...conversation })) as Conversation[],
    messages: new Map(Object.entries(options.messages ?? {})),
    drafts: new Map(Object.entries(options.drafts ?? {})),
    documents: new Map(Object.entries(options.documents ?? {})),
    /** Set to make the next document save answer 409 once: another tab saved this content first, one version on. */
    conflictNextSave: null as Record<string, unknown> | null,
    /** While set, creating a conversation waits for it before answering. */
    creationGate: null as Promise<void> | null,
    /** While set, "Nhờ AI sửa" waits for it before answering. */
    rewriteGate: null as Promise<void> | null,
    /** This many conversation creations fail with a server error first. */
    failCreations: 0,
    /** This many document reads fail with a server error first. */
    failDocumentReads: 0,
    /** The next document save is stored, but its answer never reaches the page (the connection drops). */
    loseNextSaveAnswer: false,
    requests: [] as Array<{ method: string; path: string; body: Record<string, unknown>; lastEventId: string }>,
    mode: 'compose' as 'ask' | 'compose' | 'mock-exam' | 'revise',
    /** The question the last "Sửa câu …" asked for. */
    revised: null as { itemId?: string; number: number } | null,
    posted: false,
    cancelled: false,
    /** Sends are refused as another exam being composed; a test turns it off to let a retry through. */
    busy: options.busyElsewhere === true,
    /** The bank question each draft question saved to the bank became. */
    bankSaved: new Map<string, string>(),
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

    // A file published from "Xuất bản"; the edit time stays as it was.
    if (action === 'publish' && method === 'POST') {
      if (body.as !== 'DOCX' && body.as !== 'PDF') return reply(null, 400, 'Kiểu xuất bản không hợp lệ.')
      conversation.publishedAt = stamp
      conversation.publishedAs = body.as
      return reply(conversation)
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

    // "Nhờ AI sửa" on a selection: the selected words come back rewritten.
    if (action === 'rewrite' && method === 'POST') {
      if (state.rewriteGate) await state.rewriteGate
      return reply({ text: 'Phương trình $x + 2 = 0$ có bao nhiêu nghiệm?' })
    }

    if (action === 'messages') {
      if (method === 'GET') return reply(state.messages.get(conversationId) ?? [])
      if (options.subjectRequired && body.mode === 'compose' && !/môn|cả đề/i.test(String(body.content))) {
        return reply({ subjects: [{ id: 'subject-1', name: 'Toán học' }, { id: 'subject-2', name: 'Vật lí' }], whole: options.subjectWhole === true }, 422, 'Bạn muốn soạn môn nào?', 'AI_COMPOSE_SUBJECT_REQUIRED')
      }
      if (state.busy && body.mode !== 'ask') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, status: 409, message: 'Bạn đang có một đề khác đang soạn. Đợi đề đó xong hoặc dừng nó rồi soạn tiếp.' }),
        })
      }
      state.posted = true
      state.mode = body.mode === 'ask' || body.mode === 'mock-exam' || body.mode === 'revise' ? body.mode : 'compose'
      const messages = state.messages.get(conversationId) ?? []
      if (state.mode === 'revise') {
        // Rewrites the named question in place, as the server does; the rest of the draft stays.
        const target = ((body.config as Record<string, unknown>).items as Array<{ itemId: string; number: number }>)[0]
        state.revised = target
        messages.push(
          { id: `user-${messages.length + 1}`, conversationId, role: 'USER', mode: 'revise', content: body.content, createdAt: stamp },
          {
            id: `assistant-${messages.length + 2}`,
            conversationId,
            role: 'ASSISTANT',
            mode: 'revise',
            content: `Mình đã sửa câu ${target.number} theo yêu cầu (đáp án mới: câu ${target.number}: C).`,
            createdAt: stamp,
          }
        )
        const draft = state.drafts.get(conversationId)
        const item = draft?.items.find((entry) => entry.id === target.itemId)
        if (item) item.question = revisedQuestion()
        state.messages.set(conversationId, messages)
        return reply({ messageId: `user-${messages.length - 1}`, jobId: 'job-2' })
      }
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
              : options.queued
                ? sse(['stage', { stage: 'queue', status: 'running', ahead: 2, summary: 'Trước bạn còn 2 đề' }])
              : options.endless
                ? sse(['tool', { tool: 'soan-cau-hoi', arguments: { section: 'P2' } }])
                : state.mode === 'revise' && state.revised
                  ? reviseStream(state.revised)
                  : composeStream(conversationId, options.planNotes)
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
      // Where each question stands with the bank, and saving questions there, once each.
      if (segments.length === 2 && segments[1] === 'bank' && method === 'GET') {
        return reply({
          items: draft.items.map((entry) => ({
            itemId: entry.id,
            subjectId: options.bankSubject ?? null,
            questionId: state.bankSaved.get(entry.id) ?? null,
          })),
        })
      }
      if (segments.length === 2 && segments[1] === 'bank' && method === 'POST') {
        const itemIds = (body.itemIds as string[] | undefined) ?? draft.items.filter((entry) => entry.kept).map((entry) => entry.id)
        return reply({
          items: itemIds.map((itemId) => {
            const before = state.bankSaved.get(itemId)
            if (before) return { itemId, result: 'ALREADY_SAVED', questionId: before, reason: null }
            if (!options.bankSubject) return { itemId, result: 'SKIPPED', questionId: null, reason: 'Chưa xác định được môn của câu' }
            state.bankSaved.set(itemId, `bank-question-${itemId}`)
            return { itemId, result: 'SAVED', questionId: `bank-question-${itemId}`, reason: null }
          }),
        })
      }
      if (segments.length === 2 && segments[1] === 'quiz' && method === 'POST') {
        const written = draft.items.filter((entry) => entry.kept && !entry.question.failed)
        // The server records that the exam went out, as a mock exam or a course quiz.
        conversation.publishedAt = stamp
        conversation.publishedAs = body.type === 'EXAM' ? 'EXAM' : 'QUIZ'
        return reply({
          quizId: 'quiz-from-draft',
          type: body.type,
          title: String(body.title ?? conversation.title),
          questionCount: written.length,
          skipped: [],
        })
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

  // The papers loaded into the bank: listed with the exams, loaded and read in the workspace.
  const bank = { sources: [...(options.bankSources ?? [])], upload: null as string | null }
  await page.route('**/api/v1/question-bank/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { success: status < 400, status, data, message: 'OK' } })
    if (path === '/api/v1/question-bank/labelling') return reply({ ready: true, reason: null })
    if (path === '/api/v1/question-bank/me/scopes') {
      return reply({ administrator: false, authorSubjectIds: options.authorSubjectIds ?? [], reviewerSubjectIds: [] })
    }
    if (path === '/api/v1/question-bank/sources') {
      if (method === 'GET') return reply(bank.sources)
      bank.upload = request.postData()
      const queued = bankSource('src-new', 'Đề vừa nạp', 'PENDING')
      bank.sources = [queued, ...bank.sources]
      return reply(queued, 202)
    }
    const paper = path.match(/^\/api\/v1\/question-bank\/sources\/([^/]+)\/(reading|stream)$/)
    if (paper && method === 'GET') {
      const id = decodeURIComponent(paper[1])
      if (paper[2] === 'reading') return reply(options.bankReading?.(id) ?? bankReading(id, 'PENDING', []))
      const stream = options.bankStream?.(id) ?? null
      if (stream === null) return reply(null, 404)
      return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: stream })
    }
    quiz.unmatched.push(`${method} ${path}`)
    return reply(null, 501)
  })

  return { quiz, state, bank }
}

/** A paper loaded into the bank, as the list of papers shows it. */
function bankSource(id: string, title: string, status: string, questionCount = 0) {
  return {
    id, code: id, title, year: 2021, round: null, answerSource: 'REFERENCE_KEY', status,
    progress: status === 'DONE' ? null : 'Đang đọc đề', error: null, questionCount, duplicateCount: 0,
    needsReviewCount: 0, unlabelledCount: 0, createdAt: stamp, finishedAt: status === 'DONE' ? stamp : null, retryable: true,
  }
}

const paperQuestion = (number: number, text: string) => ({
  number, sectionKey: 'P1', groupKey: null, text, explanation: null, subject: null, sourcePage: 1, hasFigure: false,
  figureIds: [], imageUrl: null, hasFormula: false, confidence: 0.9, reviewNote: null,
  options: [{ label: 'A', text: '2', correct: true }, { label: 'B', text: '3', correct: false }],
})

/** What is stored of a paper's reading: one part, the questions read so far. */
function bankReading(sourceId: string, status: string, questions: ReturnType<typeof paperQuestion>[]) {
  return {
    sourceId, status, stage: status === 'DONE' ? 'DONE' : 'QUESTIONS', progress: null, error: null, finished: status === 'DONE',
    pageCount: 0, groups: [], questions, regions: [],
    sections: [{ key: 'P1', parentKey: null, title: 'Phần 1', subject: null, suggestedMinutes: null, fromQuestion: 1, toQuestion: 3 }],
  }
}

/** A server-sent event stream as the server writes it. */
const sseEvents = (...events: [string, unknown][]) =>
  events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join('')

/** An empty bank behind the entry screen; registered after installAiFixture so it answers before its catch-all. */
async function installBankFixture(page: Page) {
  await page.route('**/api/v1/question-bank/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data, message: 'OK' } })
    if (path.endsWith('/me/scopes')) {
      return ok({ administrator: false, authorSubjectIds: ['category-1'], reviewerSubjectIds: [] })
    }
    if (path.endsWith('/stats')) {
      return ok({
        total: 0, needsReview: 0, unlabelled: 0, byPart: {}, byYear: {},
        byAnswerSource: { PUBLISHED_KEY: 0, REFERENCE_KEY: 0, NONE: 0 }, bySubject: [],
      })
    }
    if (path.endsWith('/patterns')) return ok([])
    if (path.endsWith('/sources')) return ok([])
    if (path.endsWith('/labelling')) return ok({ ready: false, reason: 'Chưa cấu hình khoá Jev.' })
    if (path.endsWith('/questions')) {
      return ok({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true })
    }
    return route.fulfill({ status: 404, json: { success: false, status: 404, message: 'unmatched' } })
  })
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
  // The compose settings sit behind the "Tùy chọn" chip; its title sums them up, with no subject in it.
  await expect(page.getByRole('button', { name: 'Tùy chọn', exact: true })).toHaveAttribute(
    'title',
    '5 câu · VACT 2025 · Dùng lại 20% · Lời giải đầy đủ'
  )
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

/** The read-only sheet a loaded paper is shown on. */
const readingSheet = (page: Page) => page.locator('[aria-label="Đề đang đọc (chỉ đọc)"]')

test('a paper is loaded from the workspace and opens there, read as an exam is written', async ({ page }) => {
  const { bank } = await installAiFixture(page)
  await page.route('**/api/v1/admin/exam-years', (route) =>
    route.fulfill({ json: { success: true, status: 200, message: 'OK', data: [] } })
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  await page.getByRole('button', { name: 'Nạp đề', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('File đề (PDF)')
    .setInputFiles({ name: 'de-2021.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await dialog.getByRole('button', { name: 'Xác nhận nhập' }).click()
  await expect(dialog).toBeHidden()
  expect(bank.upload).toContain('de-2021.pdf')

  // the paper takes the sheet's place: same header, the run's progress where the chat was
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('Đề vừa nạp')
  await expect(page.getByRole('complementary', { name: 'Tiến trình đọc đề' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tiến trình', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Hỏi AI' })).toHaveCount(0)

  // it is listed with the exams, lit as the open one and still waiting to be read
  const exams = page.getByRole('list', { name: 'Đề của tôi', exact: true })
  await expect(exams.getByRole('button', { name: 'Đề vừa nạp', exact: true })).toHaveAttribute('aria-current', 'location')
  await expect(exams.getByRole('listitem').filter({ hasText: 'Đề vừa nạp' }).first()).toContainText('Đang chờ')
})

test('a paper being read shows on the sheet word by word, with the stages of the run', async ({ page }) => {
  const writing = sseEvents(
    ['snapshot', {
      sourceId: 'src-1', live: true, status: 'RUNNING', stage: 'QUESTIONS', progress: 'Đang đọc Phần 1 (câu 1-3)...', error: null,
      labelled: 0, labelTotal: 0, reviewed: 0, reviewTotal: 0, rereading: 0, needsPerson: 0,
      parts: [{ id: '1-3', title: 'Phần 1', fromQuestion: 1, toQuestion: 3, firstPage: 1, lastPage: 1, attempt: 1, status: 'READING', text: '', questions: 0 }],
    }],
    ['text', { partId: '1-3', attempt: 1, text: '{"questions": [{"number": 2, "text": "Câu 2: Tính 3 + 4", "options": [{"label": "A", "text": "7"}]}, ' }],
    ['text', { partId: '1-3', attempt: 1, text: '{"number": 3, "text": "Câu 3: Tìm giá trị lớn nhất của' }],
  )
  await installAiFixture(page, 'MANAGER', {
    bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'RUNNING')],
    bankReading: (id) => bankReading(id, 'RUNNING', [paperQuestion(1, 'Giải x + 1 = 3')]),
    bankStream: () => writing,
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  await page.getByRole('list', { name: 'Đề của tôi', exact: true }).getByRole('button', { name: 'Đề mẫu 2021', exact: true }).click()

  const sheet = readingSheet(page)
  // the stored question and the one finished in the stream are on the paper, numbered as printed
  await expect(sheet).toContainText('PHẦN 1')
  await expect(sheet).toContainText('Câu 1. Giải x + 1 = 3')
  await expect(sheet).toContainText('Câu 2. Tính 3 + 4')
  // the one being written shows in the live box the compose run uses
  const live = sheet.locator('[data-live-draft]')
  await expect(live).toContainText('AI đang đọc đề…')
  await expect(live).toContainText('Câu 3. Tìm giá trị lớn nhất của')
  await expect(sheet).toHaveAttribute('contenteditable', 'false')

  const panel = page.getByRole('complementary', { name: 'Tiến trình đọc đề' })
  await expect(panel.getByText('AI đang đọc đề', { exact: true })).toBeVisible()
  await expect(panel.getByText('Đọc câu hỏi')).toBeVisible()
  await expect(panel.getByText('0/1 phần')).toBeVisible()
  await expect(panel.getByText('Phần 1 · câu 1–3')).toBeVisible()
  // the paper is lit in the list, among the loaded papers, with no outline of its questions under it
  const papers = page.getByRole('list', { name: 'Đề nạp vào kho', exact: true })
  await expect(papers.getByRole('button', { name: 'Đề mẫu 2021', exact: true })).toHaveAttribute('aria-current', 'location')
  await expect(page.getByRole('list', { name: 'Đề của tôi', exact: true }).getByText('Câu 1.')).toHaveCount(0)
})

test('a teacher opens loaded papers in the workspace but cannot load one', async ({ page }) => {
  await installAiFixture(page, 'TEACHER', {
    bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'DONE', 1)],
    bankReading: (id) => bankReading(id, 'DONE', [paperQuestion(1, 'Giải x + 1 = 3')]),
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/teacher/ai-assistant')
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nạp đề', exact: true })).toHaveCount(0)

  const panel = page.getByRole('complementary', { name: 'Danh sách đề' })
  await panel.getByRole('list', { name: 'Đề của tôi', exact: true }).getByRole('button', { name: 'Đề mẫu 2021', exact: true }).click()
  await expect(readingSheet(page)).toContainText('Câu 1. Giải x + 1 = 3')
  await expect(page.getByRole('button', { name: 'Gán nhãn' })).toHaveCount(0)
})

test('the question bank opens the assistant, whose compose settings ask for no subject, and its back control returns to the bank', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await installBankFixture(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/question-bank')

  await expect(page.getByRole('button', { name: 'Soạn đề với AI', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Soạn đề với AI', exact: true }).click()

  await expect(page).toHaveURL(/\/console\/manager\/ai-assistant$/)
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  await page.getByRole('button', { name: 'Tùy chọn', exact: true }).click()
  // The request names the subject ("10 câu Toán"); the settings have no subject to pick.
  await expect(page.getByText('Định dạng đề', { exact: true })).toBeVisible()
  await expect(page.getByText('Môn học', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })).toHaveAttribute('placeholder', /Soạn 10 câu Toán/)
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toBeDisabled()
  expect(state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations`)).toBe(true)

  await page.getByRole('link', { name: 'Về ngân hàng câu hỏi', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/manager\/question-bank$/)
  await expect(page.getByRole('heading', { name: 'Ngân hàng câu hỏi', exact: true })).toBeVisible()
})

test('a teacher opens the assistant from the menu, and its back control returns to the overview', async ({ page }) => {
  await installAiFixture(page, 'TEACHER')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/teacher/dashboard')

  await page.locator('aside nav').getByRole('button', { name: 'Trợ lý AI', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/teacher\/ai-assistant$/)
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()

  await page.getByRole('link', { name: 'Về trang tổng quan', exact: true }).click()
  await expect(page).toHaveURL(/\/console\/teacher\/dashboard$/)
})

test('the assistant entry stays visible after switching to the bank\'s "Đề đã nạp" tab', async ({ page }) => {
  await installAiFixture(page)
  await installBankFixture(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/question-bank')

  const entry = page.getByRole('button', { name: 'Soạn đề với AI', exact: true })
  await expect(entry).toBeVisible()
  await page.getByRole('tab', { name: 'Đề đã nạp' }).click()
  await expect(page.getByRole('tab', { name: 'Đề đã nạp' })).toHaveAttribute('aria-selected', 'true')
  await expect(entry).toBeVisible()
})

// MENTOR has no grant for the bank page (src/lib/permissions.ts), so there is no bank screen
// to carry the button: the route is refused before any assistant entry can be shown.
test('a role with no bank page is refused the bank instead of seeing the assistant entry', async ({ page }) => {
  const state = await installQuizFixture(page, 'MENTOR')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/mentor/question-bank')

  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Soạn đề với AI', exact: true })).toHaveCount(0)
  expect(state.unmatched).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('a compose run streams its stages and items into the paper', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toBeVisible()
  await expect(page.getByText('Khảo sát ngân hàng câu hỏi')).toBeVisible()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  // Each stage folds to one line; opening the writing stage shows the questions it went through.
  await page.getByRole('button', { name: /^Soạn câu hỏi/ }).click()
  await expect(page.getByText('Đang soạn câu 2/2', { exact: true })).toBeVisible()
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

  // Choosing the mode was the new exam's first edit: it created the conversation (named after the document's
  // heading) and saved the document under it in that mode, so the prompt went to that conversation.
  const created = state.requests.filter((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations`)
  expect(created.map((entry) => entry.body)).toEqual([{ title: 'ĐỀ THI MỚI' }])
  expect(documentSaves(state, 'conv-1')[0]).toMatchObject({ mode: 'STRUCTURED', version: 0 })
  const sent = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`)
  expect(sent?.body).toMatchObject({
    content: 'Soạn 2 câu đại số cơ bản',
    mode: 'compose',
    config: { examFormat: 'VACT_2025', questionCount: 5, bankRatio: 0.2, solutionStyle: 'full' },
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

/** A saved exam of two kept AI questions shown as question cards, with what their check found. */
async function openCheckedExam(page: Page, role: UserRole, bank: Pick<AiFixtureOptions, 'bankSubject' | 'authorSubjectIds'>) {
  const saved: Conversation = { id: 'conv-7', title: 'Đề ôn hàm số', subjectId: null, mode: 'compose', createdAt: stamp, updatedAt: stamp }
  const fixture = await installAiFixture(page, role, {
    conversations: [saved],
    drafts: {
      'conv-7': {
        draft: { id: 'draft-conv-7', conversationId: 'conv-7', name: 'Đề ôn hàm số', examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [
          {
            ...item('conv-7', 'item-1', 1, 'Tính giá trị của biểu thức x cộng 1.', {
              passed: true,
              needsReview: true,
              reasons: [],
              warnings: ['Chưa kiểm dạng câu: máy chủ chưa cấu hình Jev', 'Chưa kiểm đáp án: máy chủ chưa cấu hình model soát đáp án'],
            }),
            kept: true,
          },
          {
            ...item('conv-7', 'item-2', 2, 'Rút gọn biểu thức hai x trừ x.', {
              passed: false,
              needsReview: true,
              reasons: ['Model soát chọn C, đáp án A'],
              warnings: [],
            }),
            kept: true,
          },
        ],
      },
    },
    documents: { 'conv-7': structuredDocument('Đề ôn hàm số', ['item-1', 'item-2']) },
    ...bank,
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/console/${role === 'TEACHER' ? 'teacher' : 'manager'}/ai-assistant`)
  await expect(page.locator('#exam-question-item-1')).toBeVisible()
  return fixture
}

test('a question card shows what its check found, faults apart from warnings', async ({ page }) => {
  await openCheckedExam(page, 'MANAGER', {})

  const first = page.locator('#exam-question-item-1').getByRole('list', { name: 'Kết quả kiểm tra câu 1', exact: true })
  await expect(first.getByText('Cần duyệt', { exact: true })).toBeVisible()
  await expect(first.getByTitle('Chưa kiểm dạng câu: máy chủ chưa cấu hình Jev', { exact: true })).toBeVisible()
  await expect(first.getByTitle('Chưa kiểm đáp án: máy chủ chưa cấu hình model soát đáp án', { exact: true }))
    .toContainText('Chưa kiểm đáp án')
  const second = page.locator('#exam-question-item-2').getByRole('list', { name: 'Kết quả kiểm tra câu 2', exact: true })
  await expect(second.getByTitle('Model soát chọn C, đáp án A', { exact: true })).toBeVisible()
})

test('a question is saved to the bank from its card, then the rest from the header', async ({ page }) => {
  const { state } = await openCheckedExam(page, 'MANAGER', { bankSubject: 'category-1', authorSubjectIds: ['category-1'] })
  const saves = () => state.requests.filter((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-7/draft/bank`)

  const first = page.locator('#exam-question-item-1')
  await first.hover()
  await first.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng', exact: true }).click()
  await expect.poll(() => saves().at(-1)?.body).toEqual({ itemIds: ['item-1'] })
  await expect(first.getByText('Đã lưu vào ngân hàng', { exact: true })).toBeVisible()
  await expect(first.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng' })).toHaveCount(0)

  await page.getByRole('banner').getByRole('button', { name: 'Lưu vào ngân hàng', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('checkbox', { name: /^Câu 1\./ })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Lưu 1 câu', exact: true }).click()
  await expect(dialog.getByText('Đã lưu 1 câu', { exact: true })).toBeVisible()
  expect(saves().at(-1)?.body).toEqual({ itemIds: ['item-2'] })
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(page.locator('#exam-question-item-2').getByText('Đã lưu vào ngân hàng', { exact: true })).toBeVisible()
})

test('without an author scope for the questions\' subject nothing is offered for the bank', async ({ page }) => {
  const { state } = await openCheckedExam(page, 'MANAGER', { bankSubject: 'category-1', authorSubjectIds: ['category-2'] })

  // a manager asks where the questions stand with the bank...
  await expect
    .poll(() => state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations/conv-7/draft/bank`))
    .toBe(true)
  // ...but may save none of another subject's questions
  await expect(page.getByRole('banner').getByRole('button', { name: 'Lưu vào ngân hàng' })).toHaveCount(0)
  await page.locator('#exam-question-item-1').hover()
  await expect(page.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng' })).toHaveCount(0)
})

test('a teacher, even one authoring the subject, is offered nothing for the bank and never asks about it', async ({ page }) => {
  const { state } = await openCheckedExam(page, 'TEACHER', { bankSubject: 'category-1', authorSubjectIds: ['category-1'] })
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('banner').getByRole('button', { name: 'Lưu vào ngân hàng' })).toHaveCount(0)
  await page.locator('#exam-question-item-1').hover()
  await expect(page.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng' })).toHaveCount(0)
  await expect(page.getByText('Đã lưu vào ngân hàng')).toHaveCount(0)
  expect(state.requests.filter((entry) => entry.path.endsWith('/draft/bank'))).toEqual([])
  // writing quizzes is staff work: the teacher publishes the exam only as a file
  await page.getByRole('banner').getByRole('button', { name: 'Xuất bản', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Word (.docx)', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Thành quiz / đề thi…', exact: true })).toHaveCount(0)
})

test('the exam becomes a draft mock exam of a course, opened from the result', async ({ page }) => {
  const { state } = await openCheckedExam(page, 'MANAGER', {})

  await page.getByRole('banner').getByRole('button', { name: 'Xuất bản', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Thành quiz / đề thi…', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Khóa học' }).click()
  await page.getByRole('option', { name: 'Khóa được phân công', exact: true }).click()
  await expect(dialog.getByText('2 câu cần kiểm tra lại; quiz được tạo ở dạng nháp.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Xuất 2 câu', exact: true }).click()

  await expect(dialog.getByText('Đề thi thử “Đề ôn hàm số” đã được tạo ở dạng nháp với 2 câu.')).toBeVisible()
  const exported = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-7/draft/quiz`)
  expect(exported?.body).toMatchObject({ type: 'EXAM', courseId: '10000000-0000-0000-0000-000000000001', title: 'Đề ôn hàm số' })
  await expect(dialog.getByRole('link', { name: 'Mở quiz', exact: true })).toHaveAttribute(
    'href',
    '/console/manager/mock-exams/quiz-from-draft/edit'
  )

  // the exam went out as a mock exam: the list moves it from the drafts to the published ones
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click()
  const published = page.getByRole('list', { name: 'Đã xuất bản', exact: true })
  await expect(published.getByRole('listitem').filter({ hasText: 'Đề ôn hàm số' })).toContainText('Đề thi thử')
  await expect(page.getByRole('list', { name: 'Bản nháp', exact: true }).getByText('Đề ôn hàm số')).toHaveCount(0)
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

test('a run queued behind other teachers shows its place before its own steps', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { queued: true })
  await openAssistant(page)
  await chooseStructuredMode(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đang chờ đến lượt', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Trước bạn còn 2 đề', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toBeVisible()
})

test('a teacher composing another exam elsewhere is told so instead of starting a second one', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { busyElsewhere: true })
  await openAssistant(page)
  await chooseStructuredMode(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Bạn đang có một đề khác đang soạn. Đợi đề đó xong hoặc dừng nó rồi soạn tiếp.').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toHaveCount(0)
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

test('the assistant moves to a bar at the bottom of the paper, answers there, folds away and goes back beside it', async ({ page }) => {
  const answer = 'Đạo hàm là tốc độ thay đổi tức thời của hàm số tại một điểm.'
  await installAiFixture(page, 'MANAGER', { askAnswer: answer })
  await openAssistant(page)

  await page.getByRole('complementary', { name: 'Trợ lý AI' }).getByRole('button', { name: 'Chuyển sang thanh dưới cùng' }).click()
  const bar = page.getByRole('region', { name: 'Thanh trợ lý AI' })
  await expect(bar).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toHaveCount(0)
  // The bar floats over the paper, inside its column.
  const [barBox, paperBox] = await Promise.all([bar.boundingBox(), page.locator('main').first().boundingBox()])
  expect(barBox!.x).toBeGreaterThanOrEqual(paperBox!.x)
  expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(paperBox!.x + paperBox!.width)

  await bar.getByRole('button', { name: 'Chế độ trả lời' }).click()
  await page.getByRole('option', { name: /Hỏi đáp/ }).click()
  await bar.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Đạo hàm là gì?')
  await bar.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(bar.getByText(answer, { exact: true })).toBeVisible({ timeout: 15_000 })

  // Escape folds the bar to one button, which opens it again.
  await bar.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).press('Escape')
  await expect(bar).toHaveCount(0)
  await page.getByRole('button', { name: 'Mở rộng thanh trợ lý AI' }).click()
  await expect(bar.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })).toBeFocused()

  // The place is kept for the next visit.
  await page.reload()
  await expect(bar).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toHaveCount(0)

  await bar.getByRole('button', { name: 'Tùy chọn thanh trợ lý AI' }).click()
  await page.getByRole('menuitem', { name: 'Chuyển sang bảng điều khiển bên' }).click()
  const panel = page.getByRole('complementary', { name: 'Trợ lý AI' })
  await expect(panel).toBeVisible()
  await expect(bar).toHaveCount(0)
  // The thread asked in the bar is all there in the panel.
  await expect(panel.getByText(answer, { exact: true })).toBeVisible()
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

  // The exams are listed in the left panel, the open one lit among the drafts; the chat's list button brings that
  // panel back when it was folded away.
  const chat = page.getByRole('complementary', { name: 'Trợ lý AI', exact: true })
  await expect(page.getByRole('banner').getByRole('button', { name: 'Cuộc trò chuyện', exact: true })).toHaveCount(0)
  const exams = page.getByRole('list', { name: 'Đề của tôi', exact: true })
  await expect(
    exams.getByRole('list', { name: 'Bản nháp', exact: true }).getByRole('button', { name: 'Đề đã lưu', exact: true })
  ).toHaveAttribute('aria-current', 'location')
  await page.getByRole('button', { name: 'Thu gọn danh sách đề', exact: true }).click()
  await expect(exams).toBeHidden()
  await chat.getByRole('button', { name: 'Cuộc trò chuyện', exact: true }).click()
  await expect(exams).toBeVisible()

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

/** The "Câu n. …" question lines of a sheet, in order (the answer guide's "Câu n. Chọn A." lines left out). */
const questionLines = (sheet: Locator) => sheet.locator(':scope > p:not([data-exam-key])').filter({ hasText: /^Câu \d+\./ })

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

test('the exam list groups drafts, published exams and loaded papers, and keeps how the viewer set it', async ({ page }) => {
  const handedOut: Conversation = {
    id: 'conv-8',
    title: 'Đề giữa kỳ đã giao',
    subjectId: 'category-1',
    mode: 'compose',
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-20T08:00:00Z',
    publishedAt: '2026-10-21T08:00:00Z',
    publishedAs: 'QUIZ',
  }
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam, handedOut],
    documents: { 'conv-9': examDocument() },
    bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'DONE', 1)],
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant?c=conv-9')
  await expect(docEditor(page)).toContainText(EXAM_STEMS[0], { timeout: 15_000 })

  const panel = page.getByRole('complementary', { name: 'Danh sách đề', exact: true })
  const drafts = panel.getByRole('list', { name: 'Bản nháp', exact: true })
  const published = panel.getByRole('list', { name: 'Đã xuất bản', exact: true })
  const papers = panel.getByRole('list', { name: 'Đề nạp vào kho', exact: true })
  await expect(drafts.getByRole('button', { name: savedExam.title, exact: true })).toHaveAttribute('aria-current', 'location')
  await expect(published.getByRole('listitem')).toHaveText([/^Đề giữa kỳ đã giao.*Quiz$/])
  // A paper read to the end carries no tag: its group says what it is.
  await expect(papers.getByRole('listitem')).toHaveText(['Đề mẫu 2021'])
  // As a word processor's tabs panel: an arrow that puts it away, the tabs with "+" beside them; no title, and
  // loading a paper is the header's. The header has no buttons of its own for a new exam or for the list.
  await expect(panel.getByRole('tab', { name: 'Đề', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(panel.getByRole('heading')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Thêm đề', exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: /Nạp đề/ })).toHaveCount(0)
  await expect(page.getByRole('banner').getByRole('button', { name: /Đề mới|Danh sách đề|Thêm đề/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hiện danh sách đề', exact: true })).toBeHidden()

  // A Word file from "Xuất bản" publishes the exam; the same file from the File menu does not.
  const publishes = () => state.requests.filter((entry) => entry.method === 'POST' && entry.path.endsWith('/publish'))
  await downloadFromFileMenu(page, 'Word (.docx)')
  expect(publishes()).toEqual([])
  await page.getByRole('banner').getByRole('button', { name: 'Xuất bản', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Word (.docx)', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10.docx')
  await expect.poll(() => publishes().map((entry) => entry.body)).toEqual([{ as: 'DOCX' }])
  await expect(published.getByRole('listitem')).toHaveText([/^Đề kiểm tra Toán 10.*Word$/, /^Đề giữa kỳ đã giao.*Quiz$/])
  await expect(drafts.getByRole('listitem')).toHaveCount(0)

  // The viewer hides the loaded papers, sorts by name and folds the drafts; the last group shown cannot be hidden.
  await panel.getByRole('button', { name: 'Tùy chỉnh danh sách', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Đề nạp vào kho', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Đã xuất bản', exact: true }).click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Bản nháp', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('menuitemcheckbox', { name: 'Đã xuất bản', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Tên A–Z', exact: true }).click()
  await expect(papers).toHaveCount(0)
  await expect(published.getByRole('listitem')).toHaveText([/^Đề giữa kỳ đã giao/, /^Đề kiểm tra Toán 10/])
  await panel.getByRole('button', { name: 'Thu gọn Bản nháp', exact: true }).click()
  await expect(drafts).toHaveCount(0)

  // All of it is still so after a reload, and the server kept the exam published.
  await page.reload()
  await expect(docEditor(page)).toContainText(EXAM_STEMS[0], { timeout: 15_000 })
  await expect(published.getByRole('button', { name: savedExam.title, exact: true })).toHaveAttribute('aria-current', 'location')
  await expect(published.getByRole('listitem')).toHaveText([/^Đề giữa kỳ đã giao/, /^Đề kiểm tra Toán 10.*Word$/])
  await expect(papers).toHaveCount(0)
  await expect(drafts).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Mở Bản nháp', exact: true })).toBeVisible()
})

test('an exam\'s menu copies its link, renames it and unfolds its outline under it, as a double click does', async ({ page }) => {
  // The copied link is read back from a stand-in clipboard: the headless browser's own may refuse to be read.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          ;(window as unknown as { copied: string }).copied = text
          return Promise.resolve()
        },
      },
    })
  })
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    documents: { 'conv-9': examDocument() },
    bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'DONE', 1)],
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant?c=conv-9')
  await expect(docEditor(page)).toContainText(EXAM_STEMS[0], { timeout: 15_000 })
  const copied = () => page.evaluate(() => (window as unknown as { copied?: string }).copied ?? null)

  const panel = page.getByRole('complementary', { name: 'Danh sách đề', exact: true })
  const outline = panel.getByRole('list', { name: 'Bố cục đề', exact: true })
  const row = panel.getByRole('button', { name: savedExam.title, exact: true })
  const menu = panel.getByRole('button', { name: `Tùy chọn ${savedExam.title}`, exact: true })
  await expect(outline).toHaveCount(0)

  // "Hiện bố cục" lists the exam's headings and every question under it; a line takes the sheet there.
  await menu.click()
  await page.getByRole('menuitem', { name: 'Hiện bố cục', exact: true }).click()
  await expect(outline.getByRole('button', { name: /^Tới / })).toHaveText([
    'ĐỀ KIỂM TRA TOÁN 10',
    'PHẦN I. TRẮC NGHIỆM',
    ...EXAM_STEMS.map((stem, index) => `Câu ${index + 1}. ${stem}`),
  ])
  const third = outline.getByRole('button', { name: `Tới Câu 3. ${EXAM_STEMS[2]}`, exact: true })
  await third.click()
  await expect(third).toHaveAttribute('aria-current', 'location')
  await expect(panel.getByRole('button', { name: `Thu gọn ${savedExam.title}`, exact: true })).toHaveAttribute('aria-expanded', 'true')
  await menu.click()
  await page.getByRole('menuitem', { name: 'Ẩn bố cục', exact: true }).click()
  await expect(outline).toHaveCount(0)

  // A double click on the row unfolds it too, and folds it again.
  await row.dblclick()
  await expect(outline).toBeVisible()
  await row.dblclick()
  await expect(outline).toHaveCount(0)

  // The links open the exam (?c=) and the loaded paper (?paper=), with the toast saying so.
  await menu.click()
  await page.getByRole('menuitem', { name: 'Sao chép đường liên kết', exact: true }).click()
  await expect.poll(copied).toBe(new URL('/console/manager/ai-assistant?c=conv-9', page.url()).href)
  await expect(page.getByText('Đã sao chép đường liên kết')).toBeVisible()
  const paperRow = panel.getByRole('list', { name: 'Đề nạp vào kho', exact: true }).getByRole('listitem')
  await paperRow.hover()
  await paperRow.getByRole('button', { name: 'Tùy chọn Đề mẫu 2021', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Đổi tên', exact: true })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Sao chép đường liên kết', exact: true }).click()
  await expect.poll(copied).toBe(new URL('/console/manager/ai-assistant?paper=src-1', page.url()).href)

  // "Đổi tên" swaps the row for a field holding the focus; "Xoá" asks first.
  await menu.click()
  await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).click()
  const name = panel.getByRole('textbox', { name: 'Tên đề', exact: true })
  await expect(name).toBeFocused()
  await name.fill('Đề Toán 10 đã sửa')
  await name.press('Enter')
  await expect(panel.getByRole('button', { name: 'Đề Toán 10 đã sửa', exact: true })).toBeVisible()
  await expect
    .poll(() => state.requests.filter((entry) => entry.method === 'PATCH' && entry.path.endsWith('/conv-9')).map((entry) => entry.body))
    .toEqual([{ title: 'Đề Toán 10 đã sửa' }])
  await panel.getByRole('button', { name: 'Tùy chọn Đề Toán 10 đã sửa', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Xoá', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Xoá cuộc trò chuyện' })).toBeVisible()
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
  // Only the answer key follows the end line.
  expect(blocks.slice(part + 6)).toContain('BẢNG ĐÁP ÁN')

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

/** The non-empty blocks of a sheet after its "--- HẾT ---" line. */
async function afterEndLine(sheet: Locator) {
  const blocks = await sheetBlocks(sheet)
  return blocks.slice(blocks.indexOf('--- HẾT ---') + 1).filter(Boolean)
}

/** The cell texts of the sheet table holding `text`, row by row. */
const tableRowsOf = (sheet: Locator, text: string) =>
  sheet
    .locator('table')
    .filter({ hasText: text })
    .evaluate((table) =>
      Array.from(table.querySelectorAll('tr')).map((row) =>
        Array.from(row.querySelectorAll('td, th')).map((cell) => (cell.textContent ?? '').trim())
      )
    )

const FULL_GUIDE = (number: number) => [
  `Câu ${number}. Chọn A.`,
  'Phương pháp giải: Thay giá trị vào biểu thức.',
  'Lời giải:',
  'Vì vậy chọn A.',
  'Phân tích, loại trừ:',
  '+ Đáp án B sai: Nhầm dấu khi chuyển vế.',
  '+ Đáp án C sai: Làm tròn quá sớm.',
]

test('a finished compose run writes the answer table and the full solution guide after the end line', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  await sendCompose(page)

  // A new page for the table, ten answers a row, then a new page for the guide.
  await expect.poll(() => afterEndLine(sheet)).toEqual([
    'BẢNG ĐÁP ÁN',
    'Câu12Đáp ánAA',
    'Câu cần thầy cô kiểm tra lại trước khi dùng: 1.',
    'HƯỚNG DẪN GIẢI',
    ...FULL_GUIDE(1),
    ...FULL_GUIDE(2),
  ])
  expect(await tableRowsOf(sheet, 'Đáp án')).toEqual([
    ['Câu', '1', '2'],
    ['Đáp án', 'A', 'A'],
  ])
  await expect(sheet.locator(':scope > [data-page-break][data-exam-key]')).toHaveCount(2)
  // The key is saved with the exam.
  await expect
    .poll(() => savedBlocks(documentSaves(state, 'conv-1').at(-1)))
    .toEqual(expect.arrayContaining(['BẢNG ĐÁP ÁN', 'HƯỚNG DẪN GIẢI', 'Câu 2. Chọn A.']))
})

test('a short solution style is asked for and shown, and the key is written again without doubling', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  await page.getByRole('button', { name: 'Tùy chọn', exact: true }).click()
  await page.getByRole('dialog', { name: 'Tùy chọn' }).getByRole('button', { name: /Lời giải/ }).click()
  await page.getByRole('option', { name: 'Gọn', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Tùy chọn', exact: true })).toHaveAttribute(
    'title',
    '5 câu · VACT 2025 · Dùng lại 20% · Lời giải gọn'
  )
  await sendCompose(page)

  const sent = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`)
  expect(sent?.body).toMatchObject({ config: { solutionStyle: 'short' } })
  const short = ['HƯỚNG DẪN GIẢI', 'Câu 1. Chọn A.', 'Vì vậy chọn A.', 'Câu 2. Chọn A.', 'Vì vậy chọn A.']
  await expect.poll(async () => (await afterEndLine(sheet)).slice(3)).toEqual(short)

  // Written again on request: the same key, once.
  await page.getByRole('button', { name: 'Cập nhật đáp án', exact: true }).click()
  await expect.poll(async () => (await afterEndLine(sheet)).slice(3)).toEqual(short)
  await expect(sheet.getByRole('heading', { name: 'BẢNG ĐÁP ÁN', exact: true })).toHaveCount(1)

  // A teacher who wants the full guide after all picks it and asks again.
  await page.getByRole('button', { name: 'Tùy chọn', exact: true }).click()
  await page.getByRole('dialog', { name: 'Tùy chọn' }).getByRole('button', { name: /Lời giải/ }).click()
  await page.getByRole('option', { name: 'Đầy đủ', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Cập nhật đáp án', exact: true }).click()
  await expect.poll(async () => (await afterEndLine(sheet)).slice(3)).toEqual(['HƯỚNG DẪN GIẢI', ...FULL_GUIDE(1), ...FULL_GUIDE(2)])
  await expect(sheet.getByRole('heading', { name: 'HƯỚNG DẪN GIẢI', exact: true })).toHaveCount(1)
})

const PROFIT_PASSAGE = 'Mỗi bánh loại A lãi 3 nghìn đồng, mỗi bánh loại B lãi 2 nghìn đồng; có 5 kg bột và 1 kg thịt.'

test('a question with its own passage prints it under a lead, and an older exam gets it back once', async ({ page }) => {
  // A bank question outside any group whose paper gave it the data to work from; the saved sheet lacks that data.
  const profit: DraftItem = {
    ...item('conv-9', 'item-p', 1, 'Lợi nhuận tối đa có thể thu được là bao nhiêu?'),
    question: { ...question('Lợi nhuận tối đa có thể thu được là bao nhiêu?'), passage: PROFIT_PASSAGE },
    source: 'BANK',
  }
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [profit],
      },
    },
    documents: {
      'conv-9': {
        mode: 'FREE',
        version: 2,
        updatedAt: stamp,
        content: {
          type: 'doc',
          attrs: { deliveredItems: ['item-p'] },
          content: [
            heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
            { type: 'paragraph', attrs: { examItem: 'item-p' }, content: [run('Câu 1. ', 'bold'), run('Lợi nhuận tối đa có thể thu được là bao nhiêu?')] },
            choiceGrid('Đáp án đúng', 'Đáp án sai', 'Đáp án gần đúng', 'Không xác định'),
            paragraph(run('--- HẾT ---', 'bold')),
          ],
        },
      },
    },
  })
  await openSavedDocument(page, 'Lợi nhuận tối đa')

  const sheet = docEditor(page)
  await expect.poll(() => sheetBlocks(sheet)).toEqual([
    'ĐỀ KIỂM TRA TOÁN 10',
    'Dựa vào thông tin dưới đây để trả lời câu 1',
    PROFIT_PASSAGE,
    'Câu 1. Lợi nhuận tối đa có thể thu được là bao nhiêu?',
    'A.Đáp án đúngB.Đáp án saiC.Đáp án gần đúngD.Không xác định',
    '--- HẾT ---',
  ])
  // Saved once with the passage; opening it again changes nothing more.
  await expect.poll(() => documentSaves(state, 'conv-9').length).toBe(1)
  expect(savedBlocks(documentSaves(state, 'conv-9')[0])).toContain(PROFIT_PASSAGE)
  await expect(questionLines(sheet)).toHaveCount(1)
})

test('underline and bold tags in a question show as underline and bold, also on a sheet saved with them as text', async ({ page }) => {
  // The sheet was saved before the tags were read, so its words still hold them; the passage is new and comes from
  // the draft.
  const stem = 'The analysts <u>attributed the rise with</u> the new form, rather than **to** a decline.'
  const marked: DraftItem = {
    ...item('conv-9', 'item-u', 1, stem),
    question: { ...question(stem), passage: 'If the stored map is <b>stale</b>, the app replaces it.' },
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [marked],
      },
    },
    documents: {
      'conv-9': {
        mode: 'FREE',
        version: 2,
        updatedAt: stamp,
        content: {
          type: 'doc',
          attrs: { deliveredItems: ['item-u'] },
          content: [
            heading(1, 'ĐỀ KIỂM TRA TIẾNG ANH'),
            { type: 'paragraph', attrs: { examItem: 'item-u' }, content: [run('Câu 1. ', 'bold'), run(stem)] },
            choiceGrid('<u>attributed</u>', 'to', 'with', 'for'),
            paragraph(run('--- HẾT ---', 'bold')),
          ],
        },
      },
    },
  })
  await openSavedDocument(page, 'The analysts')

  const sheet = docEditor(page)
  await expect(sheet.locator('u', { hasText: 'attributed the rise with' })).toBeVisible()
  await expect(sheet.locator('strong', { hasText: /^to$/ })).toBeVisible()
  await expect(sheet.locator('strong', { hasText: /^stale$/ })).toBeVisible()
  await expect(sheet.locator('u', { hasText: /^attributed$/ })).toBeVisible()
  await expect(sheet).not.toContainText('<u>')
  await expect(sheet).not.toContainText('<b>')
  await expect(sheet).not.toContainText('**')
})

test('"Sửa câu 2" rewrites only that question where it stands and writes its new answer into the key', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  await sendCompose(page)
  await expect(sheet.getByRole('heading', { name: 'HƯỚNG DẪN GIẢI', exact: true })).toHaveCount(1)
  // The teacher's own words in question 1 stay through the rewrite of question 2.
  await caretAtEndOf(page, 'Câu 1. Tính giá trị của biểu thức x cộng 1.')
  await page.keyboard.type(' (2 điểm)')

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Sửa câu 2 cho khó hơn')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đã sửa 1 câu trong đề')).toBeVisible({ timeout: 15_000 })
  const sent = state.requests.filter((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`).at(-1)
  expect(sent?.body).toMatchObject({ mode: 'revise', config: { items: [{ itemId: 'item-2', number: 2 }], instruction: 'Sửa câu 2 cho khó hơn' } })
  // The run's steps read as what they did, once its stage is opened.
  await page.getByRole('button', { name: /^Sửa câu hỏi/ }).click()
  for (const step of ['Đọc câu trong đề', 'Viết lại câu', 'Kiểm tra lại câu', 'Cập nhật đáp án']) {
    await expect(page.getByText(step, { exact: true }).first()).toBeVisible()
  }

  await expect(questionLines(sheet)).toHaveText([
    'Câu 1. Tính giá trị của biểu thức x cộng 1. (2 điểm)',
    'Câu 2. Tính giá trị của biểu thức hai x cộng một khi x bằng ba.',
  ])
  const options = questionLines(sheet).nth(1).locator('xpath=following-sibling::*[1]')
  await expect(options.locator('.exam-choice-body')).toHaveText(['5', '6', '7', '8'])
  expect(await tableRowsOf(sheet, 'Đáp án')).toEqual([
    ['Câu', '1', '2'],
    ['Đáp án', 'A', 'C'],
  ])
  const after = await afterEndLine(sheet)
  expect(after.filter((line) => line === 'BẢNG ĐÁP ÁN')).toHaveLength(1)
  expect(after).toContain('Câu 2. Chọn C.')
  expect(after).toContain('Thay x bằng 3: 2·3 + 1 = 7.')
})

test('a question the AI could not write keeps its place and number on the sheet, saying why', async ({ page }) => {
  const failed: DraftItem = {
    ...item('conv-9', 'item-2', 2, ''),
    question: {
      ...question(''),
      text: '',
      options: [],
      failed: true,
      failure: 'mất kết nối tới mô hình AI',
    },
    checkResult: { needsReview: true, reasons: ['Chưa soạn được: mất kết nối tới mô hình AI'] },
  }
  await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    drafts: {
      'conv-9': {
        draft: { id: 'draft-conv-9', conversationId: 'conv-9', name: savedExam.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [seededItems('conv-9')[0], failed, item('conv-9', 'item-3', 3, 'Tìm x biết 2x bằng 6.')],
      },
    },
    documents: { 'conv-9': { ...noteDocument(1), content: { ...noteContent(NOTE), attrs: { deliveredItems: [] } } } },
  })
  await openSavedDocument(page, 'Tìm x biết 2x bằng 6.')

  await expect(questionLines(docEditor(page))).toHaveText([
    'Câu 1. Tính giá trị của biểu thức x cộng 1.',
    'Câu 2. ⚠ CHƯA SOẠN ĐƯỢC CÂU NÀY (mất kết nối tới mô hình AI). Nhắn "Sửa câu" kèm số câu này để trợ lý soạn lại.',
    'Câu 3. Tìm x biết 2x bằng 6.',
  ])
  // It has no options to print: the next question follows its line.
  const blocks = await sheetBlocks(docEditor(page))
  const line = blocks.findIndex((block) => block.startsWith('Câu 2. ⚠'))
  expect(blocks[line + 1]).toBe('Câu 3. Tìm x biết 2x bằng 6.')
})

test('"Sửa câu 9" when the exam has no question 9 says so and sends nothing', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await sendCompose(page)
  const posts = () => state.requests.filter((entry) => entry.method === 'POST' && entry.path.endsWith('/messages')).length
  const before = posts()

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Sửa câu 9 cho dễ hơn')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đề không có câu 9 để sửa.')).toBeVisible()
  expect(posts()).toBe(before)
  await expect(page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })).toHaveValue('Sửa câu 9 cho dễ hơn')
})

const messagePosts = (state: { requests: Array<{ method: string; path: string; body?: unknown }> }) =>
  state.requests.filter((entry) => entry.method === 'POST' && entry.path.endsWith('/messages'))

test('"Sửa câu 2" in the mock exam mode revises that question instead of replacing the exam', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'DONE', 1)] })
  await openAssistant(page)
  await sendCompose(page)

  await page.getByRole('button', { name: 'Chế độ trả lời' }).click()
  await page.getByRole('option', { name: /Mô phỏng đề/ }).click()
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Câu 2 dễ quá, làm cho khó hơn chút')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đã sửa 1 câu trong đề')).toBeVisible({ timeout: 15_000 })
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ mode: 'revise', config: { items: [{ itemId: 'item-2', number: 2 }] } })
  await expect(page.getByRole('dialog', { name: 'Soạn đề mới thay đề hiện tại?' })).toHaveCount(0)
})

test('a new run over a draft with questions asks first, naming how many are replaced and kept', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
  await chooseStructuredMode(page)
  await sendCompose(page)
  await page.locator('#exam-question-item-1').getByRole('button', { name: 'Giữ', exact: true }).click()
  await expect(page.locator('#exam-question-item-1').getByText('Đã giữ', { exact: true })).toBeVisible()
  const posts = messagePosts(state).length
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })

  await input.fill('Soạn 2 câu hình học')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Soạn đề mới thay đề hiện tại?' })
  await expect(dialog).toContainText('2 câu hiện có sẽ bị thay, kể cả 1 câu đã giữ')
  await dialog.getByRole('button', { name: 'Huỷ' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(input).toHaveValue('Soạn 2 câu hình học')
  expect(messagePosts(state)).toHaveLength(posts)

  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await dialog.getByRole('button', { name: 'Thay đề' }).click()
  await expect.poll(() => messagePosts(state).length).toBe(posts + 1)
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ content: 'Soạn 2 câu hình học' })
})

test('a send that fails shows its error once and gives the typed message back', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { busyElsewhere: true })
  await openAssistant(page)
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })

  await input.fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Bạn đang có một đề khác đang soạn', { exact: false })).toHaveCount(1)
  await expect(input).toHaveValue('Soạn 2 câu đại số cơ bản')
})

test('stopping a run that the server accepts shows it stopped at once, with no warning', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { endless: true })
  await openAssistant(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn đề kiểm tra')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await page.getByRole('button', { name: 'Dừng tạo câu trả lời' }).click()

  // Well before the server's own end event could be waited for.
  await expect(page.getByText('Đã dừng', { exact: true })).toBeVisible({ timeout: 2_500 })
  await expect(page.getByText('Trợ lý AI đang xử lý')).toHaveCount(0)
  await expect(page.getByText('máy chủ chưa phản hồi', { exact: false })).toHaveCount(0)
})

test('a compose request naming no subject is answered with the subjects to choose from', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { subjectRequired: true })
  await openAssistant(page)
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })

  await input.fill('Soạn 5 câu trung bình')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  // A question, not an error; the teacher's words stay above it, and no empty exam is left in the list.
  await expect(page.getByText('Bạn muốn soạn môn nào?', { exact: true })).toBeVisible()
  await expect(page.getByText('Trợ lý AI báo lỗi')).toHaveCount(0)
  await expect(page.getByText('Soạn 5 câu trung bình', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Chọn môn' }).getByRole('button')).toHaveText(['Toán học', 'Vật lí'])
  await expect(page.getByRole('list', { name: 'Đề của tôi', exact: true }).getByText('Soạn 5 câu trung bình')).toHaveCount(0)
  await expect(input).toHaveValue('')

  await page.getByRole('list', { name: 'Chọn môn' }).getByRole('button', { name: 'Toán học' }).click()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ content: 'Soạn 5 câu trung bình môn Toán học', mode: 'compose' })
  // The choices are gone once one is taken.
  await expect(page.getByRole('list', { name: 'Chọn môn' })).toHaveCount(0)
})

test('a request naming no subject also offers the whole paper when the teacher can teach every subject', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { subjectRequired: true, subjectWhole: true })
  await openAssistant(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 5 câu trung bình')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  const choices = page.getByRole('list', { name: 'Chọn môn' })
  await expect(choices.getByRole('button')).toHaveText(['Cả đề', 'Toán học', 'Vật lí'])

  await choices.getByRole('button', { name: 'Cả đề' }).click()
  await expect.poll(() => messagePosts(state).length).toBe(2)
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ content: 'Soạn 5 câu trung bình cả đề', mode: 'compose' })
})

test('a refused request, a stopped run and the next request all stay in the thread', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { subjectRequired: true, endless: true })
  await openAssistant(page)
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })
  const thread = page.getByRole('complementary', { name: 'Trợ lý AI', exact: true })

  await input.fill('Soạn đề thứ nhất')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(thread.getByText('Bạn muốn soạn môn nào?', { exact: true })).toBeVisible()

  await input.fill('Soạn đề thứ hai môn Toán học')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await page.getByRole('button', { name: 'Dừng tạo câu trả lời' }).click()
  await expect(thread.getByText('Đã dừng', { exact: true })).toBeVisible({ timeout: 5_000 })

  await input.fill('Soạn đề thứ ba')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(thread.getByText('Bạn muốn soạn môn nào?', { exact: true })).toHaveCount(2)

  await expect(thread.getByText('Soạn đề thứ nhất', { exact: true })).toBeVisible()
  await expect(thread.getByText('Soạn đề thứ hai môn Toán học', { exact: true })).toBeVisible()
  await expect(thread.getByText('Soạn đề thứ ba', { exact: true })).toBeVisible()
  await expect(thread.getByText('Đã dừng', { exact: true })).toBeVisible()
})

test('a new conversation starts from the default settings, not from the exam it follows', async ({ page }) => {
  const older: Conversation = { id: 'conv-1', title: 'Đề cũ', subjectId: null, mode: 'compose', createdAt: stamp, updatedAt: stamp }
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [older],
    drafts: {
      'conv-1': {
        ...emptyDraft(older),
        draft: {
          ...emptyDraft(older).draft,
          config: { examFormat: 'VACT_2025', questionCount: 30, bankRatio: 0.2, solutionStyle: 'full' },
        },
      },
    },
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant?c=conv-1')
  const chip = page.getByRole('button', { name: 'Tùy chọn', exact: true })
  await expect(chip).toHaveAttribute('title', /^30 câu/)

  await page.getByRole('complementary', { name: 'Trợ lý AI', exact: true }).getByRole('button', { name: 'Cuộc trò chuyện mới', exact: true }).click()
  await expect(chip).toHaveAttribute('title', /^5 câu/)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn đề đại số')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect.poll(() => messagePosts(state).length).toBeGreaterThan(0)
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ config: { questionCount: 5 } })
})

test('the settings menu closes when a message is sent', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { endless: true })
  await openAssistant(page)

  await page.getByRole('button', { name: 'Tùy chọn', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Tùy chọn' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn đề kiểm tra')
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).press('Enter')

  await expect(page.getByRole('dialog', { name: 'Tùy chọn' })).toHaveCount(0)
})

test('a failed send leaves no empty exam behind and can be tried again', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { busyElsewhere: true })
  await openAssistant(page)
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })

  await input.fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Trợ lý AI báo lỗi')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Đề của tôi', exact: true }).getByText('Soạn 2 câu đại số cơ bản')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).not.toHaveValue('Soạn 2 câu đại số cơ bản')
  expect(state.requests.some((entry) => entry.method === 'DELETE')).toBe(true)

  state.busy = false
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Trợ lý AI báo lỗi')).toHaveCount(0)
  expect(messagePosts(state).at(-1)?.body).toMatchObject({ content: 'Soạn 2 câu đại số cơ bản' })
})

test('the plan step tells what it changed, and the config chip follows the count the words ask for', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { planNotes: ['Đề tối đa 120 câu; yêu cầu 500 câu được rút về 120.'] })
  await openAssistant(page)
  const chip = page.getByRole('button', { name: 'Tùy chọn', exact: true })
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' })

  await input.fill('Soạn 10 câu Toán')
  await expect(chip).toHaveAttribute('title', '10 câu · VACT 2025 · Dùng lại 20% · Lời giải đầy đủ')
  await input.fill('Sửa câu 2 cho khó hơn')
  await expect(chip).toHaveAttribute('title', '5 câu · VACT 2025 · Dùng lại 20% · Lời giải đầy đủ')

  await input.fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /^Lập ma trận đề/ }).click()
  await expect(page.getByText('Đề tối đa 120 câu; yêu cầu 500 câu được rút về 120.')).toBeVisible()
  await expect(page.getByText('2 câu', { exact: true }).first()).toBeVisible()
  // The AI's own codes and words for cells stay out of the steps.
  await expect(page.getByText(/\d+ ô|· mô phỏng|P2 ·/)).toHaveCount(0)
})

test('a reload opens the exam named in the address, with the config it was last asked with', async ({ page }) => {
  const older: Conversation = { id: 'conv-1', title: 'Đề cũ', subjectId: null, mode: 'compose', createdAt: stamp, updatedAt: stamp }
  const newest: Conversation = { id: 'conv-2', title: 'Đề mới nhất', subjectId: null, mode: 'compose', createdAt: stamp, updatedAt: stamp }
  await installAiFixture(page, 'MANAGER', {
    conversations: [newest, older],
    drafts: {
      'conv-1': {
        ...emptyDraft(older),
        draft: {
          ...emptyDraft(older).draft,
          config: { examFormat: 'VACT_2018', questionCount: 10, bankRatio: 0.4, solutionStyle: 'short' },
        },
      },
    },
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant?c=conv-1')

  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('Đề cũ')
  await expect(page.getByRole('button', { name: 'Tùy chọn', exact: true })).toHaveAttribute(
    'title',
    '10 câu · VACT 2018 · Dùng lại 40% · Lời giải gọn'
  )
  expect(new URL(page.url()).searchParams.get('c')).toBe('conv-1')

  await page.getByRole('list', { name: 'Đề của tôi', exact: true }).getByRole('button', { name: 'Đề mới nhất' }).click()
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('Đề mới nhất')
  expect(new URL(page.url()).searchParams.get('c')).toBe('conv-2')
})

test('the conversations button of the chat folds the exam list away and brings it back', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const chat = page.getByRole('complementary', { name: 'Trợ lý AI', exact: true })
  const exams = page.getByRole('complementary', { name: 'Danh sách đề' })
  await expect(exams).toBeVisible()

  await chat.getByRole('button', { name: 'Cuộc trò chuyện', exact: true }).click()
  await expect(exams).toBeHidden()
  await chat.getByRole('button', { name: 'Cuộc trò chuyện', exact: true }).click()
  await expect(exams).toBeVisible()
})

test('"Sửa câu 2" on a question the teacher typed sends its words from the sheet and rewrites it there', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  const sheet = docEditor(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Sửa câu 2 cho khó hơn')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đã sửa 1 câu trong đề')).toBeVisible({ timeout: 15_000 })
  const sent = state.requests.filter((entry) => entry.method === 'POST' && entry.path.endsWith('/messages')).at(-1)
  const items = ((sent?.body.config as Record<string, unknown>).items as Array<Record<string, unknown>>)
  expect(items).toHaveLength(1)
  expect(items[0]).not.toHaveProperty('itemId')
  expect(items[0]).toMatchObject({ number: 2, text: `Câu 2. ${EXAM_STEMS[1]}\nA. 0\nB. 1\nC. 2\nD. 3` })

  await expect(questionLines(sheet)).toHaveText([
    `Câu 1. ${EXAM_STEMS[0]}`,
    'Câu 2. Tính giá trị của biểu thức hai x cộng một khi x bằng ba.',
    `Câu 3. ${EXAM_STEMS[2]}`,
    `Câu 4. ${EXAM_STEMS[3]}`,
  ])
  const options = questionLines(sheet).nth(1).locator('xpath=following-sibling::*[1]')
  await expect(options.locator('.exam-choice-body')).toHaveText(['5', '6', '7', '8'])
  // Still a question the teacher owns: no draft item is tied to it.
  await expect(questionLines(sheet).nth(1)).not.toHaveAttribute('data-exam-item', /.+/)
})

/** Selects the whole line of question 4 and asks "Nhờ AI sửa" to change its numbers. */
async function askToRewriteQuestion4(page: Page) {
  await caretAtEndOf(page, EXAM_STEMS[3])
  await page.keyboard.press('Shift+Home')
  await page.getByRole('button', { name: 'Nhờ AI sửa', exact: true }).click()
  await page.getByRole('textbox', { name: 'Yêu cầu sửa đoạn đã chọn' }).fill('đổi số liệu')
  await page.keyboard.press('Enter')
}

/** The words under a mark of the AI's (`.ai-pending`, `.ai-suggest-old`), which the mark may cut into several runs. */
async function marked(sheet: Locator, selector: string) {
  return (await sheet.locator(selector).allTextContents()).join('')
}

test('"Nhờ AI sửa" shows the rewrite as a suggestion; accepting puts it in place and Ctrl+Z takes it back', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  const sheet = docEditor(page)
  const line = `Câu 4. ${EXAM_STEMS[3]}`

  await askToRewriteQuestion4(page)

  // Shown beside the old words, which stay in the document until the teacher accepts.
  const suggestion = sheet.locator('[data-ai-suggestion]')
  await expect(suggestion).toContainText('có bao nhiêu nghiệm?')
  await expect.poll(() => marked(sheet, '.ai-suggest-old')).toContain(EXAM_STEMS[3])
  await page.getByRole('button', { name: 'Chấp nhận gợi ý của AI' }).click()
  await expect(suggestion).toHaveCount(0)

  const edited = sheet.locator(':scope > p').filter({ hasText: 'có bao nhiêu nghiệm?' }).last()
  await expect(edited.locator('[data-math]')).toHaveCount(1)
  await expect(edited.locator('[data-math]')).toContainText('x+2=0')
  await expect(sheet.locator(':scope > p', { hasText: EXAM_STEMS[3] })).toHaveCount(0)
  const asked = state.requests.find((entry) => entry.method === 'POST' && entry.path.endsWith('/rewrite'))
  expect(asked?.body).toMatchObject({ selection: line, instruction: 'đổi số liệu' })
  expect(String(asked?.body.context)).toContain('A. 0\nB. 1\nC. 2\nD. 3')

  await page.keyboard.press('Control+z')
  await expect(sheet.locator(':scope > p', { hasText: EXAM_STEMS[3] })).toHaveText(line)
})

test('turning down a suggestion of "Nhờ AI sửa" leaves the sheet as it was', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  const sheet = docEditor(page)

  await askToRewriteQuestion4(page)
  await expect(sheet.locator('[data-ai-suggestion]')).toContainText('có bao nhiêu nghiệm?')
  await page.getByRole('button', { name: 'Bỏ gợi ý của AI' }).click()

  await expect(sheet.locator('[data-ai-suggestion]')).toHaveCount(0)
  await expect(sheet.locator('.ai-suggest-old')).toHaveCount(0)
  await expect(sheet.locator(':scope > p', { hasText: EXAM_STEMS[3] })).toHaveText(`Câu 4. ${EXAM_STEMS[3]}`)
})

test('the piece sent to "Nhờ AI sửa" follows edits made elsewhere while the AI writes', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  let answer = () => {}
  state.rewriteGate = new Promise<void>((resolve) => (answer = resolve))
  await openSavedExam(page)
  const sheet = docEditor(page)

  await askToRewriteQuestion4(page)
  await expect.poll(() => marked(sheet, '.ai-pending')).toContain(EXAM_STEMS[3])
  // Words typed in question 1 move question 4 down the document.
  await caretAtEndOf(page, EXAM_STEMS[0])
  await page.keyboard.type(' (thêm)')
  answer()

  await expect(sheet.locator('[data-ai-suggestion]')).toContainText('có bao nhiêu nghiệm?')
  await expect.poll(() => marked(sheet, '.ai-suggest-old')).toBe(`Câu 4. ${EXAM_STEMS[3]}`)
  await page.getByRole('button', { name: 'Chấp nhận gợi ý của AI' }).click()
  await expect(sheet.locator(':scope > p', { hasText: 'có bao nhiêu nghiệm?' })).toHaveCount(1)
  await expect(sheet.locator(':scope > p', { hasText: `${EXAM_STEMS[0]} (thêm)` })).toHaveCount(1)
})

test('editing inside the piece sent to "Nhờ AI sửa" drops its suggestion', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  let answer = () => {}
  state.rewriteGate = new Promise<void>((resolve) => (answer = resolve))
  await openSavedExam(page)
  const sheet = docEditor(page)

  await askToRewriteQuestion4(page)
  await expect.poll(() => marked(sheet, '.ai-pending')).toContain(EXAM_STEMS[3])
  await caretAtEndOf(page, EXAM_STEMS[3])
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.type('x')
  answer()

  await expect(page.getByText('Đoạn đã chọn vừa bị sửa nên chưa hiện gợi ý của AI.', { exact: false })).toBeVisible()
  await expect(sheet.locator('[data-ai-suggestion]')).toHaveCount(0)
  await expect(sheet.locator('.ai-pending')).toHaveCount(0)
})

test('a question in ask mode carries the exam on the sheet, its outline and every question', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', {
    conversations: [savedExam],
    documents: { 'conv-9': examDocument() },
    askAnswer: 'Đề có 4 câu.',
  })
  await openSavedExam(page)

  await page.getByRole('button', { name: 'Chế độ trả lời' }).click()
  await page.getByRole('option', { name: /Hỏi đáp/ }).click()
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Đề có mấy câu?')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByText('Đề có 4 câu.', { exact: true })).toBeVisible({ timeout: 15_000 })
  const sent = state.requests.find((entry) => entry.method === 'POST' && entry.path.endsWith('/messages'))
  const document = (sent?.body.config as Record<string, unknown>).document as { outline: string; questions: Array<{ number: number; text: string }> }
  expect(document.outline).toContain('## PHẦN I. TRẮC NGHIỆM')
  expect(document.outline).toContain(`Câu 3. ${EXAM_STEMS[2]}`)
  expect(document.questions.map((question) => question.number)).toEqual([1, 2, 3, 4])
  expect(document.questions[3].text).toContain(`Câu 4. ${EXAM_STEMS[3]}\nA. 0`)
})

test('the exam downloads with or without its key', async ({ page }) => {
  await installAiFixture(page)
  await openAssistant(page)
  const sheet = docEditor(page)
  await sendCompose(page)
  await expect(sheet.getByRole('heading', { name: 'HƯỚNG DẪN GIẢI', exact: true })).toHaveCount(1)

  const wordText = async (button: string) => {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: button, exact: true }).click()
    const file = await download
    const zip = await JSZip.loadAsync(await readFile(await file.path()))
    return { name: file.suggestedFilename(), body: (await zip.file('word/document.xml')?.async('string')) ?? '' }
  }
  const full = await wordText('Tải Word')
  expect(full.body).toContain('Tính giá trị của biểu thức x cộng 1.')
  expect(full.body).toContain('BẢNG ĐÁP ÁN')
  expect(full.body).toContain('HƯỚNG DẪN GIẢI')
  const examOnly = await wordText('Word không đáp án')
  expect(examOnly.name).toMatch(/-khong-dap-an\.docx$/)
  expect(examOnly.body).toContain('Tính giá trị của biểu thức x cộng 1.')
  expect(examOnly.body).toContain('HẾT')
  expect(examOnly.body).not.toContain('BẢNG ĐÁP ÁN')
  expect(examOnly.body).not.toContain('HƯỚNG DẪN GIẢI')
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
  const panel = page.getByRole('complementary', { name: 'Danh sách đề', exact: true })
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
  await page.getByRole('button', { name: 'Thêm đề', exact: true }).click()
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
  await page.getByLabel('Đề của tôi', { exact: true }).getByRole('button', { name: /Đề kiểm tra Toán 10/ }).click()
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
  await expect(page.getByText(/excludeIds|patternCode/)).toHaveCount(0)
  // The question being written shows word by word on the sheet (and as one line in the chat), never in the saved document.
  const live = docEditor(page).locator('[data-live-draft]')
  await expect(live).toContainText('Tập nghiệm của phương trình x bình phương bằng 4 là')
  await expect(live).toContainText('A. {2}')
  await expect(live).toContainText('B. {-2')
  await expect(page.getByText('Đang viết', { exact: true })).toBeVisible()
  // A running stage folds to what it is doing now; opening it shows every step, and tool calls read as what they
  // did, without their raw arguments.
  await page.getByRole('button', { name: /^Soạn câu hỏi/ }).click()
  await expect(page.getByText('Tìm câu mẫu trong ngân hàng', { exact: true })).toBeVisible()
  await expect(page.getByText(/excludeIds|patternCode/)).toHaveCount(0)
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
  // The data and kind are under "Thiết lập", the titles under "Tùy chỉnh".
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true })).toHaveValue('Nhiệt độ trung bình')
  await dialog.getByRole('tab', { name: 'Thiết lập', exact: true }).click()
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
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
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
  await page.getByRole('menuitem', { name: 'Cột', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Sửa biểu đồ', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cột', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill('Số học sinh')
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

  // Formatting and files belong to the free document.
  const freeOnly = 'Chỉ có ở chế độ Văn bản tự do'
  await expect(page.getByRole('button', { name: 'Đậm', exact: true })).toBeDisabled()
  await openFileMenu(page)
  await expect(page.getByRole('menuitem', { name: 'Mở file (Word, Markdown, JSON)…', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).press('ArrowRight')
  // The PDF is a picture of the free document's sheets, which question cards do not show.
  for (const label of ['Word (.docx)', 'PDF (.pdf)', 'Markdown (.md)', 'JSON (.json)']) {
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('title', freeOnly)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'PDF (.pdf)', exact: true })).toHaveCount(0)
  await expect(page.getByRole('menuitemradio', { name: 'Văn bản tự do', exact: true })).toHaveCount(0)
  // Publishing as a file is free-document work too.
  await page.getByRole('banner').getByRole('button', { name: 'Xuất bản', exact: true }).click()
  for (const label of ['Word (.docx)', 'PDF (.pdf)']) {
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('title', freeOnly)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'PDF (.pdf)', exact: true })).toHaveCount(0)

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
  const panel = page.getByRole('complementary', { name: 'Danh sách đề', exact: true })
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
  // The first tab lists the exams again.
  await panel.getByRole('tab', { name: 'Đề', exact: true }).click()
  await expect(
    panel.getByRole('list', { name: 'Bản nháp', exact: true }).getByRole('button', { name: savedExam.title, exact: true })
  ).toHaveAttribute('aria-current', 'location')
})

test('the ĐGNL template lays out the whole paper: its parts, their question ranges, the end line and a 120-answer key', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': noteDocument() } })
  await openSavedDocument(page, NOTE)
  const sheet = docEditor(page)
  await caretAtEndOf(page, NOTE)
  const panel = page.getByRole('complementary', { name: 'Danh sách đề', exact: true })
  await panel.getByRole('tab', { name: 'Mẫu đề thi', exact: true }).click()
  await panel.getByRole('button', { name: 'Chèn mẫu ĐGNL', exact: true }).click()

  await expect(sheet.locator(':scope > h2, :scope > h3')).toHaveText([
    'PHẦN 1. SỬ DỤNG NGÔN NGỮ',
    '1.1. Tiếng Việt (câu 1–30)',
    '1.2. Tiếng Anh (câu 31–60)',
    'PHẦN 2. TOÁN HỌC (câu 61–90)',
    'PHẦN 3. TƯ DUY KHOA HỌC',
    '3.1. Logic, phân tích số liệu (câu 91–102)',
    '3.2. Suy luận khoa học (câu 103–120)',
    'BẢNG ĐÁP ÁN',
  ])
  await expect(sheet).toContainText('Thời gian làm bài: 150 phút – 120 câu hỏi trắc nghiệm')
  await expect(questionLines(sheet)).toHaveText(['Câu 1. Viết câu dẫn.', 'Câu 31. Viết câu dẫn.', 'Câu 61. Viết câu dẫn.', 'Câu 91. Viết câu dẫn.', 'Câu 103. Viết câu dẫn.'])
  const key = await tableRowsOf(sheet, 'Đáp án')
  expect(key).toHaveLength(24)
  expect(key.at(-2)).toEqual(['Câu', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'])
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

// The composer row is exam list | divider | paper | divider | chat. Each divider resizes its
// panel, the paper never drops under 560px, and a committed width is kept in localStorage.

const PANEL_WIDTHS_KEY = 'hocluc.aiAssistant.panelWidths'

function layout(page: Page) {
  return {
    outline: page.getByRole('complementary', { name: 'Danh sách đề', exact: true }),
    outlineDivider: page.getByRole('separator', { name: 'Kéo để đổi độ rộng danh sách đề', exact: true }),
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

test('the ruler stays put while the sheets scroll, and Ctrl + wheel zooms the paper', async ({ page }) => {
  await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
  await openSavedExam(page)
  const paper = page.locator('.exam-doc-paper')
  const ruler = paper.locator('xpath=preceding-sibling::*[1]')
  const scroller = paper.locator('xpath=..')
  // A long exam, so the sheets scroll under the ruler.
  await caretAtEndOf(page, '--- HẾT ---')
  for (let line = 0; line < 60; line++) await page.keyboard.press('Enter')

  const rulerTop = async () => (await ruler.boundingBox())?.y ?? -1
  const top = await rulerTop()
  for (const y of [200, 900, 1600]) {
    await scroller.evaluate((element, to) => element.scrollTo(0, to), y)
    await expect.poll(rulerTop).toBe(top)
  }

  await scroller.evaluate((element) => element.scrollTo(0, 0))
  const zoomOf = () => paper.evaluate((element) => element.style.zoom)
  const before = await zoomOf()
  const box = await paper.boundingBox()
  await page.mouse.move((box?.x ?? 0) + 200, (box?.y ?? 0) + 200)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -120)
  await page.keyboard.up('Control')
  await expect.poll(zoomOf).toBe('1.25')
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, 120)
  await page.mouse.wheel(0, 120)
  await page.keyboard.up('Control')
  await expect.poll(zoomOf).toBe('0.9')
  expect(before).not.toBe('0.9')
  // The browser itself did not zoom the page.
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1)
})

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

  await page.getByRole('button', { name: 'Hiện danh sách đề', exact: true }).click()
  const outlineSheet = page.getByRole('dialog', { name: 'Đề của tôi', exact: true })
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

  await outline.getByRole('button', { name: 'Thu gọn danh sách đề' }).click()
  await expect(outline).toHaveCount(0)
  await expect(outlineDivider).toHaveCount(0)
  await expectPx(leftOf(paper), 0)
  // Only the button at the sheet's top left is left of the list; it brings the list back.
  await page.getByRole('button', { name: 'Hiện danh sách đề', exact: true }).click()
  await expect(outline).toBeVisible()
  await expect(outlineDivider).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hiện danh sách đề', exact: true })).toBeHidden()
  await outline.getByRole('button', { name: 'Thu gọn danh sách đề' }).click()

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

// The ruler above the sheet sets the selected paragraph's indents, as in Word.
test.describe('ruler indents', () => {
  const CM_PX = 96 / 2.54
  const OLD_STEPS_LINE = 'Dòng thụt hai bậc theo cách lưu cũ.'
  const PLAIN_LINE = 'Dòng chưa thụt lề.'
  const OPTION_LINE = 'a) Phương án thụt một bậc.'
  // Documents saved before free indents carry `indent: n`, n steps of 1.27 cm; the compose writer still writes
  // `indent: 1` for options lettered a), b)… (draft-to-doc.ts).
  const indentContent = tiptapDoc(
    heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
    { type: 'paragraph', attrs: { indent: 2 }, content: [run(OLD_STEPS_LINE)] },
    paragraph(run(PLAIN_LINE)),
    { type: 'paragraph', attrs: { indent: 1 }, content: [run(OPTION_LINE)] },
    paragraph(run('--- HẾT ---', 'bold'))
  )
  const indentDocument = (): FixtureDocument => ({ mode: 'FREE', content: indentContent, version: 3, updatedAt: stamp })

  const sheetLine = (page: Page, text: string) => docEditor(page).locator(':scope > p', { hasText: text })
  const marker = (page: Page, name: 'Thụt lề trái' | 'Thụt lề phải' | 'Thụt dòng đầu' | 'Thụt treo') =>
    page.getByRole('slider', { name, exact: true })
  /** The paragraph's computed indents, in unzoomed CSS px. */
  const indentsOf = (line: Locator) =>
    line.evaluate((element) => {
      const style = getComputedStyle(element)
      return { left: parseFloat(style.marginLeft), right: parseFloat(style.marginRight), first: parseFloat(style.textIndent) }
    })
  const leftOf = (line: Locator) => async () => Math.round((await indentsOf(line)).left * 10) / 10
  const firstOf = (line: Locator) => async () => Math.round((await indentsOf(line)).first * 10) / 10
  const px = (cm: number) => Math.round(cm * CM_PX * 10) / 10

  async function openIndentDocument(page: Page) {
    const fixture = await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': indentDocument() } })
    await openSavedDocument(page, PLAIN_LINE)
    return fixture
  }

  /** Screen px per unzoomed px of the ruler (the sheet's zoom). */
  async function rulerScale(page: Page) {
    const box = await page.getByRole('group', { name: 'Thước', exact: true }).boundingBox()
    return (box?.width ?? 0) / (21 * CM_PX)
  }

  async function centreOf(locator: Locator) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('not on screen')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  /** Presses a marker and moves it `cm` right (screen distance at the ruler's zoom), without letting go. */
  async function pressAndMove(page: Page, handle: Locator, cm: number) {
    const from = await centreOf(handle)
    const scale = await rulerScale(page)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + cm * CM_PX * scale, from.y, { steps: 8 })
  }

  test('old step indents load at 1.27 cm a step, and opening them saves nothing', async ({ page }) => {
    const { state } = await openIndentDocument(page)
    await expect.poll(leftOf(sheetLine(page, OLD_STEPS_LINE))).toBe(px(2.54))
    await expect.poll(leftOf(sheetLine(page, OPTION_LINE))).toBe(px(1.27))
    await expect.poll(leftOf(sheetLine(page, PLAIN_LINE))).toBe(0)
    await page.waitForTimeout(1_600)
    expect(documentSaves(state, 'conv-9')).toEqual([])
    // Printing (and the browser's PDF) keeps the inline indents.
    await page.emulateMedia({ media: 'print' })
    await expect.poll(leftOf(sheetLine(page, OLD_STEPS_LINE))).toBe(px(2.54))
    await page.emulateMedia({ media: 'screen' })

    // Old HTML (`data-indent="2"`) pasted in comes in at 2.54 cm too.
    await caretAtEndOf(page, PLAIN_LINE)
    await docEditor(page).evaluate((root) => {
      const data = new DataTransfer()
      data.setData('text/html', '<p>Đầu.</p><p data-indent="2">Dòng dán theo cách cũ.</p><p>Cuối.</p>')
      root.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    })
    await expect.poll(leftOf(sheetLine(page, 'Dòng dán theo cách cũ.'))).toBe(px(2.54))
  })

  test('the markers follow the selection between paragraphs with different indents', async ({ page }) => {
    await openIndentDocument(page)
    const left = marker(page, 'Thụt lề trái')
    await sheetLine(page, OLD_STEPS_LINE).click()
    await expect(left).toHaveAttribute('aria-valuenow', '2.54')
    await expect(left).toHaveAttribute('aria-valuetext', '2,54 cm')
    const indented = (await centreOf(left)).x
    await sheetLine(page, PLAIN_LINE).click()
    await expect(left).toHaveAttribute('aria-valuenow', '0')
    const plain = (await centreOf(left)).x
    expect(Math.abs(indented - plain - 2.54 * CM_PX * (await rulerScale(page)))).toBeLessThan(1.5)
  })

  test('dragging the left marker shows its guide, writes one undo step, and Escape cancels a drag', async ({ page }) => {
    await openIndentDocument(page)
    const line = sheetLine(page, PLAIN_LINE)
    await line.click()
    const guide = page.locator('[data-ruler-guide]')
    const value = page.locator('[data-ruler-value]')

    await pressAndMove(page, marker(page, 'Thụt lề trái'), 1)
    await expect(guide).toBeVisible()
    await expect(value).toHaveText('1 cm')
    // The sheet shows the indent while the marker is held.
    await expect.poll(leftOf(line)).toBe(px(1))
    await page.mouse.up()
    await expect(guide).toHaveCount(0)
    await expect.poll(leftOf(line)).toBe(px(1))
    await expect(line).toHaveAttribute('data-indent-left', '1')
    // The editor kept focus: Ctrl+Z goes to it and takes the whole drag back at once.
    await expect(docEditor(page)).toBeFocused()
    await page.keyboard.press('Control+z')
    await expect.poll(leftOf(line)).toBe(0)

    await pressAndMove(page, marker(page, 'Thụt lề trái'), 2)
    await expect.poll(leftOf(line)).toBe(px(2))
    await page.keyboard.press('Escape')
    await expect(guide).toHaveCount(0)
    await expect.poll(leftOf(line)).toBe(0)
    await page.mouse.up()
    await expect.poll(leftOf(line)).toBe(0)
    await expect(marker(page, 'Thụt lề trái')).toHaveAttribute('aria-valuenow', '0')
  })

  test('arrow keys move a focused marker a quarter centimetre, a whole one with Shift', async ({ page }) => {
    await openIndentDocument(page)
    const line = sheetLine(page, PLAIN_LINE)
    await line.click()
    const left = marker(page, 'Thụt lề trái')
    await left.focus()
    await page.keyboard.press('ArrowRight')
    await expect(left).toHaveAttribute('aria-valuenow', '0.25')
    await expect.poll(leftOf(line)).toBe(px(0.25))
    await page.keyboard.press('Shift+ArrowRight')
    await expect(left).toHaveAttribute('aria-valuenow', '1.25')
    await page.keyboard.press('ArrowLeft')
    await expect.poll(leftOf(line)).toBe(px(1))

    const right = marker(page, 'Thụt lề phải')
    await right.focus()
    await page.keyboard.press('Shift+ArrowLeft')
    await expect(right).toHaveAttribute('aria-valuenow', '1')
    await expect.poll(async () => Math.round((await indentsOf(line)).right * 10) / 10).toBe(px(1))
    // At least 3 cm of text is left: the left indent stops where the right one leaves 3 cm.
    await left.focus()
    for (let step = 0; step < 16; step++) await page.keyboard.press('Shift+ArrowRight')
    await expect(left).toHaveAttribute('aria-valuenow', '13.5')
  })

  test('the first-line marker sets the first line apart, and the hanging one the lines after it', async ({ page }) => {
    await openIndentDocument(page)
    const line = sheetLine(page, PLAIN_LINE)
    await line.click()
    await pressAndMove(page, marker(page, 'Thụt dòng đầu'), 1)
    await page.mouse.up()
    await expect.poll(firstOf(line)).toBe(px(1))
    await expect.poll(leftOf(line)).toBe(0)

    // The hanging marker moves the left indent; the first line stays at 1 cm, so it now hangs 1 cm out.
    await marker(page, 'Thụt treo').focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await expect.poll(leftOf(line)).toBe(px(2))
    await expect.poll(firstOf(line)).toBe(-px(1))
    await expect(marker(page, 'Thụt dòng đầu')).toHaveAttribute('aria-valuenow', '-1')
  })

  test('Tăng thụt lề still steps 1.27 cm, from an old step count too', async ({ page }) => {
    await openIndentDocument(page)
    // The toolbar shares its row with the assistant's card, so at this width the indent buttons sit in its overflow.
    // Its items carry their shortcut after the name.
    const tool = async (name: string) => {
      await page.getByRole('button', { name: 'Thêm công cụ', exact: true }).click()
      await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
    }
    await sheetLine(page, PLAIN_LINE).click()
    await tool('Tăng thụt lề')
    await expect.poll(leftOf(sheetLine(page, PLAIN_LINE))).toBe(px(1.27))
    await sheetLine(page, OLD_STEPS_LINE).click()
    await tool('Tăng thụt lề')
    await expect.poll(leftOf(sheetLine(page, OLD_STEPS_LINE))).toBe(px(3.81))
    await tool('Giảm thụt lề')
    await tool('Giảm thụt lề')
    await expect.poll(leftOf(sheetLine(page, OLD_STEPS_LINE))).toBe(px(1.27))
  })

  test('indents go into the Word file as w:ind, in twips', async ({ page }) => {
    await openIndentDocument(page)
    await sheetLine(page, PLAIN_LINE).click()
    await marker(page, 'Thụt lề trái').focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await marker(page, 'Thụt dòng đầu').focus()
    await page.keyboard.press('Shift+ArrowRight')
    await marker(page, 'Thụt lề phải').focus()
    await page.keyboard.press('Shift+ArrowLeft')
    // 1.27 cm, then the hanging marker 1 cm on: left 2.27 cm, the first line 1 cm out.
    await sheetLine(page, OPTION_LINE).click()
    await marker(page, 'Thụt treo').focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect(marker(page, 'Thụt lề trái')).toHaveAttribute('aria-valuenow', '2.27')

    const word = await downloadFromFileMenu(page, 'Word (.docx)')
    const zip = await JSZip.loadAsync(await readFile(await word.path()))
    const body = (await zip.file('word/document.xml')?.async('string')) ?? ''
    const indentOf = (text: string) => {
      const xml = body.split(/<w:p[ >]/).find((chunk) => chunk.includes(text)) ?? ''
      const ind = /<w:ind\b[^>]*>/.exec(xml)?.[0] ?? ''
      return Object.fromEntries(Array.from(ind.matchAll(/w:(\w+)="(-?\d+)"/g), ([, name, value]) => [name, Number(value)]))
    }
    expect(indentOf(PLAIN_LINE)).toEqual({ left: 1134, right: 567, firstLine: 567 })
    expect(indentOf(OPTION_LINE)).toEqual({ left: 1287, hanging: 567 })
    expect(indentOf(OLD_STEPS_LINE)).toEqual({ left: 1440 })
  })

  test('at 75% zoom a drag lands the indent under the pointer', async ({ page }) => {
    await openIndentDocument(page)
    const paper = page.locator('.exam-doc-paper')
    const box = await paper.boundingBox()
    await page.mouse.move((box?.x ?? 0) + 200, (box?.y ?? 0) + 200)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, 120)
    await page.mouse.wheel(0, 120)
    await page.keyboard.up('Control')
    await expect.poll(() => paper.evaluate((element) => element.style.zoom)).toBe('0.75')
    const scale = await rulerScale(page)
    expect(scale).toBeCloseTo(0.75, 2)

    const line = sheetLine(page, PLAIN_LINE)
    await line.click()
    const handle = marker(page, 'Thụt lề trái')
    const from = await centreOf(handle)
    const ruler = await page.getByRole('group', { name: 'Thước', exact: true }).boundingBox()
    // 3 cm in from the left text margin, at the ruler's scale.
    const target = (ruler?.x ?? 0) + (2 + 3) * CM_PX * scale
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(target, from.y, { steps: 10 })
    await page.mouse.up()
    await expect.poll(leftOf(line)).toBe(px(3))
    expect(Math.abs(((await line.boundingBox())?.x ?? 0) - target)).toBeLessThan(2)
    expect(Math.abs((await centreOf(handle)).x - target)).toBeLessThan(2)
  })

  test('the markers of a read-only sheet cannot be moved', async ({ page }) => {
    await installAiFixture(page, 'MANAGER', {
      bankSources: [bankSource('src-1', 'Đề mẫu 2021', 'DONE', 1)],
      bankReading: (id) => bankReading(id, 'DONE', [paperQuestion(1, 'Giải x + 1 = 3')]),
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/console/manager/ai-assistant')
    await page.getByRole('complementary', { name: 'Danh sách đề' }).getByRole('button', { name: 'Đề mẫu 2021', exact: true }).click()
    const sheet = readingSheet(page)
    await expect(sheet).toContainText('Câu 1. Giải x + 1 = 3')
    await expect(sheet).toHaveAttribute('contenteditable', 'false')

    for (const name of ['Thụt lề trái', 'Thụt lề phải', 'Thụt dòng đầu', 'Thụt treo'] as const) {
      await expect(marker(page, name)).toHaveAttribute('aria-disabled', 'true')
      await expect(marker(page, name)).not.toHaveAttribute('tabindex')
    }
    const line = sheet.locator(':scope > p', { hasText: /^Câu 1\./ })
    await line.click()
    const from = await centreOf(marker(page, 'Thụt lề trái'))
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 60, from.y, { steps: 5 })
    await page.mouse.up()
    await expect(page.locator('[data-ruler-guide]')).toHaveCount(0)
    expect((await indentsOf(line)).left).toBe(0)
  })
})

// The PDF: the server prints it (real text) when it can; any failure falls back to the browser's picture of the sheets.
test.describe('PDF from the server', () => {
  const EXAM_PDF = '**/api/v1/exam-docs/pdf'
  const KEY_TEXT = 'Lời giải chỉ thầy cô được xem'
  /** A small but well-formed PDF, standing in for the server's. */
  const SERVER_PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    'latin1'
  )

  const math = (latex: string, display = false): DocNode => ({ type: 'math', attrs: { latex, display } })
  const cell = (text: string): DocNode => ({ type: 'tableCell', content: [paragraph(run(text))] })
  const keyed = (node: DocNode, kind: 'table' | 'guide'): DocNode => ({ ...node, attrs: { ...((node.attrs as object) ?? {}), examKey: kind } })

  /** A real exam's blocks: header, formulas (chemistry too), options, a chart, a table and the answer key after a break. */
  const pdfExamContent = tiptapDoc(
    {
      type: 'examHeader',
      content: [
        { type: 'headerColumn', content: [paragraph(run('SỞ GIÁO DỤC VÀ ĐÀO TẠO')), paragraph(run('TRƯỜNG THPT NGUYỄN DU', 'bold'))] },
        { type: 'headerColumn', content: [paragraph(run('ĐỀ KIỂM TRA GIỮA KỲ I', 'bold')), paragraph(run('Thời gian làm bài: 45 phút', 'italic'))] },
      ],
    },
    heading(1, 'ĐỀ KIỂM TRA TOÁN 10'),
    heading(2, 'PHẦN I. TRẮC NGHIỆM'),
    paragraph(run('Câu 1. ', 'bold'), run('Rút gọn biểu thức '), math('\\frac{a^2-b^2}{a-b}'), run(' với '), math('a \\ne b'), run('.')),
    choiceGrid('a + b', 'a − b', 'a² + b²', 'Không rút gọn được'),
    paragraph(run('Câu 2. ', 'bold'), run('Phương trình hoá học '), math('\\ce{2H2 + O2 -> 2H2O}'), run(' cho biết điều gì?')),
    choiceGrid('Hai phân tử hiđro phản ứng với một phân tử oxi', 'Nước bị phân huỷ', 'Oxi là chất xúc tác', 'Không có phản ứng'),
    paragraph(run('Câu 3. ', 'bold'), run('Tính tích phân sau.')),
    paragraph(math('\\int_0^1 x^2\\,dx = \\frac{1}{3}', true)),
    paragraph(run('Câu 4. ', 'bold'), run('Quan sát biểu đồ điểm trung bình các lớp.')),
    {
      type: 'chart',
      attrs: {
        data: {
          columns: [
            { id: 'label', label: 'Lớp', role: 'label' },
            { id: 'score', label: 'Điểm', role: 'series' },
          ],
          rows: [['10A', 7.5], ['10B', 8.1], ['10C', 6.9]],
        },
        spec: { type: 'bar', title: 'Điểm trung bình các lớp', xLabel: 'Lớp', yLabel: 'Điểm', legend: false, palette: 'print', width: 0.7 },
      },
    },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell('Lớp'), cell('Sĩ số'), cell('Điểm trung bình')] },
        { type: 'tableRow', content: [cell('10A'), cell('40'), cell('7,5')] },
        { type: 'tableRow', content: [cell('10B'), cell('42'), cell('8,1')] },
      ],
    },
    paragraph(run('--- HẾT ---', 'bold')),
    keyed({ type: 'pageBreak' }, 'guide'),
    keyed(heading(2, 'HƯỚNG DẪN GIẢI'), 'guide'),
    keyed(paragraph(run('Câu 1. ', 'bold'), run('Chọn A. '), run(KEY_TEXT)), 'guide')
  )
  const pdfExam = (): FixtureDocument => ({ mode: 'FREE', content: pdfExamContent, version: 3, updatedAt: stamp })

  async function openPdfExam(page: Page) {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': pdfExam() } })
    // The browser's capture reads the page's web font style sheets to embed them; offline here, they are empty.
    await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    // The browser renderer's capture library is fetched only when it draws the PDF.
    const capture: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('modern-screenshot')) capture.push(request.url())
    })
    await openSavedDocument(page, 'Rút gọn biểu thức')
    return capture
  }

  /** The bodies the page posted to the PDF endpoint; it answers with `answer`. */
  async function routePdf(page: Page, answer: (route: import('@playwright/test').Route) => Promise<void>) {
    const bodies: Array<{ html: string; title: string }> = []
    await page.route(EXAM_PDF, async (route) => {
      bodies.push(route.request().postDataJSON() as { html: string; title: string })
      await answer(route)
    })
    return bodies
  }

  test('the server PDF is downloaded as it comes, and the browser draws nothing', async ({ page }) => {
    const capture = await openPdfExam(page)
    const bodies = await routePdf(page, (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: SERVER_PDF }))

    const file = await downloadFromFileMenu(page, 'PDF (.pdf)')
    expect(file.suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10.pdf')
    expect((await readFile(await file.path())).equals(SERVER_PDF)).toBe(true)
    expect(capture).toEqual([])

    expect(bodies).toHaveLength(1)
    const [{ html, title }] = bodies
    expect(title).toBe('ĐỀ KIỂM TRA TOÁN 10')
    // Formulas as MathML (no LaTeX copy), the chart as inline SVG, options and header as tables, the break as CSS
    expect(html).toContain('<math')
    expect(html).not.toContain('<annotation')
    expect(html).toContain('<svg')
    expect(html).toContain('viewBox=')
    expect(html).toContain('class="exam-choice-grid"')
    expect(html).toContain('class="exam-header"')
    expect(html).toContain('class="exam-page-break"')
    expect(html).toContain('Điểm trung bình')
    expect(html).toContain(KEY_TEXT)
    expect(html).not.toContain('data-')
    expect(html).not.toContain('data:image/svg+xml')
    // Kept for rendering through the backend renderer by hand (see the backend's ExamPdfRealRenderTest)
    if (process.env.EXAM_PDF_BODY_OUT) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(process.env.EXAM_PDF_BODY_OUT, JSON.stringify(bodies[0]), 'utf8')
    }
  })

  // A refused session (401/403) must not sign the person out either: the fallback is quiet in every case.
  for (const failure of [401, 403, 404, 500, 'network'] as const) {
    test(`a ${failure} failure from the server still downloads the PDF the browser draws`, async ({ page }) => {
      const capture = await openPdfExam(page)
      const bodies = await routePdf(page, (route) =>
        failure === 'network'
          ? route.abort('failed')
          : route.fulfill({ status: failure, json: { success: false, status: failure, message: `HTTP ${failure}` } })
      )
      const before = page.url()

      const file = await downloadFromFileMenu(page, 'PDF (.pdf)')
      expect(file.suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10.pdf')
      const bytes = await readFile(await file.path())
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
      expect(bytes.equals(SERVER_PDF)).toBe(false)
      expect(bodies).toHaveLength(1)
      expect(capture.length).toBeGreaterThan(0)
      // No error is shown, and the person stays signed in on the same page
      await expect(page.getByText('Không tạo được tệp PDF')).toHaveCount(0)
      expect(page.url()).toBe(before)
      expect(await page.evaluate(() => localStorage.getItem('hocluc.accessToken'))).toBeTruthy()
    })
  }

  test('the exam without its key is sent without the key', async ({ page }) => {
    await openPdfExam(page)
    const bodies = await routePdf(page, (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: SERVER_PDF }))

    const file = await downloadFromFileMenu(page, 'PDF không đáp án (.pdf)')
    expect(file.suggestedFilename()).toBe('ĐỀ-KIỂM-TRA-TOÁN-10-khong-dap-an.pdf')
    expect(bodies).toHaveLength(1)
    expect(bodies[0].html).toContain('Rút gọn biểu thức')
    expect(bodies[0].html).toContain('--- HẾT ---')
    expect(bodies[0].html).not.toContain(KEY_TEXT)
    expect(bodies[0].html).not.toContain('HƯỚNG DẪN GIẢI')
    // The key's page break went with it: nothing after the end line starts a new sheet
    expect(bodies[0].html).not.toContain('exam-page-break')
  })
})

test.describe('AI soát đề', () => {
  const content = tiptapDoc(
    paragraph(run('Đọc đoạn văn bị lổi này.')),
    paragraph(run('Câu 1. Câu hổi bị sai.')),
    choiceGrid('Đáp án chưả đúng', 'Hai', 'Ba', 'Bốn'),
    paragraph(run('Câu 2. Tính '), { type: 'math', attrs: { latex: 'x+1', display: false } }, run('.')),
    choiceGrid('Một', 'Hai', 'Ba', 'Bốn')
  )
  const document: FixtureDocument = { mode: 'FREE', content, version: 3, updatedAt: stamp }
  async function setup(page: Page, find: string, replace: string) {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': document } })
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', async (route) => {
      const body = route.request().postDataJSON() as { units: Array<{ ref: string; text: string }> }
      const unit = body.units.find((entry) => entry.text.includes(find))
      await route.fulfill({ json: { success: true, data: { suggestions: unit ? [{ ref: unit.ref, find, replace, reason: 'Sửa lỗi', kind: 'SPELLING' }] : [] } } })
    })
    await openSavedDocument(page, 'Câu hổi bị sai')
    await page.getByRole('button', { name: 'AI soát đề' }).click()
  }
  for (const [name, find, replace] of [
    ['câu hỏi', 'hổi', 'hỏi'],
    ['đoạn dẫn', 'lổi', 'lỗi'],
    ['phương án', 'A. Đáp án chưả đúng', 'Đáp án chưa đúng'],
  ]) {
    test(`soát ${name} và chấp nhận gợi ý`, async ({ page }) => {
      await setup(page, find, replace)
      const suggestion = docEditor(page).locator('[data-ai-suggestion]')
      await expect(suggestion).toContainText(replace)
      await suggestion.getByRole('button', { name: 'Chấp nhận gợi ý của AI' }).click()
      await expect(docEditor(page)).toContainText(replace)
    })
  }
  test('soát không định vị phần bên trong công thức', async ({ page }) => {
    await setup(page, 'x+1', 'x+2')
    await expect(page.getByText('1 không định vị được')).toBeVisible()
  })
  test('soát và chấp nhận tất cả hoàn tác trong một bước', async ({ page }) => {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': document } })
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', async (route) => {
      const body = route.request().postDataJSON() as { units: Array<{ ref: string; text: string }> }
      const suggestions = [['lổi', 'lỗi'], ['hổi', 'hỏi']].map(([find, replace]) => ({ ref: body.units.find((u) => u.text.includes(find))!.ref, find, replace, reason: 'Sửa lỗi', kind: 'SPELLING' }))
      await route.fulfill({ json: { success: true, data: { suggestions } } })
    })
    await openSavedDocument(page, 'Câu hổi bị sai')
    await page.getByRole('button', { name: 'AI soát đề' }).click()
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(2)
    await page.getByRole('button', { name: 'Chấp nhận tất cả' }).click()
    await expect(docEditor(page)).toContainText('Câu hỏi bị sai')
    await page.keyboard.press('Control+z')
    await expect(docEditor(page)).toContainText('Câu hổi bị sai')
    await expect(docEditor(page)).toContainText('đoạn văn bị lổi')
  })
  test('soát vẫn định vị khi thêm đoạn phía trên trong lúc chờ', async ({ page }) => {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': document } })
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let requested = false
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', async (route) => {
      const body = route.request().postDataJSON() as { units: Array<{ ref: string; text: string }> }
      const unit = body.units.find((entry) => entry.text.includes('hổi'))!
      requested = true
      await gate
      await route.fulfill({ json: { success: true, data: { suggestions: [{ ref: unit.ref, find: 'hổi', replace: 'hỏi', reason: 'Sửa lỗi', kind: 'SPELLING' }] } } })
    })
    await openSavedDocument(page, 'Câu hổi bị sai')
    await page.getByRole('button', { name: 'AI soát đề' }).click()
    await expect.poll(() => requested).toBe(true)
    await docEditor(page).locator(':scope > p').first().click()
    await page.keyboard.press('Control+Home')
    await page.keyboard.type('Câu 99. Mới')
    await page.keyboard.press('Enter')
    release()
    const original = docEditor(page).locator(':scope > p', { hasText: 'Câu 1.' })
    await expect(original.locator('[data-ai-suggestion]')).toContainText('hỏi')
  })
  test('soát báo lý do khi lô thất bại', async ({ page }) => {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': document } })
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', (route) => route.fulfill({ status: 503, json: { success: false, message: 'AI chưa được cấu hình' } }))
    await openSavedDocument(page, 'Câu hổi bị sai')
    await page.getByRole('button', { name: 'AI soát đề' }).click()
    await expect(page.getByText('AI chưa được cấu hình')).toBeVisible()
    await expect(page.getByText(/không soát được/)).toBeVisible()
  })
  test('soát không thấy lỗi giữ thông báo đến khi đóng', async ({ page }) => {
    await setup(page, 'không có trong đề', 'mới')
    await expect(page.getByText('AI không thấy lỗi nào')).toBeVisible()
    await page.getByRole('button', { name: 'Đóng thanh soát đề' }).click()
    await expect(page.getByText('AI không thấy lỗi nào')).toHaveCount(0)
  })
  test('soát đóng thanh mà vẫn giữ gợi ý', async ({ page }) => {
    await setup(page, 'hổi', 'hỏi')
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Đóng thanh soát đề' }).click()
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Đóng thanh soát đề' })).toHaveCount(0)
  })
  test('soát chỉ chấp nhận các gợi ý soát đề', async ({ page }) => {
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': examDocument() } })
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', async (route) => {
      const body = route.request().postDataJSON() as { units: Array<{ ref: string; text: string }> }
      const unit = body.units.find((entry) => entry.text.includes('Tập nghiệm'))!
      await route.fulfill({ json: { success: true, data: { suggestions: [{ ref: unit.ref, find: 'Tập nghiệm', replace: 'Tập hợp nghiệm', reason: 'Diễn đạt', kind: 'WORDING' }] } } })
    })
    await openSavedExam(page)
    await askToRewriteQuestion4(page)
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(1)
    await page.getByRole('button', { name: 'AI soát đề' }).click()
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(2)
    await expect(page.getByText('1 gợi ý', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Chấp nhận tất cả' }).click()
    await expect(docEditor(page).locator('[data-ai-suggestion]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Đóng thanh soát đề' })).toHaveCount(0)
  })
  test('soát nhiều lô và hiển thị tiến độ', async ({ page }) => {
    const long = tiptapDoc(...Array.from({ length: 30 }, (_, i) => paragraph(run(`Câu ${i + 1}. Nội dung câu hỏi ${i + 1}.`))))
    await installAiFixture(page, 'MANAGER', { conversations: [savedExam], documents: { 'conv-9': { mode: 'FREE', content: long, version: 3, updatedAt: stamp } } })
    let requests = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/v1/ai-assistant/conversations/*/proofread', async (route) => {
      requests++
      if (requests === 3) await gate
      await route.fulfill({ json: { success: true, data: { suggestions: [] } } })
    })
    await openSavedDocument(page, 'Nội dung câu hỏi 1.')
    await page.getByRole('button', { name: 'AI soát đề' }).click()
    await expect.poll(() => requests).toBeGreaterThanOrEqual(2)
    await expect(page.getByText(/Đang soát 2\/3 phần/)).toBeVisible()
    release()
  })
})
