import Button from '../../ui/Button'
import StatusBadge from '../../ui/StatusBadge'
import { LESSON_STATE_LABELS, LESSON_STATE_TONES } from '../../../lib/roadmapFormat'
import type { RoadmapLessonItem } from '../../../services/roadmapService'

interface RoadmapLessonRowProps {
  lesson: RoadmapLessonItem
  onOpenLesson: (courseId: string, lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
}

export default function RoadmapLessonRow({
  lesson,
  onOpenLesson,
  onOpenQuiz,
}: RoadmapLessonRowProps) {
  const showStateBadge = lesson.state !== 'PENDING'
  const weakSet = new Set(lesson.weakSkillCodes)
  const locationParts = [
    lesson.contentSectionTitle,
    lesson.chapterTitle,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line py-3.5 first:border-t-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-[15px] font-semibold break-words text-text-heading">
            {lesson.title}
          </strong>
          {showStateBadge && (
            <StatusBadge tone={LESSON_STATE_TONES[lesson.state]} size="sm">
              {LESSON_STATE_LABELS[lesson.state]}
            </StatusBadge>
          )}
          {lesson.fromGift && (
            <StatusBadge tone="neutral" size="sm">
              Khóa tặng kèm
            </StatusBadge>
          )}
        </div>
        {locationParts.length > 0 && (
          <p className="text-xs text-text-secondary">{locationParts.join(' · ')}</p>
        )}
        {lesson.skillNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lesson.skillNames.map((name, index) => {
              const code = lesson.skillCodes[index]
              const isWeak = code ? weakSet.has(code) : false
              return (
                <StatusBadge
                  key={code ?? `${name}-${index}`}
                  tone={isWeak ? 'danger' : 'neutral'}
                  size="sm"
                >
                  {name}
                </StatusBadge>
              )
            })}
          </div>
        )}
        {lesson.reason && (lesson.state === 'PRIORITY_WEAK' || lesson.state === 'SKIPPED_MASTERED') && (
          <p className="text-xs leading-relaxed text-text-body">{lesson.reason}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          size="sm"
          appearance={lesson.state === 'PRIORITY_WEAK' ? 'fill' : 'outline'}
          onClick={() => onOpenLesson(lesson.courseId, lesson.lessonId)}
        >
          Học
        </Button>
        {lesson.quizId && (
          <Button
            size="sm"
            appearance="outline"
            onClick={() => onOpenQuiz(lesson.quizId!)}
          >
            Làm bài
          </Button>
        )}
      </div>
    </div>
  )
}
