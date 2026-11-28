import Button from '../button'
import Notice from '../notice'
import SelectField from '../select-field'
import Status from '../status'
import { Progress } from '../../tailgrids/core/progress'
import {
  NEXT_ACTION_LABELS,
  formatCoverageNotice,
  formatForgettingRisk,
} from '../../../lib/roadmapFormat'
import type { PersonalRoadmapResponse } from '../../../services/roadmapService'

interface RoadmapProgressOverviewProps {
  roadmap: PersonalRoadmapResponse | null
  loading: boolean
  errorMessage?: string
  onRetry: () => void
  onSelectCourse: (courseId: string) => void
}

export default function RoadmapProgressOverview({
  roadmap,
  loading,
  errorMessage,
  onRetry,
  onSelectCourse,
}: RoadmapProgressOverviewProps) {
  if (loading && !roadmap) {
    return (
      <div className="space-y-3" role="status" aria-label="Đang tải lộ trình học viên">
        <div className="h-20 animate-pulse rounded-lg border border-card-border bg-background-gray-secondary" />
        <div className="h-32 animate-pulse rounded-lg border border-card-border bg-background-gray-secondary" />
      </div>
    )
  }

  if (errorMessage && !roadmap) {
    return (
      <Notice tone="danger">
        <span>{errorMessage}</span>
        <Button size="sm" appearance="ghost" onClick={onRetry}>
          Thử lại
        </Button>
      </Notice>
    )
  }

  if (!roadmap) {
    return <Notice tone="info">Chưa có dữ liệu lộ trình học.</Notice>
  }

  const coverageNotice = roadmap.hasEnrolledCourse ? formatCoverageNotice(roadmap.coverage) : null
  const nextMeta = NEXT_ACTION_LABELS[roadmap.nextAction.type]
  const nextTarget =
    roadmap.nextAction.lessonTitle ||
    roadmap.nextAction.skillNameVi ||
    roadmap.nextAction.quizTitle ||
    nextMeta.title

  return (
    <div className="space-y-4">
      {roadmap.enrolledCourses.length > 1 && (
        <div className="max-w-sm">
          <SelectField
            ariaLabel="Chọn khóa học của học viên"
            value={roadmap.selectedCourseId ?? undefined}
            onChange={onSelectCourse}
            options={roadmap.enrolledCourses.map((course) => ({
              id: course.courseId,
              label: course.title,
            }))}
          />
        </div>
      )}

      {coverageNotice && <Notice tone="info">{coverageNotice}</Notice>}

      {!roadmap.hasEnrolledCourse ? (
        <Notice tone="info">Học viên chưa đăng ký khóa học nào.</Notice>
      ) : (
        <>
          <div className="space-y-1.5 rounded-lg border border-card-border bg-card-background p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Status tone="info">{nextMeta.title}</Status>
              {roadmap.selectedCourseTitle && (
                <span className="text-xs text-text-tertiary">{roadmap.selectedCourseTitle}</span>
              )}
            </div>
            <p className="font-medium text-text-primary">{nextTarget}</p>
            {roadmap.nextAction.reason && (
              <p className="text-xs text-text-secondary">{roadmap.nextAction.reason}</p>
            )}
          </div>

          {roadmap.phases.length > 0 && (
            <ul className="space-y-2.5">
              {roadmap.phases.map((phase, index) => {
                const done = phase.completedLessons + phase.skippedMasteredLessons
                const pct =
                  phase.totalLessons > 0 ? Math.round((done / phase.totalLessons) * 100) : 0
                return (
                  <li
                    key={phase.phaseId ?? `${phase.name}-${index}`}
                    className="space-y-2 rounded-lg border border-card-border bg-card-background p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-text-primary">{phase.name}</p>
                      <span className="text-xs text-text-tertiary">
                        {phase.completedLessons} hoàn thành · {phase.skippedMasteredLessons} đã vững ·{' '}
                        {phase.remainingLessons} còn lại
                      </span>
                    </div>
                    <Progress progress={pct} withLabel className="max-w-none" />
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {roadmap.reviewQueue.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-primary">Hàng đợi ôn tập</h4>
          <ul className="space-y-2">
            {roadmap.reviewQueue.map((item) => (
              <li
                key={item.skillCode}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-card-border bg-card-background p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{item.skillNameVi}</p>
                  {item.reason && (
                    <p className="mt-0.5 text-xs text-text-secondary">{item.reason}</p>
                  )}
                </div>
                <Status tone="warning">{formatForgettingRisk(item.forgettingRisk)}</Status>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
