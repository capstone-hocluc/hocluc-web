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
    <Card as="section" variant="panel" padding="none" radius="xl" className="p-6 max-[640px]:p-5">
      <CardTitle className="mb-4 text-xl">Lịch sử làm bài</CardTitle>
      <div className="flex flex-col gap-3">
        {sorted.map((attempt) => {
          const canReview = allowReview && attempt.status !== 'IN_PROGRESS'
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-line-card bg-surface-sky px-4 py-3.5"
              key={attempt.attemptId}
            >
              <div className="flex min-w-[96px] flex-col gap-0.5">
                <span className="text-base font-extrabold text-text-heading">
                  Lần {attempt.attemptNumber}
                </span>
                <span className="text-sm text-text-secondary">
                  {getAttemptStatusLabel(attempt.status)}
                </span>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                {attempt.status !== 'IN_PROGRESS' && (
                  <strong className="text-base font-black text-primary-text">{attempt.percentage}%</strong>
                )}
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
                  className="h-auto border-primary px-4 py-2 text-sm font-extrabold"
                  onClick={() => onOpenReview(attempt.attemptId)}
                >
                  <Eye size={16} />
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
