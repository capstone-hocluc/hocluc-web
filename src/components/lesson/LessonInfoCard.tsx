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
    <Card as="section" padding="none" radius="xl" className="p-6 max-[640px]:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1.5 text-[26px] leading-tight font-black tracking-[-0.4px] text-text-heading max-[640px]:text-[22px]">
            {lesson.title}
          </h1>
          <span className="text-sm font-semibold text-text-secondary">
            {prettifyEnum(lesson.contentType)}
            {Boolean(lesson.durationSeconds) && ` · ${formatDuration(lesson.durationSeconds)}`}
          </span>
        </div>
        <StatusBadge
          tone={getLessonStatusTone(statusKey)}
          size="sm"
          className="shrink-0 px-3 py-1 text-xs"
        >
          {getLessonStatusLabel(statusKey)}
        </StatusBadge>
      </div>

      {lesson.description && (
        <p className="mt-4 text-base leading-[1.65] text-text-body">{lesson.description}</p>
      )}

      <div className="mt-5 flex items-center gap-3 text-sm font-extrabold text-text-heading max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:gap-2">
        <Progress value={percent} className="flex-1 max-[640px]:flex-none" aria-label="Tiến độ bài học" />
        <span className="whitespace-nowrap">Tiến độ bài học: {percent}%</span>
      </div>

      {lesson.progress?.chapterCompleted && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-badge-success-text">
          <CheckCircle2 size={16} />
          Chương đã hoàn thành
        </span>
      )}

      <div className="mt-5">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-badge-success-text">
            <CheckCircle2 size={18} />
            Đã hoàn thành
          </span>
        ) : (
          canMarkComplete && (
            <Button onClick={onMarkComplete} disabled={completing}>
              {completing ? 'Đang lưu...' : 'Đánh dấu hoàn thành'}
            </Button>
          )
        )}
      </div>
    </Card>
  )
}

export default LessonInfoCard
