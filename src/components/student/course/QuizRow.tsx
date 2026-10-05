import type { CourseStudyQuiz } from '../../../services/courseService'
import type { LessonQuiz } from '../../../services/lessonService'
import { getQuizLockMessage } from '../../../lib/quizLock'
import LearningStatus from '../common/LearningStatus'
import LearningTypeIcon from '../common/LearningTypeIcon'
import CurriculumRow from './CurriculumRow'
import { getQuizKind, quizKindLabel } from '../../../lib/learningType'

interface QuizRowProps {
  quiz: CourseStudyQuiz | LessonQuiz
  // Course Study and Lesson Detail use distinct copy for the same lock
  // concept - callers pass their own message; defaults to Course Study's.
  lockMessage?: string
  onOpenQuiz: (quizId: string) => void
}

function QuizRow({ quiz, lockMessage, onOpenQuiz }: QuizRowProps) {
  const kind = getQuizKind(quiz.type)
  const meta = [
    quiz.questionCount ? `${quiz.questionCount} câu` : '',
    quiz.durationMinutes ? `${quiz.durationMinutes} phút` : '',
  ].filter(Boolean)

  return (
    <CurriculumRow
      icon={<LearningTypeIcon type={kind} locked={quiz.locked} />}
      kind={quizKindLabel(kind)}
      title={quiz.title}
      meta={meta.length > 0 ? meta.join(' · ') : undefined}
      locked={quiz.locked}
      lockNote={lockMessage ?? getQuizLockMessage(quiz.lockReason)}
      onClick={() => onOpenQuiz(quiz.id)}
      side={
        <>
          {(quiz.bestPercentage ?? 0) > 0 && (
            <span className="font-extrabold text-practice">{quiz.bestPercentage}%</span>
          )}
          <span>
            {quiz.attemptsUsed}/{quiz.maxAttempts} lượt
          </span>
          {quiz.locked ? (
            <LearningStatus status="locked">Chưa mở</LearningStatus>
          ) : quiz.passed ? (
            <LearningStatus status="completed">Đã đạt</LearningStatus>
          ) : (
            <LearningStatus status="action">
              {quiz.inProgressAttemptId ? 'Tiếp tục làm bài' : 'Làm bài'}
            </LearningStatus>
          )}
        </>
      }
    />
  )
}

export default QuizRow
