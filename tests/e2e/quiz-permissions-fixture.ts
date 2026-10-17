import type { Page } from '@playwright/test'
import type { UserRole } from '../../src/services/userService'
import type { TeacherQuizRecord, TeacherQuizQuestion } from '../../src/services/teacherQuizService'

export const QUIZ_IDS = {
  user: '40000000-0000-0000-0000-000000000001',
  course: '10000000-0000-0000-0000-000000000001',
  otherCourse: '10000000-0000-0000-0000-000000000002',
  chapter: '20000000-0000-0000-0000-000000000001',
  lesson: '30000000-0000-0000-0000-000000000001',
  quiz: '50000000-0000-0000-0000-000000000001',
  exam: '50000000-0000-0000-0000-000000000002',
  otherQuiz: '50000000-0000-0000-0000-000000000003',
  question: '60000000-0000-0000-0000-000000000001',
  attempt: '70000000-0000-0000-0000-000000000001',
}
const stamp = '2026-10-17T00:00:00Z'
export const quizToken = (role: UserRole) => `fixture.${Buffer.from(JSON.stringify({
  // AuthServiceImpl.issueTokens signs authorities (ROLE_STAFF), not profile enums (STAFF).
  sub: QUIZ_IDS.user, role: `ROLE_${role}`, exp: 4102444800,
})).toString('base64url')}.fixture`
const record = (id: string, title: string, type: 'QUICK' | 'EXAM', courseId = QUIZ_IDS.course): TeacherQuizRecord => ({
  id, title, type, courseId, courseTitle: 'Khóa được phân công', status: 'DRAFT',
  description: null, chapterId: QUIZ_IDS.chapter, chapterTitle: 'Chương nháp',
  lessonId: type === 'QUICK' ? QUIZ_IDS.lesson : null, lessonTitle: type === 'QUICK' ? 'Bài nháp' : null,
  durationMinutes: 30, maxAttempts: 2, passingPercentage: 60, showAnswers: false,
  availableFrom: null, availableUntil: null, practiceAllowed: true, examFileUrl: null,
  pageCount: 0, questionCount: 1, missingAnswerCount: 0, needsReviewCount: 0,
  attemptCount: 0, locked: false, publishProblems: [], createdById: QUIZ_IDS.user,
  createdAt: stamp, updatedAt: stamp,
})
const question = (): TeacherQuizQuestion => ({
  id: QUIZ_IDS.question, sequence: 1, sectionId: null, groupId: null,
  questionText: 'Câu hỏi được phân công', questionType: 'SINGLE_CHOICE', difficulty: null,
  categoryId: null, categoryName: null, explanation: 'Giải thích được phép đọc', imageUrl: null,
  sourcePage: null, marks: null, needsReview: false, reviewNote: null, correctLabels: 'A',
  options: ['A', 'B'].map((label, index) => ({ id: `option-${label}`, label, sequence: index + 1, text: `Lựa chọn ${label}`, correct: index === 0 })),
})

