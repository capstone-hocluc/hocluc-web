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

test('lists and creates conversations for the quiz while keeping the workspace route unfiltered', async (t) => {
  const quizId = 'quiz & 1'
  const conversation = { id: 'conversation-1', quizId }
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
    return { data: method === 'GET' ? { content: [conversation] } : conversation }
  })

  assert.deepEqual((await service.getAiConversations(0, 50, quizId)).content, [conversation])
  assert.deepEqual(await service.createAiConversation({ title: 'Đề Toán', quizId }), conversation)
  await service.getAiConversations()
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

test('only written questions from the run can be appended', () => {
  const messages = [
    { role: 'assistant', addedItemIds: ['older'] },
    { role: 'user' },
    { role: 'assistant', addedItemIds: ['written-1', 'failed', 'sheet-2', 'written-1'] },
  ]
  const questions = [
    { id: 'older' },
    { id: 'written-1' },
    { id: 'failed', failure: 'Không viết được câu hỏi' },
  ]
  assert.deepEqual(quizDraft.writtenRunItemIds(messages, questions), ['written-1'])
  assert.deepEqual(quizDraft.writtenRunItemIds([...messages, { role: 'assistant', addedItemIds: [] }], questions), [])
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
