import type { CourseStudyLiveClass } from '../../../services/courseService'
import Button from '../../ui/Button'
import CourseListRow from './CourseListRow'
import LiveClassMeta from './LiveClassMeta'

interface LiveClassRowProps {
  liveClass: CourseStudyLiveClass
}

// Compact row for upcoming/past lists (NextLiveClassCard is used for the
// highlighted "next" item). Join/recording rules are applied uniformly from
// backend fields alone - never gated by which list an item came from, since
// backend `joinable` is authoritative, not derived from time or category.
function LiveClassRow({ liveClass }: LiveClassRowProps) {
  const canJoin = liveClass.joinable && Boolean(liveClass.meetingUrl)
  const hasRecording = Boolean(liveClass.recordingUrl)

  return (
    <CourseListRow
      title={liveClass.title}
      meta={<LiveClassMeta liveClass={liveClass} className="gap-x-2.5 gap-y-0" />}
      actions={
        (canJoin || hasRecording) && (
          <>
            {canJoin && (
              <Button asChild size="sm">
                <a href={liveClass.meetingUrl as string} target="_blank" rel="noreferrer">
                  Tham gia
                </a>
              </Button>
            )}
            {hasRecording && (
              <Button asChild size="sm" appearance="outline">
                <a href={liveClass.recordingUrl as string} target="_blank" rel="noreferrer">
                  Xem bản ghi
                </a>
              </Button>
            )}
          </>
        )
      }
    />
  )
}

export default LiveClassRow
