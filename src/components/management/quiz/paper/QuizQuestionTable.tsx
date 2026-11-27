import type { ExamPaper } from '../../ai-assistant/exam-format'
import QuizPassageRow from './QuizPassageRow'
import QuizQuestionCell from './QuizQuestionCell'
import { quizRows } from './quiz-question-rows'
import QuizSolutionCell from './QuizSolutionCell'

/**
 * Every question of the quiz in one dense list: the question and its options on the left, the answer and its
 * explanation on the right, parts as headings between them. Numbers match the A4 sheet.
 */
export default function QuizQuestionTable({ paper }: { paper: ExamPaper }) {
  return (
    <ul aria-label="Câu hỏi và lời giải" className="m-0 list-none divide-y divide-card-border overflow-hidden rounded-xl border border-card-border bg-card-background p-0 text-sm leading-6">
      {quizRows(paper).map((row) => {
        if (row.kind === 'part') {
          return <li key={row.key} className="bg-background-gray-secondary px-3 py-1.5 text-xs font-semibold tracking-wide text-text-secondary uppercase">{row.heading}</li>
        }
        if (row.kind === 'passage') return <li key={row.key} className="px-3 py-2"><QuizPassageRow group={row.group} numbers={row.numbers} /></li>
        return (
          <li key={row.key} aria-label={`Câu ${row.number}`} className="grid gap-x-6 gap-y-1 px-3 py-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <QuizQuestionCell question={row.question} number={row.number} />
            <QuizSolutionCell question={row.question} />
          </li>
        )
      })}
    </ul>
  )
}
