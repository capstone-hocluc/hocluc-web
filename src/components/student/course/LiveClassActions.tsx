import { useEffect, useState } from 'react'
import Button from '../../ui/Button'
import { safeExternalUrl } from '../../../lib/scheduling'
import {
  getLiveClassRecordings,
  type CourseStudyLiveClass,
} from '../../../services/courseService'
import LiveClassJoinButton from '../live/LiveClassJoinButton'

interface LiveClassActionsProps {
  liveClass: CourseStudyLiveClass
  size?: 'sm' | 'md'
}

/**
 * A student's actions on one live class: join with pay-per-session once live,
 * or replay it after it ends.
 */
function LiveClassActions({ liveClass, size = 'sm' }: LiveClassActionsProps) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const canReplay = liveClass.status === 'COMPLETED'

  useEffect(() => {
    if (!canReplay) return
    let alive = true
    getLiveClassRecordings(liveClass.id)
      .then((recordings) => {
        const ready = recordings.find((recording) => recording.status !== 'PROCESSING' && recording.recordingUrl)
        if (alive) setRecordingUrl(safeExternalUrl(ready?.recordingUrl))
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [canReplay, liveClass.id])

  if (canReplay) {
    if (!recordingUrl) return null
    return (
      <Button asChild size={size} appearance="outline">
        <a href={recordingUrl} target="_blank" rel="noreferrer">Xem bản ghi</a>
      </Button>
    )
  }

  return <LiveClassJoinButton liveClass={liveClass} size={size} />
}

export default LiveClassActions
