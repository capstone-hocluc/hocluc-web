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
      variant="panel"
      padding="none"
      radius="xl"
      className={cn(
        'p-6 max-[640px]:p-4',
        verdict === 'correct' && 'border-success',
        verdict === 'incorrect' && 'border-danger-line'
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-assess-soft text-base font-black text-assess">
          {index + 1}
        </span>
        <span className="text-base font-extrabold text-text-heading">Câu {index + 1}</span>
        {question.categoryName && (
          <StatusBadge tone="primary" size="sm" className="font-bold">
            {question.categoryName}
          </StatusBadge>
        )}
        <StatusBadge
          tone={verdict === 'correct' ? 'success' : verdict === 'incorrect' ? 'danger' : 'neutral'}
          size="sm"
          className="ml-auto px-3 py-1 text-xs font-extrabold"
        >
          {verdict === 'correct' && <CheckCircle2 size={14} />}
          {verdict === 'incorrect' && <XCircle size={14} />}
          {verdict === 'correct' ? 'Đúng' : verdict === 'incorrect' ? 'Sai' : 'Chưa trả lời'}
        </StatusBadge>
      </div>

      {question.imageUrl && (
        <img className="mb-3 max-w-full rounded-2xl border-[1.5px] border-line-card" src={question.imageUrl} alt="" />
      )}

      <p className="mb-4 text-base leading-[1.6] font-bold text-text-heading">{question.questionText}</p>

      <div className="flex flex-col gap-2.5">
        {bySequence(question.options).map((option, optionIndex) => {
          const isSelected = option.optionId === question.selectedOptionId
          const isWrongPick = isSelected && !option.correct
          return (
            <div
              key={option.optionId}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-[15px]',
                option.correct
                  ? 'border-success bg-badge-success-bg font-extrabold text-badge-success-text'
                  : isWrongPick
                    ? 'border-danger-line bg-badge-danger-bg font-extrabold text-badge-danger-text'
                    : 'border-line bg-surface font-semibold text-text-body'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black',
                  option.correct
                    ? 'bg-success text-white'
                    : isWrongPick
                      ? 'bg-danger text-white'
                      : 'bg-surface-sky text-text-body'
                )}
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="min-w-0 flex-1">{option.optionText}</span>
              {option.correct && <CheckCircle2 size={18} className="shrink-0" />}
              {isWrongPick && <XCircle size={18} className="shrink-0" />}
            </div>
          )
        })}
      </div>

      {question.explanation && (
        <div className="mt-4 rounded-2xl border-[1.5px] border-line-brand bg-surface-brand px-4 py-3.5 text-[15px]">
          <strong className="mb-1 block font-black text-text-heading">Giải thích</strong>
          <p className="leading-[1.6] text-text-body">{question.explanation}</p>
        </div>
      )}
    </Card>
  )
}

export default QuizReviewQuestionCard
