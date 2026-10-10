import { CheckCircle2 } from '../console/icons'
import type { LessonDetail } from '../../services/lessonService'
import { formatDuration, prettifyEnum } from '../../lib/courseFormat'
import { getLessonStatusLabel, getLessonStatusTone } from '../../lib/lessonStatus'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Progress from '../ui/Progress'
import StatusBadge from '../ui/StatusBadge'

interface LessonInfoCardProps {
  lesson: LessonDetail
  completing: boolean
  onMarkComplete: () => void
}

// Title, status, description, progress and the "mark complete" action.
function LessonInfoCard({ lesson, completing, onMarkComplete }: LessonInfoCardProps) {
  const statusKey = lesson.progress?.status || 'NOT_STARTED'
  const isCompleted = lesson.progress?.status === 'COMPLETED'
  const canMarkComplete = Boolean(lesson.owned) && !isCompleted
  const percent = Math.max(0, Math.min(100, lesson.progress?.progressPercentage ?? 0))

  return (
    <Card as="section" padding="none" className="px-5 py-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[21px] leading-tight font-bold text-text-heading">
            {lesson.title}
          </h1>
          <span className="text-[12.5px] text-text-secondary">
            {prettifyEnum(lesson.contentType)}
            {Boolean(lesson.durationSeconds) && ` · ${formatDuration(lesson.durationSeconds)}`}
          </span>
        </div>
        <StatusBadge
          tone={getLessonStatusTone(statusKey)}
          size="sm"
          className="shrink-0 px-2.5 py-1 text-[11.5px] font-semibold"
        >
          {getLessonStatusLabel(statusKey)}
        </StatusBadge>
      </div>

      {lesson.description && (
        <p className="mt-3.5 text-[13.5px] leading-[1.6] text-text-body">{lesson.description}</p>
      )}

      <div className="mt-4 flex items-center gap-3 text-[12.5px] font-medium text-text-secondary">
        <Progress value={percent} size="sm" className="flex-1" aria-label="Tiến độ bài học" />
        <span>Tiến độ bài học: {percent}%</span>
      </div>

      {lesson.progress?.chapterCompleted && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-badge-success-text">
          <CheckCircle2 size={14} />
          Chương đã hoàn thành
        </span>
      )}

      <div className="mt-4">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-badge-success-text">
            <CheckCircle2 size={15} />
            Đã hoàn thành
          </span>
        ) : (
          canMarkComplete && (
            <Button className="text-[13.5px] font-semibold" onClick={onMarkComplete} disabled={completing}>
              {completing ? 'Đang lưu...' : 'Đánh dấu hoàn thành'}
            </Button>
          )
        )}
      </div>
    </Card>
  )
}

export default LessonInfoCard
