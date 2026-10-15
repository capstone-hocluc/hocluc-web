import { Sparkles } from '../../console/icons'
import type { CourseStudyLesson } from '../../../services/courseService'
import { formatDuration, prettifyEnum } from '../../../lib/courseFormat'
import { getLessonStatusLabel } from '../../../lib/lessonStatus'
import StatusBadge from '../../ui/StatusBadge'
import LearningStatus from '../common/LearningStatus'
import LearningTypeIcon from '../common/LearningTypeIcon'
import CurriculumRow from './CurriculumRow'
import QuizRow from './QuizRow'

const rowIcon = 'size-10 rounded-xl [&>svg]:size-5'
const statusText = 'text-[13px]'

interface LessonRowProps {
  lesson: CourseStudyLesson
  isCurrent: boolean
  onOpen: (lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
}

// A lesson line plus the quizzes attached directly to that lesson (nested).
function LessonRow({ lesson, isCurrent, onOpen, onOpenQuiz }: LessonRowProps) {
  const isCompleted = lesson.status === 'COMPLETED'
  const isInProgress = lesson.status === 'IN_PROGRESS'
  const isVideo = lesson.contentType === 'VIDEO'
  const kindLabel = isVideo ? 'Video' : prettifyEnum(lesson.contentType) || 'Bài học'
  const duration = lesson.durationSeconds ? formatDuration(lesson.durationSeconds) : ''

  return (
    <>
      <CurriculumRow
        icon={<LearningTypeIcon type={isVideo ? 'video' : 'document'} className={rowIcon} />}
        kind={kindLabel}
        title={
          <>
            {lesson.title}
            {lesson.preview && (
              <StatusBadge tone="practice" size="sm" className="text-xs">
                <Sparkles size={12} />
                Học thử
              </StatusBadge>
            )}
          </>
        }
        meta={duration}
        current={isCurrent}
        onClick={() => onOpen(lesson.id)}
        side={
          isCompleted ? (
            <LearningStatus status="completed" className={statusText}>Đã hoàn thành</LearningStatus>
          ) : isInProgress || isCurrent ? (
            <LearningStatus status="current" className={statusText}>Đang học</LearningStatus>
          ) : (
            <LearningStatus status="idle" className={statusText}>
              {getLessonStatusLabel(lesson.status)}
            </LearningStatus>
          )
        }
      />

      {lesson.quizzes.map((quiz) => (
        <div className="pl-6 max-[640px]:pl-3" key={quiz.id}>
          <QuizRow quiz={quiz} onOpenQuiz={onOpenQuiz} />
        </div>
      ))}
    </>
  )
}

export default LessonRow
