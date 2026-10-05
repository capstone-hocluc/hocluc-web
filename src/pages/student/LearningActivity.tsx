import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react'
import { findCourseActivity, getActivityRouteType } from '../../data/courseLookup'
import { useTransientMessage } from '../../hooks/useTransientMessage'
import StudentToast from '../../components/student/common/StudentToast'
import MascotState from '../../components/common/MascotState'
import ActivityButton from '../../components/student/activity/ActivityButton'
import {
  ActivityCard,
  ActivityCardTitle,
  ActivityHeader,
} from '../../components/student/activity/ActivityCard'
import {
  FilterPills,
  LessonActions,
  PageNav,
  SubmitConfirmModal,
} from '../../components/student/activity/ActivityParts'
import ActivityShell from '../../components/student/activity/ActivityShell'
import { getAnswerState } from '../../components/student/activity/answerState'
import { QuestionCard, ReviewQuestionCard } from '../../components/student/activity/QuestionCards'
import QuestionTracker from '../../components/student/activity/QuestionTracker'
import ResultSummaryCard, { AttemptHistory } from '../../components/student/activity/ResultSummary'
import type { ActivityAttempt, ActivityQuestion } from '../../components/student/activity/types'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Card from '../../components/ui/Card'

const pageSize = 10

const questionOptions = [
  { id: 'A', text: 'Xác định ý chính của đoạn văn' },
  { id: 'B', text: 'Loại bỏ toàn bộ ví dụ minh họa' },
  { id: 'C', text: 'Chỉ đọc câu cuối cùng' },
  { id: 'D', text: 'Bỏ qua dữ kiện trong đề' },
]

const reviewFilters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'correct', label: 'Câu đúng' },
  { key: 'incorrect', label: 'Câu sai' },
  { key: 'unanswered', label: 'Chưa trả lời' },
]

function getActivityMeta(activity) {
  return [
    activity.questionCount ? `${activity.questionCount} câu` : '',
    activity.duration || '',
    activity.deadline ? `Hạn ${activity.deadline}` : '',
  ].filter(Boolean)
}

function VideoScreen({ activity, onAction }) {
  return (
    <>
      <ActivityHeader
        label={activity.type === 'Buổi giải đề' ? 'Buổi giải đề' : 'Video'}
        title={activity.title}
        meta={getActivityMeta(activity).join(' · ')}
      />
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] gap-3.5 max-[760px]:grid-cols-1">
        <ActivityCard>
          <div className="grid aspect-video place-items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#eaf8fc,#f8fbff)] text-primary">
            <Play size={40} />
            <span className="text-[13px] font-bold">Video bài học</span>
          </div>
          <p className="mt-2.5 text-[12px] font-medium text-text-secondary">{activity.duration}</p>
        </ActivityCard>
        <ActivityCard>
          <ActivityCardTitle>Mục tiêu bài học</ActivityCardTitle>
          <ul className="grid gap-2 pl-[18px] text-[13px] leading-[1.5] font-medium text-text-dim">
            <li>Xác định được ý chính của nội dung học.</li>
            <li>Nhận diện thông tin quan trọng trong câu hỏi ĐGNL.</li>
            <li>Áp dụng kiến thức vào bài luyện tập tiếp theo.</li>
          </ul>
        </ActivityCard>
      </div>
      <LearningActions primaryLabel="Đánh dấu hoàn thành" onAction={onAction} />
    </>
  )
}

function createQuestions(activity, total): ActivityQuestion[] {
  return Array.from({ length: total }, (_, index) => {
    const correctAnswer = ['A', 'B', 'C', 'D'][index % 4]

    return {
      id: `q-${index + 1}`,
      number: index + 1,
      type: 'single-choice',
      content: `Câu hỏi ${index + 1} cho nội dung "${activity.title}". Đọc dữ kiện và chọn đáp án phù hợp nhất.`,
      options: questionOptions,
      correctAnswer,
      explanation: `Đáp án ${correctAnswer} đúng vì phương án này bám sát yêu cầu chính của câu hỏi và không bỏ qua dữ kiện quan trọng trong đề.`,
    }
  })
}

