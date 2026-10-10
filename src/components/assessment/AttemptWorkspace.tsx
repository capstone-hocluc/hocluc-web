import { ArrowLeft, ArrowRight } from '../console/icons'
import type { QuizQuestion } from '../../services/assessmentService'
import type { AttemptSession } from '../../hooks/useAttemptSession'
import BackLink from '../student/common/BackLink'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import QuestionNavigator from './QuestionNavigator'
import QuizQuestionCard from './QuizQuestionCard'
import QuizTimer from './QuizTimer'
import SubmitQuizDialog from './SubmitQuizDialog'

interface AttemptWorkspaceProps {
  session: AttemptSession
  /** Questions in display order. */
  questions: QuizQuestion[]
  onExit: () => void
  onViewResult: () => void
}

// The "taking a test" screen (question, prev/next, timer, navigator, submit)
// shared by course quizzes and the placement test. All state lives in the
// useAttemptSession() the page passes in.
function AttemptWorkspace({ session, questions, onExit, onViewResult }: AttemptWorkspaceProps) {
  const { attempt, currentIndex, setCurrentIndex, selectedAnswers, inputsDisabled, submitting } =
    session
  const currentQuestion = questions[currentIndex] || null
  if (!attempt || !currentQuestion) return null

  const isLast = currentIndex === questions.length - 1

  return (
    <>
      <BackLink onClick={onExit}>Thoát bài kiểm tra</BackLink>

      {attempt.status !== 'IN_PROGRESS' && (
        <Notice tone="warning" className="justify-between">
          <span>Bài làm này đã được nộp.</span>
          <Button
            shape="pill"
            size="sm"
            className="h-auto px-4 py-2 text-[12.5px] font-extrabold"
            onClick={onViewResult}
          >
            Xem kết quả
          </Button>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-[18px] min-[860px]:grid-cols-[minmax(0,1fr)_260px] min-[860px]:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <QuizQuestionCard
            question={currentQuestion}
            index={currentIndex}
            total={questions.length}
            selectedOptionId={selectedAnswers[currentQuestion.id] || null}
            saving={session.savingQuestionIds.has(currentQuestion.id)}
            saveFailed={session.failedQuestionIds.has(currentQuestion.id)}
            disabled={inputsDisabled}
            onSelectOption={(optionId) => session.selectOption(currentQuestion.id, optionId)}
          />

          <div className="flex items-center justify-between gap-3 max-[640px]:flex-col-reverse [&>button]:max-[640px]:w-full">
            <Button
              appearance="outline"
              shape="pill"
              className="h-11 border-[1.5px] px-5 text-[13.5px] font-bold text-text-heading"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft size={16} />
              Câu trước
            </Button>

            {isLast ? (
              <Button
                shape="pill"
                className="h-11 px-5 text-[13.5px] font-bold"
                disabled={inputsDisabled}
                onClick={() => session.setShowSubmitDialog(true)}
              >
                Nộp bài
              </Button>
            ) : (
              <Button
                shape="pill"
                className="h-11 px-5 text-[13.5px] font-bold"
                onClick={() =>
                  setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))
                }
              >
                Câu tiếp theo
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-3.5 min-[860px]:sticky min-[860px]:top-28">
          {session.isActive && (
            <QuizTimer deadlineAt={attempt.deadlineAt} onExpire={session.handleExpire} />
          )}

          <div className="text-center text-[12.5px] font-semibold text-text-faint">
            Đã trả lời {session.answeredCount}/{questions.length} câu
          </div>

          <QuestionNavigator
            questions={questions}
            currentQuestionId={currentQuestion.id}
            answeredQuestionIds={new Set(Object.keys(selectedAnswers))}
            disabled={submitting}
            onSelect={(questionId) => {
              const index = questions.findIndex((question) => question.id === questionId)
              if (index >= 0) setCurrentIndex(index)
            }}
          />

          <Button
            variant="danger"
            className="h-11 rounded-xl text-[13.5px] font-extrabold"
            disabled={inputsDisabled}
            onClick={() => session.setShowSubmitDialog(true)}
          >
            Nộp bài
          </Button>
        </aside>
      </div>

      {session.showSubmitDialog && (
        <SubmitQuizDialog
          answeredCount={session.answeredCount}
          totalQuestions={questions.length}
          submitting={submitting}
          onCancel={() => session.setShowSubmitDialog(false)}
          onConfirm={session.handleConfirmSubmit}
        />
      )}
    </>
  )
}

export default AttemptWorkspace
