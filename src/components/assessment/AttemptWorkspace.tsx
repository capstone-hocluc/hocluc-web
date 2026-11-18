import { useRef } from 'react'
import type { QuizQuestion } from '../../services/assessmentService'
import type { AttemptSession } from '../../hooks/useAttemptSession'
import BackLink from '../student/common/BackLink'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import Progress from '../ui/Progress'
import QuestionNavigator from './QuestionNavigator'
import QuizQuestionCard from './QuizQuestionCard'
import QuizTimer from './QuizTimer'
import SubmitQuizDialog from './SubmitQuizDialog'
import styles from './AssessmentWorkspace.module.css'

interface AttemptWorkspaceProps {
  session: AttemptSession
  questions: QuizQuestion[]
  title?: string
  onExit: () => void
  onViewResult: () => void
}

function AttemptWorkspace({ session, questions, title = 'Bài thi', onExit, onViewResult }: AttemptWorkspaceProps) {
  const { attempt, currentIndex, setCurrentIndex, selectedAnswers, inputsDisabled, submitting } = session
  const questionRefs = useRef(new Map<string, HTMLDivElement>())
  const currentQuestion = questions[currentIndex] ?? questions[0]
  if (!attempt) return null
  if (attempt.status !== 'IN_PROGRESS') return <div className={styles.attempt}>
    <BackLink onClick={onExit}>Quay lại bài kiểm tra</BackLink>
    <Notice className="justify-between"><span>Lượt làm này đã kết thúc.</span>{attempt.status === 'GRADED' && <Button shape="pill" size="sm" onClick={onViewResult}>Xem kết quả</Button>}</Notice>
  </div>
  if (!currentQuestion) return <Notice>Đề thi chưa có câu hỏi để hiển thị.</Notice>

  const goToQuestion = (questionId: string) => {
    const index = questions.findIndex(question => question.id === questionId)
    if (index < 0) return
    setCurrentIndex(index)
    const target = questionRefs.current.get(questionId)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  return <div className={styles.attempt}>
    <header className={styles.attemptHeader}>
      <h1>{title}</h1>
      {!submitting && <BackLink onClick={onExit}>Thoát bài kiểm tra</BackLink>}
    </header>
    <div className={styles.attemptGrid}>
      <aside className={styles.controls} aria-label="Thời gian và tiến độ làm bài">
        {session.isActive && (attempt.deadlineAt ? <QuizTimer deadlineAt={attempt.deadlineAt} onExpire={session.handleExpire} /> : <Notice>Không giới hạn thời gian</Notice>)}
        {session.expired ? <Notice tone="warning"><div className="space-y-2"><p>{submitting ? 'Hết giờ. Đang nộp bài…' : 'Hết giờ. Chưa xác nhận được kết quả nộp bài.'}</p>{!submitting && <Button size="sm" appearance="outline" onClick={() => void session.retryExpiredSubmit()}>Thử nộp lại</Button>}</div></Notice>
          : session.failedQuestionIds.size > 0 ? <Notice tone="danger"><div className="space-y-2"><p>Còn {session.failedQuestionIds.size} đáp án chưa lưu. Hãy lưu lại trước khi nộp bài.</p><Button size="sm" appearance="outline" disabled={inputsDisabled} onClick={session.retryFailedAnswers}>Lưu lại đáp án</Button></div></Notice> : null}
        <section className={styles.navigator} aria-label="Tiến độ làm bài">
          <div><div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Tiến độ làm bài</h2><strong className="text-sm text-primary-text">{session.answeredCount}/{questions.length}</strong></div>
            <Progress value={questions.length ? session.answeredCount / questions.length * 100 : 0} aria-label="Tỷ lệ câu đã trả lời" />
            <p className="mt-2 text-xs text-text-secondary">Đã trả lời {session.answeredCount}/{questions.length} câu</p>
          </div>
          <nav aria-label="Danh sách câu hỏi"><QuestionNavigator questions={questions} currentQuestionId={currentQuestion.id} answeredQuestionIds={new Set(Object.keys(selectedAnswers))} disabled={submitting} onSelect={goToQuestion} /></nav>
          <ul className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-text-secondary">
            <li className="flex items-center gap-1.5"><span className="size-3 rounded border border-primary bg-primary" />Đang chọn</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded border border-line-brand bg-surface-brand" />Đã trả lời</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded border border-line bg-surface" />Chưa làm</li>
          </ul>
          <Button disabled={inputsDisabled} onClick={() => session.setShowSubmitDialog(true)}>Nộp bài</Button>
        </section>
      </aside>
      <div className={styles.questions} role="region" aria-label="Nội dung đề thi" tabIndex={0}>
        {questions.map((question, index) => <div key={question.id} className={styles.question} tabIndex={-1}
          ref={element => { if (element) questionRefs.current.set(question.id, element); else questionRefs.current.delete(question.id) }}
          onFocusCapture={() => setCurrentIndex(index)}>
          <QuizQuestionCard question={question} index={index} total={questions.length} selectedOptionId={selectedAnswers[question.id] || null}
            saving={session.savingQuestionIds.has(question.id)} saveFailed={session.failedQuestionIds.has(question.id)} disabled={inputsDisabled}
            onSelectOption={optionId => { setCurrentIndex(index); session.selectOption(question.id, optionId) }} />
        </div>)}
        <div className={styles.endAction}><Button disabled={inputsDisabled} onClick={() => session.setShowSubmitDialog(true)}>Nộp bài</Button></div>
      </div>
    </div>
    {session.showSubmitDialog && <SubmitQuizDialog answeredCount={session.answeredCount} totalQuestions={questions.length} submitting={submitting} onCancel={() => session.setShowSubmitDialog(false)} onConfirm={session.handleConfirmSubmit} />}
  </div>
}

export default AttemptWorkspace
