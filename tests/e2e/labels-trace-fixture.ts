import type { Page, Route } from '@playwright/test'
import type { UserRole } from '../../src/services/userService'
import type { CourseAdmin } from '../../src/services/courseAdminService'
import type { ChapterAdmin } from '../../src/services/chapterAdminService'
import type { LessonAdmin } from '../../src/services/lessonAdminService'
import type {
  LessonLabelsResponse,
  LessonSkillLabel,
  LessonSuggestionResponse,
} from '../../src/types/lessonLabels'
import type {
  MasterDataContent,
  MasterDataVersion,
} from '../../src/services/masterDataService'
import type {
  BankQuestionDetail,
  BankQuestionRow,
  BankScopes,
} from '../../src/services/questionBankService'
import { installQuizFixture } from './quiz-permissions-fixture'

export const LABEL_IDS = {
  subject: 'category-tv',
  course: '10000000-0000-0000-0000-000000000101',
  courseBroken: '10000000-0000-0000-0000-000000000102',
  courseUnsafe: '10000000-0000-0000-0000-000000000103',
  courseRelative: '10000000-0000-0000-0000-000000000104',
  chapter: '20000000-0000-0000-0000-000000000101',
  lesson: '30000000-0000-0000-0000-000000000101',
  question: '60000000-0000-0000-0000-000000000101',
  questionEmpty: '60000000-0000-0000-0000-000000000102',
}

const STAMP = '2026-10-20T00:00:00Z'
const BROKEN_COVER = 'https://broken.example/missing.png'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
)

const course = (
  id: string,
  title: string,
  imageUrl: string | null,
  categoryName: string | null
): CourseAdmin => ({
  id,
  courseType: 'MAIN',
  title,
  slug: id,
  description: null,
  shortIntroduction: null,
  imageUrl,
  videoUrl: null,
  categoryId: LABEL_IDS.subject,
  categoryName,
  status: 'DRAFT',
  paid: false,
  price: 0,
  track: null,
  startDate: null,
  endDate: null,
  targetExam: null,
  examSessionDate: null,
  accessMode: null,
  accessDays: null,
  publishedAt: null,
  updatedAt: STAMP,
  reviewState: 'NONE',
  reviewNote: null,
  reviewRequestedByName: null,
  reviewRequestedAt: null,
  reviewedByName: null,
  reviewedAt: null,
  canReview: false,
  phases: [],
  sections: [],
  instructors: [],
})

const masterContent = (): MasterDataContent => ({
  domains: [
    {
      id: 'domain-1',
      code: 'TV.D01',
      nameVi: 'Đọc hiểu',
      nameEn: null,
      scope: null,
      curriculumLevel: null,
      sourceStatus: null,
      notes: null,
    },
    {
      id: 'domain-2',
      code: 'TV.D02',
      nameVi: 'Tiếng Việt',
      nameEn: null,
      scope: null,
      curriculumLevel: null,
      sourceStatus: null,
      notes: null,
    },
    {
      id: 'domain-3',
      code: 'TV.D03',
      nameVi: 'Tổng hợp',
      nameEn: null,
      scope: null,
      curriculumLevel: null,
      sourceStatus: null,
      notes: null,
    },
  ],
  patterns: [
    {
      id: 'pattern-1',
      code: 'TV.P01',
      domainCode: 'TV.D01',
      domainNameVi: 'Đọc hiểu',
      nameVi: 'Đọc hiểu văn bản',
      canonicalPrompt: null,
      stimulusType: null,
      stimulusKind: null,
      responseType: null,
      primarySkillCode: 'TV.S01',
      difficultyBand: null,
      vactRelevance: null,
      sourceStatus: null,
      notes: null,
    },
  ],
  skills: [
    {
      id: 'skill-1',
      code: 'TV.S01',
      domainCodeText: 'TV.D01',
      domainCodes: ['TV.D01'],
      nameVi: 'Xác định thông tin',
      nameEn: null,
      skillCategory: null,
      description: null,
      observableBehavior: null,
      level: null,
      prerequisiteSkillCode: null,
      vactRelevance: null,
      sourceStatus: null,
    },
    {
      id: 'skill-2',
      code: 'TV.S02',
      domainCodeText: 'TV.D01',
      domainCodes: ['TV.D01'],
      nameVi: 'Suy luận',
      nameEn: null,
      skillCategory: null,
      description: null,
      observableBehavior: null,
      level: null,
      prerequisiteSkillCode: null,
      vactRelevance: null,
      sourceStatus: null,
    },
    {
      id: 'skill-3',
      code: 'TV.S03',
      domainCodeText: 'TV.D02',
      domainCodes: ['TV.D02'],
      nameVi: 'Phân tích',
      nameEn: null,
      skillCategory: null,
      description: null,
      observableBehavior: null,
      level: null,
      prerequisiteSkillCode: null,
      vactRelevance: null,
      sourceStatus: null,
    },
    {
      id: 'skill-4',
      code: 'TV.S04',
      domainCodeText: 'TV.D03',
      domainCodes: ['TV.D03'],
      nameVi: 'Tổng hợp ý',
      nameEn: null,
      skillCategory: null,
      description: null,
      observableBehavior: null,
      level: null,
      prerequisiteSkillCode: null,
      vactRelevance: null,
      sourceStatus: null,
    },
  ],
  microSkills: [
    {
      id: 'micro-1',
      code: 'TV.M01',
      skillCode: 'TV.S01',
      nameVi: 'Tìm từ khóa',
      description: null,
      masteryEvidence: null,
      suggestedDrill: null,
      defaultErrorCode: null,
      difficultyBand: null,
      sourceStatus: null,
    },
  ],
  mappings: [
    {
      id: 'mapping-1',
      patternCode: 'TV.P01',
      skillCode: 'TV.S01',
      microSkillCode: 'TV.M01',
      role: 'PRIMARY',
      weight: 1,
      notes: null,
    },
  ],
  errorCodes: [],
})

