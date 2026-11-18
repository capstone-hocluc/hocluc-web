import ReviewWorkspace from '../../components/assessment/ReviewWorkspace'
import styles from '../../components/assessment/AssessmentWorkspace.module.css'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Skeleton from '../../components/ui/Skeleton'
import { usePageResource } from '../../hooks/usePageResource'
import { getAttempt, getAttemptReview, getQuiz, type QuizReview } from '../../services/assessmentService'
import { ApiError } from '../../lib/api'

interface QuizReviewPageProps {
  attemptId: string
  onBackToQuiz: (quizId: string) => void
  backLabel?: string
  onOpenCompetency?: (courseId: string) => void
}

function QuizReviewPage({ attemptId, onBackToQuiz, backLabel = 'Quay lại bài kiểm tra', onOpenCompetency }: QuizReviewPageProps) {
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
    const allowsReview = quiz.type === 'PLACEMENT' || quiz.showAnswers
    let answersHidden = !allowsReview
    let reviewFailed = false
    if (allowsReview) {
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

  return <StudentPageContainer width="fluid" className={styles.page}>
    <ResourceState status={status} errorMessage={errorMessage} onRetry={reload}
      loading={<><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></>}
      forbidden={{ title: 'Bạn chưa có quyền xem kết quả bài kiểm tra này.' }}
      notFound={{ title: 'Không tìm thấy kết quả bài kiểm tra.' }}
      error={{ title: 'Không thể tải kết quả bài kiểm tra.' }} />
    {status === 'ready' && data && <ReviewWorkspace key={attemptId} {...data} onRetry={reload}
      onBack={() => onBackToQuiz(data.quiz.id)} backLabel={backLabel} onOpenCompetency={onOpenCompetency} />}
  </StudentPageContainer>
}

export default QuizReviewPage
