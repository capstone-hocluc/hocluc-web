import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmbeddedClient, SuspensionViewType } from '@hocluc/zoom-meeting-sdk'
import type { LiveRoom } from '../services/liveClassService'

type MeetingStatus = 'connecting' | 'ready' | 'closed' | 'failed'
type Client = typeof EmbeddedClient
let previousCleanup = Promise.resolve()

function isMobileDevice() {
  const agent = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(agent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useZoomMeeting(room: LiveRoom | null) {
  const rootRef = useRef<HTMLDivElement>(null)
  const endMeetingRef = useRef<(() => Promise<unknown>) | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [mobile] = useState(isMobileDevice)
  const [status, setStatus] = useState<MeetingStatus>('connecting')

  useEffect(() => {
    const root = rootRef.current
    if (!room?.embedded || mobile || !root) return
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
      const videoSize = () => ({ width: root.clientWidth, height: root.clientHeight })
      const resize = () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          const size = videoSize()
          if (!disposed && !closed && size.width && size.height) zoom.updateVideoOptions({ viewSizes: { default: size } })
        }, 100)
      }
      const observer = new ResizeObserver(resize)
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
        language: 'vi-VN',
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          meetingInfo: ['topic', 'host'],
          video: {
            isResizable: false,
            popper: { disableDraggable: true },
            viewSizes: { default: videoSize() },
            defaultViewType: (role === 1 ? 'gallery' : 'speaker') as SuspensionViewType,
          },
          participants: { popper }, setting: { popper }, chat: { popper }, meeting: { popper }, activeApps: { popper },
        },
      }))
      disconnect = async () => {
        observer.disconnect()
        clearTimeout(resizeTimer)
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
      observer.observe(root)
      document.addEventListener('fullscreenchange', resize)
      resize()
      if (role === 1) endMeetingRef.current = () => zoom.endMeeting()
      setClient(zoom)
      setStatus('ready')
    }
    void previousCleanup.then(connect).catch(() => {
      if (!disposed) setStatus('failed')
      release()
    })
    return () => { disposed = true; release() }
  }, [mobile, room])

  const endZoomMeeting = useCallback(async () => {
    const result = await endMeetingRef.current?.()
    if (typeof result === 'object' && result !== null) throw result
  }, [])
  return { rootRef, mobile, status, client, endZoomMeeting }
}
