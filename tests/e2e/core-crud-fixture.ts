import type { Page } from '@playwright/test'
import type { Category } from '../../src/services/categoryService'
import type { CourseAdmin } from '../../src/services/courseAdminService'

export const IDS = {
  main: '10000000-0000-0000-0000-000000000001',
  section: '10000000-0000-0000-0000-000000000002',
  root: '20000000-0000-0000-0000-000000000001',
  child: '20000000-0000-0000-0000-000000000002',
  phase1: '30000000-0000-0000-0000-000000000001',
  phase2: '30000000-0000-0000-0000-000000000002',
  teacher: '40000000-0000-0000-0000-000000000001',
}
// Tokens are opaque strings: preserve all six PostgreSQL fractional-second digits.
export const STAMP = '2026-10-10T00:00:00.123456Z'
const course = (id: string, title: string, courseType: 'MAIN' | 'SECTION'): CourseAdmin => ({
  id,
  title,
  courseType,
  slug: courseType === 'MAIN' ? 'main-toan' : 'section-dai-so',
  description: null,
  shortIntroduction: null,
  imageUrl: null,
  videoUrl: null,
  categoryId: IDS.root,
  categoryName: 'Toán',
  status: 'DRAFT',
  paid: false,
  price: 0,
  track: null,
  startDate: null,
  endDate: null,
  targetExam: null,
  examSessionDate: null,
  publishedAt: null,
  updatedAt: STAMP,
  phases: [],
  sections: [],
  instructors: [],
})
export interface CapturedRequest {
  path: string
  method: string
  body: Record<string, unknown>
}
interface FixtureProblems {
  unmatchedRequests: string[]
  pageErrors: string[]
  consoleErrors: string[]
}
const installed = new WeakMap<Page, FixtureProblems>()
export function fixtureProblems(page: Page) {
  return installed.get(page)
}