const publicContent = (): MasterDataContent => ({ ...masterContent(), mappings: [] })

const version = (): MasterDataVersion => ({
  id: 'version-active',
  categoryId: LABEL_IDS.subject,
  categoryName: 'Ngữ văn',
  version: '1.0',
  codePrefix: 'TV',
  status: 'ACTIVE',
  importedAt: '2026-10-01T08:00:00Z',
  sourceFilename: 'ngu-van.xlsx',
  activatedAt: '2026-10-02T08:00:00Z',
})

const lessonRow = (id: string, title: string): LessonAdmin => ({
  id,
  chapterId: LABEL_IDS.chapter,
  title,
  description: null,
  contentType: 'TEXT',
  content: null,
  videoUrl: null,
  durationSeconds: null,
  sequence: 1,
  published: false,
  preview: false,
  instructorContent: null,
  instructorNotes: null,
  updatedAt: STAMP,
})

const bankLabel = (primarySkillCode: string) => ({
  partCode: 'TV',
  domainCode: 'TV.D01',
  domainNameVi: 'Đọc hiểu',
  patternCode: 'TV.P01',
  patternNameVi: 'Đọc hiểu văn bản',
  primarySkillCode,
  microSkillCode: 'TV.M01',
  confidence: 0.91,
  needsFigure: null,
  labelSource: 'JEV' as const,
})

const row = (
  id: string,
  sourceTitle: string,
  sourceNumber: number,
  primarySkillCode: string
): BankQuestionRow => ({
  id,
  sourceCode: `tv-${sourceNumber}`,
  sourceTitle,
  year: 2024,
  round: 'CHINH_THUC',
  sourceNumber,
  text: `Câu ${sourceNumber}: đọc đoạn văn và trả lời.`,
  hasFigure: false,
  hasFormula: false,
  answerSource: 'PUBLISHED_KEY',
  reviewNeeded: false,
  label: bankLabel(primarySkillCode),
  status: 'APPROVED',
  origin: 'INGEST',
  difficulty: 'TB',
  questionType: 'SINGLE_CHOICE',
})

