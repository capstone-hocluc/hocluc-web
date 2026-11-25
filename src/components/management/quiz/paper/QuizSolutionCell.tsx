import MathText from '../../../ui/MathText'
import type { ExamPaperQuestion } from '../../ai-assistant/exam-format'

/** Beside a question in the dense list: its answer, explanation and review flag. */
export default function QuizSolutionCell({ question }: { question: ExamPaperQuestion }) {
  const answers = question.options.filter((option) => option.correct).map((option) => option.label)
  const explanation = question.explanation.trim()
  return (
    <div className="flex min-w-0 flex-col gap-1 text-text-secondary">
      {question.options.length > 0 && (
        <p className="m-0 font-semibold text-text-primary">
          Đáp án: {answers.length > 0 ? answers.join(', ') : <span className="font-normal text-badge-warning-text">chưa chọn</span>}
        </p>
      )}
      {explanation
        ? <p className="m-0 whitespace-pre-wrap break-words"><MathText>{explanation}</MathText></p>
        : question.options.length === 0 && <p className="m-0 text-text-tertiary">Chưa có đáp án.</p>}
      {question.needsReview && (
        <p className="m-0 self-start rounded bg-badge-warning-bg px-1.5 text-xs text-badge-warning-text">
          Cần rà soát{question.reasons[0] ? `: ${question.reasons[0]}` : ''}
        </p>
      )}
    </div>
  )
}