/** Browser tests with BE-shaped, fail-closed fixtures; never a live BE authorization test. */
export async function installQuizFixture(page: Page, role: UserRole) {
  const state = {
    role, deniedQuiz: '', denyNextWrite: false,
    requests: [] as Array<{ method: string; path: string; query: string; body: Record<string, unknown>; role: string }>,
    unmatched: [] as string[], pageErrors: [] as string[],
    quizzes: [record(QUIZ_IDS.quiz, 'Quiz được giao', 'QUICK'), record(QUIZ_IDS.exam, 'Đề thi được giao', 'EXAM'),
      record(QUIZ_IDS.otherQuiz, 'Quiz ngoài phân công', 'QUICK', QUIZ_IDS.otherCourse)],
    questions: [question()],
    writeGate: null as Promise<void> | null,
    studentStatus: 'IN_PROGRESS', studentOption: '',
  }
  page.on('pageerror', error => state.pageErrors.push(error.message))
  await page.addInitScript((token) => {
    if (!localStorage.getItem('hocluc.accessToken')) localStorage.setItem('hocluc.accessToken', token)
  }, quizToken(role))
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!path.startsWith('/api/')) {
      if (url.origin === 'http://127.0.0.1:5174') return route.continue()
      if (['xhr', 'fetch'].includes(request.resourceType())) state.unmatched.push(request.url())
      return route.abort('blockedbyclient')
    }
    const method = request.method(), body = request.postDataJSON() ?? {}
    const auth = request.headers()['authorization']?.split(' ')[1]
    let activeRole = ''
    try { activeRole = JSON.parse(Buffer.from(auth!.split('.')[1], 'base64url').toString()).role.replace(/^ROLE_/, '') } catch { /* rejected below */ }
    state.requests.push({ method, path, query: url.search, body, role: activeRole })
    const answer = (data: unknown, status = 200, message = 'OK') => route.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify({ success: status < 400, status, data, message }) })
    if (path === '/api/v1/users/profiles') return answer({ id: QUIZ_IDS.user, role: activeRole,
      roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR', 'TEACHER'], displayName: 'Quiz QA', firstName: 'Quiz', lastName: 'QA',
      email: 'quiz@example.invalid', status: 'ACTIVE', emailVerified: true, studentProfile: null })
    if (path === '/api/v1/auth/switch-role') {
      state.role = body.role as UserRole
      return answer({ accessToken: quizToken(state.role), refreshToken: 'fixture-refresh' })
    }
    if (activeRole === 'STUDENT' && path.startsWith('/api/v1/assessments/')) {
      if (path.endsWith('/answers')) { state.studentOption = body.selectedOptionId as string; return answer(null) }
      if (path.endsWith('/submit')) { state.studentStatus = 'GRADED'; return answer({ attemptId: QUIZ_IDS.attempt, percentage: 100 }) }
      if (path.endsWith('/review')) return answer({ attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, quizTitle: 'Quiz Student', totalQuestions: 1, correctCount: 1, overallPercentage: 100, questions: [] })
      if (path.endsWith('/attempts') && method === 'POST') return answer({ attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, resumed: false, deadlineAt: '2100-01-01T00:00:00Z' })
      if (path.includes('/attempts/')) return answer({ attemptId: QUIZ_IDS.attempt, quizId: QUIZ_IDS.quiz, status: state.studentStatus,
        attemptNumber: 1, startedAt: stamp, deadlineAt: '2100-01-01T00:00:00Z', remainingSeconds: 1800,
        totalQuestions: 1, answeredCount: state.studentOption ? 1 : 0,
        answers: state.studentOption ? [{ questionId: QUIZ_IDS.question, selectedOptionId: state.studentOption }] : [] })
      return answer({ ...state.quizzes[0], title: 'Quiz Student', locked: false, attemptsUsed: 0,
        showAnswers: true, inProgressAttemptId: null, attempts: [], questions: [{ id: QUIZ_IDS.question,
          questionText: 'Câu hỏi Student', questionType: 'SINGLE_CHOICE', sequence: 1, imageUrl: null,
          options: [{ id: 'option-A', optionText: 'Đáp án Student', sequence: 1 }] }] })
    }
    const writer = ['ADMINISTRATOR', 'STAFF', 'MANAGER'].includes(activeRole)
    if (!writer && activeRole !== 'TEACHER') return answer(null, 403, 'Forbidden')
    if (method !== 'GET') {
      if (!writer || state.denyNextWrite) { state.denyNextWrite = false; return answer(null, 403, 'Không có quyền ghi quiz.') }
      if (state.writeGate) await state.writeGate
    }
    const course = (id: string) => ({ id, title: id === QUIZ_IDS.course ? 'Khóa được phân công' : 'Khóa nháp ngoài phân công',
      courseType: 'MAIN', status: 'DRAFT', phases: [], sections: [], instructors: [], paid: false, price: 0, updatedAt: stamp })
    if (path === '/api/v1/admin/courses') return answer({
      content: (writer ? [QUIZ_IDS.course, QUIZ_IDS.otherCourse] : [QUIZ_IDS.course]).map(course),
      pageNumber: 0, pageSize: 100, totalPages: 1, totalElements: writer ? 2 : 1, isLast: true,
    })
    const courseMatch = path.match(/^\/api\/v1\/admin\/courses\/([^/]+)$/)
    if (courseMatch) return !writer && courseMatch[1] !== QUIZ_IDS.course ? answer(null, 403, 'Not assigned') : answer(course(courseMatch[1]))
    if (path.endsWith('/content-sections')) return answer([])
    if (path === `/api/v1/courses/${QUIZ_IDS.course}/chapters`) return answer([{ id: QUIZ_IDS.chapter,
      courseId: QUIZ_IDS.course, title: 'Chương nháp', published: false, sequence: 1, updatedAt: stamp, sectionId: null }])
    if (path === `/api/v1/chapters/${QUIZ_IDS.chapter}/lessons`) return answer([{ id: QUIZ_IDS.lesson,
      chapterId: QUIZ_IDS.chapter, title: 'Bài nháp', published: false, sequence: 1, updatedAt: stamp, contentType: 'TEXT' }])
    if (path === '/api/v1/teacher/quizzes' && method === 'GET') return answer(state.quizzes.filter(q =>
      (writer || q.courseId === QUIZ_IDS.course) && (!url.searchParams.get('courseId') || q.courseId === url.searchParams.get('courseId'))))
    if (path === '/api/v1/teacher/quizzes' && method === 'POST') {
      const created = { ...record('50000000-0000-0000-0000-000000000004', body.title as string, body.type as 'QUICK' | 'EXAM'), ...body }
      state.quizzes.push(created); return answer(created)
    }
    const match = path.match(/^\/api\/v1\/teacher\/quizzes\/([^/]+)(?:\/(.+))?$/)
    if (match) {
      const q = state.quizzes.find(item => item.id === match[1]), action = match[2]
      if (!q) return answer(null, 404, 'Not found')
      if (state.deniedQuiz === q.id || (!writer && q.courseId !== QUIZ_IDS.course)) return answer(null, 403, 'Không được phân công khóa này.')
      if (!action && method === 'GET') return answer({ quiz: q, sections: [], groups: [], questions: state.questions, pages: [], latestJob: null })
      if (!action && method === 'PUT') { Object.assign(q, body); return answer(q) }
      if (!action && method === 'DELETE') { state.quizzes = state.quizzes.filter(item => item.id !== q.id); return answer(null) }
      if (action === 'publish' || action === 'unpublish') { q.status = action === 'publish' ? 'PUBLISHED' : q.attemptCount ? 'ARCHIVED' : 'DRAFT'; return answer(q) }
      if (action === 'duplicate') { const copy = { ...q, id: '50000000-0000-0000-0000-000000000005', title: `${q.title} bản sao`, status: 'DRAFT' as const }; state.quizzes.push(copy); return answer(copy) }
      if (action === 'questions' && method === 'POST') { state.questions = (body.questions as TeacherQuizQuestion[]).map((v, index) => ({ ...question(), ...v, id: QUIZ_IDS.question, sequence: index + 1, options: v.options.map((o, i) => ({ ...o, id: `option-${i}`, label: String.fromCharCode(65 + i), sequence: i + 1 })) })); return answer(state.questions) }
      if (action === 'questions/reviewed') { q.needsReviewCount = 0; state.questions.forEach(item => { item.needsReview = false }); return answer({ reviewed: 1 }) }
      if (action === 'stats') return answer({ quizId: q.id, gradedAttempts: 1, inProgressAttempts: 0, practiceAttempts: 0, averagePercentage: 100, passRate: 100 })
      if (action === 'attempts') return answer([{ attemptId: QUIZ_IDS.attempt, studentName: 'Student QA', studentEmail: 'student@example.invalid', mode: 'EXAM', status: 'GRADED', attemptNumber: 1, startedAt: stamp, submittedAt: stamp, autoSubmitted: false, percentage: 100, correctCount: 1, totalQuestions: 1, passed: true, timeSpentSeconds: 60 }])
    }
    if (path === `/api/v1/teacher/questions/${QUIZ_IDS.question}` && method === 'PUT') {
      state.questions[0] = { ...state.questions[0], ...body } as TeacherQuizQuestion
      if (body.options) state.questions[0].options = (body.options as TeacherQuizQuestion['options']).map((option, index) => ({
        ...option, id: `option-${index}`, label: String.fromCharCode(65 + index), sequence: index + 1,
      }))
      return answer(state.questions[0])
    }
    if (path === `/api/v1/teacher/attempts/${QUIZ_IDS.attempt}`) return answer({ attemptId: QUIZ_IDS.attempt,
      quizId: QUIZ_IDS.quiz, quizTitle: 'Quiz được giao', totalQuestions: 1, correctCount: 1, overallPercentage: 100, questions: [] })
    state.unmatched.push(`${method} ${path}`)
    return answer(null, 501, 'Fixture has no handler')
  })
  return state
}
