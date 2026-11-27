import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite
let draft
let save
let settings

before(async () => {
  vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null, ws: false } })
  draft = await vite.ssrLoadModule('/src/components/management/quiz/quiz-editor-draft.ts')
  save = await vite.ssrLoadModule('/src/components/management/quiz/save-quiz-questions.ts')
  settings = await vite.ssrLoadModule('/src/components/management/quiz/quiz-editor-settings.ts')
})

after(async () => { await vite?.close() })

function question(id, sequence, properties = {}) {
  return {
    id, sequence, sectionId: null, groupId: null, questionText: 'Nội dung gốc', questionType: 'SINGLE_CHOICE',
    categoryId: null, categoryName: null, explanation: null, imageUrl: null, sourcePage: null,
    marks: null, marksFixed: false, needsReview: false, reviewNote: null, correctLabels: 'A',
    options: [
      { id: `${id}-a`, label: 'A', sequence: 1, text: 'Đúng', correct: true },
      { id: `${id}-b`, label: 'B', sequence: 2, text: 'Sai', correct: false },
    ],
    ...properties,
  }
}

const quiz = { id: 'lesson-quiz', type: 'LESSON', status: 'DRAFT', title: 'Đọc hiểu', attemptCount: 0, locked: false }
const section = { id: 'section', title: 'Phần đọc', children: [], sequence: 1 }

function editor(properties = {}) {
  return { quiz, sections: [], questions: [], groups: [], pages: [], ...properties }
}

test('edits a question in a nested section and passage group without rewriting the quiz structure', async (t) => {
  const original = editor({
    sections: [{ ...section, children: [{ ...section, id: 'subsection', title: 'Đoạn 1' }] }],
    questions: [
      question('grouped', 1, { sectionId: 'subsection', groupId: 'passage', questionType: 'MULTIPLE_CHOICE' }),
      question('unchanged', 2, { sectionId: 'subsection', groupId: 'passage' }),
    ],
    groups: [{ id: 'passage', passage: 'Bài đọc', sectionId: 'subsection', questionIds: ['grouped', 'unchanged'] }],
  })
  const sections = draft.quizEditorSections(original)
  assert.equal(draft.sectionStructureIsSupported(original, sections), false)
  const [edited] = sections[1].questions
  assert.equal(edited.editable, true)
  edited.questionText = 'Câu hỏi đã sửa'

  const token = `stub.${Buffer.from(JSON.stringify({ sub: 'test', role: 'ROLE_STAFF' })).toString('base64url')}.stub`
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key) => key === 'hocluc.accessToken' ? token : null } })
  t.after(() => { delete globalThis.localStorage })
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    const body = JSON.parse(request.body)
    requests.push([new URL(url).pathname, request.method, body])
    return Response.json({ success: true, data: { ...original.questions[0], questionText: body.questionText } })
  })
  await save.saveQuizQuestions(original, sections, false, () => assert.fail('There are no new questions'))
  assert.deepEqual(requests.map(([path, method, { questionText, sectionId, groupId }]) => [path, method, questionText, sectionId, groupId]), [
    ['/api/v1/teacher/questions/grouped', 'PUT', 'Câu hỏi đã sửa', 'subsection', 'passage'],
  ])
})

test('a new lesson quiz starts with an editable question outside any section', () => {
  const initial = editor()
  const sections = draft.quizEditorSections(initial)
  assert.equal(draft.sectionStructureIsSupported(initial, sections), true)
  assert.equal(sections.length, 1)
  assert.equal(sections[0].unassigned, true)
  assert.equal(sections[0].questions.length, 1)
  assert.equal(sections[0].questions[0].editable, true)
})

test('reconciling a partial save never matches a new draft to a question already in the quiz', () => {
  const prior = editor({ questions: [question('original', 1)] })
  const next = editor({ questions: [question('original', 1), question('added', 2)] })
  const sections = draft.quizEditorSections(prior)
  const original = sections[0].questions[0]
  const newQuestion = { ...original, serverId: null, clientId: 'local' }
  sections[0].questions = [newQuestion, original]
  const [recovered] = draft.recoverQuizDraft(sections, prior, next)
  assert.deepEqual(recovered.questions.map(({ serverId }) => serverId), ['added', 'original'])
})

test('lesson settings retain answer review and omit locked rules', () => {
  const values = { ...settings.quizEditorSettingsOf(quiz), title: '  Tên mới ', showAnswers: true }
  assert.equal(values.duration, '30')
  assert.deepEqual(settings.quizEditorUpdatePayload(values, 'LESSON', false), {
    title: 'Tên mới', showAnswers: true, durationMinutes: 30, maxAttempts: 1,
  })
  assert.deepEqual(settings.quizEditorUpdatePayload(values, 'LESSON', true), { title: 'Tên mới', showAnswers: true })
})
