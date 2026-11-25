import { quizRequirement, quizTypeLabel } from '../../../lib/quiz-types'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import ConsoleSheet from '../../console/sheet'
import StatusBadge from '../../console/status'
import QuizAnswerReviewSetting from './QuizAnswerReviewSetting'
import type { QuizFieldError } from './quiz-form-errors'

export interface QuizSettingsValues {
  title: string
  duration: string
  attempts: string
  showAnswers: boolean
}

/**
 * The settings of a lesson or chapter quiz being edited, in a side panel over its questions. Type and place are fixed
 * once the quiz exists; changes stay in the editor's form until it is saved.
 */
export default function QuizSettingsSheet({ open, onClose, docked, quiz, values, onChange, fieldErrors, nameDisabled, rulesDisabled, locked }: {
  open: boolean
  onClose: () => void
  /** A card beside the questions instead of a drawer over them. */
  docked?: boolean
  quiz: TeacherQuizRecord
  values: QuizSettingsValues
  onChange: <K extends keyof QuizSettingsValues>(key: K, value: QuizSettingsValues[K]) => void
  fieldErrors: Partial<Record<QuizFieldError, string>>
  nameDisabled: boolean
  rulesDisabled: boolean
  /** Learners have sat the quiz: its time and attempts are fixed. */
  locked: boolean
}) {
  // Errors sit beside the label, not in it, so a field keeps its own name while it shows one.
  const fieldError = (field: QuizFieldError) => fieldErrors[field] &&
    <span id={`quiz-settings-${field}-error`} className="text-sm font-medium text-badge-error-text" role="alert">{fieldErrors[field]}</span>
  const describedBy = (field: QuizFieldError) => fieldErrors[field] ? `quiz-settings-${field}-error` : undefined
  return (
    <ConsoleSheet open={open} onClose={onClose} docked={docked} title="Thiết lập bài kiểm tra">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-xl bg-background-gray-secondary px-4 py-3 text-sm text-text-tertiary">
          <StatusBadge tone="info" className="self-start">{quizTypeLabel(quiz.type)}</StatusBadge>
          <span className="text-text-primary">{[quiz.courseTitle, quiz.chapterTitle, quiz.lessonTitle].filter(Boolean).join(' · ')}</span>
          <span className="text-xs">{quizRequirement(quiz.type)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Tên bài kiểm tra
            <input className={`${fieldControlClass} aria-invalid:border-input-error-focus-border`} value={values.title} maxLength={500} disabled={nameDisabled}
              aria-invalid={fieldErrors.title ? true : undefined} aria-describedby={describedBy('title')} onChange={(event) => onChange('title', event.target.value)} />
          </label>
          {fieldError('title')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Thời gian (phút)
              <input className={fieldControlClass} type="number" min="1" max="600" value={values.duration} disabled={rulesDisabled}
                aria-invalid={fieldErrors.duration ? true : undefined} aria-describedby={describedBy('duration')} onChange={(event) => onChange('duration', event.target.value)} />
            </label>
            {fieldError('duration')}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Số lần làm tối đa
              <input className={fieldControlClass} type="number" min="1" max="999" value={values.attempts} disabled={rulesDisabled}
                aria-invalid={fieldErrors.attempts ? true : undefined} aria-describedby={describedBy('attempts')} onChange={(event) => onChange('attempts', event.target.value)} />
            </label>
            {fieldError('attempts')}
          </div>
        </div>
        <QuizAnswerReviewSetting enabled={values.showAnswers} onChange={(checked) => onChange('showAnswers', checked)} disabled={nameDisabled} />
        {locked && <Notice tone="warning">Quiz đã có lượt thi; câu hỏi và quy định làm bài đang khóa.</Notice>}
        <Button className="self-end" onClick={onClose}>Xong</Button>
      </div>
    </ConsoleSheet>
  )
}
