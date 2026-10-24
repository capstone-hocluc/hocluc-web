import type { Page } from '@playwright/test'
import type { UserRole } from '../../src/services/userService'
import type { TeacherQuizRecord, TeacherQuizQuestion, TeacherQuizType, TeacherQuizSection } from '../../src/services/teacherQuizService'

export const QUIZ_IDS = {
  user: '40000000-0000-0000-0000-000000000001',
  course: '10000000-0000-0000-0000-000000000001',
  otherCourse: '10000000-0000-0000-0000-000000000002',
  chapter: '20000000-0000-0000-0000-000000000001',
  lesson: '30000000-0000-0000-0000-000000000001',
  otherChapter: '20000000-0000-0000-0000-000000000002',
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
const record = (id: string, title: string, type: TeacherQuizType, courseId = QUIZ_IDS.course): TeacherQuizRecord => ({
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
export async function installQuizFixture(page: Page, role: UserRole, { authenticated = true } = {}) {
  const state = {
    role, deniedQuiz: '', denyNextWrite: false, denyNextOrder: false, nextQuestion: 2,
    denyWriteStatus: 403, denyWriteMessage: 'Không có quyền ghi quiz.',
    requests: [] as Array<{ method: string; path: string; query: string; body: Record<string, unknown>; role: string }>,
    unmatched: [] as string[], pageErrors: [] as string[],
    quizzes: [record(QUIZ_IDS.quiz, 'Quiz được giao', 'QUICK'), record(QUIZ_IDS.exam, 'Đề thi được giao', 'EXAM'),
      record(QUIZ_IDS.otherQuiz, 'Quiz ngoài phân công', 'QUICK', QUIZ_IDS.otherCourse)],
    questions: [question()],
    sections: [] as TeacherQuizSection[],
    activeStudentQuizId: QUIZ_IDS.quiz,
    writeGate: null as Promise<void> | null,
    studentStatus: 'IN_PROGRESS', studentOption: '', studentLockReason: null as string | null,
  }
  page.on('pageerror', error => state.pageErrors.push(error.message))
  if (authenticated) await page.addInitScript((token) => {
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
      headers: path.startsWith('/api/v1/auth/') ? { 'access-control-allow-origin': 'http://127.0.0.1:5174', 'access-control-allow-credentials': 'true' } : undefined,
      body: JSON.stringify({ success: status < 400, status, data, message }) })
    if (path === '/api/v1/auth/refresh') return answer(null, 401, 'No refresh cookie')
    if (path === '/api/v1/auth/logout') return answer(null)
    if (path === '/api/v1/notifications/unread-count') return answer({ unread: 0 })
    if (path === '/api/v1/users/profiles') return answer({ id: QUIZ_IDS.user, role: activeRole,
      roles: ['STAFF', 'MANAGER', 'ADMINISTRATOR', 'TEACHER', 'STUDENT'], displayName: 'Quiz QA', firstName: 'Quiz', lastName: 'QA',
      email: 'quiz@example.invalid', status: 'ACTIVE', emailVerified: true, studentProfile: null })
    if (path === '/api/v1/auth/switch-role') {
      state.role = body.role as UserRole
      return answer({ accessToken: quizToken(state.role) })
    }
    if (activeRole === 'STUDENT' && path.startsWith('/api/v1/assessments/')) {
      const placement = state.quizzes.filter(q => q.type === 'PLACEMENT' && q.status === 'PUBLISHED')
        .sort((a,b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!))[0]
      if (path === '/api/v1/assessments/placement') return placement ? answer({ ...placement,
        questions: state.questions.map(q => ({ ...q, options: q.options.map(o => ({ ...o, optionText: o.text })) })) }) : answer(null, 404, 'No placement quiz has been published yet.')
      if (path === '/api/v1/assessments/placement/attempts/me') return answer(state.studentStatus === 'GRADED' ? [{ attemptId: QUIZ_IDS.attempt, status: 'GRADED', attemptNumber: 1, percentage: 100, startedAt: stamp, submittedAt: stamp }] : [])
      if (path === '/api/v1/assessments/results/me') return answer({ id: 'result-fixture', totalQuestions: state.questions.length, correctCount: state.questions.length,
        wrongCount: 0, score: state.questions.length, overallPercentage: 100, timeSpentSeconds: 60, level: 'ADVANCED',
        categories: state.questions.some(q => q.categoryId) ? [{ categoryId: 'category-1', categoryName: 'Toán', correctCount: 1, wrongCount: 0, totalCount: 1, score: 1, percentage: 100 }] : [],
        weakCategoryName: null, strongCategoryName: null })
      if (path.endsWith('/answers')) { state.studentOption = body.selectedOptionId as string; return answer(null) }
      if (path.endsWith('/submit')) { state.studentStatus = 'GRADED'; return answer({ attemptId: QUIZ_IDS.attempt, percentage: 100 }) }
      if (path.endsWith('/review')) return answer({ attemptId: QUIZ_IDS.attempt, quizId: state.activeStudentQuizId, quizTitle: 'Quiz Student', totalQuestions: 1, correctCount: 1, overallPercentage: 100, questions: [] })
      if (path.endsWith('/attempts') && method === 'POST') {
        if (path.includes('/placement/') && !placement) return answer(null, 404, 'No placement quiz has been published yet.')
        state.activeStudentQuizId = path.includes('/placement/') ? placement.id : QUIZ_IDS.quiz
        return answer({ attemptId: QUIZ_IDS.attempt, quizId: state.activeStudentQuizId, resumed: false, deadlineAt: '2100-01-01T00:00:00Z' })
      }
      if (path.includes('/attempts/')) return answer({ attemptId: QUIZ_IDS.attempt, quizId: state.activeStudentQuizId, status: state.studentStatus,
        attemptNumber: 1, startedAt: stamp, deadlineAt: '2100-01-01T00:00:00Z', remainingSeconds: 1800,
        totalQuestions: 1, answeredCount: state.studentOption ? 1 : 0,
        answers: state.studentOption ? [{ questionId: QUIZ_IDS.question, selectedOptionId: state.studentOption }] : [] })
      return answer({ ...state.quizzes[0], title: 'Quiz Student', locked: Boolean(state.studentLockReason), lockReason: state.studentLockReason, attemptsUsed: 0,
        showAnswers: true, inProgressAttemptId: null, attempts: [], questions: [{ id: QUIZ_IDS.question,
          questionText: 'Câu hỏi Student', questionType: 'SINGLE_CHOICE', sequence: 1, imageUrl: null,
          options: [{ id: 'option-A', optionText: 'Đáp án Student', sequence: 1 }] }] })
    }
    if (activeRole === 'STUDENT' && path === '/api/v1/courses/main/suggested') return answer([])
    const writer = ['ADMINISTRATOR', 'STAFF', 'MANAGER'].includes(activeRole)
    if (!writer && activeRole !== 'TEACHER') return answer(null, 403, 'Forbidden')
    if (method !== 'GET') {
      if (!writer || state.denyNextWrite) { state.denyNextWrite = false; return answer(null, writer ? state.denyWriteStatus : 403, state.denyWriteMessage) }
      if (state.writeGate) await state.writeGate
    }
    const course = (id: string) => ({ id, title: id === QUIZ_IDS.course ? 'Khóa được phân công' : 'Khóa nháp ngoài phân công',
      courseType: 'MAIN', status: 'DRAFT', phases: [], sections: [], instructors: [], paid: false, price: 0, updatedAt: stamp })
    if (path === '/api/v1/categories') return answer([{ id: 'category-1', name: 'Toán', active: true, parentId: null, sortOrder: 1 }])
    if (path === '/api/v1/admin/courses') return answer({
      content: (writer ? [QUIZ_IDS.course, QUIZ_IDS.otherCourse] : [QUIZ_IDS.course]).map(course),
      pageNumber: 0, pageSize: 100, totalPages: 1, totalElements: writer ? 2 : 1, isLast: true,
    })
    const courseMatch = path.match(/^\/api\/v1\/admin\/courses\/([^/]+)$/)
    if (courseMatch) return !writer && courseMatch[1] !== QUIZ_IDS.course ? answer(null, 403, 'Not assigned') : answer(course(courseMatch[1]))
    if (path.endsWith('/content-sections')) return answer([])
    if (path === `/api/v1/courses/${QUIZ_IDS.course}/chapters`) return answer([{ id: QUIZ_IDS.chapter,
      courseId: QUIZ_IDS.course, title: 'Chương nháp', published: false, sequence: 1, updatedAt: stamp, sectionId: null },
      { id: QUIZ_IDS.otherChapter, courseId: QUIZ_IDS.course, title: 'Chương chưa có bài', published: false, sequence: 2, updatedAt: stamp, sectionId: null }])
    if (path === `/api/v1/courses/${QUIZ_IDS.otherCourse}/chapters`) return answer([])
    if (path === `/api/v1/chapters/${QUIZ_IDS.otherChapter}/lessons`) return answer([])
    if (path === `/api/v1/chapters/${QUIZ_IDS.chapter}/lessons`) return answer([{ id: QUIZ_IDS.lesson,
      chapterId: QUIZ_IDS.chapter, title: 'Bài nháp', published: false, sequence: 1, updatedAt: stamp, contentType: 'TEXT' }])
    if (path === '/api/v1/teacher/quizzes' && method === 'GET') return answer(state.quizzes.filter(q =>
      (writer || q.courseId === QUIZ_IDS.course) && (!url.searchParams.get('courseId') || q.courseId === url.searchParams.get('courseId'))))
    if (path === '/api/v1/teacher/quizzes' && method === 'POST') {
      if (['QUICK', 'LESSON'].includes(body.type) && (body.lessonId !== QUIZ_IDS.lesson || body.chapterId || body.courseId)) return answer(null, 400, 'Invalid lesson target')
      if (body.type === 'CHAPTER' && (![QUIZ_IDS.chapter, QUIZ_IDS.otherChapter].includes(body.chapterId) || body.lessonId || body.courseId)) return answer(null, 400, 'Invalid chapter target')
      const created = { ...record('50000000-0000-0000-0000-000000000004', body.title as string, body.type as TeacherQuizType), ...body }
      if (body.type === 'PLACEMENT') {
        Object.assign(created, { courseId: null, courseTitle: null, chapterId: null, chapterTitle: null, lessonId: null, lessonTitle: null,
          passingPercentage: null, showAnswers: false, practiceAllowed: false, questionCount: 0, createdAt: '2026-10-20T00:00:00Z' })
        state.questions = []; state.sections = []
      }
      if (body.type === 'LESSON') { created.lessonId = QUIZ_IDS.lesson; created.lessonTitle = 'Bài nháp' }
      if (body.type === 'CHAPTER') { created.lessonId = null; created.lessonTitle = null; created.chapterTitle = body.chapterId === QUIZ_IDS.otherChapter ? 'Chương chưa có bài' : 'Chương nháp' }
      state.quizzes.push(created); return answer(created)
    }
    const match = path.match(/^\/api\/v1\/teacher\/quizzes\/([^/]+)(?:\/(.+))?$/)
    if (match) {
      const q = state.quizzes.find(item => item.id === match[1]), action = match[2]
      if (!q) return answer(null, 404, 'Not found')
      if (state.deniedQuiz === q.id || (!writer && q.courseId !== QUIZ_IDS.course)) return answer(null, 403, 'Không được phân công khóa này.')
      if (!action && method === 'GET') return answer({ quiz: q, sections: q.type === 'PLACEMENT' ? state.sections : [], groups: [], questions: state.questions, pages: [], latestJob: null })
      if (!action && method === 'PUT') { Object.assign(q, body); return answer(q) }
      if (!action && method === 'DELETE') { state.quizzes = state.quizzes.filter(item => item.id !== q.id); return answer(null) }
      if (action === 'publish' || action === 'unpublish') { q.status = action === 'publish' ? 'PUBLISHED' : q.attemptCount ? 'ARCHIVED' : 'DRAFT'; return answer(q) }
      if (action === 'duplicate') { const copy = { ...q, id: '50000000-0000-0000-0000-000000000005', title: `${q.title} bản sao`, status: 'DRAFT' as const }; state.quizzes.push(copy); return answer(copy) }
      if (action === 'questions' && method === 'POST') {
        const added = (body.questions as TeacherQuizQuestion[]).map((v, index) => ({ ...question(), ...v,
          id: `60000000-0000-0000-0000-${String(state.nextQuestion++).padStart(12, '0')}`,
          sequence: state.questions.length + index + 1,
          options: v.options.map((o, i) => ({ ...o, id: `option-${i}`, label: String.fromCharCode(65 + i), sequence: i + 1 })),
        }))
        state.questions.push(...added)
        q.questionCount = state.questions.length
        return answer(added)
      }
      if (action === 'sections' && method === 'PUT') {
        state.sections = (body.sections as Array<{title: string; fromQuestion?: number; toQuestion?: number}>).map((section,index) => ({
          id: `section-${index}`, title: section.title, sequence: index + 1, parentId: null, categoryId: null, categoryName: null, suggestedMinutes: null, children: [],
          firstQuestion: section.fromQuestion ?? 0, lastQuestion: section.toQuestion ?? 0,
          questionCount: section.fromQuestion && section.toQuestion ? section.toQuestion - section.fromQuestion + 1 : 0,
        }))
        state.questions = state.questions.map(question => ({ ...question, sectionId: state.sections.find(section => question.sequence >= section.firstQuestion && question.sequence <= section.lastQuestion)?.id ?? null }))
        return answer(state.sections)
      }
      if (action === 'questions/order' && method === 'PUT') {
        if (state.denyNextOrder) { state.denyNextOrder = false; return answer(null, 403, 'Không có quyền sắp xếp câu hỏi.') }
        if (q.locked || q.attemptCount > 0) return answer(null, 409, 'Quiz đã có lượt làm.')
        const ids = body.questionIds as string[]
        if (ids.length !== state.questions.length || new Set(ids).size !== ids.length || ids.some(id => !state.questions.some(question => question.id === id))) return answer(null, 400, 'Phải gửi đầy đủ câu hỏi một lần.')
        state.questions = ids.map((id, index) => ({ ...state.questions.find(question => question.id === id)!, sequence: index + 1 }))
        return answer(state.questions)
      }
      if (action === 'questions/reviewed') { q.needsReviewCount = 0; state.questions.forEach(item => { item.needsReview = false }); return answer({ reviewed: 1 }) }
      if (action === 'stats') return answer({ quizId: q.id, gradedAttempts: 1, inProgressAttempts: 0, practiceAttempts: 0, averagePercentage: 100, passRate: 100 })
      if (action === 'attempts') return answer([{ attemptId: QUIZ_IDS.attempt, studentName: 'Student QA', studentEmail: 'student@example.invalid', mode: 'EXAM', status: 'GRADED', attemptNumber: 1, startedAt: stamp, submittedAt: stamp, autoSubmitted: false, percentage: 100, correctCount: 1, totalQuestions: 1, passed: true, timeSpentSeconds: 60 }])
    }
    const questionMatch = path.match(/^\/api\/v1\/teacher\/questions\/([^/]+)$/)
    if (questionMatch && method === 'PUT') {
      const index = state.questions.findIndex(question => question.id === questionMatch[1])
      if (index < 0) return answer(null, 404, 'Question not found')
      state.questions[index] = { ...state.questions[index], ...body } as TeacherQuizQuestion
      if (body.options) state.questions[index].options = (body.options as TeacherQuizQuestion['options']).map((option, index) => ({
        ...option, id: `option-${index}`, label: String.fromCharCode(65 + index), sequence: index + 1,
      }))
      return answer(state.questions[index])
    }
    if (path === `/api/v1/teacher/attempts/${QUIZ_IDS.attempt}`) return answer({ attemptId: QUIZ_IDS.attempt,
      quizId: QUIZ_IDS.quiz, quizTitle: 'Quiz được giao', totalQuestions: 1, correctCount: 1, overallPercentage: 100, questions: [] })
    state.unmatched.push(`${method} ${path}`)
    return answer(null, 501, 'Fixture has no handler')
  })
  return state
}
