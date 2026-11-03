import type { Page } from '@playwright/test'
import type {
  CourseDetail,
  CourseStudy,
  CourseStudyChapter,
  CourseStudyLesson,
  CourseStudyPhase,
  CourseStudySection,
  GiftCourse,
} from '../../src/services/courseService'
import type { LessonDetail } from '../../src/services/lessonService'

// Mutable copies live inside installRoadmapFixture; these helpers only build the NEW API shape
// (gifts under phases, no top-level `gifts`) so a stale shape fails the type check.
export const ROADMAP_IDS = {
  main: '21000000-0000-0000-0000-000000000001',
  sparse: '21000000-0000-0000-0000-000000000002',
  unphased: '21000000-0000-0000-0000-000000000003',
  phase1: '31000000-0000-0000-0000-000000000001',
  phase2: '31000000-0000-0000-0000-000000000002',
  phase3: '31000000-0000-0000-0000-000000000003',
  giftB: '12000000-0000-0000-0000-000000000002',
  giftC: '12000000-0000-0000-0000-000000000003',
  giftUnphased: '12000000-0000-0000-0000-000000000004',
  lessonB: '13000000-0000-0000-0000-000000000001',
}

export const STAMP = '2026-10-10T00:00:00.123456Z'

export function gift(
  courseId: string,
  title: string,
  overrides: Partial<GiftCourse> = {}
): GiftCourse {
  return {
    courseId,
    phaseId: null,
    title,
    categoryName: 'Đại số',
    chapterCount: 1,
    lessonCount: 4,
    completedLessonCount: 0,
    progressPercentage: 0,
    ...overrides,
  }
}

function studyLesson(id: string, title: string, sequence: number): CourseStudyLesson {
  return {
    id,
    title,
    contentType: 'TEXT',
    durationSeconds: null,
    sequence,
    preview: false,
    status: 'PUBLISHED',
    progressPercentage: 0,
    completedAt: null,
    quizzes: [],
  }
}

function studyChapter(
  id: string,
  title: string,
  lessons: CourseStudyLesson[]
): CourseStudyChapter {
  return {
    id,
    title,
    sequence: 1,
    lessonCount: lessons.length,
    completedLessonCount: 0,
    completed: false,
    lessons,
    quizzes: [],
  }
}

function studySection(
  id: string,
  title: string,
  lessons: CourseStudyLesson[]
): CourseStudySection {
  return {
    contentSectionId: `${id}-content`,
    sectionCourseId: id,
    title,
    categoryName: 'Đại số',
    sequence: 1,
    lessonCount: lessons.length,
    completedLessonCount: 0,
    progressPercentage: 0,
    chapters: [studyChapter(`${id}-chapter`, `Chương ${title}`, lessons)],
  }
}

function studyPhase(overrides: Partial<CourseStudyPhase> & Pick<CourseStudyPhase, 'id' | 'name'>): CourseStudyPhase {
  return {
    description: null,
    sequence: null,
    lessonCount: 0,
    completedLessonCount: 0,
    progressPercentage: 0,
    gifts: [],
    sections: [],
    ...overrides,
  }
}

/** The main roadmap course: 3 named phases whose gifts are 4 / 6 / 8, plus one unphased gift. */
export function roadmapCourse(): CourseDetail {
  return {
    id: ROADMAP_IDS.main,
    title: 'MAIN Lộ trình kiểm thử',
    price: 0,
    giftCount: 19,
    phases: [
      {
        id: ROADMAP_IDS.phase1,
        name: 'Giai đoạn 1',
        // A legacy "Khóa tặng kèm:" description must no longer drive the grouping.
        description: 'Khóa tặng kèm: Không có thật.',
        sequence: 1,
        gifts: Array.from({ length: 4 }, (_, index) =>
          gift(`g1-${index}`, `Quà giai đoạn 1.${index + 1}`, { phaseId: ROADMAP_IDS.phase1 })
        ),
        sections: [],
      },
      {
        id: ROADMAP_IDS.phase2,
        name: 'Giai đoạn 2',
        sequence: 2,
        gifts: Array.from({ length: 6 }, (_, index) =>
          gift(`g2-${index}`, `Quà giai đoạn 2.${index + 1}`, { phaseId: ROADMAP_IDS.phase2 })
        ),
        sections: [],
      },
      {
        id: ROADMAP_IDS.phase3,
        name: 'Giai đoạn 3',
        sequence: 3,
        gifts: Array.from({ length: 8 }, (_, index) =>
          gift(`g3-${index}`, `Quà giai đoạn 3.${index + 1}`, { phaseId: ROADMAP_IDS.phase3 })
        ),
        sections: [],
      },
      {
        id: null,
        name: null,
        sequence: null,
        gifts: [gift(ROADMAP_IDS.giftUnphased, 'Quà xuyên suốt')],
        sections: [],
      },
    ],
  }
}

