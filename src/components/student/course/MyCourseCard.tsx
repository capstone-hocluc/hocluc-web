import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
} from '../../console/icons'
import type { MyCourseEnrollment } from '../../../services/courseService'
import {
  formatDate,
  formatEnrollmentType,
  formatExamLabel,
  formatCourseTrack,
} from '../../../lib/courseFormat'
import StatusBadge from '../../ui/StatusBadge'
import CourseProgress from './CourseProgress'
import { cn } from '../../../lib/cn'

const statusLabels = {
  'not-started': 'Chưa bắt đầu',
  'in-progress': 'Đang học',
  completed: 'Hoàn thành',
}

function getStatus(progress: number) {
  if (progress >= 100) return 'completed'
  if (progress > 0) return 'in-progress'
  return 'not-started'
}

interface MyCourseCardProps {
  enrollment: MyCourseEnrollment
  onOpen: (course: MyCourseEnrollment['course']) => void
  progressDetail?: string
  actionLabel?: string
  progressAvailable?: boolean
  compact?: boolean
  layout?: 'vertical' | 'horizontal'
}

// Course card for "My courses": cover, meta, learning progress and status.
function MyCourseCard({ enrollment, onOpen, progressDetail, actionLabel = 'Tiếp tục học', progressAvailable = true, compact = false, layout = 'vertical' }: MyCourseCardProps) {
  const { course } = enrollment
  const [coverFailed, setCoverFailed] = useState(false)
  const progress = Math.max(0, Math.min(100, enrollment.progressPercentage ?? 0))
  const status = getStatus(progress)
  const isCompleted = status === 'completed'
  const badgeLabel = formatExamLabel(course.targetExam) || formatCourseTrack(course.track) || 'Khóa học'
  const enrolledAtLabel = formatDate(enrollment.enrolledAt)
  const enrollmentTypeLabel = formatEnrollmentType(enrollment.enrollmentType)

  if (layout === 'horizontal') {
    return (
      <button type="button" onClick={() => onOpen(course)}
        className="group grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 overflow-hidden rounded-3xl border-2 border-line-card bg-surface p-4 text-left transition hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring min-[640px]:grid-cols-[64px_minmax(0,1fr)_auto] min-[640px]:gap-x-5">
        <span aria-hidden="true" className="grid aspect-square w-full place-items-center rounded-2xl bg-primary-soft text-primary-text">
          <BookOpen size={28} />
        </span>
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="line-clamp-2 text-base leading-snug font-bold text-text-heading">{course.title}</h3>
            {progressAvailable && <StatusBadge size="sm" tone={isCompleted ? 'success' : 'primary'}>{statusLabels[status]}</StatusBadge>}
          </div>
          {progressAvailable
            ? <CourseProgress value={progress} label={progressDetail || 'Tiến độ học tập'} className="gap-1.5" />
            : <p className="text-sm text-text-secondary">Chưa tải được tiến độ học tập.</p>}
        </div>
        <span className="col-start-2 inline-flex w-fit items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold whitespace-nowrap text-white min-[640px]:col-start-auto">
          {actionLabel}<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-line-card bg-surface p-0 text-left shadow-card transition duration-150 hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring active:shadow-none"
    >
      <div
        className={cn(
          'relative flex aspect-[16/9] items-center justify-between gap-3 overflow-hidden px-5',
          compact && 'px-4',
          isCompleted ? 'bg-practice-soft' : 'bg-primary-soft'
        )}
      >
        {course.imageUrl && !coverFailed && (
          <img
            src={course.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        )}
        <StatusBadge
          tone={isCompleted ? 'success' : 'primary'}
          size="sm"
          className={cn('relative max-w-[calc(100%-64px)] self-start mt-4 overflow-hidden bg-surface px-3 py-1 text-xs text-ellipsis', compact && 'mt-3')}
        >
          {badgeLabel}
        </StatusBadge>
        <span
          className={cn(
            'relative grid size-12 shrink-0 place-items-center rounded-xl bg-surface',
            course.imageUrl && !coverFailed && 'invisible',
            isCompleted ? 'text-practice' : 'text-primary'
          )}
        >
          <BookOpen size={28} />
        </span>
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col gap-3.5 px-5 pt-4 pb-5', compact && 'gap-2.5 px-4 py-3')}>
        <div>
          <h3 className={cn('line-clamp-2 min-h-[50px] text-lg leading-[1.35] font-bold tracking-[-0.2px] text-text-heading', compact && 'min-h-11 text-base')}>
            {course.title}
          </h3>
          <p className={cn('mt-1.5 line-clamp-2 text-sm leading-normal text-text-body', compact && 'mt-1 line-clamp-1 text-xs')}>
            {course.description || 'Chưa có mô tả cho khóa học này.'}
          </p>
        </div>

        {(enrolledAtLabel || enrollmentTypeLabel) && (
          <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-bold text-text-secondary [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5', compact && 'text-xs')}>
            {enrolledAtLabel && (
              <span>
                <CalendarDays size={14} />
                Đăng ký: {enrolledAtLabel}
              </span>
            )}
            {enrollmentTypeLabel && <span>{enrollmentTypeLabel}</span>}
          </div>
        )}

        {progressAvailable ? <CourseProgress value={progress} className={compact ? 'gap-1.5' : undefined} /> : <p className="text-sm text-text-secondary">Chưa tải được tiến độ học tập.</p>}
        {progressDetail && <p className={cn('text-sm text-text-body', compact && 'text-xs')}>{progressDetail}</p>}

        <div className={cn('mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5', compact && 'gap-2 pt-2.5')}>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold',
              compact && 'text-xs',
              isCompleted ? 'text-badge-success-text' : 'text-primary-text'
            )}
          >
            {progressAvailable && (isCompleted ? <CheckCircle2 size={16} /> : <CircleDot size={16} />)}
            {progressAvailable ? statusLabels[status] : 'Chưa có dữ liệu'}
          </span>
          <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary-text', compact && 'text-xs')}>
            {actionLabel}
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-[3px]"
            />
          </span>
        </div>
      </div>
    </button>
  )
}

export default MyCourseCard