export async function installCrudFixture(
  page: Page,
  role: 'ADMINISTRATOR' | 'STAFF' | 'MANAGER' = 'STAFF'
) {
  const state = {
    categories: [
      {
        id: IDS.root,
        name: 'Toán',
        slug: 'toan',
        parentId: null,
        active: true,
        sortOrder: 0,
        description: null,
        imageUrl: 'https://example.invalid/math.png',
        updatedAt: STAMP,
      },
      {
        id: IDS.child,
        name: 'Đại số',
        slug: 'dai-so',
        parentId: IDS.root,
        active: true,
        sortOrder: 1,
        description: null,
        imageUrl: null,
        updatedAt: STAMP,
      },
    ] as Category[],
    courses: [
      course(IDS.main, 'MAIN Toán', 'MAIN'),
      course(IDS.section, 'SECTION Đại số', 'SECTION'),
    ],
    requests: [] as CapturedRequest[],
    failNext: '' as '' | 'conflict' | 'network',
    sequence: 10,
    categoryReadGate: null as Promise<void> | null,
    unmatchedRequests: [] as string[],
    pageErrors: [] as string[],
    consoleErrors: [] as string[],
    expectedNetworkErrors: [] as string[],
  }
  installed.set(page, state)
  page.on('pageerror', (error) => state.pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (
      message.text().startsWith('Failed to load resource:') &&
      state.expectedNetworkErrors.includes(message.location().url)
    )
      return
    state.consoleErrors.push(message.text())
  })
  state.courses[0].phases = [
    { id: IDS.phase1, name: 'Nền tảng', description: null, sequence: 1, updatedAt: STAMP },
    { id: IDS.phase2, name: 'Luyện tập', description: null, sequence: 2, updatedAt: STAMP },
  ]
  await page.addInitScript(() => {
    localStorage.setItem('hocluc.accessToken', 'local-fixture-token-not-a-real-credential')
    localStorage.removeItem('hocluc.refreshToken')
  })
  // A fail-closed network boundary, including if a developer accidentally changes the API origin.
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) {
      if (url.origin === 'http://127.0.0.1:5174') await route.continue()
      else {
        if (['xhr', 'fetch'].includes(request.resourceType()))
          state.unmatchedRequests.push(`${request.method()} ${request.url()}`)
        state.expectedNetworkErrors.push(request.url())
        await route.abort('blockedbyclient')
      }
      return
    }
    const method = request.method()
    const body = request.postData() ? JSON.parse(request.postData()!) : {}
    const path = url.pathname
    state.requests.push({ path, method, body })
    // Model the dangerous case: mutation committed, response lost, not merely a rejected request.
    const loseResponse = method !== 'GET' && state.failNext === 'network'
    if (loseResponse) state.failNext = ''
    const answer = async (data: unknown, status = 200, message = 'OK') => {
      if (loseResponse || status >= 400) state.expectedNetworkErrors.push(request.url())
      if (loseResponse) return route.abort('connectionfailed')
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, status, message, data }),
      })
    }
    if (method !== 'GET' && role === 'MANAGER') return answer(null, 403, 'Forbidden')
    if (method !== 'GET' && state.failNext === 'conflict') {
      state.failNext = ''
      return answer(null, 409, 'Resource changed. Reload before editing.')
    }
    if (path === '/api/v1/users/profiles')
      return answer({
        id: IDS.teacher,
        email: 'qa@example.invalid',
        displayName: 'QA',
        firstName: 'QA',
        lastName: 'Local',
        role,
        roles: [role],
        status: 'ACTIVE',
        emailVerified: true,
      })
    if (path === '/api/v1/users')
      return answer({
        content: [
          {
            id: IDS.teacher,
            role: 'TEACHER',
            roles: ['TEACHER'],
            status: 'ACTIVE',
            firstName: 'Giáo viên',
            lastName: 'QA',
            displayName: 'Giáo viên QA',
            email: 'teacher@example.invalid',
            emailVerified: true,
          },
        ],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 1,
        totalPages: 1,
        last: true,
      })
    if (path === '/api/v1/categories') {
      if (method === 'GET') {
        const gate = state.categoryReadGate
        state.categoryReadGate = null
        if (gate) await gate
        return answer(state.categories)
      }
      const next = {
        ...body,
        id: `50000000-0000-0000-0000-${String(++state.sequence).padStart(12, '0')}`,
        slug: body.slug || 'new-category',
        updatedAt: STAMP,
      } as unknown as Category
      state.categories.push(next)
      return answer(next)
    }
    if (path.startsWith('/api/v1/categories/')) {
      const id = path.split('/').at(-1)!
      if (method === 'DELETE') {
        state.categories = state.categories.filter((c) => c.id !== id)
        return answer(null)
      }
      const previous = state.categories.find((c) => c.id === id)!
      Object.assign(previous, body)
      return answer(previous)
    }
    if (path === '/api/v1/admin/courses') {
      if (method === 'GET') {
        const content = state.courses.filter(
          (c) =>
            (!url.searchParams.get('type') || c.courseType === url.searchParams.get('type')) &&
            (!url.searchParams.get('status') || c.status === url.searchParams.get('status')) &&
            (!url.searchParams.get('categoryId') ||
              c.categoryId === url.searchParams.get('categoryId')) &&
            (!url.searchParams.get('query') ||
              c.title.toLowerCase().includes(url.searchParams.get('query')!.toLowerCase()))
        )
        return answer({
          content,
          pageNumber: 0,
          pageSize: 20,
          totalElements: content.length,
          totalPages: content.length ? 1 : 0,
          last: true,
        })
      }
      const next = Object.assign(
        course(
          `60000000-0000-0000-0000-${String(++state.sequence).padStart(12, '0')}`,
          String(body.title),
          body.courseType as 'MAIN' | 'SECTION'
        ),
        body
      )
      next.slug = String(body.slug || 'new-course')
      state.courses.unshift(next)
      return answer(next)
    }
    if (path.startsWith('/api/v1/admin/courses/')) {
      const parts = path.split('/').slice(5)
      const current = state.courses.find((c) => c.id === parts[0])
      if (!current) return answer(null, 404, 'Course not found')
      if (parts.length === 1) {
        if (method === 'GET') return answer(current)
        if (method === 'PUT') {
          Object.assign(current, body)
          return answer(current)
        }
        if (method === 'DELETE') {
          state.courses = state.courses.filter((c) => c !== current)
          return answer(null)
        }
      }
      if (parts[1] === 'status') return answer(null, 400, 'Course is not ready for publication.')
      if (parts[1] === 'phases' && parts[2] === 'order') {
        current.phases = (body.ids as string[]).map((id, index) => ({
          ...current.phases.find((p) => p.id === id)!,
          sequence: index + 1,
        }))
        return answer(current)
      }
      if (parts[1] === 'sections' && method === 'POST') {
        const child = state.courses.find((c) => c.id === body.sectionCourseId)!
        current.sections.push({
          id: '70000000-0000-0000-0000-000000000001',
          sectionCourseId: child.id,
          title: child.title,
          status: child.status,
          phaseId: body.phaseId as string | null,
          sequence: current.sections.length + 1,
        })
        return answer(current)
      }
      if (parts[1] === 'instructors' && method === 'PUT') {
        current.instructors = [
          {
            id: '80000000-0000-0000-0000-000000000001',
            instructorId: parts[2],
            name: 'Giáo viên QA',
            primaryInstructor: true,
            displayOrder: 0,
          },
        ]
        return answer(current)
      }
    }
    state.unmatchedRequests.push(`${method} ${request.url()}`)
    return answer(null, 501, `Unexpected fixture route: ${method} ${path}`)
  })
  return state
}