const detailOf = (record: BankQuestionRow): BankQuestionDetail => ({
  status: record.status,
  origin: record.origin,
  difficulty: record.difficulty,
  questionType: record.questionType,
  categoryId: LABEL_IDS.subject,
  categoryName: 'Ngữ văn',
  headVersionNo: 1,
  approvedVersionNo: 1,
  createdByName: 'Người soạn QA',
  canEdit: false,
  canReview: false,
  canRetire: false,
  canRestore: false,
  id: record.id,
  sourceCode: record.sourceCode,
  sourceTitle: record.sourceTitle,
  year: record.year,
  round: record.round,
  sourceNumber: record.sourceNumber,
  text: record.text,
  passage: null,
  explanation: null,
  imageUrl: null,
  passageImageUrl: null,
  hasFigure: false,
  hasFormula: false,
  answerSource: record.answerSource,
  reviewNeeded: false,
  reviewNotes: null,
  extractConfidence: null,
  options: [
    { label: 'A', text: 'Đáp án đúng', correct: true },
    { label: 'B', text: 'Đáp án khác', correct: false },
  ],
  label: record.label,
  reviewStatus: null,
})

const pageOf = <T>(content: T[], total = content.length) => ({
  content,
  pageNumber: 0,
  pageSize: 20,
  totalElements: total,
  totalPages: 1,
  last: true,
})

interface Options {
  role?: UserRole
  /** May add a chapter's domains and a lesson's skills (bank scopes). */
  labeler?: boolean
  /** The subject has an ACTIVE master data version. */
  activeMasterData?: boolean
  /** The domains of the seeded chapter and of its lesson's label set. */
  chapterDomains?: string[]
}

interface Problems {
  unmatchedRequests: string[]
  pageErrors: string[]
  consoleErrors: string[]
}

interface State {
  base: Awaited<ReturnType<typeof installQuizFixture>>
  api: Array<{ method: string; path: string; query: string; body: Record<string, unknown> }>
  chapterDomains: string[]
  chapterSaves: Array<Record<string, unknown>>
  labelSaves: Array<Record<string, unknown>>
  external: string[]
  /** Cross-origin requests this fixture refuses; their console noise is not a product defect. */
  expectedNetworkErrors: string[]
  consoleErrors: string[]
  courses: CourseAdmin[]
  chapters: ChapterAdmin[]
  lessons: LessonAdmin[]
  labels: Record<string, LessonLabelsResponse>
}

const states = new WeakMap<Page, State>()

export function labelsTraceProblems(page: Page): Problems | undefined {
  const state = states.get(page)
  return state
    ? {
        unmatchedRequests: [...state.base.unmatched],
        pageErrors: [...state.base.pageErrors],
        consoleErrors: [...state.consoleErrors],
      }
    : undefined
}

