import { expect, test, type Page } from '@playwright/test'
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

const question = (text: string, difficulty = 'TB') => ({
  patternCode: 'MA.Q07',
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
  ],
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
  /** A compose run that never ends until the test cancels it. */
  endless?: boolean
}

async function installAiFixture(page: Page, role: UserRole = 'MANAGER', options: AiFixtureOptions = {}) {
  const quiz = await installQuizFixture(page, role)
  const state = {
    conversations: [...(options.conversations ?? [])] as Conversation[],
    messages: new Map(Object.entries(options.messages ?? {})),
    drafts: new Map(Object.entries(options.drafts ?? {})),
    requests: [] as Array<{ method: string; path: string; body: Record<string, unknown>; lastEventId: string }>,
    mode: 'compose' as 'ask' | 'compose' | 'mock-exam',
    posted: false,
    cancelled: false,
  }

  await page.route('**/api/v1/ai-assistant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const body = (method === 'GET' || method === 'DELETE'
      ? {}
      : (request.postDataJSON() as Record<string, unknown> | null) ?? {}) as Record<string, unknown>
    state.requests.push({ method, path, body, lastEventId: request.headers()['last-event-id'] ?? '' })
    const reply = (data: unknown, status = 200, message = 'OK') =>
      route.fulfill({ status, json: { success: status < 400, status, data, message } })

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
    if (!match) return reply(null, 501, 'Fixture has no handler')
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
        return reply(null)
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
      // Until the message is posted there is nothing to replay; the client reconnects
      // after two seconds, by which time the scripted run is ready.
      const body =
        !state.posted
          ? ''
          : state.cancelled
            ? sse(['end', { status: 'CANCELLED', written: 0 }])
            : state.mode === 'ask'
              ? sse(...askStream)
              : options.endless
                ? sse(['tool', { tool: 'soan-cau-hoi', arguments: { section: 'P2' } }])
                : composeStream(conversationId)
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    }

    if (action === 'draft' || action.startsWith('draft/')) {
      const draft = state.drafts.get(conversationId) ?? emptyDraft(conversation)
      const segments = action.split('/')
      if (segments.length === 1) return reply(draft)
      if (segments[1] !== 'items') return reply(null, 501, 'Fixture has no handler')

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

    return reply(null, 501, 'Fixture has no handler')
  })

  return { quiz, state }
}

async function openAssistant(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Toán/ })).toBeVisible()
}

async function sendCompose(page: Page, text = 'Soạn 2 câu đại số cơ bản') {
  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill(text)
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
}

test('the console menu opens the assistant with the subject list', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/dashboard')

  await page.locator('aside nav').getByRole('button', { name: 'Trợ lý AI', exact: true }).click()

  await expect(page).toHaveURL(/\/console\/manager\/ai-assistant$/)
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toBeVisible()
  await expect(page.getByText('Môn học', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Toán/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toBeDisabled()
  expect(state.requests.some((entry) => entry.method === 'GET' && entry.path === `${BASE}/conversations`)).toBe(true)
})

test('a compose run streams its stages and items into the paper', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn 2 câu đại số cơ bản')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()

  await expect(page.getByRole('button', { name: 'Dừng tạo câu trả lời' })).toBeVisible()
  await expect(page.getByText('Khảo sát ngân hàng câu hỏi')).toBeVisible()
  await expect(page.getByText('Đang soạn câu 2/2', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Đã thêm 2 câu vào đề')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Mình đã soạn xong 2 câu cho phần Toán học.')).toBeVisible()

  const first = page.locator('#exam-question-item-1')
  await expect(first).toContainText('Tính giá trị của biểu thức x cộng 1.')
  await expect(first.getByText('Cần duyệt', { exact: true })).toBeVisible()
  await expect(first.getByText('Đáp án chưa được đối chiếu với đề gốc.')).toBeVisible()
  await expect(page.locator('#exam-question-item-2')).toContainText('Rút gọn biểu thức hai x trừ x.')
  await expect(page.getByRole('button', { name: 'Tới câu 61' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tới câu 62' })).toBeVisible()

  const created = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations`)
  expect(created?.body).toEqual({ title: 'Soạn 2 câu đại số cơ bản', subjectId: 'category-1' })
  const sent = state.requests.find((entry) => entry.method === 'POST' && entry.path === `${BASE}/conversations/conv-1/messages`)
  expect(sent?.body).toMatchObject({
    content: 'Soạn 2 câu đại số cơ bản',
    mode: 'compose',
    config: { subjectId: 'category-1', examFormat: 'VACT_2025', questionCount: 5, bankRatio: 0.2 },
  })
})

test('keeping and dropping an AI question each call the draft API', async ({ page }) => {
  const { state } = await installAiFixture(page)
  await openAssistant(page)
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
  await sendCompose(page)

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await page.getByRole('button', { name: 'Kéo câu 61 để đổi chỗ' }).dispatchEvent('dragstart', { dataTransfer })
  await page.locator('#exam-question-item-2').dispatchEvent('dragover', { dataTransfer })
  await page.locator('#exam-question-item-2').dispatchEvent('drop', { dataTransfer })

  await expect.poll(() => state.requests.filter((entry) => entry.method === 'PUT').at(-1)?.body).toEqual({
    sectionCode: 'P2',
    itemIds: ['item-2', 'item-1'],
  })
  await expect(page.locator('#exam-question-item-2')).toContainText('Câu 61')
  await expect(page.locator('#exam-question-item-1')).toContainText('Câu 62')
})

test('stopping a run asks the server to cancel it', async ({ page }) => {
  const { state } = await installAiFixture(page, 'MANAGER', { endless: true })
  await openAssistant(page)

  await page.getByRole('textbox', { name: 'Tin nhắn cho trợ lý AI' }).fill('Soạn đề kiểm tra')
  await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
  await page.getByRole('button', { name: 'Dừng tạo câu trả lời' }).click()

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
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')

  await expect(page.getByText('Soạn giúp tôi một câu đại số.')).toBeVisible()
  await expect(page.locator('#exam-question-saved-1')).toContainText('Câu đã lưu trong bản nháp.')
  await expect(page.getByRole('textbox', { name: 'Tên đề thi' })).toHaveValue('Đề đã lưu')

  await page.getByRole('button', { name: 'Cuộc trò chuyện' }).click()
  await expect(page.getByLabel('Cuộc trò chuyện trợ lý AI')).toBeVisible()
  await expect(page.getByRole('button', { name: /Đề đã lưu/ })).toBeVisible()
})
