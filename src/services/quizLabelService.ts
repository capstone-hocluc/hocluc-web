import { requireData } from './teacherQuizService'

export interface QuizQuestionLabel {
  questionId: string
  state: 'LABELLED' | 'UNLABELLED' | 'STALE'
  patternCode: string | null
  primarySkillCode: string | null
  microSkillCode: string | null
  confidence: number | null
  source: 'JEV' | 'MANUAL'
  counts: boolean
}

export interface QuizLabels {
  labels: QuizQuestionLabel[]
  patterns: { code: string; name: string; subject: string }[]
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED' | null
  progress: string | null
}

const path = (quizId: string) => `/api/v1/teacher/quizzes/${quizId}/labels`

export function getQuizLabels(quizId: string) {
  return requireData<QuizLabels>(path(quizId), 'Không thể tải nhãn kỹ năng.')
}

export function runQuizLabelling(quizId: string) {
  return requireData<string>(path(quizId), 'Không thể tạo lượt gắn kỹ năng.', { method: 'POST' })
}

export function cancelQuizLabelling(quizId: string) {
  return requireData<boolean>(path(quizId), 'Không thể dừng lượt gắn kỹ năng.', { method: 'DELETE' })
}

export function setQuestionLabel(quizId: string, questionId: string, patternCode: string | null) {
  return requireData<QuizQuestionLabel>(`${path(quizId)}/${questionId}`, 'Không thể lưu nhãn kỹ năng.', {
    method: 'PUT',
    body: { patternCode },
  })
}
