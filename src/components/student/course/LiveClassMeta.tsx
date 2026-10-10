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
        'flex flex-wrap gap-x-3.5 gap-y-2 text-[12.5px] text-text-secondary [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[5px]',
        className
      )}
    >
      <span>
        <Calendar size={13} />
        {formatDateTime(liveClass.startTime)} – {formatTime(liveClass.endTime)}
      </span>
      {liveClass.instructorName && (
        <span>
          <UserRound size={13} />
          {liveClass.instructorName}
        </span>
      )}
      {liveClass.provider && (
        <span>
          <Video size={13} />
          {prettifyEnum(liveClass.provider)}
        </span>
      )}
      <span className="font-semibold text-live">{prettifyEnum(liveClass.status)}</span>
    </div>
  )
}

export default LiveClassMeta
