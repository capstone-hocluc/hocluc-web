import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite
let service
let quizDraft

before(async () => {
  vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null, ws: false } })
  service = await vite.ssrLoadModule('/src/services/aiAssistantService.ts')
  quizDraft = await vite.ssrLoadModule('/src/components/management/quiz/quiz-assistant-draft.ts')
})

after(async () => { await vite?.close() })

function mockRequest(t, handler, role = 'STAFF') {
  const token = `stub.${Buffer.from(JSON.stringify({ sub: 'test', role: `ROLE_${role}` })).toString('base64url')}.stub`
  const storage = { getItem: (key) => key === 'hocluc.accessToken' ? token : null }
  t.mock.method(globalThis, 'fetch', async (input, request) => {
    const { pathname, searchParams } = new URL(input)
    const { status = 200, data, message } = handler(pathname, searchParams, request)
    return Response.json({ success: status < 400, status, data, message }, { status })
  })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  t.after(() => { delete globalThis.localStorage })
}

test('lists quiz conversations separately from standalone workspace conversations', async (t) => {
  const quizId = 'quiz & 1'
  const conversation = { id: 'conversation-1', quizId }
  const standalone = { id: 'workspace-1', quizId: null }
  const pending = [
    ['GET', quizId, undefined],
    ['POST', null, { title: 'Đề Toán', quizId }],
    ['GET', null, undefined],
  ]
  mockRequest(t, (path, params, request) => {
    assert.equal(path, '/api/v1/ai-assistant/conversations')
    const [method, filter, body] = pending.shift()
    assert.equal(request.method, method)
    assert.equal(params.get('quizId'), filter)
    assert.deepEqual(request.body && JSON.parse(request.body), body)
    return { data: method === 'GET' ? { content: [filter ? conversation : standalone] } : conversation }
  })

  assert.deepEqual((await service.getAiConversations(0, 50, quizId)).content, [conversation])
  assert.deepEqual(await service.createAiConversation({ title: 'Đề Toán', quizId }), conversation)
  assert.deepEqual((await service.getAiConversations()).content, [standalone])
  assert.equal(pending.length, 0)
})

test('appends only selected items and preserves the API refusal message', async (t) => {
  const body = { quizId: 'quiz-1', itemIds: ['written-1', 'written-2'] }
  const data = { quizId: 'quiz-1', questionCount: 1, skipped: [{ itemId: 'written-2', reason: 'Đã có trong bài' }] }
  let calls = 0
  mockRequest(t, (path, _params, request) => {
    assert.equal(path, '/api/v1/ai-assistant/conversations/conversation-1/draft/quiz')
    assert.equal(request.method, 'POST')
    assert.deepEqual(JSON.parse(request.body), body)
    return ++calls === 1 ? { data } : { status: 409, message: 'Bài kiểm tra đã có lượt làm.' }
  })
  assert.deepEqual(await service.exportAiDraftToQuiz('conversation-1', body), data)
  await assert.rejects(service.exportAiDraftToQuiz('conversation-1', body), { message: 'Bài kiểm tra đã có lượt làm.' })
})

test('uses the active quiz write permission before appending', async (t) => {
  mockRequest(t, () => assert.fail('The quiz write must not reach the network'), 'TEACHER')
  await assert.rejects(service.exportAiDraftToQuiz('conversation-1', { quizId: 'quiz-1', itemIds: ['written-1'] }), { status: 403 })
})

const draftItem = (id, addedToQuizId) => ({ id, addedToQuizId, question: { text: `Câu hỏi ${id}` } })

test('a freshly loaded draft offers written questions from every run', async (t) => {
  const items = [
    draftItem('earlier', null),
    draftItem('later', null),
    { id: 'failed', question: { failed: true, text: 'Không viết được câu hỏi' } },
    { id: 'blank', question: { text: ' ' } },
  ]
  mockRequest(t, (path, _params, request) => {
    assert.equal(path, '/api/v1/ai-assistant/conversations/conversation-1/draft')
    assert.equal(request.method, 'GET')
    return { data: { items } }
  })
  const loaded = await service.getAiDraft('conversation-1')
  assert.deepEqual(quizDraft.pendingQuizDraftItemIds(loaded.items, 'quiz-1'), ['earlier', 'later'])
})

test('a draft item added to the target quiz is no longer offered', () => {
  const items = [draftItem('same', 'quiz-1'), draftItem('different', 'quiz-2'), draftItem('new', undefined)]
  assert.deepEqual(quizDraft.pendingQuizDraftItemIds(items, 'quiz-1'), ['different', 'new'])
})

test('a successful append refreshes the draft and clears its pending count', async (t) => {
  const quizId = 'quiz-1'
  const conversationId = 'conversation-1'
  const items = [draftItem('earlier', null), draftItem('later', null)]
  const draftPath = `/api/v1/ai-assistant/conversations/${conversationId}/draft`
  const response = { quizId, questionCount: 2, skipped: [] }
  let writes = 0
  let reads = 0
  mockRequest(t, (path, _params, request) => {
    if (path === draftPath) {
      assert.equal(request.method, 'GET')
      reads++
      return { data: { items: writes ? items.map((item) => ({ ...item, addedToQuizId: quizId })) : items } }
    }
    assert.equal(path, `${draftPath}/quiz`)
    assert.equal(request.method, 'POST')
    assert.deepEqual(JSON.parse(request.body), { quizId, itemIds: ['earlier', 'later'] })
    writes++
    return { data: response }
  })
  let pending = await service.getAiDraft(conversationId)
  const ids = quizDraft.pendingQuizDraftItemIds(pending.items, quizId)
  assert.equal(ids.length, 2)
  const appended = await quizDraft.appendQuizDraft(conversationId, { quizId, itemIds: ids }, async (id) => {
    pending = await service.getAiDraft(id)
    return true
  })
  assert.deepEqual(appended, { result: response, draftRefreshed: true })
  assert.equal(writes, 1)
  assert.equal(reads, 2)
  assert.equal(quizDraft.pendingQuizDraftItemIds(pending.items, quizId).length, 0)
})

test('provides the current question, choices and shared passage as sheet context', () => {
  const paper = {
    title: 'Đề đọc hiểu',
    durationMinutes: 30,
    parts: [{ id: 'part-1', title: 'Đọc hiểu' }],
    groups: [{ id: 'group-1', passage: 'Đoạn văn dùng chung.' }],
    questions: [{
      id: 'quiz-question-1', partId: 'part-1', groupId: 'group-1', position: 1, printedNumber: 1,
      prompt: 'Câu hỏi hiện tại?', options: [{ text: 'Lựa chọn A', label: 'A' }, { text: 'Lựa chọn B', label: 'B' }],
    }],
  }
  const context = quizDraft.quizAssistantSheet(paper)
  assert.match(context.outline, /ĐỌC HIỂU/)
  assert.equal(context.questions.length, 1)
  assert.equal(context.questions[0].number, 1)
  assert.equal(context.questions[0].part, 'part-1')
  assert.equal(context.questions[0].group, 'group-1')
  assert.match(context.questions[0].text, /Câu hỏi hiện tại\?/)
  assert.match(context.questions[0].text, /Lựa chọn A/)
  assert.match(context.questions[0].context, /Đoạn văn dùng chung/)
  assert.equal(context.questions[0].itemId, undefined)
})
