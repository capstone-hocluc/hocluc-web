import { Eye } from '../console/icons'
import type { QuizAttemptSummary } from '../../services/assessmentService'
import { getAttemptStatusLabel } from '../../lib/attemptStatus'
import { formatDateTime, formatDuration } from '../../lib/courseFormat'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

interface QuizAttemptHistoryProps {
  attempts: QuizAttemptSummary[]
  allowReview: boolean
  onOpenReview: (attemptId: string) => void
}

function QuizAttemptHistory({ attempts, allowReview, onOpenReview }: QuizAttemptHistoryProps) {
  if (attempts.length === 0) return null

  const sorted = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)

  return (
    <Card as="section" padding="none" radius="lg" className="border-border-subtle p-[22px]">
      <CardTitle className="mb-3.5 text-base">Lịch sử làm bài</CardTitle>
      <div className="flex flex-col gap-2.5">
        {sorted.map((attempt) => {
          const canReview = allowReview && attempt.status !== 'IN_PROGRESS'
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border-subtle px-3.5 py-3"
              key={attempt.attemptId}
            >
              <div className="flex flex-col gap-[3px]">
                <span className="text-[13px] font-bold text-text-heading">
                  Lần {attempt.attemptNumber}
                </span>
                <span className="text-[11.5px] text-text-faint">
                  {getAttemptStatusLabel(attempt.status)}
                </span>
              </div>
              <div className="flex gap-3.5 text-[12.5px] text-text-faint">
                {attempt.status !== 'IN_PROGRESS' && <span>{attempt.percentage}%</span>}
                {attempt.timeSpentSeconds > 0 && (
                  <span>{formatDuration(attempt.timeSpentSeconds)}</span>
                )}
                <span>{formatDateTime(attempt.submittedAt || attempt.startedAt || '')}</span>
              </div>
              {canReview && (
                <Button
                  appearance="outline"
                  shape="pill"
                  size="sm"
                  className="h-auto border-primary px-3.5 py-1.5 text-xs font-bold"
                  onClick={() => onOpenReview(attempt.attemptId)}
                >
                  <Eye size={14} />
                  Xem lại
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default QuizAttemptHistory
