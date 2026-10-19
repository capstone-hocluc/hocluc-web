import type { CourseStudyLiveClass } from '../../../services/courseService'
import Button from '../../ui/Button'
import Card, { CardEyebrow } from '../../ui/Card'
import LiveClassMeta from './LiveClassMeta'

interface NextLiveClassCardProps {
  liveClass: CourseStudyLiveClass
}

function NextLiveClassCard({ liveClass }: NextLiveClassCardProps) {
  const canJoin = liveClass.joinable && Boolean(liveClass.meetingUrl)
  const showRecording = !canJoin && Boolean(liveClass.recordingUrl)

  return (
    <Card variant="live">
      <CardEyebrow className="text-live">Buổi học trực tuyến tiếp theo</CardEyebrow>
      <h3 className="mb-2 text-lg font-semibold text-text-heading">{liveClass.title}</h3>
      {liveClass.description && (
        <p className="mb-3 text-[15px] text-text-body">{liveClass.description}</p>
      )}

      <LiveClassMeta liveClass={liveClass} className="mb-3" />

      {(canJoin || showRecording) && (
        <div className="flex flex-wrap gap-2.5">
          {canJoin && (
            <Button asChild>
              <a href={liveClass.meetingUrl as string} target="_blank" rel="noreferrer">
                Tham gia buổi học
              </a>
            </Button>
          )}
          {showRecording && (
            <Button asChild appearance="outline">
              <a href={liveClass.recordingUrl as string} target="_blank" rel="noreferrer">
                Xem bản ghi
              </a>
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export default NextLiveClassCard
