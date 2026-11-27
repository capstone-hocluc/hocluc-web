import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmbeddedClient, SuspensionViewType } from '@hocluc/zoom-meeting-sdk'
import type { LiveRoom } from '../services/liveClassService'

type MeetingStatus = 'connecting' | 'ready' | 'closed' | 'failed'
export type RoomView = 'gallery' | 'speaker'
// SDK 6.10.5 grows its video area's height from its width with a minimum aspect ratio per view
// (measured: speaker 568:400, gallery about 1.75). Sizing the room to that ratio leaves no empty band.
const VIEW_RATIO: Record<RoomView, number> = { speaker: 568 / 400, gallery: 1.75 }
type Client = typeof EmbeddedClient
let previousCleanup = Promise.resolve()

function isMobileDevice() {
  const agent = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(agent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useZoomMeeting(room: LiveRoom | null) {
  const rootRef = useRef<HTMLDivElement>(null)
  /** The space the room may use; the Zoom root is sized to fit inside it and centred. */
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<RoomView>('gallery')
  const relayoutRef = useRef<() => void>(() => undefined)
  const endMeetingRef = useRef<(() => Promise<unknown>) | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [mobile] = useState(isMobileDevice)
  const [status, setStatus] = useState<MeetingStatus>('connecting')

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!room?.embedded || mobile || !root || !stage) return
    let disposed = false
    let disconnect: (() => Promise<void>) | undefined
    const release = () => {
      if (!disconnect) return
      const teardown = disconnect
      disconnect = undefined
      previousCleanup = teardown().catch(() => undefined)
    }
    const connect = async () => {
      if (disposed) return
      const { default: ZoomMtgEmbedded } = await import('@hocluc/zoom-meeting-sdk')
      if (disposed) return
      const { signature, meetingNumber, passcode, userName, userEmail, role, zak, registrantToken } = room
      if (!signature || !meetingNumber || !userName || role === null || (role === 1 && !zak)) throw new Error('Missing Zoom meeting credentials')
      const zoom = ZoomMtgEmbedded.createClient()
      let joinStarted = false
      let closed = false
      let resizeTimer: ReturnType<typeof setTimeout> | undefined
      viewRef.current = role === 1 ? 'gallery' : 'speaker'
      // The largest box of the view's ratio that fits the stage; the root takes that size so the dark
      // room hugs Zoom's video area instead of leaving empty bands beside it.
      const videoSize = () => {
        const ratio = VIEW_RATIO[viewRef.current]
        const width = Math.floor(Math.min(stage.clientWidth, stage.clientHeight * ratio))
        const height = Math.floor(Math.min(stage.clientHeight, width / ratio))
        root.style.width = `${width}px`
        root.style.height = `${height}px`
        return { width, height }
      }
      const resize = () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          const size = videoSize()
          if (!disposed && !closed && size.width && size.height) zoom.updateVideoOptions({ viewSizes: { default: size, ribbon: size } })
        }, 100)
      }
      const observer = new ResizeObserver(resize)
      relayoutRef.current = resize
      const onConnectionChange = ({ state }: { state: string }) => {
        if (state !== 'Closed' || disposed) return
        closed = true
        endMeetingRef.current = null
        setClient(null)
        setStatus('closed')
      }
      const popper = { anchorElement: root, placement: 'top-end' as const, disableDraggable: true }
      const init = Promise.resolve().then(() => zoom.init({
        zoomAppRoot: root,
        language: 'en-US',
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          meetingInfo: ['topic', 'host'],
          video: {
            isResizable: false,
            popper: { disableDraggable: true },
            viewSizes: { default: videoSize(), ribbon: videoSize() },
            defaultViewType: (role === 1 ? 'gallery' : 'speaker') as SuspensionViewType,
          },
          participants: { popper }, setting: { popper }, chat: { popper }, meeting: { popper }, activeApps: { popper },
        },
      }))
      disconnect = async () => {
        observer.disconnect()
        clearTimeout(resizeTimer)
        relayoutRef.current = () => undefined
        document.removeEventListener('fullscreenchange', resize)
        endMeetingRef.current = null
        try {
          await init.catch(() => undefined)
          if (joinStarted) {
            zoom.off('connection-change', onConnectionChange)
            if (!closed) await zoom.leaveMeeting()
          }
        } finally { ZoomMtgEmbedded.destroyClient() }
      }
      const initResult = await init
      if (typeof initResult === 'object' && initResult !== null) throw initResult
      if (disposed) return
      zoom.on('connection-change', onConnectionChange)
      joinStarted = true
      const joinResult = await zoom.join({ signature, meetingNumber, password: passcode ?? '', userName, userEmail: userEmail ?? undefined, zak: role === 1 ? zak ?? undefined : undefined, tk: registrantToken ?? undefined })
      if (typeof joinResult === 'object' && joinResult !== null) throw joinResult
      if (disposed || closed) return
      observer.observe(stage)
      document.addEventListener('fullscreenchange', resize)
      // Speaker view can be unavailable when the browser lacks multi-video support.
      // A view preference must never prevent a participant from joining.
      const viewFailed = await zoom.setViewType(viewRef.current).then((result) => typeof result === 'object' && result !== null, () => true)
      if (viewFailed && viewRef.current !== 'gallery') {
        viewRef.current = 'gallery'
        await zoom.setViewType('gallery').catch(() => undefined)
      }
      resize()
      if (role === 1) endMeetingRef.current = () => zoom.endMeeting()
      setClient(zoom)
      setStatus('ready')
    }
    void previousCleanup.then(connect).catch((error) => {
      console.warn('Zoom connection failed', error instanceof Error ? error.message : error?.reason)
      if (!disposed) setStatus('failed')
      release()
    })
    return () => { disposed = true; release() }
  }, [mobile, room])

  const endZoomMeeting = useCallback(async () => {
    const result = await endMeetingRef.current?.()
    if (typeof result === 'object' && result !== null) throw result
  }, [])
  /** Call after the view type changed, so the room takes the new view's shape. */
  const setView = useCallback((view: RoomView) => {
    viewRef.current = view
    relayoutRef.current()
  }, [])
  return { rootRef, stageRef, mobile, status, client, endZoomMeeting, setView }
}
