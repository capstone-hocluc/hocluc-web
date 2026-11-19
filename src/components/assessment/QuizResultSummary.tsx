import type { QuizAttemptSummary, QuizReview } from '../../services/assessmentService'
import ResultSummaryCard from './ResultSummaryCard'

interface QuizResultSummaryProps {
  title: string
  result: QuizAttemptSummary
  review: QuizReview | null
}

function QuizResultSummary({ title, result, review }: QuizResultSummaryProps) {
  return (
    <ResultSummaryCard
      eyebrow="Kết quả bài kiểm tra"
      title={title}
      correctCount={review?.correctCount}
      totalQuestions={review?.totalQuestions}
      percentage={result.percentage}
    >
      {result.maxScore != null && (
        <p className="mt-4 text-sm font-semibold text-text-body">
          Điểm: {result.score}/{result.maxScore}
        </p>
      )}
    </ResultSummaryCard>
  )
}

export default QuizResultSummary