/** Named phases with neither gifts nor own content: no empty gift group may be rendered. */
export function sparseCourse(): CourseDetail {
  return {
    id: ROADMAP_IDS.sparse,
    title: 'MAIN Lộ trình trống',
    price: 0,
    giftCount: 0,
    phases: [
      { id: ROADMAP_IDS.phase1, name: 'Giai đoạn 1', sequence: 1, gifts: [], sections: [] },
      { id: ROADMAP_IDS.phase2, name: 'Giai đoạn 2', sequence: 2, gifts: [], sections: [] },
    ],
  }
}

/** The study payload of the main course: the continue lesson sits in a gift of phase 2. */
export function roadmapStudy(): CourseStudy {
  const ownLessons = [studyLesson('lesson-1.1', 'Bài nền 1', 1), studyLesson('lesson-1.2', 'Bài nền 2', 2)]
  return {
    courseId: ROADMAP_IDS.main,
    title: 'MAIN Lộ trình kiểm thử',
    courseType: 'MAIN',
    totalLessons: 12,
    completedLessons: 5,
    progressPercentage: 42,
    continueLessonId: ROADMAP_IDS.lessonB,
    continueLessonTitle: 'Bài mở đầu của quà',
    continueSectionCourseId: ROADMAP_IDS.giftB,
    nextLiveClass: null,
    phases: [
      studyPhase({
        id: ROADMAP_IDS.phase1,
        name: 'Giai đoạn 1',
        sequence: 1,
        lessonCount: 4,
        completedLessonCount: 2,
        progressPercentage: 50,
        sections: [studySection('section-1', 'Phần nền tảng', ownLessons)],
      }),
      studyPhase({
        id: ROADMAP_IDS.phase2,
        name: 'Giai đoạn 2',
        sequence: 2,
        lessonCount: 6,
        completedLessonCount: 2,
        progressPercentage: 33,
        gifts: [
          gift(ROADMAP_IDS.giftB, 'Quà giai đoạn 2 · B', {
            phaseId: ROADMAP_IDS.phase2,
            lessonCount: 6,
            completedLessonCount: 2,
            progressPercentage: 33,
          }),
          gift(ROADMAP_IDS.giftC, 'Quà giai đoạn 2 · C', {
            phaseId: ROADMAP_IDS.phase2,
            lessonCount: 4,
            completedLessonCount: 0,
            progressPercentage: 0,
          }),
        ],
      }),
      studyPhase({
        id: null,
        name: null,
        sequence: null,
        lessonCount: 2,
        completedLessonCount: 1,
        progressPercentage: 50,
        gifts: [
          gift(ROADMAP_IDS.giftUnphased, 'Quà xuyên suốt', {
            lessonCount: 2,
            completedLessonCount: 1,
            progressPercentage: 50,
          }),
        ],
      }),
    ],
  }
}

/** A course whose content is entirely unphased: no "Xuyên suốt lộ trình" heading. */
export function unphasedStudy(): CourseStudy {
  return {
    courseId: ROADMAP_IDS.unphased,
    title: 'MAIN chỉ có nội dung chung',
    courseType: 'MAIN',
    totalLessons: 2,
    completedLessons: 1,
    progressPercentage: 50,
    continueLessonId: null,
    continueLessonTitle: null,
    continueSectionCourseId: null,
    nextLiveClass: null,
    phases: [
      studyPhase({
        id: null,
        name: null,
        lessonCount: 2,
        completedLessonCount: 1,
        progressPercentage: 50,
        sections: [
          studySection('section-common', 'Phần chung', [
            studyLesson('lesson-c1', 'Bài chung 1', 1),
            studyLesson('lesson-c2', 'Bài chung 2', 2),
          ]),
        ],
        gifts: [gift(ROADMAP_IDS.giftUnphased, 'Quà xuyên suốt', { lessonCount: 2, completedLessonCount: 1, progressPercentage: 50 })],
      }),
    ],
  }
}

