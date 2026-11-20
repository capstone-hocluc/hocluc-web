import { ArrowRight, Clock3, FileQuestion, Lock } from '../../console/icons'
import Button from '../../ui/Button'
import StatusBadge from '../../ui/StatusBadge'
import { formatDateTime } from '../../../lib/courseFormat'
import { getAssessmentLockMessage } from '../../../lib/quizLock'
import type { CourseExamSummary } from '../../../services/courseService'
import styles from './CourseExams.module.css'
import { hasCompletedExam } from './courseExamState'

const lockLabels: Record<string, string> = {
  NOT_OPEN_YET: 'Chưa mở',
  CLOSED: 'Đã đóng',
  NO_ATTEMPTS_LEFT: 'Hết lượt chính thức',
  NOT_PURCHASED: 'Chưa có quyền',
}

type ExamCardData = Pick<CourseExamSummary, 'id' | 'title' | 'questionCount' | 'durationMinutes' | 'maxAttempts' | 'bestPercentage' | 'lockReason' | 'inProgressAttemptId'> & {
  attemptsUsed: number | null
  locked: boolean | null
  passed?: boolean
  passingPercentage?: number | null
  showAnswers?: boolean
  availableFrom?: string | null
  availableUntil?: string | null
}

function CourseExamCard({ exam, onOpenQuiz, contextLabel }: { exam: ExamCardData; onOpenQuiz: (quizId: string) => void; contextLabel?: string }) {
  const completed = hasCompletedExam(exam)
  const stateLabel = exam.locked ? lockLabels[exam.lockReason ?? ''] ?? 'Chưa khả dụng'
    : exam.inProgressAttemptId ? 'Đang làm'
      : exam.passed ? 'Đã đạt' : completed ? 'Đã làm' : 'Chưa làm'
  const actionLabel = exam.locked ? 'Xem chi tiết' : exam.inProgressAttemptId ? 'Tiếp tục' : 'Xem đề'

  return (
    <article role="listitem" className={styles.card} data-completed={completed || undefined} data-active={Boolean(exam.inProgressAttemptId) && !exam.locked || undefined}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true"><FileQuestion size={24} /></span>
        <div className="min-w-0">
          <h3 className={styles.title}>{exam.title}</h3>
          {contextLabel && <p className="mt-1 text-xs text-text-secondary">{contextLabel}</p>}
          <div className={styles.meta}>
            <span>{exam.questionCount} câu hỏi</span>
            <span><Clock3 size={13} aria-hidden="true" />{exam.durationMinutes != null && exam.durationMinutes > 0 ? `${exam.durationMinutes} phút` : 'Không giới hạn thời gian'}</span>
          </div>
        </div>
      </div>

      <dl className={styles.stats}>
        <div><dt>Lượt chính thức</dt><dd>{exam.attemptsUsed == null ? 'Chưa có dữ liệu' : `${exam.attemptsUsed}/${exam.maxAttempts}`}</dd></div>
        <div><dt>Điểm cao nhất</dt><dd>{exam.bestPercentage != null ? `${exam.bestPercentage}%` : 'Chưa có điểm'}</dd></div>
        {exam.passingPercentage != null && <div><dt>Mức đạt</dt><dd>{exam.passingPercentage}%</dd></div>}
        <div><dt>Đáp án sau nộp</dt><dd>{exam.showAnswers == null ? 'Xem trong chi tiết đề' : exam.showAnswers ? 'Được công bố' : 'Không công bố'}</dd></div>
      </dl>

      {(exam.availableFrom || exam.availableUntil) && (
        <div className={styles.availability}>
          {exam.availableFrom && <p>Mở: <time dateTime={exam.availableFrom}>{formatDateTime(exam.availableFrom)}</time></p>}
          {exam.availableUntil && <p>Đóng: <time dateTime={exam.availableUntil}>{formatDateTime(exam.availableUntil)}</time></p>}
        </div>
      )}
      {exam.locked && <p className={styles.lockMessage}><Lock size={14} aria-hidden="true" />{getAssessmentLockMessage(exam.lockReason)}</p>}
      <div className={styles.footer}>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={exam.locked ? 'locked' : completed && !exam.inProgressAttemptId ? 'success' : 'primary'} size="sm">{stateLabel}</StatusBadge>
          {completed && !exam.locked && exam.inProgressAttemptId && <StatusBadge tone="success" size="sm">Đã làm</StatusBadge>}
        </div>
        {/* Read as the words on the button, then which exam it opens. */}
        <Button size="sm" shape="pill" appearance={exam.locked ? 'outline' : 'fill'} onClick={() => onOpenQuiz(exam.id)}>
          {actionLabel}<span className="sr-only"> {exam.title}</span><ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}

export default CourseExamCard
