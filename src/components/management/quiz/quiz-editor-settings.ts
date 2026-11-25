import { isCourseQuizType } from '../../../lib/quiz-types'
import type { TeacherQuizRecord, TeacherQuizType } from '../../../services/teacherQuizService'
import { examSettingsOf, examUpdatePayload, type ExamSettings } from './exam-settings'
import type { QuizFieldError } from './quiz-form-errors'

export function quizEditorSettingsOf(quiz: TeacherQuizRecord): ExamSettings {
  const settings = examSettingsOf(quiz, quiz.type === 'PLACEMENT')
  return isCourseQuizType(quiz.type) ? { ...settings, duration: String(quiz.durationMinutes ?? 30) } : settings
}

export function quizEditorUpdatePayload(settings: ExamSettings, type: TeacherQuizType, locked: boolean) {
  if (!isCourseQuizType(type)) return examUpdatePayload(settings, type === 'PLACEMENT', locked)
  return {
    title: settings.title.trim(),
    showAnswers: settings.showAnswers,
    ...(locked ? {} : { durationMinutes: Number(settings.duration), maxAttempts: Number(settings.maxAttempts) }),
  }
}

export function courseQuizFieldErrors(settings: ExamSettings): Partial<Record<QuizFieldError, string>> {
  const errors: Partial<Record<QuizFieldError, string>> = {}
  if (!settings.title.trim()) errors.title = 'Nhập tên quiz trước khi lưu.'
  const duration = Number(settings.duration)
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) errors.duration = 'Thời gian làm bài phải từ 1 đến 600 phút.'
  const attempts = Number(settings.maxAttempts)
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 999) errors.attempts = 'Số lần thử tối đa phải từ 1 đến 999.'
  return errors
}
