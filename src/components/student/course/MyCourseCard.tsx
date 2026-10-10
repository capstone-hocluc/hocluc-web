import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, CircleDot, Users } from '../../console/icons'
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
      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[18px] border border-line-card bg-surface p-0 text-left shadow-[0_10px_22px_rgba(17,24,58,0.04)] transition duration-200 hover:-translate-y-[3px] hover:border-line-brand hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary/25"
    >
      <div className="relative flex h-[120px] items-end justify-between bg-linear-to-br from-primary-soft to-surface-sky p-3.5 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.32)_1px,transparent_1px)] before:bg-[length:30px_30px]">
        <StatusBadge
          tone="primary"
          size="sm"
          className="relative max-w-[calc(100%-56px)] overflow-hidden bg-surface/85 px-[11px] py-[7px] text-[11.5px] font-black text-ellipsis uppercase"
        >
          {badgeLabel}
        </StatusBadge>
        <BookOpen size={34} className="relative shrink-0 text-primary/80" />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pt-3.5 pb-4">
        <div>
          <StatusBadge tone="primary" size="sm" className="mb-2 max-w-full font-black uppercase">
            {badgeLabel}
          </StatusBadge>
          <h3 className="line-clamp-2 min-h-11 text-base leading-[1.38] font-black text-text-heading">
            {course.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-normal text-text-body">
            {course.description || 'Chưa có mô tả cho khóa học này.'}
          </p>
        </div>

        {(enrolledAtLabel || enrollmentTypeLabel || enrollment.activeStudyGroupName) && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs font-bold text-text-faint [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[5px]">
            {enrolledAtLabel && (
              <span>
                <CalendarDays size={12} />
                Đăng ký: {enrolledAtLabel}
              </span>
            )}
            {enrollmentTypeLabel && <span>{enrollmentTypeLabel}</span>}
            {enrollment.activeStudyGroupName && (
              <span>
                <Users size={12} />
                {enrollment.activeStudyGroupName}
              </span>
            )}
          </div>
        )}

        <CourseProgress value={progress} />

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
          <span
            className={cn(
              'inline-flex items-center gap-[5px] text-[13px] font-black',
              isCompleted ? 'text-badge-success-text' : 'text-primary'
            )}
          >
            {isCompleted ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}
            {statusLabels[status]}
          </span>
          <span className="inline-flex items-center gap-[7px] text-[13px] font-black whitespace-nowrap text-primary">
            Tiếp tục học
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-[3px]" />
          </span>
        </div>
      </div>
    </button>
  )
}

export default MyCourseCard
