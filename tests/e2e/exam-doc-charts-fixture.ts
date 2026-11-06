import type { Page } from '@playwright/test'
import { installQuizFixture } from './quiz-permissions-fixture'

// The AI assistant's exam editor with one saved exam whose document the test writes: just the calls opening it and
// saving it make. Every other call is recorded as unmatched, so the spec can fail on it.

const BASE = '/api/v1/ai-assistant'
const stamp = '2026-11-01T08:00:00Z'
export const CONVERSATION_ID = 'conv-charts'

export type DocNode = Record<string, unknown>

export const run = (text: string, ...marks: Array<'bold' | 'italic'>): DocNode => ({
  type: 'text',
  text,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
})
export const paragraph = (...content: DocNode[]): DocNode => ({ type: 'paragraph', ...(content.length ? { content } : {}) })
export const heading = (level: 1 | 2 | 3, text: string): DocNode => ({ type: 'heading', attrs: { level }, content: [run(text)] })
export const tiptapDoc = (...content: DocNode[]) => ({ type: 'doc', attrs: { deliveredItems: [] as string[] }, content })

export async function installChartsFixture(page: Page, content: Record<string, unknown>) {
  const quiz = await installQuizFixture(page, 'MANAGER')
  const conversation = {
    id: CONVERSATION_ID,
    title: 'Đề có biểu đồ',
    subjectId: 'category-1',
    mode: 'compose',
    createdAt: stamp,
    updatedAt: stamp,
  }
  const state = {
    document: { mode: 'FREE', content, version: 3, updatedAt: stamp } as Record<string, unknown>,
    /** The bodies of every document save, in order. */
    saves: [] as Record<string, unknown>[],
  }

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
  await page.route('**/api/v1/courses/main', (route) => route.fulfill({ json: { success: true, status: 200, data: [], message: 'OK' } }))

  await page.route('**/api/v1/ai-assistant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { success: status < 400, status, data, message: 'OK' } })
    if (path === `${BASE}/conversations` && method === 'GET') {
      return reply({ content: [conversation], pageNumber: 0, pageSize: 50, totalElements: 1, totalPages: 1, last: true })
    }
    const prefix = `${BASE}/conversations/${CONVERSATION_ID}`
    if (path === `${prefix}/document` && method === 'GET') return reply(state.document)
    if (path === `${prefix}/document` && method === 'PUT') {
      const body = (request.postDataJSON() as Record<string, unknown> | null) ?? {}
      state.saves.push(body)
      state.document = { mode: body.mode, content: body.content, version: Number(state.document.version) + 1, updatedAt: stamp }
      return reply(state.document)
    }
    if (path === `${prefix}/draft` && method === 'GET') {
      return reply({
        draft: { id: 'draft-charts', conversationId: CONVERSATION_ID, name: conversation.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [],
      })
    }
    if (path === `${prefix}/draft/bank` && method === 'GET') return reply({ items: [] })
    if (path === `${prefix}/messages` && method === 'GET') return reply([])
    if (path === `${prefix}/stream`) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    quiz.unmatched.push(`${method} ${path}`)
    return reply(null, 501)
  })

  await page.route('**/api/v1/question-bank/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { success: status < 400, status, data, message: 'OK' } })
    if (path === '/api/v1/question-bank/labelling') return reply({ ready: true, reason: null })
    if (path === '/api/v1/question-bank/me/scopes') return reply({ administrator: false, authorSubjectIds: [], reviewerSubjectIds: [] })
    if (path === '/api/v1/question-bank/sources' && request.method() === 'GET') return reply([])
    quiz.unmatched.push(`${request.method()} ${path}`)
    return reply(null, 501)
  })

  return { quiz, state }
}
