import AttemptWorkspace from '../../components/assessment/AttemptWorkspace'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import { useAttemptSession } from '../../hooks/useAttemptSession'
import { usePageResource } from '../../hooks/usePageResource'
import { getAttempt, getPlacementTest } from '../../services/assessmentService'
import { bySequence } from '../../lib/sequence'

interface PlacementAttemptPageProps {
  attemptId: string
  onExit: () => void
  onSubmitted: () => void
}

// Taking the placement test: same attempt session + workspace as a course
// quiz; only the data source differs (one test definition, no per-quiz lookup).
function PlacementAttemptPage({ attemptId, onExit, onSubmitted }: PlacementAttemptPageProps) {
  const session = useAttemptSession(() => onSubmitted())
  const { data, status, errorMessage, reload } = usePageResource(
    async () => {
      const [test, attempt] = await Promise.all([getPlacementTest(), getAttempt(attemptId)])
      return { test, attempt }
    },
    [attemptId],
    { forbidden: false, onLoaded: ({ attempt }) => session.hydrate(attempt) }
  )

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
        notFound={{ title: 'Không tìm thấy bài làm.', actionLabel: 'Quay lại', onAction: onExit }}
        error={{ title: 'Không thể tải bài làm.' }}
      />

      {status === 'ready' && data && (
        <AttemptWorkspace
          session={session}
          questions={bySequence(data.test.questions)}
          onExit={onExit}
          onViewResult={onSubmitted}
        />
      )}
    </StudentPageContainer>
  )
}

export default PlacementAttemptPage
