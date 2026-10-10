import type { Page } from '@playwright/test'
import type { Category } from '../../src/services/categoryService'
import type { CourseAdmin } from '../../src/services/courseAdminService'
import type { ChapterAdmin } from '../../src/services/chapterAdminService'
import type { LessonAdmin } from '../../src/services/lessonAdminService'
import type {
  OrderAdminDetail,
  OrderPayment,
  OrderStatus,
} from '../../src/services/orderAdminService'
import type { EnrollmentAdmin } from '../../src/services/enrollmentAdminService'
import type { StudyGroupAdmin, StudyGroupAdminDetail, MentorStrength } from '../../src/services/studyGroupAdminService'
import type { UserProfile } from '../../src/services/userService'

export const IDS = {
  main: '10000000-0000-0000-0000-000000000001',
  section: '10000000-0000-0000-0000-000000000002',
  root: '20000000-0000-0000-0000-000000000001',
  child: '20000000-0000-0000-0000-000000000002',
  phase1: '30000000-0000-0000-0000-000000000001',
  phase2: '30000000-0000-0000-0000-000000000002',
  teacher: '40000000-0000-0000-0000-000000000001',
  student: '40000000-0000-0000-0000-000000000002',
  mentor: '40000000-0000-0000-0000-000000000003',
  group: '50000000-0000-0000-0000-000000000001',
  group2: '50000000-0000-0000-0000-000000000002',
  orderPending: '70000000-0000-0000-0000-000000000001',
  orderPaid: '70000000-0000-0000-0000-000000000002',
  enrollment: '80000000-0000-0000-0000-000000000001',
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
  accessMode: 'FIXED_END_DATE',
  accessDays: null,
  publishedAt: null,
  updatedAt: STAMP,
  phases: [],
  sections: [],
  instructors: [],
})
const orderDetail = (
  id: string,
  orderCode: string,
  status: OrderStatus,
  overrides: Partial<OrderAdminDetail> = {}
): OrderAdminDetail => ({
  id,
  orderCode,
  paymentCode: 'HLPAY0001',
  status,
  totalAmount: 1800000,
  studentId: IDS.student,
  studentEmail: 'student@example.invalid',
  studentName: 'Học viên QA',
  createdAt: STAMP,
  expiresAt: '2026-10-11T00:00:00.123456Z',
  paidAt: null,
  paymentAttempts: 1,
  items: [{ courseId: IDS.section, courseTitle: 'SECTION Đại số', unitPrice: 1800000 }],
  payments: [],
  confirmedByEmail: null,
  confirmReason: null,
  confirmedAt: null,
  cancelledByEmail: null,
  cancelledAt: null,
  ...overrides,
})
const paymentRow = (overrides: Partial<OrderPayment> = {}): OrderPayment => ({
  id: '90000000-0000-0000-0000-000000000001',
  provider: 'SEPAY',
  status: 'SUCCESS',
  amount: 1800000,
  transactionNo: 'TXN-1',
  sepayTransactionId: 1,
  bankCode: 'VCB',
  payDate: '2026-10-10',
  paidAt: STAMP,
  manual: false,
  confirmedByEmail: null,
  confirmReason: null,
  createdAt: STAMP,
  ...overrides,
})
const enrollmentRow = (overrides: Partial<EnrollmentAdmin> = {}): EnrollmentAdmin => ({
  id: IDS.enrollment,
  studentId: IDS.student,
  studentEmail: 'student@example.invalid',
  studentName: 'Học viên QA',
  courseId: IDS.section,
  courseTitle: 'SECTION Đại số',
  courseType: 'SECTION',
  mainCourseId: null,
  status: 'ACTIVE',
  enrollmentType: 'PURCHASED',
  enrolledAt: STAMP,
  startedAt: null,
  completedAt: null,
  expiresAt: '2027-06-30T16:59:59.123456Z',
  progressPercentage: 25,
  updatedAt: STAMP,
  ...overrides,
})
const HOUSE_LABELS: Record<StudyGroupAdmin['houseType'], string> = {
  NEN_MONG: 'Nhà Nền Móng',
  VUNG_VANG: 'Nhà Vững Vàng',
  BUT_PHA: 'Nhà Bứt Phá',
}

