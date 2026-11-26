import { useEffect, useRef, useState } from 'react'
import Button from '../components/console/button'
import Card from '../components/console/card'
import ConfirmDialog from '../components/console/confirm-dialog'
import Notice from '../components/console/notice'
import AppLink from '../components/landing-page/AppLink'
import LiveRoomSkeleton from '../components/live-room/LiveRoomSkeleton'
import { Skeleton } from '../components/tailgrids/core/skeleton'
import TeacherPageHeader from '../components/teacher/TeacherPageHeader'
import { useZoomMeeting } from '../hooks/useZoomMeeting'
import { ApiError } from '../lib/api'
import { TEACHER_ZOOM_CARD_PATH } from '../lib/console-routes'
import { dateKeyOfInstant, formatDdMmYyyy, formatTimeRangeFromInstants } from '../lib/liveScheduleFormat'
import { safeExternalUrl } from '../lib/scheduling'
import { endLiveClass, getLiveRoom, zoomErrorMessage, type LiveRoom } from '../services/liveClassService'

interface LiveRoomPageProps {
  liveClassId: string
  teacher?: boolean
  onLeave: () => void
}

type RoomState = { room: LiveRoom } | { error: unknown } | null

const roomErrors: Record<string, string> = {
  ZOOM_RECONNECT_REQUIRED: 'Giảng viên cần kết nối lại Zoom trước khi bạn có thể vào lớp.',
  COURSE_NOT_PURCHASED: 'Bạn chưa mua khóa học này.',
  LIVE_CLASS_NOT_BOOKED: 'Bạn cần giữ chỗ trước khi vào lớp.',
  LIVE_CLASS_NOT_OPEN_YET: 'Phòng học chưa mở. Bạn có thể vào lớp từ 15 phút trước giờ bắt đầu.',
  LIVE_CLASS_STATUS_INVALID: 'Buổi học không còn mở. Hãy kiểm tra lại lịch học.',
}

function openZoom(url: string) {
  // Open during the click and sever the opener before sending the tab to Zoom.
  const popup = window.open('', '_blank')
  if (popup) {
    popup.opener = null
    popup.location.href = url
  } else {
    window.location.assign(url)
  }
}

