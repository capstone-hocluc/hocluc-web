import Button from '../console/button'
import MentorStatsTiles from '../console/mentor-stats-tiles'
import Notice from '../console/notice'
import { Skeleton } from '../tailgrids/core/skeleton'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getMyMentorStats } from '../../services/mentorProfileService'

// The signed-in mentor's own question counts, on top of their dashboard.
export default function MentorOverview() {
  const stats = useScheduleResource('mentor-self-stats', getMyMentorStats)
  return (
    <section aria-labelledby="mentor-stats-title" aria-busy={stats.status === 'loading'} className="flex flex-col gap-3">
      <h2 id="mentor-stats-title" className="text-base font-semibold text-text-primary">
        Thống kê của tôi
      </h2>
      {stats.status === 'ready' && stats.data ? (
        <MentorStatsTiles stats={stats.data} />
      ) : stats.status === 'loading' || stats.status === 'idle' ? (
        <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-card-border px-3 py-2.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <Notice tone="warning">
          {stats.errorMessage || 'Không tải được thống kê.'}{' '}
          <Button size="sm" appearance="outline" onClick={stats.reload}>
            Thử lại
          </Button>
        </Notice>
      )}
    </section>
  )
}
