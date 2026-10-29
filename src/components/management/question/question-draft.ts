import type { TeacherQuestionType } from '../../../services/teacherQuizService'

export interface DraftOption {
  text: string
  correct: boolean
}

/** Content shared by the question bank and exam editors. */
export interface QuestionDraft {
  questionText: string
  questionType: TeacherQuestionType
  options: DraftOption[]
  explanation: string
  imageUrl: string | null
  categoryId: string | null
  difficulty: string | null
}

export const CHOICE_TYPES: TeacherQuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']

export const QUESTION_TYPE_OPTIONS: Array<{ id: TeacherQuestionType; label: string }> = [
  { id: 'SINGLE_CHOICE', label: 'Trắc nghiệm một đáp án' },
  { id: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm nhiều đáp án' },
  { id: 'LONG_ANSWER', label: 'Tự luận' },
]

