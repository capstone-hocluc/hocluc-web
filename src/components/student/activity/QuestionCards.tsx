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
const topPill = cva('rounded-full px-[9px] py-[5px] text-[11px] font-bold', {
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

const optionLetter = 'grid place-items-center bg-primary-soft text-[12px] text-primary'

interface QuestionCardProps {
  question: ActivityQuestion
  selectedId?: string
  onChoose: (optionId: string) => void
}

// One question of an attempt in progress: statement + single-choice answers.
export function QuestionCard({ question, selectedId, onChoose }: QuestionCardProps) {
  return (
    <ActivityCard className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-[12px] font-semibold text-text-secondary">
        <span>Câu {question.number}</span>
        <small className={topPill()}>
          {question.type === 'single-choice' ? 'Chọn 1 đáp án' : question.type}
        </small>
      </div>
      <ActivityCardTitle>{question.content}</ActivityCardTitle>
      <div className="grid gap-[9px]">
        {question.options.map((option) => {
          const selected = selectedId === option.id
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[13px] border border-line-card bg-surface-tint px-[11px] py-[9px] text-left text-[13px] font-medium text-text-dim',
                selected && 'border-primary bg-primary-soft shadow-[0_0_0_3px_rgba(28, 176, 246,0.08)]'
              )}
              onClick={() => onChoose(option.id)}
            >
              <b
                className={cn(
                  optionLetter,
                  'size-[26px] rounded-[9px]',
                  selected && 'bg-primary text-surface'
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
  'flex min-h-10 items-center gap-[9px] rounded-xl border border-line-card bg-surface-tint px-2.5 py-2 text-[13px] font-medium text-text-dim',
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
      <div className="flex items-center justify-between gap-3 text-[12px] font-semibold text-text-secondary">
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
              <b className={cn(optionLetter, 'size-[25px] shrink-0 rounded-lg font-extrabold')}>
                {option.id}
              </b>
              <span>{option.text}</span>
            </p>
          )
        })}
      </div>
      <div className="grid gap-[7px]">
        <p>
          <span className="block text-[11px] font-extrabold text-text-secondary">
            Đáp án của bạn:
          </span>
          <strong className="mt-0.5 block text-[13px] font-bold text-text-heading">
            {selectedOption ? `${selectedOption.id}. ${selectedOption.text}` : 'Chưa trả lời'}
          </strong>
        </p>
        <p>
          <span className="block text-[11px] font-extrabold text-text-secondary">Đáp án đúng:</span>
          <strong className="mt-0.5 block text-[13px] font-bold text-text-heading">
            {correctOption.id}. {correctOption.text}
          </strong>
        </p>
      </div>
      <div className="rounded-xl bg-surface-sky p-2.5">
        <strong className="text-[12px] font-extrabold text-text-heading">Giải thích</strong>
        <p className="mt-1 text-[13px] leading-[1.5] text-text-dim">{question.explanation}</p>
      </div>
    </ActivityCard>
  )
}
