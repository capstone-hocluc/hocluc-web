import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Lock,
  RotateCcw,
  Target,
} from '../../components/console/icons'
import AssessmentFacts from '../../components/assessment/AssessmentFacts'
import QuizAttemptHistory from '../../components/assessment/QuizAttemptHistory'
import BackLink from '../../components/student/common/BackLink'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { usePageResource } from '../../hooks/usePageResource'
import { getQuiz, startQuizAttempt } from '../../services/assessmentService'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast } from '../../lib/toastBus'
import { getAssessmentLockMessage } from '../../lib/quizLock'
import { prettifyEnum } from '../../lib/courseFormat'
import { getQuizKind } from '../../lib/learningType'

interface QuizDetailPageProps {
  quizId: string
  onStartAttempt: (quizId: string, attemptId: string) => void
  onOpenReview: (attemptId: string) => void
}

function QuizDetailPage({ quizId, onStartAttempt, onOpenReview }: QuizDetailPageProps) {
  const {
    data: quiz,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getQuiz(quizId), [quizId])
  const [starting, setStarting] = useState(false)

  const handleContinue = () => {
    if (!quiz?.inProgressAttemptId) return
    onStartAttempt(quiz.id, quiz.inProgressAttemptId)
  }

  const handleStart = async () => {
    if (!quiz || starting) return
    setStarting(true)
    try {
      const result = await startQuizAttempt(quiz.id)
      onStartAttempt(quiz.id, result.attemptId)
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
        forbidden={{ title: getAssessmentLockMessage(null) }}
        notFound={{ title: 'Không tìm thấy bài kiểm tra.' }}
        error={{ title: 'Không thể tải bài kiểm tra.' }}
      />

      {status === 'ready' && quiz && (
        <>
          <BackLink onClick={() => window.history.back()}>Quay lại</BackLink>

          <Card
            as="section"
            variant="panel"
            padding="none"
            radius="xl"
            className="flex flex-col items-start gap-4 p-7 max-[640px]:p-5"
          >
            <StatusBadge
              tone={getQuizKind(quiz.type) === 'assessment' ? 'assessment' : 'practice'}
              size="sm"
              className="px-3 py-1 text-xs font-semibold tracking-[0.04em] uppercase"
            >
              {prettifyEnum(quiz.type)}
            </StatusBadge>
            <h1 className="text-2xl leading-tight font-bold tracking-[-0.3px] text-text-heading max-[640px]:text-[22px]">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-base leading-[1.6] text-text-body">{quiz.description}</p>
            )}

            <AssessmentFacts
              facts={[
                {
                  icon: ListChecks,
                  label: 'Số câu hỏi',
                  value: `${quiz.questionCount} câu`,
                  tone: 'primary',
                },
                ...(quiz.durationMinutes > 0
                  ? [
                      {
                        icon: Clock,
                        label: 'Thời gian',
                        value: `${quiz.durationMinutes} phút`,
                        tone: 'assessment' as const,
                      },
                    ]
                  : []),
                ...(quiz.passingPercentage != null
                  ? [
                      {
                        icon: Target,
                        label: 'Điểm đạt',
                        value: `${quiz.passingPercentage}%`,
                        tone: 'practice' as const,
                      },
                    ]
                  : []),
                {
                  icon: RotateCcw,
                  label: 'Lượt làm',
                  value: `${quiz.attemptsUsed}/${quiz.maxAttempts}`,
                  tone: 'live',
                },
              ]}
            />

            {quiz.passed && (
              <StatusBadge tone="success" className="gap-1.5 px-3.5 py-1.5 text-sm font-bold">
                <CheckCircle2 size={16} />
                Đã đạt
                {quiz.bestPercentage != null && ` · Kết quả tốt nhất ${quiz.bestPercentage}%`}
              </StatusBadge>
            )}

            {quiz.locked ? (
              <Notice tone="danger" className="flex-nowrap self-stretch">
                <Lock size={16} className="shrink-0" />
                {getAssessmentLockMessage(quiz.lockReason)}
              </Notice>
            ) : quiz.inProgressAttemptId ? (
              <Button
                shape="pill"
                size="lg"
                className="px-8 text-base font-semibold max-[640px]:w-full"
                onClick={handleContinue}
              >
                Tiếp tục làm bài
              </Button>
            ) : (
              <Button
                shape="pill"
                size="lg"
                className="px-8 text-base font-semibold max-[640px]:w-full"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? 'Đang bắt đầu...' : 'Bắt đầu làm bài'}
              </Button>
            )}
          </Card>

          <QuizAttemptHistory
            attempts={quiz.attempts}
            allowReview={quiz.showAnswers}
            onOpenReview={onOpenReview}
          />
        </>
      )}
    </StudentPageContainer>
  )
}

export default QuizDetailPage