/** The list endpoint has no roster, so the fixture answers with the same shape minus members. */
const stripMembers = (group: StudyGroupAdminDetail): StudyGroupAdmin => ({
  id: group.id,
  courseId: group.courseId,
  courseTitle: group.courseTitle,
  name: group.name,
  houseType: group.houseType,
  houseLabel: group.houseLabel,
  level: group.level,
  capacity: group.capacity,
  activeStudentCount: group.activeStudentCount,
  remainingCapacity: group.remainingCapacity,
  mentors: group.mentors,
})

const groupDetail = (overrides: Partial<StudyGroupAdminDetail> = {}): StudyGroupAdminDetail => ({
  id: IDS.group,
  courseId: IDS.main,
  courseTitle: 'MAIN Toán',
  name: 'Nhóm A',
  houseType: 'NEN_MONG',
  houseLabel: 'Nhà Nền Móng',
  level: null,
  capacity: 12,
  activeStudentCount: 0,
  remainingCapacity: 12,
  mentors: [
    { id: IDS.mentor, fullName: 'Mentor QA', primaryMentor: true, strongSubjects: ['Toán'] },
  ],
  members: [],
  ...overrides,
})

const groupMember = (
  overrides: Partial<StudyGroupAdminDetail['members'][number]> = {}
): StudyGroupAdminDetail['members'][number] => ({
  groupStudentId: '50000000-0000-0000-0000-000000000009',
  studentId: IDS.student,
  studentEmail: 'student@example.invalid',
  studentName: 'Học viên QA',
  status: 'ACTIVE',
  joinedAt: STAMP,
  ...overrides,
})

const userProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: IDS.teacher,
  email: 'teacher@example.invalid',
  firstName: 'Giáo viên',
  lastName: 'QA',
  displayName: 'Giáo viên QA',
  phone: '0900000000',
  role: 'TEACHER',
  roles: ['TEACHER'],
  status: 'ACTIVE',
  emailVerified: true,
  ...overrides,
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
    chapters: [] as ChapterAdmin[],
    lessons: {} as Record<string, LessonAdmin[]>,
    orders: [
      orderDetail(IDS.orderPending, 'HL20261010001', 'PENDING'),
      orderDetail(IDS.orderPaid, 'HL20261010002', 'PAID', {
        paymentCode: 'HLPAY0002',
        paidAt: STAMP,
        payments: [paymentRow()],
      }),
    ] as OrderAdminDetail[],
    enrollments: [enrollmentRow()] as EnrollmentAdmin[],
    groups: [
      groupDetail(),
      groupDetail({
        id: IDS.group2,
        name: 'Nhóm B',
        houseType: 'BUT_PHA',
        houseLabel: 'Nhà Bứt Phá',
        capacity: 1,
        activeStudentCount: 1,
        remainingCapacity: 0,
        mentors: [],
        members: [groupMember()],
      }),
    ] as StudyGroupAdminDetail[],
    users: {} as Record<string, UserProfile>,
    mentorStrengths: {} as Record<string, MentorStrength>,
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
          url.searchParams.get('role') === 'STUDENT'
            ? {
                id: IDS.student,
                role: 'STUDENT',
                roles: ['STUDENT'],
                status: 'ACTIVE',
                firstName: 'Học viên',
                lastName: 'QA',
                displayName: 'Học viên QA',
                email: 'student@example.invalid',
                emailVerified: true,
              }
            : {
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
    const nextId = (prefix: string) =>
      `${prefix}-0000-0000-0000-${String(++state.sequence).padStart(12, '0')}`
    const pageOf = (content: unknown[]) => ({
      content,
      pageNumber: 0,
      pageSize: 20,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      last: true,
    })
    if (path.startsWith('/api/v1/admin/courses/') && path.includes('/study-groups')) {
      const parts = path.split('/').slice(5)
      const group = () => state.groups.find((item) => item.id === parts[2])
      if (parts.length === 2) {
        if (method === 'GET') return answer(state.groups.map(stripMembers))
        const created = groupDetail({
          id: nextId('a0000000'),
          name: String(body.name),
          houseType: body.houseType as StudyGroupAdmin['houseType'],
          houseLabel: HOUSE_LABELS[body.houseType as StudyGroupAdmin['houseType']],
          level: (body.level as StudyGroupAdminDetail['level']) ?? null,
          capacity: (body.capacity as number | null) ?? null,
          activeStudentCount: 0,
          remainingCapacity: (body.capacity as number | null) ?? null,
          mentors: [],
          members: [],
        })
        state.groups.push(created)
        return answer(stripMembers(created))
      }
      const current = group()
      if (!current) return answer(null, 404, 'Study group not found.')
      if (parts.length === 3) {
        if (method === 'GET') return answer(current)
        if (method === 'PUT') {
          current.name = String(body.name)
          current.houseType = body.houseType as StudyGroupAdmin['houseType']
          current.houseLabel = HOUSE_LABELS[current.houseType]
          current.level = (body.level as StudyGroupAdminDetail['level']) ?? null
          current.capacity = (body.capacity as number | null) ?? null
          current.remainingCapacity =
            current.capacity === null ? null : current.capacity - current.activeStudentCount
          return answer(stripMembers(current))
        }
        if (method === 'DELETE') {
          if (current.activeStudentCount > 0)
            return answer(null, 409, 'This group still has active students. Move them before deleting it.')
          state.groups = state.groups.filter((item) => item !== current)
          return answer(null)
        }
      }
      if (parts[3] === 'mentors' && parts[4]) {
        if (method === 'DELETE') {
          if (!current.mentors.some((mentor) => mentor.id === parts[4]))
            return answer(null, 404, 'This mentor is not assigned to the group.')
          current.mentors = current.mentors.filter((mentor) => mentor.id !== parts[4])
          if (current.mentors.length && !current.mentors.some((mentor) => mentor.primaryMentor))
            current.mentors[0].primaryMentor = true
          return answer(stripMembers(current))
        }
        const primary = Boolean(body.primary) || current.mentors.length === 0
        const assigned = current.mentors.find((mentor) => mentor.id === parts[4])
        if (primary) current.mentors.forEach((mentor) => (mentor.primaryMentor = false))
        if (assigned) assigned.primaryMentor = primary
        else
          current.mentors.push({
            id: parts[4],
            fullName: 'Mentor QA',
            primaryMentor: primary,
            strongSubjects: [],
          })
        return answer(stripMembers(current))
      }
      if (parts[3] === 'members' && parts[4]) {
        const membership = current.members.find(
          (member) => member.studentId === parts[4] && member.status === 'ACTIVE'
        )
        if (method === 'DELETE') {
          if (!membership) return answer(null, 404, 'This student is not an active member of the group.')
          membership.status = 'DROPPED'
        } else {
          if (membership) return answer(current)
          if (current.capacity !== null && current.activeStudentCount >= current.capacity)
            return answer(null, 409, 'This study group is already at capacity.')
          // One active group per course: joining here leaves the previous group.
          state.groups.forEach((candidate) => {
            if (candidate.id === current.id) return
            candidate.members
              .filter((member) => member.studentId === parts[4] && member.status === 'ACTIVE')
              .forEach((member) => {
                member.status = 'DROPPED'
                candidate.activeStudentCount -= 1
                candidate.remainingCapacity =
                  candidate.capacity === null ? null : candidate.capacity - candidate.activeStudentCount
              })
          })
          current.members.push(groupMember())
        }
        current.activeStudentCount = current.members.filter((member) => member.status === 'ACTIVE').length
        current.remainingCapacity =
          current.capacity === null ? null : current.capacity - current.activeStudentCount
        return answer(current)
      }
    }
    if (path.startsWith('/api/v1/admin/courses/') && path.includes('/mentors/')) {
      const parts = path.split('/').slice(5)
      const mentorId = parts[2]
      if (method === 'GET')
        return answer(
          state.mentorStrengths[mentorId] ?? {
            mentorId,
            fullName: 'Mentor QA',
            categoryIds: [],
            subjectNames: [],
          }
        )
      const wanted = (body.categoryIds as string[]) ?? []
      const names = wanted.map((id) => state.categories.find((category) => category.id === id)?.name)
      if (names.some((name) => !name)) return answer(null, 404, 'Category not found.')
      state.mentorStrengths[mentorId] = {
        mentorId,
        fullName: 'Mentor QA',
        categoryIds: wanted,
        subjectNames: names as string[],
      }
      state.groups.forEach((candidate) =>
        candidate.mentors
          .filter((mentor) => mentor.id === mentorId)
          .forEach((mentor) => (mentor.strongSubjects = names as string[]))
      )
      return answer(state.mentorStrengths[mentorId])
    }
    if (path.startsWith('/api/v1/users/') && /^[0-9a-f-]{36}$/.test(path.split('/').at(-1) ?? '')) {
      const id = path.split('/').at(-1)!
      if (method === 'GET') return answer(state.users[id] ?? userProfile({ id }))
      if (method === 'PUT') {
        const current = state.users[id] ?? userProfile({ id })
        const emailChanged = current.email !== body.email
        Object.assign(current, {
          firstName: String(body.firstName),
          lastName: String(body.lastName),
          displayName: `${String(body.firstName)} ${String(body.lastName)}`.trim(),
          email: String(body.email),
          phone: (body.phone as string) || null,
          emailVerified: emailChanged ? false : current.emailVerified,
        })
        state.users[id] = current
        return answer(current)
      }
    }
    if (path === '/api/v1/admin/orders') {
      const status = url.searchParams.get('status')
      const courseId = url.searchParams.get('courseId')
      const reference = (url.searchParams.get('reference') ?? '').toLowerCase()
      const content = state.orders.filter(
        (order) =>
          (!status || order.status === status) &&
          (!courseId || order.items.some((item) => item.courseId === courseId)) &&
          (!reference ||
            order.orderCode.toLowerCase().includes(reference) ||
            (order.paymentCode ?? '').toLowerCase().includes(reference))
      )
      return answer(pageOf(content))
    }
    if (path.startsWith('/api/v1/admin/orders/')) {
      const parts = path.split('/').slice(5)
      const order = state.orders.find((item) => item.id === parts[0])
      if (!order) return answer(null, 404, 'Order not found.')
      if (parts.length === 1 && method === 'GET') return answer(order)
      if (parts[1] === 'cancel' && method === 'POST') {
        if (order.status === 'PAID' || order.status === 'CANCELLED')
          return answer(null, 409, 'This order is no longer awaiting payment.')
        order.status = 'CANCELLED'
        order.cancelledByEmail = `${role.toLowerCase()}@example.invalid`
        order.cancelledAt = STAMP
        return answer(order)
      }
      if (parts[1] === 'confirm-payment' && method === 'POST') {
        const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
        if (!reason)
          return answer(null, 400, 'A reason is required when confirming a payment by hand.')
        if (order.status === 'PAID') return answer(null, 409, 'This order has already been paid.')
        const received =
          typeof body.receivedAmount === 'number' ? body.receivedAmount : order.totalAmount
        order.payments.push(
          paymentRow({
            id: nextId('90000000'),
            provider: 'MANUAL',
            amount: received,
            manual: true,
            confirmedByEmail: 'admin@example.invalid',
            confirmReason: reason,
            transactionNo: null,
            sepayTransactionId: null,
            bankCode: null,
            payDate: null,
          })
        )
        order.status = 'PAID'
        order.paidAt = STAMP
        order.confirmedByEmail = 'admin@example.invalid'
        order.confirmReason = reason
        order.confirmedAt = STAMP
        return answer(order)
      }
    }
    if (path === '/api/v1/admin/enrollments') {
      if (method === 'GET') {
        const studentId = url.searchParams.get('studentId')
        const courseId = url.searchParams.get('courseId')
        const status = url.searchParams.get('status')
        const type = url.searchParams.get('type')
        const content = state.enrollments.filter(
          (row) =>
            (!studentId || row.studentId === studentId) &&
            (!courseId || row.courseId === courseId) &&
            (!status || row.status === status) &&
            (!type || row.enrollmentType === type)
        )
        return answer(pageOf(content))
      }
      const studentId = String(body.studentId)
      const courseId = String(body.courseId)
      const course = state.courses.find((item) => item.id === courseId)
      if (!course) return answer(null, 404, 'Course not found.')
      if (
        state.enrollments.some(
          (row) => row.studentId === studentId && row.courseId === courseId && row.status === 'ACTIVE'
        )
      )
        return answer(null, 409, 'This student already has an active enrollment on the course.')
      const created = enrollmentRow({
        id: nextId('80000000'),
        studentId,
        courseId,
        courseTitle: course.title,
        courseType: course.courseType,
        status: 'ACTIVE',
        enrollmentType: 'ADMIN_ENROLLED',
        progressPercentage: 0,
      })
      state.enrollments.unshift(created)
      return answer(created)
    }
    if (path.startsWith('/api/v1/admin/enrollments/')) {
      const parts = path.split('/').slice(5)
      const row = state.enrollments.find((item) => item.id === parts[0])
      if (!row) return answer(null, 404, 'Enrollment not found.')
      if (parts[1] === 'status' && method === 'PATCH') {
        row.status = body.status as EnrollmentAdmin['status']
        row.updatedAt = STAMP
        return answer(row)
      }
      if (parts[1] === 'expiry' && method === 'PATCH') {
        row.expiresAt = (body.expiresAt as string | null) ?? null
        row.updatedAt = STAMP
        return answer(row)
      }
    }
    if (path.startsWith('/api/v1/courses/') && path.includes('/chapters')) {
      const parts = path.split('/').slice(4)
      const courseId = parts[0]
      const rows = () => state.chapters.filter((chapter) => chapter.courseId === courseId)
      if (parts[1] === 'chapters' && parts.length === 2) {
        if (method === 'GET') return answer(rows())
        if (method === 'POST') {
          const chapter: ChapterAdmin = {
            id: nextId('90000000'),
            courseId,
            title: String(body.title),
            description: (body.description as string | null) ?? null,
            sequence: rows().length + 1,
            published: false,
            updatedAt: STAMP,
          }
          state.chapters.push(chapter)
          return answer(chapter)
        }
      }
      if (parts[1] === 'chapters' && parts[2] === 'order' && method === 'PUT') {
        ;(body.ids as string[]).forEach((id, index) => {
          const chapter = state.chapters.find((item) => item.id === id)
          if (chapter) chapter.sequence = index + 1
        })
        return answer(rows())
      }
      if (parts[1] === 'chapters') {
        const chapter = state.chapters.find((item) => item.id === parts[2])
        if (!chapter) return answer(null, 404, 'Chapter does not belong to this course.')
        if (parts.length === 3) {
          if (method === 'PUT') {
            Object.assign(chapter, {
              title: String(body.title),
              description: (body.description as string | null) ?? null,
            })
            return answer(chapter)
          }
          if (method === 'DELETE') {
            state.chapters = state.chapters.filter((item) => item !== chapter)
            delete state.lessons[chapter.id]
            return answer(null)
          }
        }
        if (parts[3] === 'published' && method === 'PATCH') {
          chapter.published = Boolean(body.published)
          return answer(chapter)
        }
      }
    }
    if (path.startsWith('/api/v1/chapters/') && path.includes('/lessons')) {
      const parts = path.split('/').slice(4)
      const chapterId = parts[0]
      const rows = () => state.lessons[chapterId] ?? []
      if (parts[1] === 'lessons' && parts.length === 2) {
        if (method === 'GET') return answer(rows())
        if (method === 'POST') {
          const lesson: LessonAdmin = {
            id: nextId('91000000'),
            chapterId,
            title: String(body.title),
            description: (body.description as string | null) ?? null,
            contentType: (body.contentType as LessonAdmin['contentType']) ?? 'TEXT',
            content: (body.content as string | null) ?? null,
            videoUrl: (body.videoUrl as string | null) ?? null,
            durationSeconds: (body.durationSeconds as number | null) ?? null,
            sequence: rows().length + 1,
            published: false,
            preview: false,
            instructorContent: (body.instructorContent as string | null) ?? null,
            instructorNotes: (body.instructorNotes as string | null) ?? null,
            updatedAt: STAMP,
          }
          state.lessons[chapterId] = [...rows(), lesson]
          return answer(lesson)
        }
      }
      if (parts[1] === 'lessons' && parts[2] === 'order' && method === 'PUT') {
        const current = rows()
        ;(body.ids as string[]).forEach((id, index) => {
          const lesson = current.find((item) => item.id === id)
          if (lesson) lesson.sequence = index + 1
        })
        state.lessons[chapterId] = current
        return answer(current)
      }
      if (parts[1] === 'lessons') {
        const current = rows()
        const lesson = current.find((item) => item.id === parts[2])
        if (!lesson) return answer(null, 404, 'Lesson not found.')
        if (parts.length === 3) {
          if (method === 'PUT') {
            Object.assign(lesson, {
              title: String(body.title),
              description: (body.description as string | null) ?? null,
              content: (body.content as string | null) ?? null,
              videoUrl: (body.videoUrl as string | null) ?? null,
              durationSeconds: (body.durationSeconds as number | null) ?? null,
              instructorContent: (body.instructorContent as string | null) ?? null,
              instructorNotes: (body.instructorNotes as string | null) ?? null,
            })
            return answer(lesson)
          }
          if (method === 'DELETE') {
            state.lessons[chapterId] = current.filter((item) => item !== lesson)
            return answer(null)
          }
        }
        if (parts[3] === 'published' && method === 'PATCH') {
          lesson.published = Boolean(body.published)
          lesson.preview = Boolean(body.preview)
          return answer(lesson)
        }
      }
    }
    state.unmatchedRequests.push(`${method} ${request.url()}`)
    return answer(null, 501, `Unexpected fixture route: ${method} ${path}`)
  })
  return state
}