export function roadmapLesson(): LessonDetail {
  return {
    id: ROADMAP_IDS.lessonB,
    title: 'Bài mở đầu của quà',
    description: null,
    contentType: 'TEXT',
    content: 'Nội dung bài học kiểm thử.',
    videoUrl: null,
    durationSeconds: null,
    sequence: 1,
    preview: false,
    chapterId: null,
    chapterTitle: null,
    sectionCourseId: ROADMAP_IDS.giftB,
    sectionCourseTitle: 'Quà giai đoạn 2 · B',
    owned: false,
    progress: null,
    quizzes: [],
    previousLessonId: null,
    nextLessonId: null,
  }
}

export interface CapturedRequest {
  path: string
  method: string
  body: Record<string, unknown>
}

interface FixtureProblems {
  unmatchedRequests: string[]
  pageErrors: string[]
  consoleErrors: string[]
  expectedNetworkErrors: string[]
}
const installed = new WeakMap<Page, FixtureProblems>()
export function roadmapProblems(page: Page) {
  return installed.get(page)
}

export interface RoadmapSeed {
  courses?: Record<string, CourseDetail>
  studies?: Record<string, CourseStudy>
  lessons?: Record<string, LessonDetail>
}

// Fail-closed API boundary: every /api/ call is answered here; anything else is either the local
// dev server or an unexpected outbound request, which the afterEach check reports.
export async function installRoadmapFixture(page: Page, seed: RoadmapSeed = {}) {
  const state = {
    courses: seed.courses ?? {},
    studies: seed.studies ?? {},
    lessons: seed.lessons ?? {},
    requests: [] as CapturedRequest[],
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
  await page.addInitScript(() => {
    localStorage.setItem('hocluc.accessToken', 'local-fixture-token-not-a-real-credential')
    localStorage.removeItem('hocluc.refreshToken')
  })
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (!path.startsWith('/api/')) {
      if (url.origin === 'http://127.0.0.1:5192') return route.continue()
      if (['xhr', 'fetch'].includes(request.resourceType()))
        state.unmatchedRequests.push(`${request.method()} ${request.url()}`)
      state.expectedNetworkErrors.push(request.url())
      return route.abort('blockedbyclient')
    }
    const method = request.method()
    const body = request.postData() ? JSON.parse(request.postData()!) : {}
    state.requests.push({ path, method, body })
    const answer = (data: unknown, status = 200, message = 'OK') =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, status, message, data }),
      })
    if (path === '/api/v1/users/profiles')
      return answer({
        id: '41000000-0000-0000-0000-000000000001',
        email: 'student@example.invalid',
        displayName: 'Học viên QA',
        firstName: 'Học viên',
        lastName: 'QA',
        role: 'STUDENT',
        roles: ['STUDENT'],
        status: 'ACTIVE',
        emailVerified: true,
        onboardingState: 'COMPLETED',
      })
    if (path === '/api/v1/notifications/unread-count') return answer({ unread: 0 })
    if (path === '/api/v1/notifications')
      return answer({
        content: [],
        pageNumber: 0,
        pageSize: 20,
        totalElements: 0,
        totalPages: 0,
        last: true,
      })
    if (path.startsWith('/api/v1/courses/') && path.endsWith('/study') && method === 'GET') {
      const id = decodeURIComponent(path.split('/')[4] ?? '')
      const study = state.studies[id]
      return study ? answer(study) : answer(null, 404, 'Study not found.')
    }
    if (path.startsWith('/api/v1/courses/') && method === 'GET') {
      const id = decodeURIComponent(path.split('/')[4] ?? '')
      const course = state.courses[id]
      return course ? answer(course) : answer(null, 404, 'Course not found.')
    }
    if (path.startsWith('/api/v1/lessons/') && method === 'GET') {
      const id = decodeURIComponent(path.split('/')[4] ?? '')
      const lesson = state.lessons[id]
      return lesson ? answer(lesson) : answer(null, 404, 'Lesson not found.')
    }
    state.unmatchedRequests.push(`${method} ${request.url()}`)
    return answer(null, 501, `Unexpected fixture route: ${method} ${path}`)
  })
  return state
}
