import MascotState from '../../common/MascotState'
import ResourceState from '../common/ResourceState'
import CourseCard from '../../landing/CourseCard'
import Button from '../../ui/Button'
import Card, { CardEyebrow, CardTitle } from '../../ui/Card'
import Progress from '../../ui/Progress'
import Skeleton from '../../ui/Skeleton'
import StatusBadge from '../../ui/StatusBadge'
import CourseListRow from './CourseListRow'
import { usePageResource } from '../../../hooks/usePageResource'
import { getCourseEnrollmentPlan, type Course } from '../../../services/courseService'
import {
  formatDateTime,
  formatEnrollmentBranch,
  formatEnrollmentBranchMessage,
} from '../../../lib/courseFormat'

interface CourseEnrollmentPlanTabProps {
  courseId: string
  onOpenCourse: (course: Course) => void
  compact?: boolean
}

function CourseEnrollmentPlanTab({ courseId, onOpenCourse, compact = false }: CourseEnrollmentPlanTabProps) {
  const {
    data: plan,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getCourseEnrollmentPlan(courseId), [courseId], {
    forbidden: false,
    notFound: false,
  })

  if (status !== 'ready' || !plan) {
    return (
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[140px]" />
            <Skeleton className="h-[220px]" />
          </div>
        }
        error={{ title: 'Không thể tải lộ trình học' }}
      />
    )
  }

  const elapsed = Math.max(0, Math.min(100, plan.elapsedPercentage ?? 0))
  const planMessage = formatEnrollmentBranchMessage(plan.branch, plan.message)
  const sortedSections = [...plan.sectionOrder].sort((a, b) => a.sequence - b.sequence)
  const hasExtras =
    Boolean(plan.recommendedCourse) ||
    plan.catchUpRecordings.length > 0 ||
    sortedSections.length > 0

  return (
    <div className={`flex min-w-0 flex-col ${compact ? 'gap-3' : 'gap-5'}`}>
      <Card as="section" padding="lg" radius="xl" className={compact ? 'border-0 bg-surface-brand p-3' : undefined}>
        <CardEyebrow>{formatEnrollmentBranch(plan.branch)}</CardEyebrow>
        {planMessage && <p className={`mb-3 text-text-body ${compact ? 'text-sm' : 'text-[15px]'}`}>{planMessage}</p>}
        <div className="mt-3 mb-2 flex items-center justify-between text-sm font-semibold text-text-secondary">
          {/* Course-timeline-elapsed, NOT lesson/learning progress. */}
          <span>Tiến trình thời gian khóa học</span>
          <strong className="font-bold text-primary-text">{plan.elapsedPercentage == null ? 'Chưa xác định' : `${elapsed}%`}</strong>
        </div>
        {plan.elapsedPercentage != null && <Progress value={elapsed} aria-label="Tiến trình thời gian khóa học" />}
      </Card>

      {plan.recommendedCourse && (
        <Card as="section" padding="lg" radius="xl" className={compact ? 'p-3' : undefined}>
          <CardTitle className="text-xl">Khóa học đề xuất</CardTitle>
          <div className="grid grid-cols-[minmax(0,320px)]">
            <CourseCard course={plan.recommendedCourse} onOpen={onOpenCourse} />
          </div>
        </Card>
      )}

      {plan.catchUpRecordings.length > 0 && (
        <Card as="section" padding="lg" radius="xl" className={compact ? 'p-3' : undefined}>
          <CardTitle className="text-xl">Buổi học cần xem lại</CardTitle>
          <div className="flex flex-col">
            {plan.catchUpRecordings.map((item) => (
              <CourseListRow
                key={item.liveClassId}
                title={item.title}
                meta={
                  <span className="text-sm font-semibold text-text-secondary">
                    {formatDateTime(item.startTime)}
                  </span>
                }
                actions={
                  item.recordingUrl && (
                    <Button asChild size="sm" appearance="outline">
                      <a href={item.recordingUrl} target="_blank" rel="noreferrer">
                        Xem bản ghi
                      </a>
                    </Button>
                  )
                }
              />
            ))}
          </div>
        </Card>
      )}

      {sortedSections.length > 0 && (
        <Card as="section" padding="lg" radius="xl" className={compact ? 'p-3' : undefined}>
          <CardTitle className={compact ? 'text-base' : 'text-xl'}>Lộ trình học đề xuất</CardTitle>
          <div className="flex flex-col">
            {sortedSections.map((item, index) => (
              <div
                className="flex items-center gap-3 border-t border-line py-3.5 first:border-t-0"
                key={item.contentSectionId}
              >
                {compact && <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-text">{index + 1}</span>}
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <strong className="text-base font-semibold break-words text-text-heading">
                    {item.title}
                  </strong>
                  <span className="text-sm font-semibold text-text-secondary">
                    {item.phaseName}
                  </span>
                </div>
                {item.weakSkillCount != null && item.weakSkillCount > 0 && (
                  <StatusBadge tone="warning" size="sm">
                    {item.weakSkillCount} kỹ năng cần củng cố
                  </StatusBadge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!hasExtras && (
        <MascotState
          title="Chưa có đề xuất bổ sung"
          message="Chưa có đề xuất bổ sung cho khóa học này."
        />
      )}
    </div>
  )
}

export default CourseEnrollmentPlanTab
