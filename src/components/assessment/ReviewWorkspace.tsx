import { useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileText } from '../console/icons'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import QuizReviewQuestionCard from './QuizReviewQuestionCard'
import type { QuizDetail, QuizAttemptSummary, QuizReview } from '../../services/assessmentService'
import { bySequence } from '../../lib/sequence'
import { formatDateTime } from '../../lib/courseFormat'
import { quizTypeLabel } from '../../lib/quiz-types'
import styles from './AssessmentWorkspace.module.css'
import reviewStyles from './ReviewWorkspace.module.css'

type Filter = 'all' | 'correct' | 'incorrect' | 'unanswered'
const verdict = (question: QuizReview['questions'][number]) => !question.answered ? 'unanswered' : question.correct ? 'correct' : 'incorrect'
const labels = { all: 'Tất cả', correct: 'Đúng', incorrect: 'Sai', unanswered: 'Chưa trả lời' }

export default function ReviewWorkspace({ quiz, result, review, answersHidden, reviewFailed, onRetry, onBack, backLabel, onOpenCompetency }: {
  quiz: QuizDetail; result: QuizAttemptSummary; review: QuizReview | null; answersHidden: boolean; reviewFailed: boolean;
  onRetry: () => void; onBack: () => void; backLabel: string; onOpenCompetency?: (courseId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [activeId, setActiveId] = useState('')
  const refs = useRef(new Map<string, HTMLDivElement>())
  const questions = bySequence(review?.questions ?? [])
  const counts = { all: questions.length, correct: questions.filter(question => verdict(question) === 'correct').length, incorrect: questions.filter(question => verdict(question) === 'incorrect').length, unanswered: questions.filter(question => verdict(question) === 'unanswered').length }
  const visible = questions.filter(question => filter === 'all' || verdict(question) === filter)
  const active = visible.some(question => question.questionId === activeId) ? activeId : visible[0]?.questionId
  const goToQuestion = (id: string) => {
    setActiveId(id)
    const target = refs.current.get(id)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  return <div className={styles.attempt}>
    <header className={styles.attemptHeader}><div><p className="text-xs text-text-secondary">Xem lại bài đã làm</p><h1>{quiz.title}</h1></div><Button appearance="outline" size="sm" onClick={onBack}><ArrowLeft size={16} />{backLabel}</Button></header>
    <div className={styles.attemptGrid}>
      <aside className={styles.controls} aria-label="Kết quả và danh sách câu hỏi">
        <section className={reviewStyles.summary} aria-label="Kết quả bài kiểm tra">
          <div className={reviewStyles.banner}><span><FileText size={16} />{quizTypeLabel(quiz.type)}</span><p>Kết quả bài kiểm tra</p><strong>{result.percentage}%</strong>{result.maxScore != null && <p>Điểm: {result.score}/{result.maxScore}</p>}</div>
          <div className={reviewStyles.summaryBody}><p>Lần làm {result.attemptNumber}{result.mode === 'PRACTICE' ? ' · Luyện tập' : result.mode === 'EXAM' ? ' · Thi chính thức' : ''}</p><p>Thời gian làm bài: {Number.isFinite(result.timeSpentSeconds) ? `${Math.floor(result.timeSpentSeconds / 60)} phút ${result.timeSpentSeconds % 60} giây` : 'Chưa có dữ liệu'}</p>{result.submittedAt && <p>Đã nộp: {formatDateTime(result.submittedAt)}</p>}
            {review && <div className={reviewStyles.stats}><span><b>{review.correctCount}/{review.totalQuestions}</b> câu đúng</span><span><b>{counts.incorrect}</b> câu sai</span><span><b>{counts.unanswered}</b> chưa trả lời</span></div>}
          </div>
        </section>
        {review && <section className={styles.navigator} aria-label="Điều hướng xem lại bài"><h2 className="text-sm font-bold">Danh sách câu hỏi</h2><nav className={reviewStyles.numbers} aria-label="Danh sách câu hỏi">{visible.map(question => {
          const index = questions.findIndex(item => item.questionId === question.questionId)
          const status = verdict(question)
          return <button type="button" key={question.questionId} aria-label={`Câu ${index + 1}, ${labels[status]}`} aria-current={active === question.questionId ? 'step' : undefined} data-verdict={status} onClick={() => goToQuestion(question.questionId)}>{index + 1}</button>
        })}</nav><p className="text-xs leading-5 text-text-secondary">Xanh lá: đúng · Đỏ: sai · Xám: chưa trả lời</p></section>}
        {quiz.type === 'PLACEMENT' && quiz.sectionCourseId && onOpenCompetency && <Button size="sm" appearance="outline" onClick={() => onOpenCompetency(quiz.sectionCourseId!)}>Xem đánh giá năng lực</Button>}
      </aside>
      <section className={styles.questions} aria-label="Nội dung xem lại bài" tabIndex={0}>
        {quiz.type === 'PLACEMENT' && !quiz.sectionCourseId && <Notice>Đề này không gắn với khóa học. Kết quả được lưu trong lịch sử của đề, không cộng vào đánh giá năng lực theo khóa.</Notice>}
        {answersHidden && <div className={reviewStyles.unavailable}><CheckCircle2 size={32} /><h2 className="text-lg font-bold">Bài làm đã được chấm</h2><Notice>Bài kiểm tra này không hiển thị đáp án sau khi nộp.</Notice></div>}
        {reviewFailed && <Notice tone="warning">Không thể tải chi tiết đáp án.<Button size="sm" appearance="outline" onClick={onRetry}>Thử lại</Button></Notice>}
        {review && <><div className={reviewStyles.detailsHeader}><h2 className="text-lg font-bold">Chi tiết bài làm</h2><span className="text-xs text-text-secondary">{visible.length}/{questions.length} câu hỏi</span></div><div role="group" aria-label="Lọc câu hỏi xem lại" className={reviewStyles.filters}>{(Object.keys(labels) as Filter[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setActiveId('') }}>{labels[key]}<span>{counts[key]}</span></button>)}</div>
          {visible.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">Không có câu hỏi trong mục này.</p>}
          {visible.map(question => <div key={question.questionId} className={styles.question} tabIndex={-1} onFocusCapture={() => setActiveId(question.questionId)} ref={element => { if (element) refs.current.set(question.questionId, element); else refs.current.delete(question.questionId) }}><QuizReviewQuestionCard question={question} index={questions.findIndex(item => item.questionId === question.questionId)} /></div>)}
        </>}
      </section>
    </div>
  </div>
}
