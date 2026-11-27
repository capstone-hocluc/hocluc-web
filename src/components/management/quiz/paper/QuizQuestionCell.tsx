import { cn } from '../../../../lib/cn'
import MathText from '../../../ui/MathText'
import type { ExamPaperQuestion } from '../../ai-assistant/exam-format'
import { optionColumns } from '../paper-layout'

// Short options share a line, as on the printed paper, so each question takes as few lines as it can.
const COLUMNS = { 4: 'sm:grid-cols-4', 2: 'sm:grid-cols-2', 1: 'grid-cols-1' } as const

/** A question in the dense list: its number, text, picture and options, the correct ones marked. */
export default function QuizQuestionCell({ question, number }: { question: ExamPaperQuestion; number: number }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="w-8 shrink-0 font-semibold text-text-secondary tabular-nums">{number}.</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 whitespace-pre-wrap break-words text-text-primary"><MathText>{question.prompt}</MathText></p>
        {question.imageUrl && <img src={question.imageUrl} alt={`Hình minh họa câu ${number}`} className="max-h-48 max-w-full self-start object-contain" />}
        {question.options.length > 0 && (
          <ul className={cn('m-0 grid list-none gap-x-4 p-0', COLUMNS[optionColumns(question.options)])}>
            {question.options.map((option) => (
              <li key={option.id} className={cn('flex min-w-0 gap-1.5 rounded px-1', option.correct && 'bg-badge-success-bg text-badge-success-text')}>
                <strong className="shrink-0">{option.label}.</strong>
                <span className="min-w-0 break-words"><MathText>{option.text}</MathText></span>
                {option.correct && <span className="sr-only">(đáp án đúng)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
