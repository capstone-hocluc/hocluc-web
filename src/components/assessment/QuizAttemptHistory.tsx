import { useState } from 'react'
import type { QuizAttemptSummary } from '../../services/assessmentService'
import { getAttemptStatusLabel } from '../../lib/attemptStatus'
import { formatDateTime } from '../../lib/courseFormat'
import Button from '../ui/Button'
import styles from './AssessmentWorkspace.module.css'

interface QuizAttemptHistoryProps {
  attempts: QuizAttemptSummary[]
  allowReview: boolean
  onOpenReview: (attemptId: string) => void
  inProgressAttemptId?: string | null
  onContinue?: () => void
}

function QuizAttemptHistory({ attempts, allowReview, onOpenReview, inProgressAttemptId, onContinue }: QuizAttemptHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...attempts].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.attemptNumber - a.attemptNumber)
  const open = sorted.find(attempt => attempt.attemptId === inProgressAttemptId)
  const pinned = open ? [open, ...sorted.filter(attempt => attempt !== open)] : sorted
  return <section className={styles.history} aria-label="Lịch sử làm bài">
    <h2>Lịch sử làm bài</h2>
    {pinned.length ? <ul>{(showAll ? pinned : pinned.slice(0, 2)).map(attempt => {
      const graded = attempt.status === 'GRADED'
      return <li key={attempt.attemptId} className={styles.attemptRow}>
        <span className={styles.attemptScore} data-graded={graded || undefined}>{graded && attempt.percentage != null ? attempt.percentage + '%' : '–'}</span>
        <div className={styles.attemptMeta}>
          <h3>Làm bài lần {attempt.attemptNumber}{attempt.mode === 'PRACTICE' ? ' · Luyện tập' : ''}</h3>
          <p>{graded ? 'Đã nộp: ' + formatDateTime(attempt.submittedAt || attempt.startedAt) : attempt.status === 'IN_PROGRESS' ? 'Bạn chưa nộp bài' : getAttemptStatusLabel(attempt.status)}</p>
        </div>
        {graded ? <Button appearance="ghost" size="sm" onClick={() => onOpenReview(attempt.attemptId)}>{allowReview ? 'Xem lại' : 'Xem kết quả'}</Button>
          : attempt.attemptId === inProgressAttemptId && onContinue ? <Button appearance="outline" shape="pill" size="sm" onClick={onContinue}>Tiếp tục làm bài</Button> : null}
      </li>
    })}</ul> : <p className="py-4 text-sm text-text-secondary">Bạn chưa có lượt làm. Bắt đầu bài thi khi đã sẵn sàng.</p>}
    {pinned.length > 2 && <div className={styles.showAll}><Button appearance="ghost" size="sm" onClick={() => setShowAll(value => !value)}>{showAll ? 'Thu gọn' : 'Xem tất cả (' + pinned.length + ')'}</Button></div>}
  </section>
}

export default QuizAttemptHistory
