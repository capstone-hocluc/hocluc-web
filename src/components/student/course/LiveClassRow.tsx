import type { CourseStudyLiveClass } from '../../../services/courseService'
import CourseListRow from './CourseListRow'
import LiveClassActions from './LiveClassActions'
import LiveClassMeta from './LiveClassMeta'

interface LiveClassRowProps {
  liveClass: CourseStudyLiveClass
}

// Compact row for upcoming/past lists (NextLiveClassCard is used for the
// highlighted "next" item). Book/join/replay rules come from backend fields
// alone - never gated by which list an item came from.
function LiveClassRow({ liveClass }: LiveClassRowProps) {
  return (
    <CourseListRow
      title={liveClass.title}
      meta={<LiveClassMeta liveClass={liveClass} className="gap-x-2.5 gap-y-0" />}
      actions={<LiveClassActions liveClass={liveClass} />}
    />
  )
}

export default LiveClassRow
