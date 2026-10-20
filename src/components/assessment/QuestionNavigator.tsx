import { cn } from '../../lib/cn'

interface QuestionNavigatorProps {
  questions: { id: string }[]
  currentQuestionId: string
  answeredQuestionIds: Set<string>
  disabled: boolean
  onSelect: (questionId: string) => void
}

// Numbered tiles like the answer sheet: current = solid navy, answered = pale blue
// with a blue edge, unanswered = white with a grey edge.
function QuestionNavigator({
  questions,
  currentQuestionId,
  answeredQuestionIds,
  disabled,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <div className="grid grid-cols-5 gap-2 max-[640px]:grid-cols-6">
      {questions.map((question, index) => {
        const isCurrent = question.id === currentQuestionId
        const isAnswered = answeredQuestionIds.has(question.id)
        return (
          <button
            key={question.id}
            type="button"
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Câu ${index + 1}${isAnswered ? ', đã trả lời' : ''}`}
            className={cn(
              'grid aspect-square cursor-pointer place-items-center rounded-xl border text-sm font-semibold transition-[transform,box-shadow,background-color] duration-150  focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60',
              isCurrent
                ? 'border-transparent bg-primary text-white'
                : isAnswered
                  ? 'border-line-brand bg-surface-brand text-primary-text'
                  : 'border-line bg-surface text-text-body'
            )}
            onClick={() => onSelect(question.id)}
            disabled={disabled}
          >
            {index + 1}
          </button>
        )
      })}
    </div>
  )
}

export default QuestionNavigator
