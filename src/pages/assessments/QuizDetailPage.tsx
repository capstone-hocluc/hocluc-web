import { useState } from 'react'
import { CheckCircle2, Lock } from '../../components/console/icons'
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
        loading={<Skeleton className="h-[260px] rounded-2xl" />}
        forbidden={{ title: getAssessmentLockMessage(null) }}
        notFound={{ title: 'Không tìm thấy bài kiểm tra.' }}
        error={{ title: 'Không thể tải bài kiểm tra.' }}
      />

      {status === 'ready' && quiz && (
        <>
          <BackLink onClick={() => window.history.back()}>Quay lại</BackLink>

          <Card
            as="section"
            padding="none"
            radius="lg"
            className="flex flex-col items-start border-border-subtle p-[22px]"
          >
            <StatusBadge
              tone={getQuizKind(quiz.type) === 'assessment' ? 'assessment' : 'practice'}
              size="sm"
              className="mb-2.5 px-3 py-1 text-[11.5px] font-extrabold tracking-[0.04em] uppercase"
            >
              {prettifyEnum(quiz.type)}
            </StatusBadge>
            <h1 className="mb-2.5 text-xl font-bold text-text-heading">{quiz.title}</h1>
            {quiz.description && (
              <p className="mb-4 text-sm text-text-secondary">{quiz.description}</p>
            )}

            <div className="mb-3.5 flex flex-wrap gap-x-[18px] gap-y-2.5 text-[13px] text-text-faint">
              <span>{quiz.questionCount} câu hỏi</span>
              {quiz.durationMinutes > 0 && <span>{quiz.durationMinutes} phút</span>}
              {quiz.passingPercentage != null && (
                <span>Điểm đạt: {quiz.passingPercentage}%</span>
              )}
              <span>
                Lượt làm: {quiz.attemptsUsed}/{quiz.maxAttempts}
              </span>
            </div>

            {quiz.passed && (
              <StatusBadge
                tone="success"
                className="mb-3.5 gap-1.5 px-3 py-1.5 text-[12.5px] font-bold"
              >
                <CheckCircle2 size={14} />
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
                className="h-[46px] px-[26px] text-sm font-extrabold"
                onClick={handleContinue}
              >
                Tiếp tục làm bài
              </Button>
            ) : (
              <Button
                shape="pill"
                className="h-[46px] px-[26px] text-sm font-extrabold"
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
