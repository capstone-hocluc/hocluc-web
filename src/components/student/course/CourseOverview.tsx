import type { ReactNode } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, Play } from 'lucide-react'
import type { CourseStudy } from '../../../services/courseService'
import { formatDate, prettifyEnum } from '../../../lib/courseFormat'
import Button from '../../ui/Button'
import Progress from '../../ui/Progress'
import StatusBadge from '../../ui/StatusBadge'
import { findFirstLesson } from './studyUtils'

interface CourseOverviewProps {
  study: CourseStudy
  onBack: () => void
  onOpenLesson: (lessonId: string) => void
}

function MetaChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-blue bg-surface-tint px-2.5 py-2 text-xs font-semibold text-text-dim [&>svg]:text-primary">
      {icon}
      {children}
    </span>
  )
}

// Course Study hero: title + meta on the left, learning progress and the
// continue / start CTA on the right (stacked below 820px).
function CourseOverview({ study, onBack, onOpenLesson }: CourseOverviewProps) {
  const trackLabel = prettifyEnum(study.track || undefined)
  const startLabel = formatDate(study.startDate || undefined)
  const endLabel = formatDate(study.endDate || undefined)

  // Learning progress from the Study API - never the course-timeline
  // elapsedPercentage, which lives on the enrollment plan.
  const progress = Math.max(0, Math.min(100, study.progressPercentage ?? 0))
  const completed = study.completedLessons ?? 0
  const total = study.totalLessons ?? 0

  const hasContinueTarget = Boolean(study.continueLessonId)
  const fallbackLesson = hasContinueTarget ? null : findFirstLesson(study.phases)
  const targetLessonId = study.continueLessonId || fallbackLesson?.id

  return (
    <header className="rounded-[18px] border border-line-card bg-surface-sky bg-[linear-gradient(rgba(224,233,250,0.62)_1px,transparent_1px),linear-gradient(90deg,rgba(224,233,250,0.62)_1px,transparent_1px)] bg-[length:28px_28px] p-4 shadow-card">
      <Button
        appearance="ghost"
        size="sm"
        className="h-auto gap-[7px] p-0 text-[13px] font-black hover:bg-transparent hover:underline"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Khóa học của tôi
      </Button>

      <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_300px] items-center gap-5 max-[820px]:grid-cols-1">
        <div className="min-w-0">
          {trackLabel && (
            <StatusBadge tone="primary" size="sm" className="px-2.5 py-[5px] font-black uppercase">
              {trackLabel}
            </StatusBadge>
          )}
          <h1 className="mt-3 mb-2 max-w-[820px] text-[clamp(22px,2.4vw,27px)] leading-[1.16] font-extrabold text-text-heading">
            {study.title}
          </h1>
          <div className="mt-3.5 flex flex-wrap gap-[9px]">
            {(startLabel || endLabel) && (
              <MetaChip icon={<CalendarDays size={16} />}>
                {startLabel}
                {endLabel ? ` – ${endLabel}` : ''}
              </MetaChip>
            )}
            <MetaChip icon={<BookOpen size={16} />}>{total} bài học</MetaChip>
          </div>
        </div>

        <div className="flex flex-col gap-[9px] rounded-2xl border border-line-blue bg-primary-soft p-3.5">
          <span className="text-[13px] font-bold text-text-heading">Tiến độ khóa học</span>
          <div className="flex items-center justify-between gap-3">
            <small className="text-xs font-medium text-text-secondary">
              {completed}/{total} bài học
            </small>
            <strong className="text-[30px] leading-none font-black text-primary">{progress}%</strong>
          </div>
          <Progress value={progress} aria-label="Tiến độ khóa học" />
          {targetLessonId && (
            <Button
              size="lg"
              className="shadow-[0_12px_20px_rgba(28, 176, 246,0.14)]"
              onClick={() => onOpenLesson(targetLessonId)}
            >
              {hasContinueTarget ? 'Tiếp tục học' : 'Bắt đầu học'}
              <Play size={15} />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default CourseOverview
