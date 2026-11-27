import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import { dateTimeMillis, fromDateTimeLocal, type AssessmentType, type ExamSettings } from './exam-settings'

/** What a create request that got no clear answer asked for, so the exam list can be searched for its result. */
export interface PendingExamCreate {
  type: AssessmentType
  existingIds: Set<string>
  startedAt: number
  createdById: string | null
  title: string
  courseId: string
  durationMinutes: number
  maxAttempts: number
  passingPercentage: number | null
  showAnswers: boolean
  practiceAllowed: boolean
  availableFrom: number | null
  availableUntil: number | null
}

export function pendingExamCreate(
  type: AssessmentType,
  settings: ExamSettings,
  existing: TeacherQuizRecord[],
  createdById: string | null,
): PendingExamCreate {
  return {
    type,
    existingIds: new Set(existing.map((quiz) => quiz.id)),
    startedAt: Date.now(),
    createdById,
    title: settings.title.trim(),
    courseId: settings.courseId,
    durationMinutes: Number(settings.duration),
    maxAttempts: Number(settings.maxAttempts),
    passingPercentage: type === 'PLACEMENT' ? null : Number(settings.passingPercentage),
    showAnswers: settings.showAnswers,
    practiceAllowed: settings.practiceAllowed,
    availableFrom: dateTimeMillis(fromDateTimeLocal(settings.availableFrom)),
    availableUntil: dateTimeMillis(fromDateTimeLocal(settings.availableUntil)),
  }
}

/** Drafts made by the same person, after the request started, with exactly the settings it sent. */
export function findPendingExamCreateCandidates(
  quizzes: TeacherQuizRecord[],
  pending: PendingExamCreate | null,
  now = Date.now(),
) {
  if (!pending || !pending.createdById) return []
  return quizzes.filter((quiz) => {
    if (pending.existingIds.has(quiz.id) || quiz.type !== pending.type || quiz.status !== 'DRAFT') return false
    if (!pending.createdById || quiz.createdById !== pending.createdById) return false
    if (quiz.title !== pending.title || (quiz.courseId ?? '') !== pending.courseId) return false
    if (quiz.durationMinutes !== pending.durationMinutes ||
      quiz.maxAttempts !== pending.maxAttempts ||
      quiz.passingPercentage !== pending.passingPercentage) return false
    if (quiz.showAnswers !== pending.showAnswers || quiz.practiceAllowed !== pending.practiceAllowed) return false
    if (dateTimeMillis(quiz.availableFrom) !== pending.availableFrom ||
      dateTimeMillis(quiz.availableUntil) !== pending.availableUntil) return false
    const createdAt = quiz.createdAt ? new Date(quiz.createdAt).getTime() : Number.NaN
    return Number.isFinite(createdAt) &&
      createdAt >= pending.startedAt - 30_000 &&
      createdAt <= now + 30_000
  })
}
