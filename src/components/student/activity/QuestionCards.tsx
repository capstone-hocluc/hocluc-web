import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { ActivityCard, ActivityCardTitle } from './ActivityCard'
import { getAnswerState } from './answerState'
import type { ActivityAttempt, ActivityQuestion, AnswerState } from './types'

const stateLabel: Record<AnswerState, string> = {
  correct: 'Đúng',
  incorrect: 'Sai',
  unanswered: 'Chưa trả lời',
}

// Pill at the top-right of a question ("Chọn 1 đáp án" / review result).
const topPill = cva('rounded-full px-3 py-1 text-xs font-semibold', {
  variants: {
    state: {
      neutral: 'bg-lock-soft text-text-secondary',
      correct: 'bg-practice-soft text-practice',
      incorrect: 'bg-danger-soft text-danger',
      unanswered: 'bg-live-tint text-live',
    },
  },
  defaultVariants: { state: 'neutral' },
})

const reviewBorder: Record<AnswerState, string> = {
  correct: 'border-line-practice',
  incorrect: 'border-danger-line',
  unanswered: 'border-live-line',
}

const optionLetter = 'grid place-items-center bg-primary-soft text-sm font-bold text-primary-text'

interface QuestionCardProps {
  question: ActivityQuestion
  selectedId?: string
  onChoose: (optionId: string) => void
}

// One question of an attempt in progress: statement + single-choice answers.
export function QuestionCard({ question, selectedId, onChoose }: QuestionCardProps) {
  return (
    <ActivityCard className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-text-secondary">
        <span>Câu {question.number}</span>
        <small className={topPill()}>
          {question.type === 'single-choice' ? 'Chọn 1 đáp án' : question.type}
        </small>
      </div>
      <ActivityCardTitle>{question.content}</ActivityCardTitle>
      <div className="grid gap-2.5">
        {question.options.map((option) => {
          const selected = selectedId === option.id
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-[15px] font-semibold text-text-body transition-colors hover:bg-surface-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                selected && 'border-primary bg-primary-soft text-text-heading'
              )}
              onClick={() => onChoose(option.id)}
            >
              <b
                className={cn(
                  optionLetter,
                  'size-8 rounded-xl',
                  selected && 'bg-primary text-white'
                )}
              >
                {option.id}
              </b>
              <span className="min-w-0">{option.text}</span>
            </button>
          )
        })}
      </div>
    </ActivityCard>
  )
}

const reviewOption = cva(
  'flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-[15px] font-semibold text-text-body',
  {
    variants: {
      tone: {
        plain: '',
        correct: 'border-line-practice bg-practice-soft',
        wrong: 'border-danger-line bg-danger-soft',
      },
    },
    defaultVariants: { tone: 'plain' },
  }
)

interface ReviewQuestionCardProps {
  question: ActivityQuestion
  attempt: ActivityAttempt
}

// One question of a finished attempt: options marked right/wrong + explanation.
export function ReviewQuestionCard({ question, attempt }: ReviewQuestionCardProps) {
  const selectedAnswer = attempt.answers[question.id]
  const selectedOption = question.options.find((option) => option.id === selectedAnswer)
  const correctOption = question.options.find((option) => option.id === question.correctAnswer)
  const state = getAnswerState(question, attempt)

  return (
    <ActivityCard
      id={`review-question-${question.number}`}
      className={cn('grid gap-3', reviewBorder[state])}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-text-secondary">
        <span>Câu {question.number}</span>
        <small className={topPill({ state })}>{stateLabel[state]}</small>
      </div>
      <ActivityCardTitle>{question.content}</ActivityCardTitle>
      <div className="grid gap-2">
        {question.options.map((option) => {
          const isSelected = option.id === selectedAnswer
          const isCorrect = option.id === question.correctAnswer
          return (
            <p
              key={option.id}
              className={cn(
                reviewOption({
                  tone: isCorrect ? 'correct' : isSelected ? 'wrong' : 'plain',
                })
              )}
            >
              <b className={cn(optionLetter, 'size-8 shrink-0 rounded-xl')}>{option.id}</b>
              <span>{option.text}</span>
            </p>
          )
        })}
      </div>
      <div className="grid gap-2">
        <p>
          <span className="block text-xs font-semibold tracking-[0.04em] text-text-secondary uppercase">
            Đáp án của bạn:
          </span>
          <strong className="mt-0.5 block text-[15px] font-semibold text-text-heading">
            {selectedOption ? `${selectedOption.id}. ${selectedOption.text}` : 'Chưa trả lời'}
          </strong>
        </p>
        <p>
          <span className="block text-xs font-semibold tracking-[0.04em] text-text-secondary uppercase">
            Đáp án đúng:
          </span>
          <strong className="mt-0.5 block text-[15px] font-semibold text-text-heading">
            {correctOption.id}. {correctOption.text}
          </strong>
        </p>
      </div>
      <div className="rounded-xl bg-surface-brand p-3.5">
        <strong className="text-sm font-semibold text-text-heading">Giải thích</strong>
        <p className="mt-1 text-[15px] leading-[1.5] text-text-body">{question.explanation}</p>
      </div>
    </ActivityCard>
  )
}
