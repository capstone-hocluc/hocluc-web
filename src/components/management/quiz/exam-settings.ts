import type { CreateTeacherQuizRequest, TeacherQuizRecord } from '../../../services/teacherQuizService'

export type AssessmentType = 'EXAM' | 'PLACEMENT'

/** An exam's settings as the form holds them: numbers and dates as the text of their inputs. */
export interface ExamSettings {
  description: string
  title: string
  courseId: string
  duration: string
  maxAttempts: string
  passingPercentage: string
  availableFrom: string
  availableUntil: string
  showAnswers: boolean
  practiceAllowed: boolean
}

export function examSettingsOf(quiz: TeacherQuizRecord | null, placement: boolean): ExamSettings {
  return {
    description: quiz?.description ?? '',
    title: quiz?.title ?? '',
    courseId: quiz?.courseId ?? '',
    duration: String(quiz?.durationMinutes ?? (placement ? 30 : 120)),
    maxAttempts: String(quiz?.maxAttempts ?? 1),
    passingPercentage: String(quiz?.passingPercentage ?? 60),
    availableFrom: toDateTimeLocal(quiz?.availableFrom),
    availableUntil: toDateTimeLocal(quiz?.availableUntil),
    showAnswers: quiz?.showAnswers ?? false,
    practiceAllowed: quiz?.practiceAllowed ?? !placement,
  }
}

/**
 * The first thing wrong with the settings, or '' when they can be saved. {@code saved} is the exam as the server has
 * it: a date it holds cannot be cleared through the API. A new mock exam needs its main course.
 */
export function validateExamSettings(settings: ExamSettings, placement: boolean, saved: TeacherQuizRecord | null) {
  if (!settings.title.trim()) return 'Nhập tên đề thi trước khi lưu.'
  if (!placement && !saved && !settings.courseId) return 'Chọn khóa học chính cho đề thi.'
  const duration = Number(settings.duration)
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) return 'Thời gian làm bài phải từ 1 đến 600 phút.'
  const attempts = Number(settings.maxAttempts)
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 999) return 'Số lượt làm tối đa phải từ 1 đến 999.'
  const passingText = settings.passingPercentage.trim()
  const passing = Number(passingText)
  const passingDecimalDigits = passingText.split('.')[1]?.length ?? 0
  if (!Number.isFinite(passing) || passing < 0 || passing > 100 || passingDecimalDigits > 2) {
    return 'Điểm đạt phải từ 0 đến 100%, tối đa 2 chữ số thập phân.'
  }
  if (settings.availableFrom && Number.isNaN(new Date(settings.availableFrom).getTime())) return 'Thời điểm bắt đầu không hợp lệ.'
  if (settings.availableUntil && Number.isNaN(new Date(settings.availableUntil).getTime())) return 'Thời hạn làm bài không hợp lệ.'
  if (settings.availableFrom && settings.availableUntil &&
    new Date(settings.availableUntil).getTime() <= new Date(settings.availableFrom).getTime()) {
    return 'Thời hạn làm bài phải sau thời điểm bắt đầu.'
  }
  if (saved?.availableFrom && !settings.availableFrom) return 'API hiện tại không hỗ trợ xóa thời điểm bắt đầu đã lưu; hãy chọn thời điểm mới.'
  if (saved?.availableUntil && !settings.availableUntil) return 'API hiện tại không hỗ trợ xóa hạn làm bài đã lưu; hãy chọn hạn mới.'
  return ''
}

/** The rules a learner sits under; a placement has no pass mark, answer review, practice or schedule of its own. */
function examRules(settings: ExamSettings, placement: boolean) {
  return {
    durationMinutes: Number(settings.duration),
    maxAttempts: Number(settings.maxAttempts),
    ...(!placement ? {
      passingPercentage: Number(settings.passingPercentage),
      showAnswers: settings.showAnswers,
      practiceAllowed: settings.practiceAllowed,
    } : {}),
    ...(fromDateTimeLocal(settings.availableFrom) ? { availableFrom: fromDateTimeLocal(settings.availableFrom) } : {}),
    ...(fromDateTimeLocal(settings.availableUntil) ? { availableUntil: fromDateTimeLocal(settings.availableUntil) } : {}),
  }
}

export function examCreatePayload(settings: ExamSettings, type: AssessmentType): CreateTeacherQuizRequest {
  const placement = type === 'PLACEMENT'
  return {
    type,
    ...(placement ? { description: settings.description.trim() } : { courseId: settings.courseId }),
    title: settings.title.trim(),
    ...examRules(settings, placement),
  }
}

/** Once a learner has sat the exam only its name and description may change. */
export function examUpdatePayload(settings: ExamSettings, placement: boolean, locked: boolean) {
  return {
    title: settings.title.trim(),
    ...(placement ? { description: settings.description.trim() } : {}),
    ...(locked ? {} : examRules(settings, placement)),
  }
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

export function dateTimeMillis(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function isExamLocked(quiz: TeacherQuizRecord | null | undefined) {
  return Boolean(quiz?.locked || (quiz?.attemptCount ?? 0) > 0)
}
