import { ApiError } from '../lib/api'
import { getPlacementAttemptHistory, getPlacementResult, getQuizAttemptHistory, type QuizAttemptSummary } from './assessmentService'
import { getCourseStudy, getMyCourses, type CourseStudy, type MyCourseEnrollment } from './courseService'
import { getErrorMessage } from '../lib/errors'

/** An absent placement is expected. Network, permission and server errors remain visible. */
export async function getLearningProfilePlacement() {
  try {
    return await getPlacementResult()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'PLACEMENT_RESULT_NOT_FOUND') return null
    throw error
  }
}

export async function getLearningProfileHistory() {
  try { return await getPlacementAttemptHistory() }
  catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'PLACEMENT_QUIZ_NOT_FOUND') return null
    throw error
  }
}

export interface LearningProfileCourse {
  enrollment: MyCourseEnrollment
  study: CourseStudy | null
  error: string | null
}

export interface LearningCourseQuiz {
  id: string
  title: string
  type: string
  best: number | null
  courseId: string
  courseTitle: string
}

export interface LearningQuizAttempt extends QuizAttemptSummary {
  quizId: string
  quizTitle: string
  quizType: string
}

let runningHistories = 0
const waitingHistories: (() => void)[] = []
async function loadQuizHistoryLimited(quizId: string) {
  if (runningHistories < 4) runningHistories++
  else await new Promise<void>(resolve => waitingHistories.push(resolve))
  try { return await getQuizAttemptHistory(quizId) }
  finally {
    const next = waitingHistories.shift()
    if (next) next()
    else runningHistories--
  }
}

/** The BE exposes history per quiz. Load only the selected scope, at most four at once. */
export async function getLearningQuizHistory(quizzes: LearningCourseQuiz[]) {
  const unique = [...new Map(quizzes.map(quiz => [quiz.id, quiz])).values()]
  const attempts: LearningQuizAttempt[] = []
  const failures: { quizId: string; title: string; message: string }[] = []
  let firstError: unknown
  for (let offset = 0; offset < unique.length; offset += 4) {
    const batch = unique.slice(offset, offset + 4)
    const results = await Promise.allSettled(batch.map(quiz => loadQuizHistoryLimited(quiz.id)))
    results.forEach((result, index) => {
      const quiz = batch[index]
      if (result.status === 'fulfilled') {
        attempts.push(...result.value.map(attempt => ({ ...attempt, quizId: quiz.id, quizTitle: quiz.title, quizType: quiz.type })))
      } else {
        firstError ??= result.reason
        failures.push({ quizId: quiz.id, title: quiz.title, message: getErrorMessage(result.reason) })
      }
    })
  }
  if (unique.length && failures.length === unique.length) throw firstError
  return { attempts, failures, loaded: unique.length - failures.length }
}

/** Deduplicate a quiz that may appear at chapter and lesson level in a course. */
export function getLearningCourseQuizzes(courses: LearningProfileCourse[]): LearningCourseQuiz[] {
  const quizzes = new Map<string, LearningCourseQuiz>()
  for (const { study, enrollment: { course } } of courses) {
    const source = study?.phases.flatMap(phase => phase.sections.flatMap(section => section.chapters.flatMap(chapter =>
      [...chapter.quizzes, ...chapter.lessons.flatMap(lesson => lesson.quizzes)]
    ))) ?? []
    for (const quiz of [...source, ...(study?.exams ?? [])]) {
      const key = `${course.id}:${quiz.id}`
      if (!quizzes.has(key)) quizzes.set(key, {
        id: quiz.id, title: quiz.title, type: quiz.type, best: quiz.bestPercentage ?? null,
        courseId: course.id, courseTitle: course.title,
      })
    }
  }
  return [...quizzes.values()]
}

/** Keep an individual course failure visible; bound concurrent study requests. */
export async function getLearningProfileCourses(): Promise<LearningProfileCourse[]> {
  const response = await getMyCourses()
  if (!Array.isArray(response.data)) throw new Error('Không thể tải danh sách khóa học.')
  const enrollments = [...new Map(response.data.map((item) => [item.course.id, item])).values()]
  // The ownership API exposes enrollment time, not order paidAt. Missing dates stay last.
  const timestamp = (value?: string) => {
    const parsed = Date.parse(value ?? '')
    return Number.isFinite(parsed) ? parsed : null
  }
  enrollments.sort((a, b) => {
    const first = timestamp(a.enrolledAt)
    const second = timestamp(b.enrolledAt)
    if (first === null) return second === null ? 0 : 1
    if (second === null) return -1
    return second - first
  })
  const courses: LearningProfileCourse[] = []
  for (let offset = 0; offset < enrollments.length; offset += 4) {
    const batch = enrollments.slice(offset, offset + 4)
    const results = await Promise.allSettled(batch.map(({ course }) => getCourseStudy(course.id)))
    results.forEach((result, index) => courses.push({
      enrollment: batch[index],
      study: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? getErrorMessage(result.reason) : null,
    }))
  }
  return courses
}
