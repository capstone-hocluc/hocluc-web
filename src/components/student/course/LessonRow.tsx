import { Sparkles } from '../../console/icons'
import type { CourseStudyLesson } from '../../../services/courseService'
import { formatDuration, prettifyEnum } from '../../../lib/courseFormat'
import { getLessonStatusLabel } from '../../../lib/lessonStatus'
import StatusBadge from '../../ui/StatusBadge'
import LearningStatus from '../common/LearningStatus'
import LearningTypeIcon from '../common/LearningTypeIcon'
import CurriculumRow from './CurriculumRow'
import QuizRow from './QuizRow'

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
        icon={<LearningTypeIcon type={isVideo ? 'video' : 'document'} />}
        kind={kindLabel}
        title={
          <>
            {lesson.title}
            {lesson.preview && (
              <StatusBadge tone="practice" size="sm" className="text-[10.5px] font-bold">
                <Sparkles size={11} />
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
            <LearningStatus status="completed">Đã hoàn thành</LearningStatus>
          ) : isInProgress || isCurrent ? (
            <LearningStatus status="current">Đang học</LearningStatus>
          ) : (
            <LearningStatus status="idle">{getLessonStatusLabel(lesson.status)}</LearningStatus>
          )
        }
      />

      {lesson.quizzes.map((quiz) => (
        <div className="pl-5 max-[640px]:pl-2.5" key={quiz.id}>
          <QuizRow quiz={quiz} onOpenQuiz={onOpenQuiz} />
        </div>
      ))}
    </>
  )
}

export default LessonRow
