import type { ReactNode } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, Play } from '../../console/icons'
import type { CourseStudy } from '../../../services/courseService'
import { formatDate, prettifyEnum } from '../../../lib/courseFormat'
import Button from '../../ui/Button'
import Progress from '../../ui/Progress'
import StatusBadge from '../../ui/StatusBadge'
import { findFirstLesson, formatStudyPercent } from './studyUtils'
import styles from './CourseStudyAppearance.module.css'

interface CourseOverviewProps {
  study: CourseStudy
  onBack: () => void
  onOpenLesson: (lessonId: string, courseId?: string) => void
}

function MetaChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-text-body [&>svg]:text-primary">
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
    <header className={styles.banner}>
      <Button
        appearance="ghost"
        size="sm"
        className="h-auto gap-2 p-0 text-sm font-semibold text-primary-text hover:bg-transparent hover:underline"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Khóa học của tôi
      </Button>

      <div className={styles.overviewGrid}>
        <div className="min-w-0">
          {trackLabel && (
            <StatusBadge
              tone="primary"
              size="sm"
              className="bg-surface px-3 py-1 text-xs uppercase"
            >
              {trackLabel}
            </StatusBadge>
          )}
          <h1 className="mt-2 mb-2 max-w-[820px] text-[clamp(20px,2vw,26px)] leading-snug font-bold tracking-[-0.5px] text-text-heading">
            {study.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {(startLabel || endLabel) && (
              <MetaChip icon={<CalendarDays size={16} />}>
                {startLabel}
                {endLabel ? ` – ${endLabel}` : ''}
              </MetaChip>
            )}
            <MetaChip icon={<BookOpen size={16} />}>{total} bài học</MetaChip>
          </div>
        </div>

        <div className={styles.progressCard}>
          <img src="/mascot/05.png" alt="" width={108} height={72} className={styles.mascot} />
          <span className="text-sm font-semibold text-text-heading">Tiến độ khóa học</span>
          <div className="flex items-center justify-between gap-3">
            <small className="text-sm font-semibold text-text-secondary">
              {completed}/{total} bài học
            </small>
            <strong className="text-3xl leading-none font-bold text-primary-text">
              {formatStudyPercent(progress)}
            </strong>
          </div>
          <Progress value={progress} size="sm" aria-label="Tiến độ khóa học" />
          {targetLessonId && (
            <Button size="sm" onClick={() => onOpenLesson(targetLessonId, hasContinueTarget ? study.continueSectionCourseId ?? undefined : undefined)}>
              {hasContinueTarget ? 'Tiếp tục học' : 'Bắt đầu học'}
              <Play size={18} />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default CourseOverview
