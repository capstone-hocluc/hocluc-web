import { useState } from 'react'
import { Clock, ListChecks } from '../../components/console/icons'
import AssessmentFacts from '../../components/assessment/AssessmentFacts'
import QuizAttemptHistory from '../../components/assessment/QuizAttemptHistory'
import BackLink from '../../components/student/common/BackLink'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { usePageResource } from '../../hooks/usePageResource'
import {
  getPlacementAttemptHistory,
  getPlacementTest,
  startPlacementAttempt,
} from '../../services/assessmentService'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast } from '../../lib/toastBus'

interface PlacementIntroPageProps {
  onStartAttempt: (attemptId: string) => void
  onOpenReview: (attemptId: string) => void
  onBack: () => void
}

function PlacementIntroPage({ onStartAttempt, onOpenReview, onBack }: PlacementIntroPageProps) {
  const { data, status, errorMessage, reload } = usePageResource(
    async () => {
      const [test, attempts] = await Promise.all([getPlacementTest(), getPlacementAttemptHistory()])
      return { test, attempts }
    },
    [],
    { forbidden: false, notFound: false }
  )
  const [starting, setStarting] = useState(false)

  const inProgressAttempt =
    data?.attempts.find((attempt) => attempt.status === 'IN_PROGRESS') || null

  // Always goes through the same start-or-resume endpoint - the backend
  // decides whether this creates a new attempt or resumes the in-progress
  // one (resumed flag), so there's no separate "continue" code path here.
  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const result = await startPlacementAttempt()
      onStartAttempt(result.attemptId)
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setStarting(false)
    }
  }

  return (
    <StudentPageContainer width="compact" spacing="stack">
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={<Skeleton className="h-[260px] rounded-xl" />}
        error={{ title: 'Không thể tải bài kiểm tra đầu vào.' }}
      />

      {status === 'ready' && data && (
        <>
          <BackLink onClick={onBack}>Quay lại</BackLink>

          <Card
            as="section"
            variant="panel"
            padding="none"
            radius="xl"
            className="flex flex-col items-start gap-4 p-7 max-[640px]:p-5"
          >
            <StatusBadge
              tone="assessment"
              size="sm"
              className="px-3 py-1 text-xs font-semibold tracking-[0.04em] uppercase"
            >
              Kiểm tra đầu vào
            </StatusBadge>
            <h1 className="text-2xl leading-tight font-bold tracking-[-0.3px] text-text-heading max-[640px]:text-[22px]">
              {data.test.title}
            </h1>
            {data.test.description && (
              <p className="text-base leading-[1.6] text-text-body">{data.test.description}</p>
            )}

            <AssessmentFacts
              facts={[
                {
                  icon: ListChecks,
                  label: 'Số câu hỏi',
                  value: `${data.test.questions.length} câu`,
                  tone: 'primary',
                },
                ...(data.test.durationMinutes > 0
                  ? [
                      {
                        icon: Clock,
                        label: 'Thời gian',
                        value: `${data.test.durationMinutes} phút`,
                        tone: 'assessment' as const,
                      },
                    ]
                  : []),
              ]}
            />

            <Button
              shape="pill"
              size="lg"
              className="px-8 text-base font-semibold max-[640px]:w-full"
              onClick={handleStart}
              disabled={starting}
            >
              {starting
                ? 'Đang chuẩn bị...'
                : inProgressAttempt
                  ? 'Tiếp tục làm bài'
                  : 'Bắt đầu làm bài'}
            </Button>
          </Card>

          <QuizAttemptHistory attempts={data.attempts} allowReview onOpenReview={onOpenReview} />
        </>
      )}
    </StudentPageContainer>
  )
}

export default PlacementIntroPage
