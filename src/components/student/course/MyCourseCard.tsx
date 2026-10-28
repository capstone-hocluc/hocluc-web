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
  prettifyEnum,
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
}

// Course card for "My courses": cover, meta, learning progress and status.
function MyCourseCard({ enrollment, onOpen }: MyCourseCardProps) {
  const { course } = enrollment
  const [coverFailed, setCoverFailed] = useState(false)
  const progress = Math.max(0, Math.min(100, enrollment.progressPercentage ?? 0))
  const status = getStatus(progress)
  const isCompleted = status === 'completed'
  const badgeLabel = formatExamLabel(course.targetExam) || prettifyEnum(course.track) || 'Khóa học'
  const enrolledAtLabel = formatDate(enrollment.enrolledAt)
  const enrollmentTypeLabel = formatEnrollmentType(enrollment.enrollmentType)

  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-line-card bg-surface p-0 text-left shadow-card transition duration-150  hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring  active:shadow-none"
    >
      <div
        className={cn(
          'relative flex aspect-[16/9] items-center justify-between gap-3 overflow-hidden px-5',
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
          className="relative max-w-[calc(100%-64px)] self-start mt-4 overflow-hidden bg-surface px-3 py-1 text-xs text-ellipsis"
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

      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-4 pb-5">
        <div>
          <h3 className="line-clamp-2 min-h-[50px] text-lg leading-[1.35] font-bold tracking-[-0.2px] text-text-heading">
            {course.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-normal text-text-body">
            {course.description || 'Chưa có mô tả cho khóa học này.'}
          </p>
        </div>

        {(enrolledAtLabel || enrollmentTypeLabel) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-bold text-text-secondary [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5">
            {enrolledAtLabel && (
              <span>
                <CalendarDays size={14} />
                Đăng ký: {enrolledAtLabel}
              </span>
            )}
            {enrollmentTypeLabel && <span>{enrollmentTypeLabel}</span>}
          </div>
        )}

        <CourseProgress value={progress} />

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold',
              isCompleted ? 'text-badge-success-text' : 'text-primary-text'
            )}
          >
            {isCompleted ? <CheckCircle2 size={16} /> : <CircleDot size={16} />}
            {statusLabels[status]}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary-text">
            Tiếp tục học
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