function parseDurationToSeconds(duration, fallbackMinutes) {
  const minutes = Number.parseInt(String(duration).match(/\d+/)?.[0] || '', 10) || fallbackMinutes
  return minutes * 60
}

function formatClock(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds]
  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}

function createSeedAttempt(activity, questions): ActivityAttempt[] {
  if (activity.status !== 'completed') return []

  const answers = questions.reduce((result, question, index) => {
    result[question.id] = index % 5 === 0 ? 'B' : question.correctAnswer
    return result
  }, {})
  const score = scoreAttempt(questions, answers)

  return [
    {
      id: `${activity.id}-attempt-1`,
      attemptNumber: 1,
      score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      duration: activity.duration?.replace(' phút', ':10') || '18:32',
      submittedAt: '2026-09-10T09:00:00',
      answers,
    },
  ]
}

function scoreAttempt(questions, answers) {
  return questions.reduce(
    (total, question) => (answers[question.id] === question.correctAnswer ? total + 1 : total),
    0
  )
}

function getAttemptBreakdown(questions, attempt) {
  return questions.reduce(
    (result, question) => {
      const answer = attempt.answers[question.id]
      if (!answer) result.unanswered += 1
      else if (answer === question.correctAnswer) result.correct += 1
      else result.incorrect += 1
      return result
    },
    { correct: 0, incorrect: 0, unanswered: 0 }
  )
}

function getScoreTone(percentage) {
  if (percentage >= 80) return 'success'
  if (percentage >= 60) return 'blue'
  if (percentage >= 40) return 'warning'
  return 'danger'
}

function getBestAttempt(attempts, fallback) {
  return attempts.reduce(
    (best, item) => (item.percentage > best.percentage ? item : best),
    fallback
  )
}

