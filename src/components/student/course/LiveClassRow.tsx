import type { CourseStudyLiveClass } from '../../../services/courseService'
import StatusBadge from '../../ui/StatusBadge'
import CourseListRow from './CourseListRow'
import LiveClassActions from './LiveClassActions'
import LiveClassMeta from './LiveClassMeta'

interface LiveClassRowProps {
  liveClass: CourseStudyLiveClass
}

// Compact row for upcoming/past lists (NextLiveClassCard is used for the highlighted "next" item).
function LiveClassRow({ liveClass }: LiveClassRowProps) {
  return (
    <CourseListRow
      title={liveClass.title}
      meta={<LiveClassMeta liveClass={liveClass} className="gap-x-2.5 gap-y-0" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {liveClass.status === 'COMPLETED' && liveClass.refunded && (
            <StatusBadge size="sm" tone="warning">Đã hoàn Sao</StatusBadge>
          )}
          <LiveClassActions liveClass={liveClass} />
        </div>
      }
    />
  )
}

export default LiveClassRow
