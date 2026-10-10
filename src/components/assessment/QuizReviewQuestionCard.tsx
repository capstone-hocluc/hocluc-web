import { CheckCircle2, XCircle } from '../console/icons'
import type { QuizReviewQuestion } from '../../services/assessmentService'
import { bySequence } from '../../lib/sequence'
import { cn } from '../../lib/cn'
import Card from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'

interface QuizReviewQuestionCardProps {
  question: QuizReviewQuestion
  index: number
}

// Only ever rendered when the caller has already confirmed showAnswers is
// true - this component always reveals correctness, by design.
function QuizReviewQuestionCard({ question, index }: QuizReviewQuestionCardProps) {
  const verdict = !question.answered ? 'unanswered' : question.correct ? 'correct' : 'incorrect'

  return (
    <Card
      padding="none"
      className={cn(
        'border-[1.5px] p-[18px]',
        verdict === 'correct' && 'border-success',
        verdict === 'incorrect' && 'border-danger'
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-extrabold text-text-heading">Câu {index + 1}</span>
        {question.categoryName && (
          <StatusBadge tone="primary" size="sm" className="font-bold">
            {question.categoryName}
          </StatusBadge>
        )}
        <StatusBadge
          tone={verdict === 'correct' ? 'success' : verdict === 'incorrect' ? 'danger' : 'neutral'}
          size="sm"
          className="ml-auto px-2.5 py-[3px] text-[11.5px] font-extrabold"
        >
          {verdict === 'correct' && <CheckCircle2 size={13} />}
          {verdict === 'incorrect' && <XCircle size={13} />}
          {verdict === 'correct' ? 'Đúng' : verdict === 'incorrect' ? 'Sai' : 'Chưa trả lời'}
        </StatusBadge>
      </div>

      {question.imageUrl && (
        <img className="mb-2.5 max-w-full rounded-[10px]" src={question.imageUrl} alt="" />
      )}

      <p className="mb-3 text-[14.5px] text-text-heading">{question.questionText}</p>

      <div className="flex flex-col gap-2">
        {bySequence(question.options).map((option) => {
          const isSelected = option.optionId === question.selectedOptionId
          return (
            <div
              key={option.optionId}
              className={cn(
                'flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-[13.5px]',
                option.correct
                  ? 'border-success bg-badge-success-bg font-semibold text-badge-success-text'
                  : isSelected
                    ? 'border-danger bg-badge-danger-bg font-semibold text-badge-danger-text'
                    : 'border-border-subtle text-text-body'
              )}
            >
              <span>{option.optionText}</span>
              {option.correct && <CheckCircle2 size={14} />}
              {isSelected && !option.correct && <XCircle size={14} />}
            </div>
          )
        })}
      </div>

      {question.explanation && (
        <div className="mt-3 border-t border-dashed border-border-subtle pt-3 text-[13px]">
          <strong className="mb-1 block text-text-heading">Giải thích</strong>
          <p className="leading-[1.6] text-text-secondary">{question.explanation}</p>
        </div>
      )}
    </Card>
  )
}

export default QuizReviewQuestionCard