function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getStoredAttempts(activityId, fallback) {
  try {
    const stored = window.localStorage.getItem(`hocLucAttempts:${activityId}`)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveStoredAttempts(activityId, attempts) {
  try {
    window.localStorage.setItem(`hocLucAttempts:${activityId}`, JSON.stringify(attempts))
  } catch {
    // Local mock only; ignore storage failures.
  }
}

function ResultView({ activity, label, attempt, onReview, onRetry, history = [], onOpenAttempt }) {
  const bestAttempt = getBestAttempt(history, attempt)
  const meta = [
    activity.questionCount ? `${activity.questionCount} câu` : '',
    activity.duration || '',
  ].filter(Boolean)

  return (
    <>
      <ResultSummaryCard
        label={label}
        title={activity.title}
        meta={meta.join(' · ')}
        attempt={attempt}
        bestScore={bestAttempt.score}
        bestTotal={bestAttempt.totalQuestions}
        scoreTone={getScoreTone(bestAttempt.percentage)}
        submittedDate={formatShortDate(attempt.submittedAt)}
        onReview={() => onReview(attempt)}
        onRetry={onRetry}
      />

      {history.length > 0 && (
        <AttemptHistory
          items={history.map((item) => ({
            ...item,
            submittedLabel: formatSubmittedAt(item.submittedAt),
          }))}
          onOpen={onOpenAttempt}
        />
      )}
    </>
  )
}

function ReviewMode({ activity, label, questions, attempt, onBackResult }) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const filteredQuestions = questions.filter(
    (question) => filter === 'all' || filter === getAnswerState(question, attempt)
  )
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize))
  const visibleQuestions = filteredQuestions.slice((page - 1) * pageSize, page * pageSize)
  const breakdown = getAttemptBreakdown(questions, attempt)

  const setReviewFilter = (nextFilter) => {
    setFilter(nextFilter)
    setPage(1)
  }

  const jumpToQuestion = (number) => {
    setFilter('all')
    setPage(Math.ceil(number / pageSize))
    window.setTimeout(() => {
      document
        .getElementById(`review-question-${number}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  return (
    <>
      <ActivityHeader
        label={`${label} · Xem lại`}
        title={activity.title}
        meta={getActivityMeta(activity).join(' · ')}
      />
      <FilterPills items={reviewFilters} active={filter} onChange={setReviewFilter} />
      <TestLayout
        main={
          <>
            {visibleQuestions.map((question) => (
              <ReviewQuestionCard key={question.id} question={question} attempt={attempt} />
            ))}
            {visibleQuestions.length === 0 && (
              <ActivityCard className="text-center text-[13px] text-text-secondary">
                Không có câu hỏi phù hợp với bộ lọc này.
              </ActivityCard>
            )}
            <PageNav
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
            />
          </>
        }
        aside={
          <QuestionTracker
            title={`Xem lại lần ${attempt.attemptNumber}`}
            stats={[
              { label: 'Điểm', value: `${attempt.score}/${attempt.totalQuestions}` },
              { label: 'Tỷ lệ', value: `${attempt.percentage}%` },
              { label: 'Sai', value: breakdown.incorrect },
              { label: 'Chưa trả lời', value: breakdown.unanswered },
            ]}
            numbers={questions.map((question) => {
              const state = getAnswerState(question, attempt)
              return {
                number: question.number,
                state:
                  state === 'correct'
                    ? 'reviewCorrect'
                    : state === 'incorrect'
                      ? 'reviewIncorrect'
                      : 'reviewUnanswered',
                onClick: () => jumpToQuestion(question.number),
              }
            })}
            legend={[
              { label: 'Đúng', dot: 'correct' },
              { label: 'Sai', dot: 'incorrect' },
              { label: 'Chưa trả lời', dot: 'unanswered' },
            ]}
            actionLabel="Quay lại kết quả"
            onAction={onBackResult}
          />
        }
      />
    </>
  )
}

// Questions on the left, sticky tracker on the right (stacked on mobile).
function TestLayout({ main, aside }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-3.5 max-[760px]:grid-cols-1">
      <main className="grid gap-3">{main}</main>
      {aside}
    </div>
  )
}

function QuestionTakingScreen({ activity, mode }) {
  const totalQuestions =
    activity.questionCount || (mode === 'mock-test' ? 120 : mode === 'mini-test' ? 20 : 10)
  const questions = useMemo(
    () => createQuestions(activity, totalQuestions),
    [activity, totalQuestions]
  )
  const label = mode === 'mock-test' ? 'Mock Test' : mode === 'mini-test' ? 'Mini Test' : 'Bài tập'
  const [attempts, setAttempts] = useState(() =>
    getStoredAttempts(activity.id, createSeedAttempt(activity, questions))
  )
  const [view, setView] = useState(() => (attempts.length > 0 ? 'result' : 'taking'))
  const [activeAttempt, setActiveAttempt] = useState(() => attempts[0] || null)
  const [page, setPage] = useState(1)
  const [answers, setAnswers] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const totalPages = Math.ceil(totalQuestions / pageSize)
  const visibleQuestions = questions.slice((page - 1) * pageSize, page * pageSize)
  const answeredCount = Object.keys(answers).length
  const durationSeconds = parseDurationToSeconds(
    activity.duration,
    mode === 'mock-test' ? 150 : mode === 'mini-test' ? 25 : 30
  )
  const timerText =
    mode === 'exercise'
      ? formatClock(elapsedSeconds)
      : formatClock(Math.max(durationSeconds - elapsedSeconds, 0))

  useEffect(() => {
    if (view !== 'taking') return undefined

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [view])

  const chooseAnswer = (questionId, optionId) => {
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
  }

  const startAttempt = () => {
    setAnswers({})
    setPage(1)
    setElapsedSeconds(0)
    setConfirmOpen(false)
    setView('taking')
  }

  const finishAttempt = () => {
    const score = scoreAttempt(questions, answers)
    const attempt = {
      id: `${activity.id}-attempt-${attempts.length + 1}-${Date.now()}`,
      attemptNumber: attempts.length + 1,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      duration: formatClock(elapsedSeconds),
      submittedAt: new Date().toISOString(),
      answers: { ...answers },
    }
    const nextAttempts = [attempt, ...attempts]
    setAttempts(nextAttempts)
    saveStoredAttempts(activity.id, nextAttempts)
    setActiveAttempt(attempt)
    setConfirmOpen(false)
    setView('result')
  }

  const submit = () => {
    if (answeredCount < totalQuestions) {
      setConfirmOpen(true)
      return
    }
    finishAttempt()
  }

  if (view === 'review' && activeAttempt) {
    return (
      <ReviewMode
        activity={activity}
        label={label}
        questions={questions}
        attempt={activeAttempt}
        onBackResult={() => setView('result')}
      />
    )
  }

  if (view === 'result' && activeAttempt) {
    const openAttempt = (attempt) => {
      setActiveAttempt(attempt)
      setView('review')
    }

    return (
      <ResultView
        activity={activity}
        label={label}
        attempt={activeAttempt}
        history={attempts}
        onReview={openAttempt}
        onOpenAttempt={openAttempt}
        onRetry={startAttempt}
      />
    )
  }

  return (
    <>
      <ActivityHeader
        label={label}
        title={activity.title}
        meta={getActivityMeta(activity).join(' · ')}
      />
      <TestLayout
        main={
          <>
            {visibleQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                selectedId={answers[question.id]}
                onChoose={(optionId) => chooseAnswer(question.id, optionId)}
              />
            ))}
            <PageNav
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
            />
          </>
        }
        aside={
          <QuestionTracker
            title="Theo dõi bài làm"
            stats={[
              { label: mode === 'exercise' ? 'Thời gian' : 'Còn lại', value: timerText },
              { label: 'Đã làm', value: `${answeredCount}/${totalQuestions}` },
            ]}
            numbers={questions.map((question) => {
              const active = visibleQuestions.some((item) => item.id === question.id)
              const answered = Boolean(answers[question.id])
              return {
                number: question.number,
                state:
                  answered && active
                    ? 'answeredActive'
                    : answered
                      ? 'answered'
                      : active
                        ? 'active'
                        : 'idle',
                onClick: () => setPage(Math.ceil(question.number / pageSize)),
              }
            })}
            legend={[{ label: 'Đã trả lời', dot: 'answered' }, { label: 'Chưa trả lời' }]}
            actionLabel="NỘP BÀI"
            onAction={submit}
          />
        }
      />

      {confirmOpen && (
        <SubmitConfirmModal onContinue={() => setConfirmOpen(false)} onSubmit={finishAttempt} />
      )}
    </>
  )
}

function LearningActions({ primaryLabel, onAction }) {
  return (
    <LessonActions>
      <ActivityButton block onClick={() => onAction('Điều hướng bài trước đang được phát triển.')}>
        <ArrowLeft size={15} />
        Bài trước
      </ActivityButton>
      <ActivityButton
        tone="primary"
        block
        onClick={() => onAction('Tiến độ đã được cập nhật mô phỏng.')}
      >
        <CheckCircle2 size={15} />
        {primaryLabel}
      </ActivityButton>
      <ActivityButton
        block
        onClick={() => onAction('Điều hướng bài tiếp theo đang được phát triển.')}
      >
        Bài tiếp theo
        <ArrowRight size={15} />
      </ActivityButton>
    </LessonActions>
  )
}

function LearningActivity({ courseId, routeType, activityId, onBack }) {
  const { message, show: showMessage } = useTransientMessage(2400)
  const context = findCourseActivity(courseId, activityId)
  const activity = context?.activity
  const expectedRouteType = activity ? getActivityRouteType(activity) : ''
  const invalid = !context || expectedRouteType !== routeType

  if (invalid) {
    return (
      <StudentPageContainer>
        <Card padding="lg" radius="xl">
          <MascotState
            title="Không tìm thấy nội dung học"
            message="Nội dung này không tồn tại hoặc chưa được thêm vào."
            actionLabel="Quay lại khóa học"
            onAction={onBack}
          />
        </Card>
      </StudentPageContainer>
    )
  }

  return (
    <ActivityShell
      courseTitle={context.course.title}
      subjectTitle={context.subjectTitle}
      chapterTitle={context.chapterTitle}
      onBack={onBack}
    >
      {routeType === 'lessons' && <VideoScreen activity={activity} onAction={showMessage} />}
      {routeType === 'exercises' && <QuestionTakingScreen activity={activity} mode="exercise" />}
      {routeType === 'mini-tests' && <QuestionTakingScreen activity={activity} mode="mini-test" />}
      {routeType === 'mock-tests' && <QuestionTakingScreen activity={activity} mode="mock-test" />}
      <StudentToast message={message} />
    </ActivityShell>
  )
}

export default LearningActivity
