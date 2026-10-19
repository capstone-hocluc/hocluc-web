import AttemptWorkspace from '../../components/assessment/AttemptWorkspace'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import { useAttemptSession } from '../../hooks/useAttemptSession'
import { usePageResource } from '../../hooks/usePageResource'
import { getAttempt, getQuiz } from '../../services/assessmentService'
import { getAssessmentLockMessage } from '../../lib/quizLock'
import { bySequence } from '../../lib/sequence'

interface QuizAttemptPageProps {
  quizId: string
  attemptId: string
  onExit: (quizId: string) => void
  onSubmitted: (attemptId: string) => void
}

// Taking a course quiz: loads the quiz + attempt, the shared attempt session
// handles answers / timer / submit, AttemptWorkspace renders it.
function QuizAttemptPage({ quizId, attemptId, onExit, onSubmitted }: QuizAttemptPageProps) {
  const session = useAttemptSession(onSubmitted)
  const { data, status, errorMessage, reload } = usePageResource(
    async () => {
      const [quiz, attempt] = await Promise.all([getQuiz(quizId), getAttempt(attemptId)])
      return { quiz, attempt }
    },
    [quizId, attemptId],
    { onLoaded: ({ attempt }) => session.hydrate(attempt) }
  )

  const backToQuiz = () => onExit(quizId)

  return (
    <StudentPageContainer width="reading" spacing="stack">
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <>
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-[220px] rounded-xl" />
          </>
        }
        forbidden={{
          title: getAssessmentLockMessage(null),
          actionLabel: 'Quay lại bài kiểm tra',
          onAction: backToQuiz,
        }}
        notFound={{
          title: 'Không tìm thấy bài làm.',
          actionLabel: 'Quay lại bài kiểm tra',
          onAction: backToQuiz,
        }}
        error={{ title: 'Không thể tải bài làm.' }}
      />

      {status === 'ready' && data && (
        <AttemptWorkspace
          session={session}
          questions={bySequence(data.quiz.questions)}
          onExit={backToQuiz}
          onViewResult={() => session.attempt && onSubmitted(session.attempt.attemptId)}
        />
      )}
    </StudentPageContainer>
  )
}

export default QuizAttemptPage
