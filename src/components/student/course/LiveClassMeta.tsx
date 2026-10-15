import { Calendar, UserRound, Video } from '../../console/icons'
import type { CourseStudyLiveClass } from '../../../services/courseService'
import { formatDateTime, formatTime, prettifyEnum } from '../../../lib/courseFormat'
import { cn } from '../../../lib/cn'

interface LiveClassMetaProps {
  liveClass: CourseStudyLiveClass
  className?: string
}

// "time range · instructor · provider · status" line shared by the next-class
// card and the upcoming/past list rows.
function LiveClassMeta({ liveClass, className }: LiveClassMetaProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-text-secondary [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5',
        className
      )}
    >
      <span>
        <Calendar size={15} />
        {formatDateTime(liveClass.startTime)} – {formatTime(liveClass.endTime)}
      </span>
      {liveClass.instructorName && (
        <span>
          <UserRound size={15} />
          {liveClass.instructorName}
        </span>
      )}
      {liveClass.provider && (
        <span>
          <Video size={15} />
          {prettifyEnum(liveClass.provider)}
        </span>
      )}
      <span className="font-extrabold text-live">{prettifyEnum(liveClass.status)}</span>
    </div>
  )
}

export default LiveClassMeta
