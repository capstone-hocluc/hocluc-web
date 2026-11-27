import { useEffect, useRef, useState } from 'react'
import Button from '../components/console/button'
import ConfirmDialog from '../components/console/confirm-dialog'
import Notice from '../components/console/notice'
import AppLink from '../components/landing-page/AppLink'
import LiveRoomSkeleton from '../components/live-room/LiveRoomSkeleton'
import { Skeleton } from '../components/tailgrids/core/skeleton'
import ClassPanel from '../components/live-room/ClassPanel'
import ChatPanel from '../components/live-room/ChatPanel'
import RoomControls from '../components/live-room/RoomControls'
import RoomControlsSkeleton from '../components/live-room/RoomControlsSkeleton'
import RoomHeader from '../components/live-room/RoomHeader'
import RoomSidePanel, { type RoomTab } from '../components/live-room/RoomSidePanel'
import RoomSidePanelSkeleton from '../components/live-room/RoomSidePanelSkeleton'
import '../components/live-room/zoom-overrides.css'
import { useActiveSpeakers } from '../hooks/useActiveSpeakers'
import { useRoomChat } from '../hooks/useRoomChat'
import { useRoomControls } from '../hooks/useRoomControls'
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
  const onLeaveRef = useRef(onLeave)
  useEffect(() => {
    onLeaveRef.current = onLeave
  }, [onLeave])
  const room = result && 'room' in result ? result.room : null
  const { rootRef, stageRef, mobile, status: meetingStatus, client, endZoomMeeting, setView } = useZoomMeeting(room)
  const participants = useClassParticipants(client)
  const { fullscreen, toggleFullscreen, elapsed } = useRoomDisplay(meetingStatus === 'ready')
  // The side panel starts open where there is room beside the video: the class list for teachers, chat for students.
  const [panel, setPanel] = useState<RoomTab | null>(() => window.matchMedia('(min-width: 768px)').matches ? (teacher ? 'class' : 'chat') : null)
  const controls = useRoomControls(client, rootRef, teacher, setView)
  const chat = useRoomChat(client, panel === 'chat')
  const speaking = useActiveSpeakers(client)
  const selfSpeaking = Boolean(controls.self && !controls.self.muted && speaking.has(controls.self.userId))

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
        if (!controller.signal.aborted) {
          if (!teacher && error instanceof ApiError && error.code === 'LIVE_CLASS_NOT_ADMITTED') {
            onLeaveRef.current()
            return
          }
          setResult({ error })
        }
      }
    })
    return () => controller.abort()
  }, [attempt, liveClassId, teacher])

  const handleLeave = async () => {
    if (client) {
      try { await client.leaveMeeting() } catch { /* Navigation must remain available if Zoom has disconnected. */ }
    }
    onLeave()
  }

  const handleEnd = async () => {
    if (ending) return
    const signal = requestRef.current?.signal
    let ended = zoomEnded
    setEnding(true)
    setEndError('')
    try {
      if (!ended) {
        // Only the device holding Zoom's host role can close the room from here. On another device
        // (the teacher's second tab or computer) this fails, and the backend closes the room when the class ends.
        ended = await endZoomMeeting().then(() => true, () => false)
        if (signal?.aborted) return
        if (ended) setZoomEnded(true)
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
  // Covers Zoom until the HocLuc controls take over, so its own toolbar never shows first.
  const loading = connecting || (!fallbackMessage && controls.pending)
  // In class the video tiles sit straight on the page; Zoom's dark backdrop stays only for its own waiting screens.
  const inClass = controls.custom && !loading && !controls.self?.isHold
  const time = room && `${formatDdMmYyyy(dateKeyOfInstant(room.startTime))} · ${formatTimeRangeFromInstants(room.startTime, room.endTime)}`

  const showTab = (tab: RoomTab) => { if (tab === 'chat') chat.clearUnread(); setPanel(tab) }
  const toggleTab = (tab: RoomTab) => { if (panel === tab) setPanel(null); else showTab(tab) }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background-gray-secondary">
      {!result ? <LiveRoomSkeleton teacher={teacher} onLeave={() => void handleLeave()} /> : (
        <>
          {!fullscreen && <RoomHeader
            title={room?.title ?? 'Phòng học trực tuyến'}
            time={time ? { start: room!.startTime, label: time } : null}
            live={meetingStatus === 'ready' ? { elapsed, people: participants.inClass.length } : null}
          >
            {(!client || controls.pending) && <Button size="sm" shape="pill" variant="danger" appearance="outline" onClick={() => void handleLeave()} disabled={ending}>Rời lớp</Button>}
          </RoomHeader>}
          {endError && <Notice tone="danger" className="mx-3 mt-3">{endError}</Notice>}
          {!room ? (
            <div className="grid min-h-0 flex-1 place-items-center p-6">
              <Notice tone="danger" className="max-w-xl">
                {needsReconnect ? zoomErrorMessage(error, roomError) : roomError}
                {needsReconnect ? <Button asChild size="sm" appearance="outline"><AppLink href={TEACHER_ZOOM_CARD_PATH}>Kết nối lại Zoom</AppLink></Button>
                  : (!code || code === 'LIVE_CLASS_NOT_OPEN_YET') && <Button size="sm" appearance="outline" onClick={() => { setResult(null); setAttempt((value) => value + 1) }}>Thử lại</Button>}
              </Notice>
            </div>
          ) : (
            <>
              <div className={`relative flex min-h-0 flex-1 ${fullscreen ? '' : 'gap-3 p-3'}`} aria-busy={loading}>
                <div ref={stageRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
                  <div ref={rootRef} className={`hocluc-zoom-room relative shrink-0 overflow-hidden ${inClass ? 'hocluc-zoom-clear' : `bg-neutral-800 ${fullscreen ? '' : 'rounded-2xl'}`} ${controls.zoomToolbar ? '' : 'hocluc-zoom-custom'} ${loading ? 'opacity-0' : ''}`} />
                  {loading && <Skeleton role="status" aria-label="Đang kết nối với Zoom" className={`absolute inset-0 h-full w-full ${fullscreen ? 'rounded-none' : 'rounded-2xl'}`} />}
                  {(fallbackMessage || meetingStatus === 'closed') && (
                    <div className="absolute inset-0 grid place-items-center p-6">
                      {fallbackMessage
                        ? <Notice tone="warning" className="max-w-xl">{fallbackMessage}{fallbackUrl ? <Button size="sm" onClick={() => openZoom(fallbackUrl)}>Mở bằng Zoom</Button> : ' Chưa có đường dẫn Zoom cho buổi học này.'}</Notice>
                        : <Notice className="max-w-xl">Bạn đã rời phòng Zoom.</Notice>}
                    </div>
                  )}
                </div>
                {loading && panel && <RoomSidePanelSkeleton teacher={teacher} />}
                {client && !loading && panel && (
                  <div className={`absolute z-10 flex md:static md:inset-auto ${fullscreen ? 'inset-0' : 'inset-3'}`}>
                    <RoomSidePanel
                      active={panel}
                      onChange={showTab}
                      onClose={() => setPanel(null)}
                      tabs={[
                        ...(teacher ? [{ value: 'class' as const, label: `Lớp học (${participants.inClass.length})`, content: <ClassPanel client={client} state={participants} speaking={speaking} /> }] : []),
                        { value: 'chat' as const, label: 'Trò chuyện', badge: chat.unread, content: <ChatPanel chat={chat} currentUserId={participants.currentUserId} /> },
                      ]}
                    />
                  </div>
                )}
              </div>
              {controls.notice && <Notice tone="warning" className="mx-3 mb-3">{controls.notice}</Notice>}
              {loading && <RoomControlsSkeleton teacher={teacher} />}
              {client && !controls.pending && <RoomControls controls={controls} teacher={teacher} panel={panel} unread={chat.unread} speaking={selfSpeaking} fullscreen={fullscreen} onFullscreen={() => void toggleFullscreen()} onChat={() => toggleTab('chat')} onParticipants={() => toggleTab('class')} onLeave={() => void handleLeave()} onEnd={() => setConfirmEnd(true)} />}
            </>
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
