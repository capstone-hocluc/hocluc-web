import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, reading, publishing, service
before(async () => {
  vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null, ws: false } })
  ;[reading, publishing, service] = await Promise.all([
    vite.ssrLoadModule('/src/components/management/ai-assistant/chat/reading-permission.ts'),
    vite.ssrLoadModule('/src/components/management/quiz/quiz-publish-confirmation.ts'),
    vite.ssrLoadModule('/src/services/aiAssistantService.ts'),
  ])
})
after(async () => { await vite?.close() })

const permission = {
  kind: 'READING_PASSAGES', parts: ['Phần 2. Tiếng Việt'], passages: 3,
  request: 'Soạn thử theo đề nguồn', mode: 'mock-exam',
  config: { bankSourceId: 'source-1', questionCount: 18, subjectId: 'subject-1', extra: 'preserve' }, answer: null,
}
const card = (id, answer = null) => ({ id, role: 'assistant', permission: { ...permission, answer } })
const user = { id: 'user', role: 'user' }

test('only the latest unanswered reading permission is actionable', () => {
  const first = card('first')
  const latest = card('latest')
  const history = [user, first, latest]
  const active = reading.latestReadingPermissionId(history)
  assert.equal(active, latest.id)
  assert.equal(reading.readingPermissionState(first, active), 'inert')
  assert.equal(reading.readingPermissionState(latest, active), 'actionable')
  assert.equal(reading.readingPermissionState(latest, active, true), 'inert')
})

test('a newer teacher message makes an unanswered permission inert, even on an earlier branch', () => {
  const latest = card('latest')
  assert.equal(reading.latestReadingPermissionId([latest, { ...user, id: 'local-send' }], [latest]), null)
  const active = reading.latestReadingPermissionId([latest], [latest, user])
  assert.equal(reading.readingPermissionState(latest, active), 'inert')
})

test('persisted answers only show the recorded decision after reload', () => {
  const allowed = card('allowed', 'ALLOWED')
  const declined = card('declined', 'DECLINED')
  const active = reading.latestReadingPermissionId([allowed, declined])
  assert.equal(active, null)
  assert.equal(reading.readingPermissionState(allowed, active), 'ALLOWED')
  assert.equal(reading.readingPermissionState(declined, active), 'DECLINED')
})

test('markReadingPermissionAnswered records answer once on the target permission message', () => {
  const target = card('permission-1')
  const other = card('permission-2')
  const already = card('permission-3', 'DECLINED')
  const config = reading.readingPermissionReply(target, true).config
  assert.equal(reading.markReadingPermissionAnswered(target, config).permission.answer, 'ALLOWED')
  assert.equal(reading.markReadingPermissionAnswered(other, config), other)
  assert.equal(reading.markReadingPermissionAnswered(already, { ...config, permissionMessageId: 'permission-3' }), already)
  const declinedConfig = reading.readingPermissionReply(target, false).config
  assert.equal(reading.markReadingPermissionAnswered(target, declinedConfig).permission.answer, 'DECLINED')
})

test('both choices send the saved mode, request and config as an agreed message', async (t) => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
  t.after(() => { delete globalThis.localStorage })
  const expected = [true, false]
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).pathname, '/api/v1/ai-assistant/conversations/conversation-1/messages')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), {
      content: permission.request, mode: permission.mode, parentId: 'permission-1',
      config: { ...permission.config, confirmed: true, agreed: true, permissionMessageId: 'permission-1', allowReadingPassages: expected.shift() },
    })
    return Response.json({ success: true, data: { messageId: 'accepted', jobId: 'job' } })
  })
  for (const allow of [true, false]) {
    await service.sendAiMessage('conversation-1', reading.readingPermissionReply(card('permission-1'), allow))
  }
  assert.deepEqual(expected, [])
})

test('only draft copies with an active original require replacement confirmation', () => {
  const draft = { status: 'DRAFT', replacesQuizId: 'published-quiz', replacesQuizTitle: 'Đề gốc' }
  assert.deepEqual(publishing.quizPublishConfirmation(draft), {
    title: 'Thay bản đang dùng?',
    description: 'Xuất bản bản này sẽ gỡ “Đề gốc” khỏi học viên.',
    confirmLabel: 'Xuất bản và thay',
  })
  assert.deepEqual(publishing.quizPublishConfirmation({ ...draft, replacesQuizTitle: '   ' }), {
    title: 'Thay bản đang dùng?',
    description: 'Xuất bản bản này sẽ gỡ bản đang dùng khỏi học viên.',
    confirmLabel: 'Xuất bản và thay',
  })
  assert.equal(publishing.quizPublishConfirmation({ ...draft, replacesQuizId: null }), null)
  assert.equal(publishing.quizPublishConfirmation({ status: 'DRAFT' }), null)
  assert.equal(publishing.quizPublishConfirmation({ ...draft, status: 'PUBLISHED' }), null)
  assert.equal(publishing.quizPublishConfirmation({ ...draft, status: 'ARCHIVED' }), null)
})
