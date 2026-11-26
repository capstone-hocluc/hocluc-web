import { useEffect, useRef, useState } from 'react'
import Button from '../components/console/button'
import ConfirmDialog from '../components/console/confirm-dialog'
import Notice from '../components/console/notice'
import AppLink from '../components/landing-page/AppLink'
import LiveRoomSkeleton from '../components/live-room/LiveRoomSkeleton'
import { Skeleton } from '../components/tailgrids/core/skeleton'
import ClassPanel from '../components/live-room/ClassPanel'
import { useClassParticipants } from '../hooks/useClassParticipants'
import { useRoomDisplay } from '../hooks/useRoomDisplay'
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
  const [zoomEnded, setZoomEnded] = useState(false)
  const [endError, setEndError] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const room = result && 'room' in result ? result.room : null
  const { rootRef, mobile, status: meetingStatus, client, endZoomMeeting } = useZoomMeeting(room)
  const participants = useClassParticipants(client)
  const { roomRef, fullscreen, toggleFullscreen, elapsed } = useRoomDisplay(meetingStatus === 'ready')
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches)

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
    let ended = zoomEnded
    setEnding(true)
    setEndError('')
    try {
      if (!ended) {
        await endZoomMeeting()
        if (signal?.aborted) return
        ended = true
        setZoomEnded(true)
      }
      await endLiveClass(liveClassId)
      if (!signal?.aborted) onLeave()
    } catch (error) {
      if (signal?.aborted) return
      setConfirmEnd(false)
      const code = error instanceof ApiError ? error.code : undefined
      setEndError(ended
        ? 'Phòng Zoom đã kết thúc. Chưa kết thúc được buổi học. Hãy thử lại.'
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
    <main ref={roomRef} className="flex h-dvh flex-col overflow-hidden bg-background-gray-secondary">
      {!result ? <LiveRoomSkeleton teacher={teacher} onLeave={onLeave} /> : (
        <>
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-card-border bg-card-background px-3 py-2">
            <div className="min-w-0">
              <h1 className="truncate font-semibold">{room?.title ?? 'Phòng học trực tuyến'}</h1>
              <div className="flex flex-wrap gap-x-3 text-sm text-text-tertiary">
                {time && <time dateTime={room!.startTime}>{time}</time>}
                {meetingStatus === 'ready' && <><span>{elapsed}</span><span>{participants.inClass.length} người</span></>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {teacher && client && <Button size="sm" appearance="outline" onClick={() => setPanelOpen(!panelOpen)}>Lớp học ({participants.inClass.length})</Button>}
              <Button size="sm" appearance="outline" onClick={() => void toggleFullscreen()}>{fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}</Button>
              <Button size="sm" appearance="outline" onClick={onLeave} disabled={ending}>Rời lớp</Button>
              {teacher && room && <Button size="sm" variant="danger" onClick={() => setConfirmEnd(true)} disabled={connecting || ending}>Kết thúc buổi</Button>}
            </div>
          </header>
          {endError && <Notice tone="danger">{endError}</Notice>}
          {!room ? (
            <Notice tone="danger">
              {needsReconnect ? zoomErrorMessage(error, roomError) : roomError}
              {needsReconnect ? <Button asChild size="sm" appearance="outline"><AppLink href={TEACHER_ZOOM_CARD_PATH}>Kết nối lại Zoom</AppLink></Button>
                : (!code || code === 'LIVE_CLASS_NOT_OPEN_YET') && <Button size="sm" appearance="outline" onClick={() => { setResult(null); setAttempt((value) => value + 1) }}>Thử lại</Button>}
            </Notice>
          ) : (
            <div className="relative flex min-h-0 flex-1" aria-busy={connecting}>
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <div ref={rootRef} className="absolute inset-0" />
                {connecting && <Skeleton role="status" aria-label="Đang kết nối với Zoom" className="pointer-events-none absolute inset-0 h-full w-full rounded-none" />}
                {fallbackMessage && <Notice tone="warning" className="relative m-4">{fallbackMessage}{fallbackUrl ? <Button size="sm" onClick={() => openZoom(fallbackUrl)}>Mở bằng Zoom</Button> : ' Chưa có đường dẫn Zoom cho buổi học này.'}</Notice>}
                {meetingStatus === 'closed' && !fallbackMessage && <Notice className="relative m-4">Bạn đã rời phòng Zoom.</Notice>}
              </div>
              {teacher && client && panelOpen && <div className="absolute inset-y-0 right-0 z-10 flex w-full max-w-80 md:static md:w-auto md:max-w-none"><ClassPanel client={client} state={participants} /></div>}
            </div>
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