export default function LiveRoomPage({ liveClassId, teacher = false, onLeave }: LiveRoomPageProps) {
  const [result, setResult] = useState<RoomState>(null)
  const [attempt, setAttempt] = useState(0)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const [classEnded, setClassEnded] = useState(false)
  const [endError, setEndError] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const room = result && 'room' in result ? result.room : null
  const { rootRef, mobile, status: meetingStatus, endZoomMeeting } = useZoomMeeting(room)

  useEffect(() => {
    const controller = new AbortController()
    requestRef.current = controller
    // A Strict Mode setup that is immediately cleaned up need not request Zoom credentials.
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      try {
        const room = await getLiveRoom(liveClassId, controller.signal)
        if (!controller.signal.aborted) setResult({ room })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ error })
      }
    })
    return () => controller.abort()
  }, [attempt, liveClassId])

  const handleEnd = async () => {
    if (ending) return
    const signal = requestRef.current?.signal
    let ended = classEnded
    setEnding(true)
    setEndError('')
    try {
      if (!ended) {
        await endLiveClass(liveClassId)
        if (signal?.aborted) return
        ended = true
        setClassEnded(true)
      }
      await endZoomMeeting()
      if (!signal?.aborted) onLeave()
    } catch (error) {
      if (signal?.aborted) return
      setConfirmEnd(false)
      const code = error instanceof ApiError ? error.code : undefined
      setEndError(ended
        ? 'Buổi học đã kết thúc trên HocLuc. Chưa đóng được phòng Zoom. Hãy thử lại.'
        : (code && roomErrors[code]) || 'Không kết thúc được buổi học. Hãy thử lại.')
    } finally {
      if (!signal?.aborted) setEnding(false)
    }
  }

  const error = result && 'error' in result ? result.error : null
  const code = error instanceof ApiError ? error.code : undefined
  const needsReconnect = teacher && code === 'ZOOM_RECONNECT_REQUIRED'
  const roomError = (code && roomErrors[code]) || 'Không mở được phòng học. Vui lòng thử lại.'
  const fallbackMessage = room && (
    !room.embedded ? 'Buổi học này mở bằng Zoom.'
      : mobile ? 'Hãy mở Zoom để vào lớp trên thiết bị này.'
        : meetingStatus === 'failed' ? 'Không kết nối được với phòng Zoom trong HocLuc.' : null
  )
  const fallbackUrl = fallbackMessage ? safeExternalUrl(room?.fallbackUrl) : null
  const connecting = Boolean(room && !fallbackMessage && meetingStatus === 'connecting')
  const time = room && `${formatDdMmYyyy(dateKeyOfInstant(room.startTime))} · ${formatTimeRangeFromInstants(room.startTime, room.endTime)}`

  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-background-gray-secondary p-4 sm:p-6">
      {!result ? <LiveRoomSkeleton teacher={teacher} onLeave={onLeave} /> : (
        <>
          <TeacherPageHeader
            title={room?.title ?? 'Phòng học trực tuyến'}
            description={time && <time dateTime={room.startTime}>{time}</time>}
            actions={
              <>
                <Button appearance="outline" onClick={onLeave} disabled={ending}>Rời lớp</Button>
                {teacher && room && (
                  <Button variant="danger" onClick={() => setConfirmEnd(true)} disabled={connecting || ending}>
                    Kết thúc buổi
                  </Button>
                )}
              </>
            }
          />
          {endError && <Notice tone="danger">{endError}</Notice>}
          {!room ? (
            <Notice tone="danger">
              {needsReconnect ? zoomErrorMessage(error, roomError) : roomError}
              {needsReconnect ? (
                <Button asChild size="sm" appearance="outline">
                  <AppLink href={TEACHER_ZOOM_CARD_PATH}>Kết nối lại Zoom</AppLink>
                </Button>
              ) : (!code || code === 'LIVE_CLASS_NOT_OPEN_YET') && (
                <Button size="sm" appearance="outline" onClick={() => { setResult(null); setAttempt((value) => value + 1) }}>
                  Thử lại
                </Button>
              )}
            </Notice>
          ) : (
            <Card padding="none" className="relative flex min-h-96 flex-1" aria-busy={connecting}>
              {connecting && (
                <Skeleton role="status" aria-label="Đang kết nối với Zoom" className="pointer-events-none absolute inset-0 h-full w-full rounded-xl" />
              )}
              <div ref={rootRef} className="absolute inset-0" />
              {fallbackMessage && (
                <Notice tone="warning" className="relative m-4 w-full self-start">
                  {fallbackMessage}
                  {fallbackUrl ? (
                    <Button size="sm" onClick={() => openZoom(fallbackUrl)}>Mở bằng Zoom</Button>
                  ) : ' Chưa có đường dẫn Zoom cho buổi học này.'}
                </Notice>
              )}
              {meetingStatus === 'closed' && !fallbackMessage && (
                <Notice className="relative m-4 w-full self-start">Bạn đã rời phòng Zoom.</Notice>
              )}
            </Card>
          )}
        </>
      )}
      {confirmEnd && (
        <ConfirmDialog
          title="Kết thúc buổi học?"
          description={fallbackMessage
            ? 'Buổi học sẽ được đánh dấu đã kết thúc trên HocLuc. Nếu đang dạy bằng Zoom, hãy kết thúc phòng họp trong Zoom.'
            : 'Học viên sẽ không thể vào lại buổi học này.'}
          cancelLabel="Quay lại"
          confirmLabel="Kết thúc buổi"
          busyLabel="Đang kết thúc…"
          variant="danger"
          busy={ending}
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => void handleEnd()}
        />
      )}
    </main>
  )
}
