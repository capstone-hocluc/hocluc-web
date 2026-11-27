import { useState } from 'react'
import { Clock, FileText, ListChecks, Lock, RotateCcw, Target } from '../../components/console/icons'
import QuizAttemptHistory from '../../components/assessment/QuizAttemptHistory'
import BackLink from '../../components/student/common/BackLink'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import Skeleton from '../../components/ui/Skeleton'
import { usePageResource } from '../../hooks/usePageResource'
import { getQuiz, startQuizAttempt, type QuizDetail } from '../../services/assessmentService'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast } from '../../lib/toastBus'
import { getAssessmentLockMessage } from '../../lib/quizLock'
import { quizTypeLabel, quizRequirement } from '../../lib/quiz-types'
import styles from '../../components/assessment/AssessmentWorkspace.module.css'

interface QuizDetailPageProps {
  quizId: string
  onBack: (quiz: QuizDetail | null) => void
  onStartAttempt: (quizId: string, attemptId: string) => void
  onOpenReview: (attemptId: string) => void
  onOpenCompetency?: (courseId: string) => void
}

function QuizDetailPage({ quizId, onBack, onStartAttempt, onOpenReview, onOpenCompetency }: QuizDetailPageProps) {
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
    <StudentPageContainer width="fluid" spacing="stack">
      {status !== 'loading' && <BackLink onClick={() => onBack(quiz)}>Quay lại</BackLink>}
      <ResourceState status={status} errorMessage={errorMessage} onRetry={reload}
        loading={<Skeleton className="h-[260px] rounded-xl" />}
        forbidden={{ title: getAssessmentLockMessage(null) }}
        notFound={{ title: 'Không tìm thấy bài kiểm tra.' }} error={{ title: 'Không thể tải bài kiểm tra.' }} />
      {status === 'ready' && quiz && <div className={styles.overview}>
        <section className={styles.intro} aria-label="Thông tin bài thi">
          <div className={styles.introBanner}>
          <header className={styles.introTitle}><span className={styles.introIcon}><FileText size={20} /></span><div><p className={styles.type}>{quizTypeLabel(quiz.type)}</p><h1>{quiz.title}</h1></div></header>
          {quiz.description && <p className="text-sm leading-relaxed text-text-body">{quiz.description}</p>}
          <div className={styles.metadata}>
            <span><ListChecks size={16} />{quiz.questionCount} câu hỏi</span>
            <span><Clock size={16} />{quiz.durationMinutes ? quiz.durationMinutes + ' phút' : 'Không giới hạn thời gian'}</span>
            <span><RotateCcw size={16} />Lượt làm: {quiz.attemptsUsed}/{quiz.maxAttempts}</span>
            {quiz.passingPercentage != null && <span><Target size={16} />Điểm đạt: {quiz.passingPercentage}%</span>}
          </div>
          <div className={styles.introAction}>{quiz.locked ? <Notice tone="danger"><Lock size={16} />{getAssessmentLockMessage(quiz.lockReason)}</Notice>
            : quiz.inProgressAttemptId ? (!quiz.attempts.some(attempt => attempt.attemptId === quiz.inProgressAttemptId) && <Button size="sm" shape="pill" onClick={handleContinue}>Tiếp tục làm bài</Button>)
            : <Button size="sm" shape="pill" onClick={handleStart} disabled={starting}>{starting ? 'Đang bắt đầu...' : 'Bắt đầu làm bài'}</Button>}</div>
          </div>
          <QuizAttemptHistory attempts={quiz.attempts} allowReview={quiz.type === 'PLACEMENT' || quiz.showAnswers} onOpenReview={onOpenReview}
            inProgressAttemptId={quiz.inProgressAttemptId} onContinue={!quiz.locked ? handleContinue : undefined} />
        </section>
        <aside className={styles.scoreAside} aria-label="Điểm số bài thi">
          <div className={styles.scoreHighlight}>
          <div className={styles.scoreNote}><p>Điểm cập nhật theo lần thi chính thức có kết quả cao nhất.</p><img src="/mascot/07.png" alt="" width={148} height={112} /></div>
          <section className={styles.scoreCard}><h2>Điểm số</h2><div className={styles.scoreValue}><span>Kết quả cao nhất</span><strong>{quiz.bestPercentage == null ? '–' : quiz.bestPercentage + '%'}</strong></div>
            {quiz.bestPercentage == null && <p className="text-xs text-text-secondary">Chưa có kết quả thi chính thức.</p>}
            {quiz.passed && <p className="text-sm font-semibold text-badge-success-text">Đã đạt yêu cầu</p>}
          </section>
          </div>
          {quizRequirement(quiz.type) && <p className="px-2 text-xs leading-relaxed text-text-secondary">{quizRequirement(quiz.type)}</p>}
          {quiz.type === 'PLACEMENT' && quiz.sectionCourseId && onOpenCompetency && <Button appearance="outline" size="sm" onClick={() => onOpenCompetency(quiz.sectionCourseId!)}>Xem đánh giá năng lực</Button>}
        </aside>
      </div>}
    </StudentPageContainer>
  )
}

export default QuizDetailPage
