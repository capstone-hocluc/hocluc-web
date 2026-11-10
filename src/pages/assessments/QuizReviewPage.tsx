import QuizResultSummary from '../../components/assessment/QuizResultSummary'
import QuizReviewQuestionCard from '../../components/assessment/QuizReviewQuestionCard'
import BackLink from '../../components/student/common/BackLink'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import { usePageResource } from '../../hooks/usePageResource'
import { getAttempt, getAttemptReview, getQuiz, type QuizReview } from '../../services/assessmentService'
import { ApiError } from '../../lib/api'
import { bySequence } from '../../lib/sequence'

interface QuizReviewPageProps {
  attemptId: string
  onBackToQuiz: (quizId: string) => void
}

function QuizReviewPage({ attemptId, onBackToQuiz }: QuizReviewPageProps) {
  const {
    data,
    status,
    errorMessage,
    reload,
  } = usePageResource(async () => {
    const attempt = await getAttempt(attemptId)
    const quiz = await getQuiz(attempt.quizId)
    const result = quiz.attempts.find((item) => item.attemptId === attemptId && item.status === 'GRADED')
    if (!result || result.percentage == null) {
      throw new Error('Lượt làm này chưa có điểm. Hãy kiểm tra lại sau.')
    }

    let review: QuizReview | null = null
    let answersHidden = !quiz.showAnswers
    let reviewFailed = false
    if (quiz.showAnswers) {
      try {
        review = await getAttemptReview(attemptId)
      } catch (error) {
        // The setting may change between loading the quiz and requesting its answer key.
        answersHidden = error instanceof ApiError && error.code === 'REVIEW_NOT_AVAILABLE'
        reviewFailed = !answersHidden
      }
    }
    return { quiz, result, review, answersHidden, reviewFailed }
  }, [attemptId])

  return (
    <StudentPageContainer width="reading" spacing="stack">
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <>
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </>
        }
        forbidden={{ title: 'Bạn chưa có quyền xem kết quả bài kiểm tra này.' }}
        notFound={{ title: 'Không tìm thấy kết quả bài kiểm tra.' }}
        error={{ title: 'Không thể tải kết quả bài kiểm tra.' }}
      />

      {status === 'ready' && data && (
        <>
          <BackLink onClick={() => onBackToQuiz(data.quiz.id)}>Quay lại bài kiểm tra</BackLink>

          <QuizResultSummary title={data.quiz.title} result={data.result} review={data.review} />

          {data.answersHidden && <Notice>Bài kiểm tra này không hiển thị đáp án sau khi nộp.</Notice>}
          {data.reviewFailed && (
            <Notice tone="warning">
              Không thể tải chi tiết đáp án.
              <Button size="sm" appearance="outline" onClick={reload}>Thử lại</Button>
            </Notice>
          )}
          {data.review && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold tracking-[-0.2px] text-text-heading">
                Chi tiết bài làm
              </h2>
              <div className="flex flex-col gap-4">
                {bySequence(data.review.questions).map((question, index) => (
                  <QuizReviewQuestionCard
                    key={question.questionId}
                    question={question}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </StudentPageContainer>
  )
}

export default QuizReviewPage