/** The course, taxonomy and bank endpoints behind the cover, labelling and back-link screens. */
export async function installLabelsTrace(page: Page, options: Options = {}) {
  const base = await installQuizFixture(page, options.role ?? 'STAFF')
  const labeler = options.labeler ?? true
  const active = options.activeMasterData ?? true
  const chapterDomains = options.chapterDomains ?? ['TV.D01']
  const state: State = {
    base,
    api: [],
    chapterSaves: [],
    labelSaves: [],
    external: [],
    expectedNetworkErrors: [],
    consoleErrors: [],
    chapterDomains,
    courses: [
      course(LABEL_IDS.course, 'Ngữ văn 12', '/cover-ok.png', 'Ngữ văn'),
      course(LABEL_IDS.courseBroken, 'Toán nâng cao', BROKEN_COVER, 'Toán'),
      course(LABEL_IDS.courseUnsafe, 'Khóa hình ảnh lạ', '//evil.com/cover.png', null),
      course(LABEL_IDS.courseRelative, 'Khóa đường dẫn tương đối', 'uploads/cover.png', 'Toán'),
    ],
    chapters: [
      {
        id: LABEL_IDS.chapter,
        courseId: LABEL_IDS.course,
        title: 'Đọc hiểu',
        description: null,
        sequence: 1,
        published: false,
        updatedAt: STAMP,
        sectionId: null,
        sectionTitle: null,
        domainCodes: chapterDomains,
      },
    ],
    lessons: [lessonRow(LABEL_IDS.lesson, 'Bài đọc 1')],
    labels: {},
  }
  states.set(page, state)

  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname === 'evil.com' || url.pathname === '/uploads/cover.png')
      state.external.push(request.url())
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (
      message.text().startsWith('Failed to load resource:') &&
      state.expectedNetworkErrors.includes(message.location().url)
    )
      return
    state.consoleErrors.push(message.text())
  })

  // Registered before the API handler so it only sees what that handler falls through to the base
  // fixture: the dev server continues, everything else is refused here and recorded as expected noise.
  await page.route('**/*', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/')) return route.fallback()
    if (url.origin === 'http://127.0.0.1:5192') return route.continue()
    if (['xhr', 'fetch'].includes(request.resourceType())) state.base.unmatched.push(request.url())
    state.expectedNetworkErrors.push(request.url())
    return route.abort('blockedbyclient')
  })

  const skillLabel = (code: string, primary: boolean): LessonSkillLabel => {
    const skill = masterContent().skills.find((item) => item.code === code)
    return {
      code,
      primary,
      nameVi: skill?.nameVi ?? null,
      domainCodes: skill?.domainCodes ?? [],
      prerequisiteSkillCode: skill?.prerequisiteSkillCode ?? null,
      microSkills: masterContent()
        .microSkills.filter((item) => item.skillCode === code)
        .map((item) => ({ code: item.code, nameVi: item.nameVi, suggestedDrill: null })),
      inActiveSet: true,
    }
  }
  const labelsFor = (lesson: LessonAdmin): LessonLabelsResponse =>
    state.labels[lesson.id] ?? {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      chapterId: lesson.chapterId,
      chapterTitle: state.chapters.find((item) => item.id === lesson.chapterId)?.title ?? '',
      subjectCategoryId: LABEL_IDS.subject,
      subjectName: 'Ngữ văn',
      labelSetVersion: active ? '1.0' : null,
      chapterDomainCodes: state.chapterDomains,
      skills: [],
      videos: [],
      markers: [],
      microSkillCodes: [],
      domainCodes: [],
      patternCodes: [],
      prerequisiteSkillCodes: [],
    }

  const suggestions: LessonSuggestionResponse[] = [
    {
      lessonId: LABEL_IDS.lesson,
      lessonTitle: 'Bài đọc 1',
      chapterId: LABEL_IDS.chapter,
      chapterTitle: 'Đọc hiểu',
      courseId: LABEL_IDS.course,
      courseTitle: 'Ngữ văn 12',
      matchedBy: 'SKILL',
      primary: true,
      videoId: null,
      videoTitle: null,
      second: null,
      marker: null,
    },
    {
      lessonId: LABEL_IDS.lesson,
      lessonTitle: 'Bài đọc 1',
      chapterId: LABEL_IDS.chapter,
      chapterTitle: 'Đọc hiểu',
      courseId: LABEL_IDS.course,
      courseTitle: 'Ngữ văn 12',
      matchedBy: 'MARKER',
      primary: false,
      videoId: 'video-1',
      videoTitle: 'Video bài giảng',
      second: 30,
      marker: null,
    },
  ]
  const records = [
    row(LABEL_IDS.question, 'Đề Ngữ văn 2024', 1, 'TV.S02'),
    row(LABEL_IDS.questionEmpty, 'Đề Ngữ văn 2025', 2, 'TV.S09'),
  ]

  const scopes: BankScopes = {
    administrator: false,
    authorSubjectIds: labeler ? [LABEL_IDS.subject] : [],
    reviewerSubjectIds: [],
  }

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const ok = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, status, data, message: 'OK' }),
      })
    const own = (body: Record<string, unknown> = {}) =>
      state.api.push({ method, path, query: url.search, body })

    if (path === '/api/v1/categories' && method === 'GET') {
      own()
      return ok([
        {
          id: LABEL_IDS.subject,
          name: 'Ngữ văn',
          slug: 'ngu-van',
          description: null,
          imageUrl: null,
          parentId: null,
          active: true,
          sortOrder: 0,
          updatedAt: STAMP,
        },
      ])
    }

    if (path === '/api/v1/admin/courses' && method === 'GET') {
      own()
      if (url.searchParams.get('reviewState') === 'PENDING') return ok(pageOf([], 0))
      return ok(pageOf(state.courses))
    }
    const courseItem = path.match(/^\/api\/v1\/admin\/courses\/([^/]+)$/)
    if (courseItem && method === 'GET') {
      own()
      const found = state.courses.find((item) => item.id === courseItem[1])
      return found ? ok(found) : ok(null, 404)
    }

    const chapterList = path.match(/^\/api\/v1\/courses\/([^/]+)\/chapters$/)
    if (chapterList) {
      const courseId = chapterList[1]
      if (method === 'GET') {
        own()
        return ok(state.chapters.filter((item) => item.courseId === courseId))
      }
      if (method === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>
        own(body)
        state.chapterSaves.push(body)
        const created: ChapterAdmin = {
          id: `chapter-${state.chapters.length + 1}`,
          courseId,
          title: String(body.title ?? ''),
          description: (body.description as string | null) ?? null,
          sequence: state.chapters.filter((item) => item.courseId === courseId).length + 1,
          published: false,
          updatedAt: STAMP,
          sectionId: null,
          sectionTitle: null,
          domainCodes: (body.domainCodes as string[] | undefined) ?? [],
        }
        state.chapters.push(created)
        return ok(created)
      }
    }
    const chapterItem = path.match(/^\/api\/v1\/courses\/([^/]+)\/chapters\/([^/]+)$/)
    if (chapterItem && method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      own(body)
      state.chapterSaves.push(body)
      const index = state.chapters.findIndex((item) => item.id === chapterItem[2])
      if (index < 0) return ok(null, 404)
      state.chapters[index] = {
        ...state.chapters[index],
        title: String(body.title ?? ''),
        description: (body.description as string | null) ?? null,
        domainCodes: (body.domainCodes as string[] | undefined) ?? [],
      }
      return ok(state.chapters[index])
    }

    const lessonList = path.match(/^\/api\/v1\/chapters\/([^/]+)\/lessons$/)
    if (lessonList && method === 'GET') {
      own()
      return ok(
        state.lessons
          .filter((item) => item.chapterId === lessonList[1])
          .map((item) => ({ ...item, labels: labelsFor(item) }))
      )
    }

    const lessonLabels = path.match(/^\/api\/v1\/authoring\/lessons\/([^/]+)\/labels$/)
    if (lessonLabels) {
      const lessonId = decodeURIComponent(lessonLabels[1])
      if (method === 'GET') {
        own()
        const lesson = state.lessons.find((item) => item.id === lessonId)
        return lesson ? ok(labelsFor(lesson)) : ok(null, 404)
      }
      if (method === 'PUT') {
        const body = request.postDataJSON() as Record<string, unknown>
        own(body)
        state.labelSaves.push(body)
        const lesson = state.lessons.find((item) => item.id === lessonId)
        if (!lesson) return ok(null, 404)
        const picks = (body.skills as Array<{ code: string; primary: boolean }> | undefined) ?? []
        const skills = picks.map((pick) => skillLabel(pick.code, pick.primary))
        state.labels[lessonId] = {
          ...labelsFor(lesson),
          skills,
          microSkillCodes: [...new Set(skills.flatMap((skill) => skill.microSkills.map((m) => m.code)))],
          domainCodes: [...new Set(skills.flatMap((skill) => skill.domainCodes))],
          prerequisiteSkillCodes: [
            ...new Set(
              skills
                .map((skill) => skill.prerequisiteSkillCode)
                .filter((code): code is string => Boolean(code))
            ),
          ],
        }
        return ok(state.labels[lessonId])
      }
    }
    // The course content panel also lists the AI's skill suggestions; this course has had no run yet.
    const suggestionsOf = /^\/api\/v1\/authoring\/courses\/([^/]+)\/skill-suggestions$/.exec(path)
    if (suggestionsOf && method === 'GET') {
      return ok({ courseId: suggestionsOf[1], run: null, suggestions: [] })
    }
    if (path === '/api/v1/authoring/lessons/by-label' && method === 'GET') {
      own()
      return ok(url.searchParams.get('skillCode') === 'TV.S02' ? suggestions : [])
    }

    if (path === '/api/v1/question-bank/me/scopes') {
      own()
      return ok(scopes)
    }
    if (path === '/api/v1/question-bank/stats') {
      own()
      return ok({
        total: 7,
        needsReview: 0,
        unlabelled: 0,
        byPart: { TV: 7 },
        byYear: { 2024: 7 },
        byAnswerSource: { PUBLISHED_KEY: 7, REFERENCE_KEY: 0, NONE: 0 },
        bySubject: [{ id: LABEL_IDS.subject, name: 'Ngữ văn', count: 7 }],
      })
    }
    if (path === '/api/v1/question-bank/patterns') {
      own()
      return ok([
        {
          code: 'TV.P01',
          nameVi: 'Đọc hiểu văn bản',
          domainCode: 'TV.D01',
          domainNameVi: 'Đọc hiểu',
          partCode: 'TV',
          categoryId: LABEL_IDS.subject,
        },
      ])
    }
    if (path === '/api/v1/question-bank/sources') {
      own()
      return ok([])
    }
    if (path === '/api/v1/question-bank/labelling') {
      own()
      return ok({ ready: true, reason: null })
    }
    if (path === '/api/v1/question-bank/questions' && method === 'GET') {
      own()
      const skill = url.searchParams.get('primarySkillCode')
      const size = Number(url.searchParams.get('size') ?? 20)
      const filtered = records.filter((item) => !skill || item.label?.primarySkillCode === skill)
      return ok(
        pageOf(filtered.slice(0, size), skill === 'TV.S02' ? 7 : filtered.length)
      )
    }
    const questionItem = path.match(/^\/api\/v1\/question-bank\/questions\/([^/]+)$/)
    if (questionItem && method === 'GET') {
      own()
      const record = records.find((item) => item.id === questionItem[1])
      return record ? ok(detailOf(record)) : ok(null, 404)
    }

    if (path === '/api/v1/master-data/categories') {
      own()
      return ok(
        active
          ? [
              {
                categoryId: LABEL_IDS.subject,
                categoryName: 'Ngữ văn',
                codePrefix: 'TV',
                versionId: 'version-active',
                version: '1.0',
              },
            ]
          : []
      )
    }
    const activePart = path.match(
      /^\/api\/v1\/master-data\/(domains|patterns|skills|micro-skills|error-codes)$/
    )
    if (activePart && method === 'GET') {
      own()
      if (!active) return ok([])
      const content = publicContent()
      const key = {
        domains: 'domains',
        patterns: 'patterns',
        skills: 'skills',
        'micro-skills': 'microSkills',
        'error-codes': 'errorCodes',
      } as const
      return ok(content[key[activePart[1] as keyof typeof key]])
    }

    if (path === '/api/v1/admin/master-data/versions' && method === 'GET') {
      own()
      return ok(active ? [version()] : [])
    }
    const versionPart = path.match(
      /^\/api\/v1\/admin\/master-data\/versions\/([^/]+)\/(domains|patterns|skills|micro-skills|mappings|error-codes)$/
    )
    if (versionPart && method === 'GET') {
      own()
      if (!active) return ok([])
      const content = masterContent()
      const key = {
        domains: 'domains',
        patterns: 'patterns',
        skills: 'skills',
        'micro-skills': 'microSkills',
        mappings: 'mappings',
        'error-codes': 'errorCodes',
      } as const
      return ok(content[key[versionPart[2] as keyof typeof key]])
    }
    if (path.endsWith('/validation')) {
      own()
      return ok({ valid: true, errors: [], warnings: [], sheetRowCounts: {} })
    }

    const outcomes = path.match(/^\/api\/v1\/admin\/courses\/([^/]+)\/outcomes$/)
    if (outcomes && method === 'GET') {
      own()
      return ok([])
    }
    const contentSections = path.match(/^\/api\/v1\/courses\/([^/]+)\/content-sections$/)
    if (contentSections && method === 'GET') {
      own()
      return ok([])
    }
    if (path === '/api/v1/users' && method === 'GET') {
      own()
      return ok(pageOf([] as unknown[], 0))
    }

    if (path === '/api/v1/admin/chapters/by-domain' && method === 'GET') {
      own()
      return ok(
        url.searchParams.get('domainCode') === 'TV.D01'
          ? [
              {
                chapterId: LABEL_IDS.chapter,
                chapterTitle: 'Đọc hiểu',
                courseId: LABEL_IDS.course,
                courseTitle: 'Ngữ văn 12',
              },
            ]
          : []
      )
    }

    return route.fallback()
  })

  await page.route('**/cover-ok.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: PNG })
  )

  return {
    state,
    chapterSaves: () => state.chapterSaves,
    labelSaves: () => state.labelSaves,
    external: () => state.external,
    api: () => state.api,
  }
}
