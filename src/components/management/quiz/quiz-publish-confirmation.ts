import type { TeacherQuizRecord } from '../../../services/teacherQuizService'

export function quizPublishConfirmation(quiz: Pick<TeacherQuizRecord, 'status' | 'replacesQuizId' | 'replacesQuizTitle'>) {
  if (quiz.status !== 'DRAFT' || !quiz.replacesQuizId) return null
  const title = quiz.replacesQuizTitle?.trim()
  return {
    title: 'Thay bản đang dùng?',
    description: `Xuất bản bản này sẽ gỡ ${title ? `“${title}”` : 'bản đang dùng'} khỏi học viên.`,
    confirmLabel: 'Xuất bản và thay',
  }
}
