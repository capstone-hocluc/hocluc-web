import type { TeacherQuestionType } from '../../../services/teacherQuizService'

export interface DraftOption {
  text: string
  correct: boolean
}

export interface DraftQuestion {
  clientId: string
  serverId: string | null
  questionText: string
  questionType: TeacherQuestionType
  options: DraftOption[]
  explanation: string
  imageUrl: string | null
  categoryId: string | null
  difficulty: string | null
  sourcePage: number | null
  /** Only marks the teacher set; an equal share is BE's to compute and must not be sent back as fixed. */
  marks: number | null
  needsReview: boolean
  reviewNote: string
  editable: boolean
}

export interface DraftSection {
  clientId: string
  title: string
  /** Set on a child of a parent section: the parent's title and the child's own, kept apart because `title` joins them for display. */
  parentTitle: string | null
  childTitle: string | null
  categoryId: string | null
  suggestedMinutes: string
  unassigned: boolean
  questions: DraftQuestion[]
}

export const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']

export const QUESTION_TYPE_OPTIONS: Array<{ id: TeacherQuestionType; label: string }> = [
  { id: 'SINGLE_CHOICE', label: 'Trắc nghiệm một đáp án' },
  { id: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm nhiều đáp án' },
  { id: 'LONG_ANSWER', label: 'Tự luận' },
]

export type QuestionStatus = 'ok' | 'missing-answer' | 'needs-review'

/** What the question list shows for a question: a review flag wins over a missing answer. */
export function questionStatus(question: DraftQuestion): QuestionStatus {
  if (question.needsReview) return 'needs-review'
  if (CHOICE_TYPES.includes(question.questionType) && !question.options.some((option) => option.correct && option.text.trim())) {
    return 'missing-answer'
  }
  return 'ok'
}
