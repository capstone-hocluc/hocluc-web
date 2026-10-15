import QuizReviewQuestionCard from '../../components/assessment/QuizReviewQuestionCard'
import BackLink from '../../components/student/common/BackLink'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import { usePageResource } from '../../hooks/usePageResource'
import { getAttemptReview } from '../../services/assessmentService'
import { bySequence } from '../../lib/sequence'

interface PlacementReviewPageProps {
  attemptId: string
  onBack: () => void
}

// The placement test definition has no showAnswers-style flag (unlike a
// course quiz), so unlike QuizReviewPage this never gates the per-question
// breakdown behind a lookup - it's always shown once the review loads.
function PlacementReviewPage({ attemptId, onBack }: PlacementReviewPageProps) {
  const {
    data: review,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getAttemptReview(attemptId), [attemptId], { forbidden: false })

  return (
    <StudentPageContainer width="reading" spacing="stack">
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </>
        }
        notFound={{
          title: 'Không tìm thấy kết quả bài làm.',
          actionLabel: 'Quay lại',
          onAction: onBack,
        }}
        error={{ title: 'Không thể tải kết quả bài làm.' }}
      />

      {status === 'ready' && review && (
        <>
          <BackLink onClick={onBack}>Quay lại kết quả</BackLink>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-black tracking-[-0.2px] text-text-heading">Xem lại đáp án</h2>
            <div className="flex flex-col gap-4">
              {bySequence(review.questions).map((question, index) => (
                <QuizReviewQuestionCard
                  key={question.questionId}
                  question={question}
                  index={index}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </StudentPageContainer>
  )
}

export default PlacementReviewPage
